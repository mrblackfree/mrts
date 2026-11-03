'use client';

import { Container, FileDown, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_SCENARIOS, getProduct } from '@/data/kr-ph-trade-db';
import { analyzeLocal, DIRECTION_LABEL, rankPartners } from '@/lib/engine/simulate';
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
import Overview from './Overview';
import { Button, cx } from './ui';
import { useBusinessDay } from './useBusinessDay';

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
  // re-applies the official layer at the day boundary so expired overrides drop out of an open dashboard
  const businessDay = useBusinessDay();
  const trustScore = useMemo(() => overallTrustScore(), [businessDay]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const product = report ? getProduct(report.productId) : undefined;

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

  const nav = [
    { id: 'm-brief', label: t('navBrief') },
    { id: 'm-tariff', label: t('navTariff') },
    { id: 'm-market', label: t('navMarket') },
    { id: 'm-partners', label: t('navPartners') },
  ];

  // scroll-spy: highlight the module currently in view
  const [activeSection, setActiveSection] = useState('m-brief');
  useEffect(() => {
    if (status !== 'done') return;
    const els = ['m-brief', 'm-tariff', 'm-market', 'm-partners'].map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    // callbacks only report sections whose visibility changed, so keep the full visible set across callbacks
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = els.find((el) => visible.has(el.id)); // first in document order
        if (first) setActiveSection(first.id);
      },
      { rootMargin: '-130px 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [status, report?.id]);

  return (
    <>
      <Header health={health} trustScore={trustScore} onOpenTrust={() => setTrustOpen(true)} />
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

              <nav className="no-print sticky top-[65px] z-30 -mx-4 flex items-center gap-2 bg-[#f5f7fa]/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 dark:bg-[#060a12]/80" aria-label="modules">
                <div className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-[#0c121d]/80">
                  {nav.map((n, i) => {
                    const active = activeSection === n.id;
                    return (
                      <a
                        key={n.id}
                        href={`#${n.id}`}
                        aria-current={active ? 'location' : undefined}
                        onClick={() => setActiveSection(n.id)}
                        className={cx(
                          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-[background-color,color] duration-150',
                          active ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white',
                        )}
                      >
                        <span className={cx('text-[10px] font-bold tabular-nums', active ? 'opacity-60' : 'text-slate-400')}>{String(i + 1).padStart(2, '0')}</span>
                        {n.label}
                      </a>
                    );
                  })}
                </div>
                <Button variant="primary" size="sm" pill onClick={() => window.print()} className="ml-auto shrink-0" aria-label={t('pdf')}>
                  <FileDown className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t('pdf')}</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </nav>

              <BriefingModule key={`b-${report.id}`} report={report} product={product} onOpenTrust={() => setTrustOpen(true)} />
              <TariffModule key={`t-${report.id}`} product={product} initialAmount={report.intent.amountUsd} />
              <MarketModule key={`m-${report.id}`} product={product} />
              <div className="print-break" />
              <PartnersModule key={`p-${report.id}`} product={product} intent={report.intent} onOpen={(partnerId, tab) => setAssistant({ partnerId, tab })} />
            </>
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6">
        <div className="rounded-[20px] border border-slate-200/80 bg-white/70 p-5 text-xs leading-relaxed text-slate-500 shadow-hairline backdrop-blur sm:p-6 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-slate-400">
          <p className="flex items-start gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">
              <ShieldCheck className="size-3.5" aria-hidden />
            </span>
            <span className="pt-0.5">{t('footerNote')}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 pt-4 font-medium text-slate-400 dark:border-white/[0.06]">
            <span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">TradeScope AI</span> · {t('projectTag')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Container className="size-3.5" aria-hidden /> Next.js · standalone · Docker-ready
            </span>
          </div>
        </div>
      </footer>

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
