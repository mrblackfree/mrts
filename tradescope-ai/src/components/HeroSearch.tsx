'use client';

import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { DEMO_SCENARIOS } from '@/data/kr-ph-trade-db';
import type { Direction } from '@/lib/types';
import { Flag } from './Flag';
import { useI18n } from './I18nProvider';
import { Button, cx } from './ui';

interface Props {
  query: string;
  direction: Direction;
  loading: boolean;
  activeDemo: string | null;
  onQuery: (q: string) => void;
  onDirection: (d: Direction) => void;
  onSubmit: () => void;
  onDemo: (id: string) => void;
}

const LEAD_EMOJI = /^(\p{Extended_Pictographic}\uFE0F?)\s*/u;

/** Corridors after KR ↔ PH (roadmap, shown as not yet available). */
const NEXT_CORRIDORS: Array<{ code: string; ko: string; en: string }> = [
  { code: 'VN', ko: '베트남', en: 'Vietnam' },
  { code: 'ID', ko: '인도네시아', en: 'Indonesia' },
  { code: 'TH', ko: '태국', en: 'Thailand' },
  { code: 'MY', ko: '말레이시아', en: 'Malaysia' },
];

/** "🇵🇭 필리핀 → 🇰🇷 대한민국 (수입/소싱)" with image flags. */
function DirectionLabel({ direction }: { direction: Direction }) {
  const { t } = useI18n();
  const [from, to] = direction === 'PH_TO_KR' ? (['PH', 'KR'] as const) : (['KR', 'PH'] as const);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag code={from} />
      {t(`country${from}`)}
      <span aria-hidden>→</span>
      <Flag code={to} />
      {t(`country${to}`)}
      <span className="font-medium opacity-70">({direction === 'PH_TO_KR' ? t('dirTagImport') : t('dirTagExport')})</span>
    </span>
  );
}

