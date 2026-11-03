'use client';

import { ArrowRight, Check, Loader2, Search } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
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
  /** after an analysis: only the direction and the search box, so the report starts near the top */
  compact?: boolean;
  onQuery: (q: string) => void;
  onDirection: (d: Direction) => void;
  onSubmit: () => void;
  onDemo: (id: string) => void;
}

const LEAD_EMOJI = /^(\p{Extended_Pictographic}️?)\s*/u;

function Route({ direction }: { direction: Direction }) {
  const { t } = useI18n();
  const [from, to] = direction === 'PH_TO_KR' ? (['PH', 'KR'] as const) : (['KR', 'PH'] as const);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Flag code={from} />
      {t(`country${from}`)}
      <ArrowRight className="size-3 opacity-60" aria-hidden />
      <Flag code={to} />
      {t(`country${to}`)}
    </span>
  );
}

/** Import / export choice: the trade direction decides which duties, permits and partners apply. */
function DirectionPicker({ direction, onDirection, compact }: { direction: Direction; onDirection: (d: Direction) => void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t('directionLabel')} className={cx('grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-white/[0.04]', compact ? 'w-full lg:w-auto lg:shrink-0' : 'mx-auto w-full max-w-xl')}>
      {(['PH_TO_KR', 'KR_TO_PH'] as Direction[]).map((d) => {
        const on = direction === d;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onDirection(d)}
            className={cx(
              'flex min-w-0 flex-col items-center justify-center rounded-xl px-2 text-center transition-[background-color,color,box-shadow] duration-150',
              compact ? 'h-12 gap-0' : 'h-[3.75rem] gap-0.5',
              on
                ? 'bg-white text-slate-900 shadow-soft ring-1 ring-slate-900/[0.06] dark:bg-white/[0.1] dark:text-white dark:ring-white/10'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200',
            )}
          >
            <span className={cx('text-[11px] font-bold uppercase tracking-[0.08em]', on ? 'text-brand-700 dark:text-brand-300' : '')}>{d === 'PH_TO_KR' ? t('dirImport') : t('dirExport')}</span>
            <span className="max-w-full truncate text-[13px] font-semibold">
              <Route direction={d} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HeroSearch({ query, direction, loading, activeDemo, compact, onQuery, onDirection, onSubmit, onDemo }: Props) {
  const { t, p } = useI18n();
  const box = useRef<HTMLTextAreaElement>(null);

  // the box grows with the question (up to about four lines) instead of scrolling inside itself
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [query, compact]);

  const search = (
    <form
      className={cx(compact ? 'min-w-0 flex-1' : 'mx-auto mt-4 w-full max-w-2xl')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
    >
      <div className="group/search flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft transition-[border-color,box-shadow] duration-200 focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgb(42_133_166/0.12)] sm:flex-row sm:items-center dark:border-white/10 dark:bg-[#080d17] dark:focus-within:border-brand-400/70">
        <label className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2">
          <Search className="mt-[3px] size-[18px] shrink-0 text-slate-400 transition-colors group-focus-within/search:text-brand-600" aria-hidden />
          <span className="sr-only">{t('searchLabel')}</span>
          <textarea
            ref={box}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!loading) onSubmit();
              }
            }}
            rows={1}
            maxLength={500}
            placeholder={t('searchPlaceholderShort')}
            className="block min-h-6 w-full resize-none bg-transparent text-left text-[15.5px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
          />
        </label>
        <Button type="submit" variant="primary" size="lg" loading={loading} className="sm:min-w-[8.5rem]">
          {loading ? t('analyzing') : t('analyze')}
          {!loading && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </div>
    </form>
  );

  if (compact) {
    return (
      <section aria-label={t('compactTitle')} className="no-print rounded-[22px] border border-slate-200/80 bg-white/90 p-3 shadow-soft backdrop-blur sm:p-4 dark:border-white/[0.07] dark:bg-[#0b111c]/90">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <DirectionPicker direction={direction} onDirection={onDirection} compact />
          {search}
        </div>
      </section>
    );
  }

  return (
    <section className="no-print relative isolate overflow-hidden rounded-[32px] border border-slate-200/70 bg-white px-4 pb-10 pt-12 shadow-soft sm:px-10 sm:pb-14 sm:pt-16 dark:border-white/[0.07] dark:bg-[#0a101b]">
      {/* one calm light source and a fine grid that fades out — no competing colours */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(60%_70%_at_50%_0%,rgb(184_220_232/0.6),transparent_75%)] dark:bg-[radial-gradient(60%_70%_at_50%_0%,rgb(42_133_166/0.22),transparent_75%)]" />
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[12px] font-semibold text-slate-600 shadow-hairline dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          <Flag code="KR" />
          {t('countryKR')}
          <span aria-hidden className="text-slate-400">↔</span>
          <Flag code="PH" />
          {t('countryPH')}
          <span aria-hidden className="h-3 w-px bg-slate-200 dark:bg-white/15" />
          <span className="text-brand-700 dark:text-brand-300">{t('corridorLive')}</span>
        </p>
        <h1 className="mt-6 text-balance break-keep text-[32px] font-bold leading-[1.15] tracking-[-0.04em] text-slate-900 sm:text-[52px] dark:text-white">
          {t('heroTitleLead')}
          <br />
          <span className="text-brand-700 dark:text-brand-300">{t('heroTitleAccent')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty break-keep text-[15.5px] leading-relaxed text-slate-500 sm:text-[17px] dark:text-slate-400">{t('heroSubPlain')}</p>
      </div>

      <div className="mx-auto mt-9 max-w-2xl">
        <DirectionPicker direction={direction} onDirection={onDirection} />
        {search}

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-[12.5px] font-medium text-slate-400">{t('examplesTitle')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO_SCENARIOS.map((d) => {
              const label = p(d.label);
              const emoji = label.match(LEAD_EMOJI)?.[1];
              const active = activeDemo === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDemo(d.id)}
                  disabled={loading}
                  title={label.replace(LEAD_EMOJI, '')}
                  className={cx(
                    'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-[border-color,background-color,color] duration-150 disabled:cursor-wait',
                    active
                      ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-400/40 dark:bg-brand-400/10 dark:text-brand-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.06]',
                  )}
                >
                  {loading && active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : emoji && <span aria-hidden>{emoji}</span>}
                  {p(d.short)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-100 pt-6 text-[12.5px] font-medium text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
        {[t('heroTrust1'), t('heroTrust2'), t('heroTrust3')].map((x) => (
          <li key={x} className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
            {x}
          </li>
        ))}
      </ul>
    </section>
  );
}
