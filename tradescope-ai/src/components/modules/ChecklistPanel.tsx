'use client';

import { CheckSquare, ChevronDown, Clock, ExternalLink, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { REQ_CATEGORY_LABEL } from '@/lib/i18n';
import type { Country, TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, cx, LevelBadge, ProgressBar, SourceTag } from '../ui';

export default function ChecklistPanel({ product }: { product: TradeProduct }) {
  const { t, p, lang } = useI18n();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setChecked(new Set());
    setOpen(null);
  }, [product.id]);

  const total = product.requirements.length;
  const doneCount = checked.size;
  // Importing-country side first.
  const sides: Country[] = product.direction === 'PH_TO_KR' ? ['KR', 'PH'] : ['PH', 'KR'];

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('checklistTitle')}</p>
        <span className="text-xs font-bold text-slate-500">
          {doneCount}/{total} {t('done')}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={(doneCount / total) * 100} tone="green" />
      </div>

      <div className="mt-3 space-y-4">
        {sides.map((side) => {
          const items = product.requirements.filter((r) => r.side === side);
          if (!items.length) return null;
          return (
            <div key={side}>
              <p className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{side === 'KR' ? t('sideKr') : t('sidePh')}</p>
              <ul className="space-y-1.5">
                {items.map((r) => {
                  const isOpen = open === r.id;
                  const isDone = checked.has(r.id);
                  return (
                    <li key={r.id} className={cx('rounded-xl border transition', isOpen ? 'border-brand-500/60 bg-brand-50/40 dark:bg-brand-500/5' : 'border-slate-200 dark:border-slate-800')}>
                      <div className="flex items-start gap-2 p-2.5">
                        <button type="button" onClick={() => toggle(r.id)} className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600" aria-label={p(r.title)} aria-pressed={isDone}>
                          {isDone ? <CheckSquare className="size-[18px] text-emerald-500" /> : <Square className="size-[18px]" />}
                        </button>
                        <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left" aria-expanded={isOpen}>
                          <span className="min-w-0">
                            <span className={cx('block text-[13px] font-semibold leading-snug', isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>{p(r.title)}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1">
                              <Badge tone={r.mandatory ? 'red' : 'slate'}>{r.mandatory ? t('mandatory') : t('optional')}</Badge>
                              <Badge>{REQ_CATEGORY_LABEL[r.category][lang]}</Badge>
                              {r.reviewed && <LevelBadge level="verified" title={`${r.reviewed.source} · ${r.reviewed.verifiedBy} · ${r.reviewed.verifiedAt}`} />}
                              {r.leadDays ? (
                                <Badge tone="amber">
                                  <Clock className="size-3" />
                                  {r.leadDays}
                                  {t('days')}
                                </Badge>
                              ) : null}
                            </span>
                          </span>
                          <ChevronDown className={cx('mt-0.5 size-4 shrink-0 text-slate-400 transition', isOpen && 'rotate-180')} />
                        </button>
                      </div>
                      {/* Detailed guide (always expanded in print) */}
                      <div className={cx('border-t border-slate-100 px-3 pb-3 pt-2 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300', isOpen ? 'block' : 'hidden print:block')}>
                        <p className="mb-1 font-bold text-slate-500">{t('detailGuide')}</p>
                        <p>{p(r.detail)}</p>
                        <a href={r.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-400">
                          {r.agency} · {t('officialSite')} <ExternalLink className="size-3" />
                        </a>
                        {r.linkCheck && (
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            {t('linkHealth')}:{' '}
                            {r.linkCheck.state === 'ok' ? t('linkOk') : r.linkCheck.state === 'protected' ? t('linkProtected') : r.linkCheck.state === 'unreachable' ? t('linkUnreachable') : t('linkBroken')} ·{' '}
                            {r.linkCheck.checkedAt.slice(0, 10)}
                          </p>
                        )}
                        {r.reviewed && (
                          <p className="mt-1 text-[10.5px] font-semibold text-violet-700 dark:text-violet-300">
                            {t('reviewedBy')}: {r.reviewed.source} · {r.reviewed.verifiedBy} · {r.reviewed.verifiedAt}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <SourceTag meta={product.requirementMeta} className="mt-4" />
    </div>
  );
}