export default function HeroSearch({ query, direction, loading, activeDemo, onQuery, onDirection, onSubmit, onDemo }: Props) {
  const { t, p, lang } = useI18n();
  return (
    <section className="no-print ring-gradient relative overflow-hidden rounded-[28px] bg-white/80 px-4 pb-7 pt-9 shadow-elevated backdrop-blur sm:px-10 sm:pb-10 sm:pt-12 dark:bg-[#0b111c]/80">
      {/* decorative layers: dot grid + soft flag-coloured light */}
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-[26rem] rounded-full bg-[#cd2e3a]/[0.07] blur-3xl dark:bg-[#cd2e3a]/[0.12]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-44 -right-28 size-[28rem] rounded-full bg-[#0038a8]/[0.07] blur-3xl dark:bg-[#3b82f6]/[0.12]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 py-1 pl-1 pr-3 text-xs font-semibold text-slate-600 shadow-hairline dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="size-3" aria-hidden />
            AI
          </span>
          {t('heroEyebrow')}
        </p>
        <h1 className="mt-5 text-balance break-keep text-[28px] font-bold leading-[1.18] tracking-[-0.035em] text-slate-900 sm:text-[44px] dark:text-white">
          {t('heroTitleLead')}{' '}
          <span className="bg-gradient-to-r from-brand-500 via-brand-700 to-ink-900 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-white">{t('heroTitleAccent')}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty break-keep text-[14.5px] leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">{t('heroSub')}</p>

        {/* corridors: KR ↔ PH is the one live today; the next ones are a roadmap */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 py-1 pl-1 pr-3 font-semibold text-brand-800 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200">
            <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-brand-700 shadow-hairline dark:bg-white/10 dark:text-brand-200">{t('corridorLive')}</span>
            <span className="inline-flex items-center gap-1.5">
              <Flag code="KR" />
              {t('countryKR')}
              <span aria-hidden>↔</span>
              <Flag code="PH" />
              {t('countryPH')}
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-brand-600/80 dark:text-brand-300/80">{t('corridorPilot')}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500" title={t('corridorNextNote')}>
            {t('corridorNext')}
            <span className="inline-flex items-center gap-1.5">
              {NEXT_CORRIDORS.map((c) => (
                <span key={c.code} className="inline-flex items-center opacity-60 grayscale-[35%]">
                  <Flag code={c.code} label={lang === 'ko' ? c.ko : c.en} />
                </span>
              ))}
            </span>
            <span className="sr-only">{t('corridorNextNote')}</span>
          </span>
        </div>

        <div className="mt-7 flex justify-center">
          <div
            role="group"
            aria-label="direction"
            className="grid w-full grid-cols-1 gap-1 rounded-2xl bg-slate-900/[0.05] p-1 ring-1 ring-inset ring-slate-900/[0.04] sm:inline-grid sm:w-auto sm:grid-cols-2 dark:bg-white/[0.05] dark:ring-white/[0.06]"
          >
            {(['PH_TO_KR', 'KR_TO_PH'] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={direction === d}
                onClick={() => onDirection(d)}
                className={cx(
                  'h-10 whitespace-nowrap rounded-xl px-4 text-[13.5px] font-semibold transition-[background-color,color,box-shadow] duration-150',
                  direction === d
                    ? 'bg-ink-900 text-white shadow-ink dark:bg-white dark:text-ink-900'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
                )}
              >
                <DirectionLabel direction={d} />
              </button>
            ))}
          </div>
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) onSubmit();
          }}
        >
          <div className="group/search flex flex-col gap-2 rounded-[20px] border border-slate-200 bg-white p-2 shadow-elevated transition-[border-color,box-shadow] duration-200 focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgb(42_133_166/0.12),0_12px_32px_-12px_rgb(15_23_42/0.18)] sm:flex-row sm:items-end dark:border-white/10 dark:bg-[#070c15] dark:focus-within:border-brand-400/70">
            <label className="flex flex-1 items-start gap-2.5 px-2.5 pt-2.5 sm:pb-1">
              <Search className="mt-0.5 size-5 shrink-0 text-slate-400 transition-colors group-focus-within/search:text-brand-500" aria-hidden />
              <span className="sr-only">{t('searchPlaceholder')}</span>
              <span className="flex w-full flex-col">
                <textarea
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (!loading) onSubmit();
                    }
                  }}
                  rows={2}
                  maxLength={500}
                  placeholder={t('searchPlaceholder')}
                  className="min-h-[3.25rem] w-full resize-none bg-transparent text-left text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
                <span aria-hidden className="mt-1 hidden items-center gap-1.5 text-left text-[11px] text-slate-400 sm:flex">
                  <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">Enter</kbd>
                  {t('kbdSubmit')}
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">Shift + Enter</kbd>
                  {t('kbdNewline')}
                </span>
              </span>
            </label>
            <Button type="submit" variant="brand" size="lg" loading={loading} className="sm:min-w-[9.5rem]">
              {!loading && <ArrowRight className="size-4" aria-hidden />}
              {loading ? t('analyzing') : t('analyze')}
            </Button>
          </div>
        </form>

        <div className="mt-8">
          <p className="mb-3 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700" />
            {t('demoTitle')}
            <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700" />
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {DEMO_SCENARIOS.map((d) => {
              const label = p(d.label);
              const m = label.match(LEAD_EMOJI);
              const active = activeDemo === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDemo(d.id)}
                  disabled={loading}
                  className={cx(
                    'group flex items-center gap-3 rounded-2xl border p-2.5 pr-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 disabled:cursor-wait',
                    active
                      ? 'border-brand-300 bg-brand-50/80 shadow-[0_0_0_3px_rgb(42_133_166/0.1)] dark:border-brand-400/40 dark:bg-brand-400/10'
                      : 'border-slate-200/80 bg-white/70 hover:-translate-y-px hover:border-slate-300 hover:bg-white hover:shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.05]',
                  )}
                >
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-xl ring-1 ring-inset ring-slate-200/70 dark:from-white/[0.06] dark:to-white/[0.02] dark:ring-white/10">
                    {m ? m[1] : '•'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-keep text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{m ? label.slice(m[0].length) : label}</span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Flag code={d.direction === 'PH_TO_KR' ? 'PH' : 'KR'} />
                      {d.direction === 'PH_TO_KR' ? 'PH' : 'KR'}
                      <span aria-hidden>→</span>
                      <Flag code={d.direction === 'PH_TO_KR' ? 'KR' : 'PH'} />
                      {d.direction === 'PH_TO_KR' ? 'KR' : 'PH'}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cx(
                      'grid size-7 shrink-0 place-items-center rounded-full transition-colors',
                      active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-ink-900 group-hover:text-white dark:bg-white/[0.06] dark:group-hover:bg-white dark:group-hover:text-ink-900',
                    )}
                  >
                    {loading && active ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-px" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
