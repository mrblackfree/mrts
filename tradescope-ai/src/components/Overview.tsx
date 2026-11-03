'use client';

import { ArrowRight, Globe2, Handshake, Scale } from 'lucide-react';
import { KR_PH_OVERVIEW, PRODUCTS } from '@/data/kr-ph-trade-db';
import { formatPct, formatUsd, trend, yoy } from '@/lib/format';
import { bestTariff, DIRECTION_LABEL, mfnTariff } from '@/lib/engine/simulate';
import { GroupedColumns } from './charts';
import { useI18n } from './I18nProvider';
import { Badge, Card, cx, SourceTag } from './ui';

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
        <div className="px-5 pt-5 sm:px-6">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{t('overviewTitle')}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('overviewSub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-5 pt-4 sm:px-6">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-gradient-to-b from-slate-50 to-white p-3.5 ring-1 ring-inset ring-slate-200/70 dark:from-white/[0.04] dark:to-white/[0.01] dark:ring-white/[0.07]">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="grid size-5 place-items-center rounded-md bg-white text-slate-500 shadow-hairline ring-1 ring-slate-200/70 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10 [&>svg]:size-3">{k.icon}</span>
                {k.label} · {ex[last].year}
              </p>
              <p className="mt-2 text-[22px] font-bold leading-none tracking-[-0.02em] text-slate-900 tabular-nums dark:text-white">{k.value}</p>
              {k.delta !== null && (
                <p
                  className={cx(
                    'mt-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    { up: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400', down: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400', flat: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' }[trend(k.delta)],
                  )}
                >
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
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200/60 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20">
            <Handshake className="mt-0.5 size-4 shrink-0" />
            {p(KR_PH_OVERVIEW.ftaInForce)}
          </p>
          <SourceTag meta={KR_PH_OVERVIEW.meta} className="mt-3" />
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <div className="flex items-end justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{t('catalogTitle')}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('catalogSub')}</p>
          </div>
          <Badge tone="brand">
            {t('itemsUnit').replace('{n}', String(PRODUCTS.length))} · {t('partnersUnit').replace('{n}', String(PRODUCTS.reduce((n, x) => n + x.partners.length, 0)))}
          </Badge>
        </div>
        <ul className="grid gap-2.5 p-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
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
                  className="group flex h-full w-full flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevated dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/15"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-xl ring-1 ring-inset ring-slate-200/70 dark:from-white/[0.06] dark:to-white/[0.02] dark:ring-white/10" aria-hidden>
                      {prod.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-snug text-slate-900 dark:text-white">{p(prod.name)}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{DIRECTION_LABEL[prod.direction][lang]}</p>
                    </div>
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-ink-900 group-hover:text-white dark:bg-white/[0.06] dark:group-hover:bg-white dark:group-hover:text-ink-900">
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>HS {prod.hs[0].code}</Badge>
                    <Badge tone="green">
                      {mfn.rate}% → {best.rate}%
                    </Badge>
                    <Badge tone={{ up: 'brand', down: 'red', flat: 'slate' }[trend(g)] as 'brand' | 'red' | 'slate'}>
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
