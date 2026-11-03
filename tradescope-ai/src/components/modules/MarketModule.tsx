'use client';

import { Anchor, Lightbulb, Ship, TrendingUp } from 'lucide-react';
import { formatNumber, formatPct, formatUsd, yoy } from '@/lib/format';
import type { TradeProduct } from '@/lib/types';
import { ShareBars, TrendColumns } from '../charts';
import { useI18n } from '../I18nProvider';
import { Card, cx, ModuleHeader, SourceTag } from '../ui';

const PORT_FLAG: Record<string, string> = { Busan: '🇰🇷', Incheon: '🇰🇷', Manila: '🇵🇭', Cebu: '🇵🇭', Davao: '🇵🇭' };

export default function MarketModule({ product }: { product: TradeProduct }) {
  const { t, p, lang } = useI18n();
  const m = product.market;
  const s = m.series;
  const last = s[s.length - 1];
  const growth = yoy(last.value, s[s.length - 2].value);
  const cagr = (Math.pow(last.value / s[0].value, 1 / (s.length - 1)) - 1) * 100;
  const highlighted = m.competitors.find((c) => c.highlight);

  const kpis = [
    { label: `${t('latest')} (${last.year})`, value: formatUsd(last.value, { compact: true }), sub: `${t('yoyLabel')} ${formatPct(growth, 1, true)}`, tone: growth >= 0 ? 'up' : 'down' },
    { label: `CAGR ${s[0].year}–${last.year}`, value: formatPct(cagr, 1, true), sub: `HS ${m.hsBasis}`, tone: 'flat' },
    { label: `${t('marketSize')} (${m.marketSize.year})`, value: formatUsd(m.marketSize.value, { compact: true }), sub: highlighted ? `${p(highlighted.country)} ${highlighted.share}%` : '', tone: 'flat' },
    ...(m.unitValue
      ? [{ label: `${lang === 'ko' ? '공식 통관 단가' : 'Official unit value'} (${m.unitValue.year} ${m.unitValue.basis})`, value: `$${m.unitValue.usdPerKg}/kg`, sub: `${(m.unitValue.netWgtKg / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} t · Comtrade`, tone: 'flat' }]
      : []),
    ...(m.latestMonthly
      ? [{ label: `${t('ytdKcs')} ${m.latestMonthly.from.slice(0, 4)}.${m.latestMonthly.from.slice(4)}–${m.latestMonthly.to.slice(4)}`, value: formatUsd(m.latestMonthly.value, { compact: true }), sub: 'KCS · data.go.kr', tone: 'flat' }]
      : []),
  ];

  return (
    <Card id="m-market" className="rise-in scroll-mt-28">
      <ModuleHeader index={3} title={t('m3Title')} icon={<TrendingUp className="size-5" />} />
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="min-w-0">
          <div className={cx('grid gap-2', kpis.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900 sm:text-xl dark:text-white">{k.value}</p>
                <p
                  className={cx(
                    'text-[11px] font-bold',
                    k.tone === 'up' && 'text-emerald-600 dark:text-emerald-400',
                    k.tone === 'down' && 'text-rose-600 dark:text-rose-400',
                    k.tone === 'flat' && 'text-slate-500',
                  )}
                >
                  {k.sub}
                </p>
              </div>
            ))}
          </div>
          <p className="mb-1 mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
            {t('trend3y')} · <span className="font-semibold text-slate-500">{p(m.seriesLabel)}</span>
          </p>
          <TrendColumns series={s} ariaLabel={p(m.seriesLabel)} />
          <p className="mt-1 text-[11px] text-slate-400">{p(m.marketSize.label)}: {formatUsd(m.marketSize.value)}</p>
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            {t('competitors')} · HS {m.hsBasis}
          </p>
          <ShareBars rows={m.competitors.map((c) => ({ ...c, name: p(c.country) }))} label={t('competitors')} />
          <div className="mt-4 rounded-xl bg-violet-50 p-3.5 text-[13px] leading-relaxed text-violet-900 dark:bg-violet-500/10 dark:text-violet-200">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
              <Lightbulb className="size-3.5" />
              {t('insight')}
              {m.insightYear && <span className="font-medium opacity-70">· {m.insightYear}</span>}
            </p>
            {p(m.insight)}
            {product.verification?.insightStale && <p className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">⚠ {t('insightStale')}</p>}
          </div>
          <SourceTag meta={m.meta} className="mt-3" />
        </div>
      </div>

      {/* Logistics lanes */}
      <div className="border-t border-slate-100 p-5 dark:border-slate-800">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Ship className="size-4 text-brand-500" />
          {t('logistics')}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {product.logistics.map((l, i) => (
            <div key={`${l.from}-${l.to}-${l.mode}-${i}`} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span>
                  {PORT_FLAG[l.from] ?? ''} {l.from}
                </span>
                <span className="relative mx-1 h-px flex-1 bg-gradient-to-r from-slate-300 to-brand-500 dark:from-slate-600">
                  <Anchor className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-white p-0.5 text-brand-500 dark:bg-slate-900" />
                </span>
                <span>
                  {l.to} {PORT_FLAG[l.to] ?? ''}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <dt className="text-slate-400">{t('mode')}</dt>
                <dd className="text-right font-semibold text-slate-700 dark:text-slate-200">{l.mode}</dd>
                <dt className="text-slate-400">{t('cost')}</dt>
                <dd className="text-right font-bold tabular-nums text-slate-900 dark:text-white">
                  ${formatNumber(l.cost[0])}–{formatNumber(l.cost[1])}
                  {l.mode === 'LCL' ? t('perCbm') : ''}
                </dd>
                <dt className="text-slate-400">{t('transit')}</dt>
                <dd className="text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {l.transitDays[0]}–{l.transitDays[1]} {t('days')}
                </dd>
                <dt className="text-slate-400">{t('frequency')}</dt>
                <dd className="text-right text-slate-600 dark:text-slate-300">{p(l.frequency)}</dd>
              </dl>
              {l.note && <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">{p(l.note)}</p>}
            </div>
          ))}
        </div>
        <SourceTag meta={product.logisticsMeta} className="mt-3" />
      </div>
    </Card>
  );
}
