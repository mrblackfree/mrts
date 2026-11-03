'use client';

import { BadgePercent, Calculator, CheckCircle2, ExternalLink, Info, Sparkles, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AGENCY_LINKS } from '@/data/kr-ph-trade-db';
import { OFFICIAL } from '@/data/official';
import { formatUsd } from '@/lib/format';
import { computeDuties, importVat, SCHEME_LABEL } from '@/lib/engine/simulate';
import type { Bilingual, FtaScheme, MfnCheck, PrefCheck, TariffRate, TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, Card, cx, LevelBadge, ModuleHeader, SourceTag } from '../ui';
import ChecklistPanel from './ChecklistPanel';

type Tone = 'ok' | 'warn' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
  info: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
};

/** One official cross-check (MFN or preferential) — shared layout, tone by status. */
function VerificationNotice({ tone, title, status, detail, url }: { tone: Tone; title: string; status: string; detail: string; url: string }) {
  const Icon = tone === 'warn' ? TriangleAlert : tone === 'info' ? Info : CheckCircle2;
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl border p-3 text-xs', TONE_CLASS[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">
          {title} · {status}
        </p>
        <p className="mt-0.5 leading-relaxed">{detail}</p>
        <a href={url} target="_blank" rel="noreferrer" className="no-print mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
          WITS API <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

interface TariffTableView {
  key: string;
  label: Bilingual;
  tariffs: TariffRate[];
  bestFta: { scheme: FtaScheme; reason: Bilingual };
  mfnCheck?: MfnCheck;
  prefCheck?: PrefCheck;
}

const fmtHs6 = (hs6: string) => `${hs6.slice(0, 4)}.${hs6.slice(4)}`;
const fmtRange = (min: number, max: number) => (min === max ? `${min}%` : `${min}–${max}%`);

export default function TariffModule({ product, initialAmount }: { product: TradeProduct; initialAmount?: number }) {
  const { t, p, lang } = useI18n();
  const [amount, setAmount] = useState<number>(initialAmount ?? 50_000);

  // Primary HS table plus any HS-specific tables (e.g. flooring next to door locks); the module is keyed per
  // report, so the selection resets when the product changes.
  const tables = useMemo<TariffTableView[]>(() => {
    const primary = product.hs[0];
    const list: TariffTableView[] = [
      {
        key: primary.code,
        label: { ko: `${primary.desc.ko} (HS ${primary.code.slice(0, 7)})`, en: `${primary.desc.en} (HS ${primary.code.slice(0, 7)})` },
        tariffs: product.tariffs,
        bestFta: product.bestFta,
        mfnCheck: product.verification?.mfnCheck,
        prefCheck: product.verification?.prefCheck,
      },
    ];
    for (const [code, table] of Object.entries(product.tariffsByHs ?? {})) list.push({ key: code, ...table });
    return list;
  }, [product]);
  const [tableKey, setTableKey] = useState(tables[0].key);
  const table = tables.find((x) => x.key === tableKey) ?? tables[0];

  const duties = useMemo(() => computeDuties(product, amount || 0, table.tariffs), [product, amount, table]);
  const maxRate = Math.max(...table.tariffs.map((x) => x.rate), 1);
  const best = table.bestFta.scheme;
  const bestLine = duties.find((d) => d.scheme === best) ?? duties[0];
  const mfnLine = duties.find((d) => d.scheme === 'MFN') ?? duties[0];
  const officialFinder = product.direction === 'KR_TO_PH' ? AGENCY_LINKS.phTcPhkr : AGENCY_LINKS.ftaPortal;
  const { mfnCheck, prefCheck } = table;
  const fx = OFFICIAL.fx;
  const statusLabel = (s: MfnCheck['status'] | PrefCheck['status']) =>
    s === 'exact-match' ? t('mfnExact') : s === 'corrected' ? t('mfnCorrected') : s === 'within-range' ? t('mfnWithin') : s === 'info' ? t('prefInfoStatus') : t('mfnOut');
  const seedToApplied = (seed: number, applied: number) => t('seedToApplied').replace('{seed}', String(seed)).replace('{applied}', String(applied));

  return (
    <Card id="m-tariff" className="rise-in scroll-mt-28" >
      <ModuleHeader index={2} title={t('m2Title')} icon={<BadgePercent className="size-5" />} />
      <div className="grid gap-5 p-5 xl:grid-cols-5">
        <div className="min-w-0 space-y-5 xl:col-span-3">
          {tables.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('hsTables')}</p>
              <div role="group" aria-label={t('hsTables')} className="flex flex-wrap gap-1.5">
                {tables.map((x, i) => (
                  <button
                    key={x.key}
                    type="button"
                    aria-pressed={x.key === table.key}
                    onClick={() => setTableKey(x.key)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-left text-xs font-semibold transition',
                      x.key === table.key ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'border-slate-200 text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:text-slate-400',
                    )}
                  >
                    {i === 0 && <span className="mr-1 text-[10px] uppercase tracking-wide opacity-70">{t('hsPrimary')}</span>}
                    {p(x.label)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rate comparison bars */}
          <div>
            <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">{t('rateCompare')}</p>
            <ul className="space-y-3">
              {table.tariffs.map((rate) => {
                const isBest = rate.scheme === best;
                return (
                  <li key={rate.scheme} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[10.5rem_1fr_4rem]">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                        {SCHEME_LABEL[rate.scheme][lang]}
                        {isBest && (
                          <Badge tone="green" className="!px-1.5">
                            <Sparkles className="size-3" />
                            {t('recommended')}
                          </Badge>
                        )}
                      </span>
                      {rate.note && <span className="mt-0.5 hidden text-[10.5px] leading-tight text-slate-400 sm:block">{p(rate.note)}</span>}
                      <LevelBadge level={rate.level ?? 'seed'} className="mt-1 !px-1.5 !py-0 !text-[10px]" title={rate.verifiedNote} />
                    </span>
                    <span className="relative h-7 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800" title={rate.note ? p(rate.note) : undefined}>
                      <span
                        className={cx(
                          'absolute inset-y-0 left-0 rounded-lg transition-all duration-700',
                          rate.scheme === 'MFN' ? 'bg-slate-400 dark:bg-slate-600' : isBest ? 'bg-emerald-500' : 'bg-brand-400/80',
                        )}
                        style={{ width: `${rate.rate === 0 ? 1.5 : (rate.rate / maxRate) * 100}%` }}
                      />
                    </span>
                    <span className={cx('text-right text-sm font-extrabold tabular-nums', isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200')}>{rate.rate}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Official cross-checks for the selected HS table */}
          {mfnCheck && (
            <VerificationNotice
              tone={mfnCheck.status === 'out-of-range' ? 'warn' : 'ok'}
              title={t('mfnCheckTitle')}
              status={statusLabel(mfnCheck.status)}
              detail={[
                `HS ${fmtHs6(mfnCheck.hs6)} · ${mfnCheck.year} · MFN ${mfnCheck.min === mfnCheck.max ? `${mfnCheck.min}%` : `${mfnCheck.min}–${mfnCheck.max}% (avg ${mfnCheck.avg}%)`} · ${t('lines').replace('{n}', String(mfnCheck.lines))}`,
                mfnCheck.status === 'corrected' ? seedToApplied(mfnCheck.seedRate, mfnCheck.appliedRate) : '',
                mfnCheck.status === 'within-range' ? t('confirmUnipass') : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              url={mfnCheck.url}
            />
          )}

          {prefCheck && (
            <VerificationNotice
              tone={prefCheck.status === 'out-of-range' ? 'warn' : prefCheck.status === 'info' ? 'info' : 'ok'}
              title={t('prefCheckTitle')}
              status={statusLabel(prefCheck.status)}
              detail={[
                product.direction === 'KR_TO_PH' ? t('prefAppliedToKr') : t('prefAppliedToPh'),
                `${prefCheck.year} · HS ${fmtHs6(prefCheck.hs6)} · ${fmtRange(prefCheck.min, prefCheck.max)} (${t('lines').replace('{n}', String(prefCheck.lines))})`,
                prefCheck.status === 'corrected' && prefCheck.seedRate !== undefined ? seedToApplied(prefCheck.seedRate, prefCheck.min) : '',
                prefCheck.scheme === 'AKFTA' ? t('prefOnlyAkfta') : t('prefBestInfo'),
              ]
                .filter(Boolean)
                .join(' · ')}
              url={prefCheck.url}
            />
          )}

          {/* Calculator */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <Calculator className="size-4 text-brand-500" />
                  {t('calculator')}
                </span>
                <span className="text-xs text-slate-500">{t('customsValue')}</span>
                <span className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950">
                  <span className="text-sm font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1000}
                    value={Number.isFinite(amount) ? amount : 0}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                    className="h-10 w-40 bg-transparent px-2 text-base font-bold text-slate-900 outline-none dark:text-white"
                    aria-label={t('customsValue')}
                  />
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[10_000, 50_000, 100_000, 500_000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={cx(
                      'no-print rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                      amount === v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'border-slate-200 text-slate-500 hover:border-brand-500 dark:border-slate-700',
                    )}
                  >
                    {formatUsd(v, { compact: true })}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {SCHEME_LABEL[best][lang]} · {t('saving')}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-300">{formatUsd(bestLine.savingVsMfn)}</p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                {t('duty')} {formatUsd(mfnLine.duty)} → {formatUsd(bestLine.duty)} · {t('importVat')} {importVat(product.direction)}%
              </p>
              {product.direction === 'PH_TO_KR' &&
                (fx ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {t('krwDuty')}: ₩{Math.round(bestLine.savingVsMfn * fx.usdKrw).toLocaleString('ko-KR')} (USD 1 = ₩{fx.usdKrw.toLocaleString('ko-KR')}, {fx.appliedFrom})
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('krwHint')}</p>
                ))}
            </div>

            <div className="thin-scroll mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="py-2 font-semibold">FTA</th>
                    <th className="py-2 text-right font-semibold">{t('duty')}</th>
                    <th className="py-2 text-right font-semibold">{t('vat')}</th>
                    <th className="py-2 text-right font-semibold">{t('total')}</th>
                    <th className="py-2 text-right font-semibold">{t('saving')}</th>
                  </tr>
                </thead>
                <tbody>
                  {duties.map((d) => (
                    <tr key={d.scheme} className={cx('border-b border-slate-100 dark:border-slate-800/70', d.scheme === best && 'bg-emerald-50/60 font-semibold dark:bg-emerald-500/5')}>
                      <td className="py-2">
                        {SCHEME_LABEL[d.scheme][lang]} <span className="text-slate-400">({d.rate}%)</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatUsd(d.duty)}</td>
                      <td className="py-2 text-right tabular-nums">{formatUsd(d.vat)}</td>
                      <td className="py-2 text-right tabular-nums">{formatUsd(d.total)}</td>
                      <td className={cx('py-2 text-right tabular-nums', d.savingVsMfn > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                        {d.savingVsMfn > 0 ? `−${formatUsd(d.savingVsMfn)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rules of origin */}
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('roo')} · {t('certificate')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {table.tariffs
                .filter((r) => r.scheme !== 'MFN')
                .map((r) => (
                  <div key={r.scheme} className={cx('rounded-xl border p-3', r.scheme === best ? 'border-emerald-400/60 dark:border-emerald-500/40' : 'border-slate-200 dark:border-slate-800')}>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {SCHEME_LABEL[r.scheme][lang]} · {r.rate}%
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">{r.roo}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{p(r.certificate)}</p>
                  </div>
                ))}
            </div>
            <div className="mt-3 rounded-xl bg-brand-50 p-3 text-[13px] leading-relaxed text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
              <span className="font-bold">{t('bestReason')}: </span>
              {p(table.bestFta.reason)}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <SourceTag meta={product.tariffMeta} />
              <a href={officialFinder} target="_blank" rel="noreferrer" className="no-print text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
                {product.direction === 'KR_TO_PH' ? 'PH Tariff Finder (PH-KR FTA) ↗' : lang === 'ko' ? '관세청 FTA 포털 ↗' : 'KCS FTA portal ↗'}
              </a>
            </div>
          </div>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <ChecklistPanel product={product} />
        </div>
      </div>
    </Card>
  );
}
