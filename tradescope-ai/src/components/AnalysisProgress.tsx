'use client';

import { Check, Loader2 } from 'lucide-react';
import type { DictKey } from '@/lib/i18n';
import { useI18n } from './I18nProvider';
import { Card, cx } from './ui';

export const PIPELINE_STEPS: DictKey[] = ['stepIntent', 'stepHs', 'stepFta', 'stepMarket', 'stepMatch', 'stepBrief'];

export default function AnalysisProgress({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <Card className="rise-in no-print p-5">
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        {PIPELINE_STEPS.map((k, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'todo';
          return (
            <li key={k} className="flex items-center gap-2.5">
              <span
                className={cx(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition',
                  state === 'done' && 'bg-emerald-500 text-white',
                  state === 'active' && 'bg-brand-500 text-white',
                  state === 'todo' && 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                )}
              >
                {state === 'done' ? <Check className="size-4" /> : state === 'active' ? <Loader2 className="size-4 animate-spin" /> : i + 1}
              </span>
              <span className={cx('text-xs font-semibold', state === 'todo' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200')}>{t(k)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </Card>
  );
}
