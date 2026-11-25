'use client';

import { FileDown, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_SCENARIOS, getProduct } from '@/data/kr-ph-trade-db';
import { analyzeLocal, cifAdjustment, DIRECTION_LABEL, rankPartners } from '@/lib/engine/simulate';
import type { AnalysisReport, Direction, Lang } from '@/lib/types';
import AnalysisProgress, { PIPELINE_STEPS } from './AnalysisProgress';
import AssistantPanel from './AssistantPanel';
import DataTrustCenter, { overallTrustScore } from './DataTrustCenter';
import Header, { type HealthInfo } from './Header';
import HeroSearch from './HeroSearch';
import { I18nProvider, useI18n } from './I18nProvider';
import BriefingModule from './modules/BriefingModule';
import MarketModule from './modules/MarketModule';
import PartnersModule from './modules/PartnersModule';
import TariffModule from './modules/TariffModule';
import Landing from './Landing';
import UnsupportedNotice from './UnsupportedNotice';
import { oncePerSession, sendMetric } from '@/lib/metrics/client';
import { STATIC_PREVIEW } from '@/lib/preview';
import ExpertRequestDialog, { type ExpertContext } from './expert/ExpertRequestDialog';
import TradeJourney from './journey/TradeJourney';
import { Button, cx } from './ui';
import { useBusinessDay } from './useBusinessDay';

/** The query's own amount and incoterm when the tariff calculator starts from a value converted to CIF. */
function cifSource(report: AnalysisReport) {
  const term = report.intent.incoterm?.split(' ')[0].toUpperCase();
  const adjustment = term ? cifAdjustment(term) : undefined;
  if (report.intent.customsValueUsd === undefined || !term || !adjustment) return undefined;
  return { term, amount: report.intent.amountUsd ?? 0, adjustment };
}

export default function Workspace() {
  return (
    <I18nProvider>
      <WorkspaceInner />
    </I18nProvider>
  );
}

// Keeps the 6-step pipeline animation readable while staying close to "1 second to full report".
const MIN_ANALYSIS_MS = 600;

