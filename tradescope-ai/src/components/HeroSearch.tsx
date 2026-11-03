'use client';

import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { DEMO_SCENARIOS } from '@/data/kr-ph-trade-db';
import type { Direction } from '@/lib/types';
import { useI18n } from './I18nProvider';
import { cx } from './ui';

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

export default function HeroSearch({ query, direction, loading, activeDemo, onQuery, onDirection, onSubmit, onDemo }: Props) {
  const { t, p } = useI18n();
  return (
    <section className="no-print relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-4 py-7 shadow-sm sm:px-8 sm:py-10 dark:border-slate-800 dark:bg-slate-900">
      {/* decorative flag-coloured glow */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#cd2e3a]/10 blur-3xl dark:bg-[#cd2e3a]/15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-[#0038a8]/10 blur-3xl dark:bg-[#3b82f6]/15" />
      <div aria-hidden className="pointer-events-none absolute right-1/3 top-0 size-40 rounded-full bg-[#fcd116]/15 blur-3xl" />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
          <Sparkles className="size-3.5" />
          {t('heroEyebrow')}
        </p>
        <h1 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{t('heroTitle')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-slate-500 sm:text-base dark:text-slate-400">{t('heroSub')}</p>

        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center" role="group" aria-label="direction">
          {(['PH_TO_KR', 'KR_TO_PH'] as Direction[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              onClick={() => onDirection(d)}
              className={cx(
                'w-full rounded-xl border px-4 py-2 text-sm font-bold transition sm:w-auto',
                direction === d
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              {d === 'PH_TO_KR' ? t('dirPhKr') : t('dirKrPh')}
            </button>
          ))}
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) onSubmit();
          }}
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg shadow-slate-200/60 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 sm:flex-row sm:items-end dark:border-slate-700 dark:bg-slate-950 dark:shadow-none">
            <label className="flex flex-1 items-start gap-2 px-2 pt-2 sm:pb-2">
              <Search className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <span className="sr-only">{t('searchPlaceholder')}</span>
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
                className="min-h-[3.25rem] w-full resize-none bg-transparent text-left text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-6 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition hover:brightness-110 disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {loading ? t('analyzing') : t('analyze')}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">{t('demoTitle')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_SCENARIOS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onDemo(d.id)}
                disabled={loading}
                className={cx(
                  'group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-wait',
                  activeDemo === d.id
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-brand-500 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800',
                )}
              >
                <span>{p(d.label)}</span>
                <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
