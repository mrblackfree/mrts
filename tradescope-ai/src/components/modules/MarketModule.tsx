'use client';

import { Anchor, Lightbulb, Mail, ShieldCheck, Ship, TrendingUp } from 'lucide-react';
import { formatNumber, formatPct, formatUsd, trend, yoy } from '@/lib/format';
import type { TradeProduct } from '@/lib/types';
import { freightRfq } from '@/lib/rfq';
import RfqLink from '../RfqLink';
import { OFFICIAL } from '@/data/official';
import { ShareBars, TrendColumns } from '../charts';
import { useI18n } from '../I18nProvider';
import { Card, cx, ModuleHeader, SourceTag } from '../ui';
import { Flag } from '../Flag';

const PORT_COUNTRY: Record<string, string> = { Busan: 'KR', Incheon: 'KR', Manila: 'PH', Cebu: 'PH', Davao: 'PH' };

/** Market statistics; `withLanes` also shows the container lanes (the journey shows them in the shipping step). */
export default function MarketModule({ product, withLanes = true }: { product: TradeProduct; withLanes?: boolean }) {
  const { t, p, lang } = useI18n();
  const m = product.market;
  const s = m.series;
  const last = s[s.length - 1];
  const growth = yoy(last.value, s[s.length - 2].value);
  const cagr = (Math.pow(last.value / s[0].value, 1 / (s.length - 1)) - 1) * 100;
  const highlighted = m.competitors.find((c) => c.highlight);

  const kpis = [
    { label: `${t('latest')} (${last.year})`, value: formatUsd(last.value, { compact: true }), sub: `${t('yoyLabel')} ${formatPct(growth, 1, true)}`, tone: trend(growth) },
    { label: `CAGR ${s[0].year}–${last.year}`, value: formatPct(cagr, 1, true), sub: `HS ${m.hsBasis}`, tone: 'flat' },
    { label: `${t('marketSize')} (${m.marketSize.year})`, value: formatUsd(m.marketSize.value, { compact: true }), sub: highlighted ? `${p(highlighted.country)} ${highlighted.share}%` : '', tone: 'flat' },
    ...(m.unitValue
      ? [{ label: `${lang === 'ko' ? '공식 통관 단가' : 'Official unit value'} (${m.unitValue.year} ${m.unitValue.basis})`, value: `$${m.unitValue.usdPerKg}/kg`, sub: `${(m.unitValue.netWgtKg / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} t · Comtrade`, tone: 'flat' }]
      : []),
    ...(m.latestMonthly
      ? [{ label: `${t('ytdMonthly')} ${m.latestMonthly.from.slice(0, 4)}.${m.latestMonthly.from.slice(4)}–${m.latestMonthly.to.slice(4)}`, value: formatUsd(m.latestMonthly.value, { compact: true }), sub: m.latestMonthly.source, tone: 'flat' }]
      : []),
  ];

  return (
    <Card id="m-market" className="rise-in scroll-mt-36">
      <ModuleHeader index={3} title={t('m3Title')} icon={<TrendingUp className="size-5" />} />
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="min-w-0">
          <div className={cx('grid gap-2', kpis.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
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
            {m.mirror && m.mirror.phReported > 0 && Math.abs(m.mirror.krReported / m.mirror.phReported - 1) >= 0.2 && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                ⓘ{' '}
                {t('mirrorGap')
                  .replace('{year}', String(m.mirror.year))
                  .replace('{kr}', formatUsd(m.mirror.krReported, { compact: true }))
                  .replace('{ph}', formatUsd(m.mirror.phReported, { compact: true }))
                  .replace('{ratio}', m.mirror.ratio.toFixed(1))}
              </p>
            )}
          </div>
          <SourceTag meta={m.meta} className="mt-3" />
        </div>
      </div>

      {withLanes && <LogisticsLanes product={product} />}
    </Card>
  );
}


/** Container lanes with indicative freight, transit time and frequency. */
export function LogisticsLanes({ product }: { product: TradeProduct }) {
  const { t, p, lang } = useI18n();
  return (
      <div className="border-t border-slate-100 p-5 dark:border-white/[0.07]">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Ship className="size-4 text-brand-500" />
          {t('logistics')}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {product.logistics.map((l, i) => (
            <div key={`${l.from}-${l.to}-${l.mode}-${i}`} className="rounded-xl border border-slate-200 p-3.5 dark:border-white/[0.07]">
              <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span>
                  {PORT_COUNTRY[l.from] && <Flag code={PORT_COUNTRY[l.from]} />} {l.from}
                </span>
                <span className="relative mx-1 h-px flex-1 bg-gradient-to-r from-slate-300 to-brand-500 dark:from-slate-600">
                  <Anchor className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-white p-0.5 text-brand-500 dark:bg-[#0c121d]" />
                </span>
                <span>
                  {l.to} {PORT_COUNTRY[l.to] && <Flag code={PORT_COUNTRY[l.to]} />}
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
                  {t('days').replace('{n}', `${l.transitDays[0]}–${l.transitDays[1]}`)}
                </dd>
                <dt className="text-slate-400">{t('frequency')}</dt>
                <dd className="text-right text-slate-600 dark:text-slate-300">{p(l.frequency)}</dd>
              </dl>
              {l.note && <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">{p(l.note)}</p>}
              {l.scheduleCheck && (
                <a href={l.scheduleCheck.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-sky-700 hover:underline dark:text-sky-300" title={l.scheduleCheck.source}>
                  <ShieldCheck className="size-3 shrink-0" aria-hidden />
                  {t('laneSchedule')}: {l.scheduleCheck.carrier.split(' (')[0]} {l.scheduleCheck.service.split(' (')[0]} {t('days').replace('{n}', String(l.scheduleCheck.transitDays))} · {t('laneScheduleNote')}
                </a>
              )}
              {!l.quote && (
                <RfqLink rfq={freightRfq(product, i, lang)} className="no-print mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  <Mail className="size-3 shrink-0" aria-hidden />
                  {t('rfqFreight')}
                </RfqLink>
              )}
            </div>
          ))}
        </div>
        {OFFICIAL.kcci?.routes.KSEI && (
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <a href={OFFICIAL.kcci.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              KCCI {lang === 'ko' ? '동남아 항로' : 'South East Asia'}
            </a>{' '}
            ${formatNumber(OFFICIAL.kcci.routes.KSEI.value)}/FEU · {OFFICIAL.kcci.date} ({lang === 'ko' ? '전주' : 'prev.'} ${formatNumber(OFFICIAL.kcci.routes.KSEI.prev)}) —{' '}
            {lang === 'ko'
              ? '한국해양진흥공사 주간 지수, 부산→호찌민·자카르타·싱가포르 기준이라 필리핀 노선의 참고값일 뿐 견적이 아닙니다'
              : 'KOBC weekly index for Busan → Ho Chi Minh, Jakarta, Singapore — a reference level for Philippine lanes, not a quote'}
          </p>
        )}
        <SourceTag meta={product.logisticsMeta} className="mt-3" />
      </div>
  );
}