function WorkspaceInner() {
  const { t, p, lang } = useI18n();
  const [direction, setDirection] = useState<Direction>('PH_TO_KR');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<{ partnerId: string; tab: 'analysis' | 'email' } | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [trustOpen, setTrustOpen] = useState(false);
  const [expert, setExpert] = useState<ExpertContext | null>(null);
  const openExpert = useCallback((ctx: ExpertContext) => {
    if (ctx.source) sendMetric({ e: 'expert_open', src: ctx.source });
    setExpert(ctx);
  }, []);
  // a query for a product outside the knowledge base: the example report stays hidden until asked for
  const [showExample, setShowExample] = useState(false);
  // re-applies the official layer at the day boundary so expired overrides drop out of an open dashboard
  const businessDay = useBusinessDay();
  const trustScore = useMemo(() => overallTrustScore(), [businessDay]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const product = report ? getProduct(report.productId) : undefined;

  // validation metrics (aggregate only): one visit per tab session, and each report shown (supported or not)
  useEffect(() => {
    if (oncePerSession('visit')) sendMetric({ e: 'visit' });
  }, []);
  const countedReport = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'done' || !report || countedReport.current === report.id) return;
    countedReport.current = report.id;
    sendMetric({ e: 'report', supported: report.match.supported !== false });
  }, [status, report]);

  const run = useCallback(
    async (rawQuery: string, dir: Direction, demoId: string | null = null, reqLang: Lang = lang) => {
      const defaults = {
        ko: { PH_TO_KR: '필리핀 바나나칩 한국 수입 관세와 절차', KR_TO_PH: '한국 조미김 필리핀 수출 FDA와 바이어' },
        en: { PH_TO_KR: 'Duties and procedures to import Philippine banana chips into Korea', KR_TO_PH: 'Export Korean seasoned laver to the Philippines: FDA and buyers' },
      } as const;
      const text = rawQuery.trim() || defaults[reqLang][dir];
      const id = ++requestId.current;
      setStatus('loading');
      setStep(0);
      setShowExample(false);
      setActiveDemo(demoId);
      setAssistant(null);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

      const ticker = setInterval(() => setStep((s) => Math.min(s + 1, PIPELINE_STEPS.length - 1)), 95);
      const minDelay = new Promise((r) => setTimeout(r, MIN_ANALYSIS_MS));
      let next: AnalysisReport;
      if (STATIC_PREVIEW) {
        // no server in the preview: the same simulation engine runs in the browser
        next = analyzeLocal(text, dir).report;
      } else try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25_000);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, direction: dir, lang: reqLang }),
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        const json = await res.json();
        if (!json?.ok || !json.report || !getProduct(json.report.productId)) throw new Error('invalid response');
        next = json.report as AnalysisReport;
      } catch {
        // Offline / static hosting fallback: the same simulation engine runs in the browser.
        const local = analyzeLocal(text, dir).report;
        next = { ...local, engine: { ...local.engine, fallbackReason: 'client-offline' } };
      }
      await minDelay;
      clearInterval(ticker);
      if (id !== requestId.current) return;
      setStep(PIPELINE_STEPS.length);
      setReport(next);
      setStatus('done');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('q', text);
        url.searchParams.set('dir', dir);
        window.history.replaceState(null, '', url.toString());
      } catch {
        /* ignore */
      }
    },
    [lang],
  );

  // Health probe + deep links (/?q=...&dir=KR_TO_PH).
  useEffect(() => {
    if (!STATIC_PREVIEW) {
      fetch('/api/health')
        .then((r) => r.json())
        .then((j) => setHealth(j))
        .catch(() => setHealth(null));
    }
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const dir: Direction = params.get('dir') === 'KR_TO_PH' ? 'KR_TO_PH' : 'PH_TO_KR';
    if (q) {
      setQuery(q);
      setDirection(dir);
      // The stored language preference is applied by I18nProvider after mount; read it directly so the
      // first request already asks for the language the user will see.
      let storedLang: Lang = 'ko';
      try {
        storedLang = localStorage.getItem('ts-lang') === 'en' ? 'en' : 'ko';
      } catch {
        /* storage unavailable */
      }
      void run(q, dir, null, storedLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force the light palette while printing / saving as PDF.
  useEffect(() => {
    let wasDark = false;
    const before = () => {
      wasDark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.remove('dark');
    };
    const after = () => {
      if (wasDark) document.documentElement.classList.add('dark');
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const onDemo = (id: string) => {
    const demo = DEMO_SCENARIOS.find((d) => d.id === id);
    if (!demo) return;
    const q = p(demo.query);
    setQuery(q);
    setDirection(demo.direction);
    void run(q, demo.direction, id);
  };

  const onPick = (productId: string) => {
    const prod = getProduct(productId);
    if (!prod) return;
    const q =
      lang === 'ko'
        ? `${prod.name.ko} ${prod.direction === 'PH_TO_KR' ? '한국 수입 관세·통관 절차·공급사' : '필리핀 수출 관세·인증·바이어'}`
        : `${prod.name.en} ${prod.direction === 'PH_TO_KR' ? 'import to Korea: duties, customs and suppliers' : 'export to the Philippines: duties, certification and buyers'}`;
    setQuery(q);
    setDirection(prod.direction);
    void run(q, prod.direction);
  };

  const assistantPartner = useMemo(() => {
    if (!assistant || !product || !report) return null;
    return rankPartners(product, report.intent).find((x) => x.id === assistant.partnerId) ?? null;
  }, [assistant, product, report]);

  return (
    <>
      <Header health={health} trustScore={trustScore} onOpenTrust={() => setTrustOpen(true)} nav={status === 'idle'} />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        {STATIC_PREVIEW && (
          <p role="note" className="no-print flex items-start gap-2 rounded-2xl border border-brand-200/70 bg-brand-50/70 px-4 py-3 text-[13px] leading-relaxed text-brand-900 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-100">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{t('previewBanner')}</span>
          </p>
        )}
        <HeroSearch
          query={query}
          direction={direction}
          loading={status === 'loading'}
          activeDemo={activeDemo}
          compact={status !== 'idle'}
          onQuery={setQuery}
          onDirection={setDirection}
          onSubmit={() => void run(query, direction)}
          onDemo={onDemo}
        />

        <div ref={resultsRef} className="scroll-mt-20 space-y-5">
          {status === 'idle' && (
            <Landing onPick={onPick} onOpenTrust={() => setTrustOpen(true)} onExpert={() => openExpert({ topic: t('expertsTopic'), serviceIds: [], source: 'landing' })} />
          )}
          {status === 'loading' && <AnalysisProgress step={step} />}
          {status === 'done' && report && product && report.match.supported === false && (
            <UnsupportedNotice
              report={report}
              example={product}
              showExample={showExample}
              onToggleExample={() => setShowExample((v) => !v)}
              onPick={onPick}
              onExpert={(serviceIds) => openExpert({ topic: report.query, serviceIds, source: 'unsupported' })}
            />
          )}
          {status === 'done' && report && product && (report.match.supported !== false || showExample) && (
            <>
              {/* Print-only report header */}
              <div className="print-only">
                <p className="text-xl font-extrabold">{lang === 'ko' ? 'TradeScope AI — 무역 인텔리전스 리포트 · 대한민국 ↔ 필리핀' : 'TradeScope AI — Trade Intelligence Report · Korea ↔ Philippines'}</p>
                <p className="text-sm">
                  {DIRECTION_LABEL[product.direction][lang]} · {new Date(report.generatedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                </p>
                <p className="mt-1 text-sm">Q. {report.query}</p>
                <hr className="my-3" />
              </div>

              <TradeJourney
                report={report}
                product={product}
                onOpenTrust={() => setTrustOpen(true)}
                onOpenAssistant={(partnerId, tab) => setAssistant({ partnerId, tab })}
                onExpert={openExpert}
                tariffProps={{
                  initialAmount: report.intent.customsValueUsd ?? report.intent.amountUsd,
                  convertedFrom: cifSource(report),
                  assumedCif: report.intent.amountUsd !== undefined && !report.intent.incoterm,
                }}
              />
            </>
          )}
        </div>
      </main>

      <footer className="mx-auto mt-16 max-w-7xl px-4 pb-10 sm:px-6">
        <div className="border-t border-slate-200/80 pt-8 text-[12.5px] leading-relaxed text-slate-500 dark:border-white/[0.07] dark:text-slate-400">
          <p className="flex max-w-4xl items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span>{t('footerNote')}</span>
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">TradeScope AI</span>
            <span aria-hidden>·</span>
            <span>{t('projectTag')}</span>
          </p>
        </div>
      </footer>

      {expert && <ExpertRequestDialog context={expert} onClose={() => setExpert(null)} />}

      {trustOpen && <DataTrustCenter focusProductId={product?.id} links={health?.links} onClose={() => setTrustOpen(false)} />}

      {assistant && product && report && assistantPartner && (
        <AssistantPanel
          product={product}
          partner={assistantPartner}
          intent={report.intent}
          initialTab={assistant.tab}
          aiEnabled={!!health?.ai.enabled}
          onClose={() => setAssistant(null)}
        />
      )}
    </>
  );
}
