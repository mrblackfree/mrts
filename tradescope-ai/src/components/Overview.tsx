'use client';

import { ArrowRight, Globe2, Handshake, Scale } from 'lucide-react';
import { KR_PH_OVERVIEW, PRODUCTS } from '@/data/kr-ph-trade-db';
import { formatPct, formatUsd, yoy } from '@/lib/format';
import { bestTariff, DIRECTION_LABEL, mfnTariff } from '@/lib/engine/simulate';
import { GroupedColumns } from './charts';
import { useI18n } from './I18nProvider';
import { Badge, Card, SourceTag } from './ui';

export default function Overview({ onPick }: { onPick: (productId: string) => void }) {
  const { t, p, lang } = useI18n();
  const ex = KR_PH_OVERVIEW.krExportsToPh;
  const im = KR_PH_OVERVIEW.krImportsFromPh;
  const last = ex.length - 1;
  const total = ex[last].value + im[last].value;
  const totalPrev = ex[last - 1].value + im[last - 1].value;
  const kpis = [
    { label: t('totalTrade'), value: formatUsd(total, { compact: true }), delta: yoy(total, totalPrev), icon: <Globe2 className="size-4" /> },
    { label: t('krExports'), value: formatUsd(ex[last].value, { compact: true }), delta: yoy(ex[last].value, ex[last - 1].value), icon: <ArrowRight className="size-4" /> },
    { label: t('krImports'), value: formatUsd(im[last].value, { compact: true }), delta: yoy(im[last].value, im[last - 1].value), icon: <ArrowRight className="size-4 rotate-180" /> },
    { label: t('surplus'), value: formatUsd(ex[last].value - im[last].value, { compact: true }), delta: null, icon: <Scale className="size-4" /> },
  ];

  return (
    <div className="rise-in grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <div className="px-5 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('overviewTitle')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('overviewSub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 px-5 pt-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {k.icon}
                {k.label} · {ex[last].year}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{k.value}</p>
              {k.delta !== null && (
                <p className={k.delta >= 0 ? 'text-xs font-bold text-emerald-600 dark:text-emerald-400' : 'text-xs font-bold text-rose-600 dark:text-rose-400'}>
                  {t('yoyLabel')} {formatPct(k.delta, 1, true)}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="px-3 pt-3">
          <GroupedColumns a={ex} b={im} labelA={t('krExports')} labelB={t('krImports')} />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 pb-2 text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[#cd2e3a]" />
            {t('krExports')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[#0038a8] dark:bg-[#3b82f6]" />
            {t('krImports')}
          </span>
        </div>
        <div className="px-5 pb-5">
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <Handshake className="mt-0.5 size-4 shrink-0" />
            {p(KR_PH_OVERVIEW.ftaInForce)}
          </p>
          <SourceTag meta={KR_PH_OVERVIEW.meta} className="mt-3" />
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <div className="flex items-end justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('catalogTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('catalogSub')}</p>
          </div>
          <Badge tone="brand">
            {PRODUCTS.length} {t('itemsUnit')} · {PRODUCTS.reduce((n, x) => n + x.partners.length, 0)} {t('partnersUnit')}
          </Badge>
        </div>
        <ul className="grid gap-2.5 p-5 sm:grid-cols-2">
          {PRODUCTS.map((prod) => {
            const best = bestTariff(prod);
            const mfn = mfnTariff(prod);
            const s = prod.market.series;
            const g = yoy(s[s.length - 1].value, s[s.length - 2].value);
            return (
              <li key={prod.id}>
                <button
                  type="button"
                  onClick={() => onPick(prod.id)}
                  className="group flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md dark:border-slate-700 dark:hover:border-brand-500"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800" aria-hidden>
                      {prod.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{p(prod.name)}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{DIRECTION_LABEL[prod.direction][lang]}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>HS {prod.hs[0].code}</Badge>
                    <Badge tone="green">
                      {mfn.rate}% → {best.rate}%
                    </Badge>
                    <Badge tone={g >= 0 ? 'brand' : 'red'}>
                      {t('yoyLabel')} {formatPct(g, 0, true)}
                    </Badge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
