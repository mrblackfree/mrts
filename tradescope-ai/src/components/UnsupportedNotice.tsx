'use client';

import { ArrowRight, Eye, EyeOff, SearchX } from 'lucide-react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import type { AnalysisReport, TradeProduct } from '@/lib/types';
import { useI18n } from './I18nProvider';
import { Button, Card } from './ui';

/**
 * Shown instead of a report when the query names no product in the knowledge base. The example product's
 * numbers stay hidden until asked for, so they are never read as the answer.
 */
export default function UnsupportedNotice({
  report,
  example,
  showExample,
  onToggleExample,
  onPick,
}: {
  report: AnalysisReport;
  example: TradeProduct;
  showExample: boolean;
  onToggleExample: () => void;
  onPick: (productId: string) => void;
}) {
  const { t, p } = useI18n();
  const reason = report.match.unsupportedReason ?? 'no-match';
  const name = p(example.name);
  const body = reason === 'other-form' ? t('unsupportedOtherForm').replace('{name}', name) : reason === 'heading-only' ? t('unsupportedHeading') : t('unsupportedBody');

  return (
    <Card className="rise-in p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
          <SearchX className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{reason === 'other-form' ? t('unsupportedOtherFormTitle') : t('unsupportedTitle')}</h2>
          <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">“{report.query}”</p>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
        </div>
      </div>

      <p className="mt-5 text-xs font-bold text-slate-500 dark:text-slate-400">{t('unsupportedPick')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((prod) => (
          <li key={prod.id}>
            <button
              type="button"
              onClick={() => onPick(prod.id)}
              className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left text-[13px] font-semibold text-slate-800 transition-[border-color,box-shadow] duration-150 hover:border-slate-300 hover:shadow-elevated dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-100 dark:hover:border-white/15"
            >
              <span aria-hidden>{prod.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{p(prod.name)}</span>
              <ArrowRight className="size-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
        <Button size="sm" variant="subtle" onClick={onToggleExample} aria-expanded={showExample}>
          {showExample ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
          {(showExample ? t('hideExample') : t('showExample')).replace('{name}', name)}
        </Button>
        <span className="text-[11px] text-slate-400">{t('exampleHint')}</span>
      </div>
    </Card>
  );
}
