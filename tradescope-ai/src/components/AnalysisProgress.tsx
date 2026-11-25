'use client';

import { Check, Loader2 } from 'lucide-react';
import type { DictKey } from '@/lib/i18n';
import { useI18n } from './I18nProvider';
import { Card, cx } from './ui';

export const PIPELINE_STEPS: DictKey[] = ['stepIntent', 'stepHs', 'stepFta', 'stepMarket', 'stepMatch', 'stepBrief'];

export default function AnalysisProgress({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <Card className="rise-in no-print overflow-hidden p-5 sm:p-6">
      <div className="-mx-5 -mt-5 mb-5 h-0.5 bg-slate-100 sm:-mx-6 sm:-mt-6 dark:bg-white/[0.06]" aria-hidden>
        <div className="h-full bg-gradient-to-r from-brand-400 to-brand-700 transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, ((step + 0.5) / PIPELINE_STEPS.length) * 100)}%` }} /* finished steps + half of the active one */ />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {t(PIPELINE_STEPS[Math.min(step, PIPELINE_STEPS.length - 1)])}
      </p>
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PIPELINE_STEPS.map((k, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'todo';
          return (
            <li key={k} className="flex items-center gap-2.5">
              <span
                className={cx(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition',
                  state === 'done' && 'bg-emerald-500 text-white shadow-[0_0_0_4px_rgb(16_185_129/0.12)]',
                  state === 'active' && 'bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_0_0_4px_rgb(42_133_166/0.15)]',
                  state === 'todo' && 'bg-white text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.03] dark:ring-white/10',
                )}
              >
                {state === 'done' ? <Check className="size-4" /> : state === 'active' ? <Loader2 className="size-4 animate-spin" /> : i + 1}
              </span>
              <span className={cx('text-xs font-semibold', state === 'todo' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200')}>
                {t(k)}
                <span className="sr-only"> — {t(state === 'done' ? 'stepDone' : state === 'active' ? 'stepActive' : 'stepTodo')}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    </Card>
  );
}
