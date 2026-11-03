'use client';

import { Container, FileDown, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_SCENARIOS, getProduct } from '@/data/kr-ph-trade-db';
import { analyzeLocal, DIRECTION_LABEL, rankPartners } from '@/lib/engine/simulate';
import type { AnalysisReport, Direction } from '@/lib/types';
import AnalysisProgress, { PIPELINE_STEPS } from './AnalysisProgress';
import AssistantPanel from './AssistantPanel';
import Header, { type HealthInfo } from './Header';
import HeroSearch from './HeroSearch';
import { I18nProvider, useI18n } from './I18nProvider';
import BriefingModule from './modules/BriefingModule';
import MarketModule from './modules/MarketModule';
import PartnersModule from './modules/PartnersModule';
import TariffModule from './modules/TariffModule';
import Overview from './Overview';

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const product = report ? getProduct(report.productId) : undefined;

  const run = useCallback(
    async (rawQuery: string, dir: Direction, demoId: string | null = null) => {
      const text = rawQuery.trim() || (dir === 'PH_TO_KR' ? '필리핀 바나나칩 한국 수입 관세와 절차' : '한국 조미김 필리핀 수출 FDA와 바이어');
      const id = ++requestId.current;
      setStatus('loading');
      setStep(0);
      setActiveDemo(demoId);
      setAssistant(null);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

      const ticker = setInterval(() => setStep((s) => Math.min(s + 1, PIPELINE_STEPS.length - 1)), 95);
      const minDelay = new Promise((r) => setTimeout(r, MIN_ANALYSIS_MS));
      let next: AnalysisReport;
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25_000);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, direction: dir, lang }),
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
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setHealth(j))
      .catch(() => setHealth(null));
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const dir: Direction = params.get('dir') === 'KR_TO_PH' ? 'KR_TO_PH' : 'PH_TO_KR';
    if (q) {
      setQuery(q);
      setDirection(dir);
      void run(q, dir);
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

  const nav = [
    { id: 'm-brief', label: t('navBrief') },
    { id: 'm-tariff', label: t('navTariff') },
    { id: 'm-market', label: t('navMarket') },
    { id: 'm-partners', label: t('navPartners') },
  ];

  return (
    <>
      <Header health={health} canPrint={status === 'done'} />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <HeroSearch
          query={query}
          direction={direction}
          loading={status === 'loading'}
          activeDemo={activeDemo}
          onQuery={setQuery}
          onDirection={setDirection}
          onSubmit={() => void run(query, direction)}
          onDemo={onDemo}
        />

        <div ref={resultsRef} className="scroll-mt-20 space-y-5">
          {status === 'idle' && <Overview onPick={onPick} />}
          {status === 'loading' && <AnalysisProgress step={step} />}
          {status === 'done' && report && product && (
            <>
              {/* Print-only report header */}
              <div className="print-only">
                <p className="text-xl font-extrabold">TradeScope AI — KR ↔ PH Trade Intelligence Report</p>
                <p className="text-sm">
                  {DIRECTION_LABEL[product.direction][lang]} · {new Date(report.generatedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                </p>
                <p className="mt-1 text-sm">Q. {report.query}</p>
                <hr className="my-3" />
              </div>

              <nav className="no-print sticky top-[61px] z-30 -mx-4 flex items-center gap-1.5 overflow-x-auto bg-slate-50/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 dark:bg-slate-950/85" aria-label="modules">
                {nav.map((n, i) => (
                  <a
                    key={n.id}
                    href={`#${n.id}`}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-400"
                  >
                    {i + 1}. {n.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
                >
                  <FileDown className="size-3.5" />
                  {t('pdf')}
                </button>
              </nav>

              <BriefingModule key={`b-${report.id}`} report={report} product={product} />
              <TariffModule key={`t-${report.id}`} product={product} initialAmount={report.intent.amountUsd} />
              <MarketModule key={`m-${report.id}`} product={product} />
              <div className="print-break" />
              <PartnersModule key={`p-${report.id}`} product={product} intent={report.intent} onOpen={(partnerId, tab) => setAssistant({ partnerId, tab })} />
            </>
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            {t('footerNote')}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-slate-400">
            <span>TradeScope AI · {t('projectTag')}</span>
            <span className="inline-flex items-center gap-1">
              <Container className="size-3.5" /> Next.js · standalone · Docker-ready
            </span>
          </p>
        </div>
      </footer>

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
