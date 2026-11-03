'use client';

import { AlertTriangle, BadgeCheck, BrainCircuit, CheckCircle2, ExternalLink, ListChecks, ShieldCheck, Target } from 'lucide-react';
import { AGENCY_LINKS } from '@/data/kr-ph-trade-db';
import { formatUsd } from '@/lib/format';
import { DIRECTION_LABEL } from '@/lib/engine/simulate';
import type { AnalysisReport, TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, Card, cx, ModuleHeader, ProgressBar } from '../ui';

export default function BriefingModule({ report, product, onOpenTrust }: { report: AnalysisReport; product: TradeProduct; onOpenTrust: () => void }) {
  const { t, p, lang } = useI18n();
  const briefing = report.briefing[lang];
  // The LLM writes only the requested language; the other language is simulation output.
  const llm = report.engine.mode === 'llm' && (report.engine.llmLang ?? lang) === lang;
  const focusLabel: Record<string, string> = {
    tariff: t('navTariff'),
    regulation: t('checklistTitle'),
    partners: t('navPartners'),
    logistics: t('logistics'),
    market: t('navMarket'),
  };

  return (
    <Card id="m-brief" className="rise-in scroll-mt-36">
      <ModuleHeader
        index={1}
        title={t('m1Title')}
        icon={<BrainCircuit className="size-5" />}
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            {product.verification && (
              <button
                type="button"
                onClick={onOpenTrust}
                className="no-print inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                title={t('openTrust')}
              >
                <ShieldCheck className="size-3" />
                {t('trustScore')} {product.verification.score}
              </button>
            )}
            <Badge tone={llm ? 'green' : 'brand'} title={report.engine.fallbackReason ? `fallback: ${report.engine.fallbackReason}` : undefined}>
              {llm ? `${t('engineLlm')} · ${report.engine.model}` : t('engineSim')}
            </Badge>
            <Badge>{report.engine.latencyMs} ms</Badge>
          </div>
        }
      />
      <div className="grid gap-5 p-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {(report.match.directionAdjusted || report.match.confidence === 'low') && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {report.match.directionAdjusted ? t('directionNotice') : t('lowMatchNotice')}
            </p>
          )}
          <div>
            <p className="text-xs font-bold text-brand-700 dark:text-brand-400">{DIRECTION_LABEL[product.direction][lang]}</p>
            <h3 className="mt-1 text-pretty text-lg font-extrabold leading-snug text-slate-900 sm:text-xl dark:text-white">{briefing.headline}</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">{briefing.summary}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/[0.07] dark:bg-slate-800/40">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Target className="size-3.5" />
              {t('intent')}
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {report.intent.focus.map((f) => (
                <Badge key={f} tone="violet">
                  {focusLabel[f] ?? f}
                </Badge>
              ))}
              {report.intent.amountUsd !== undefined && <Badge tone="green">{t('amount')}: {formatUsd(report.intent.amountUsd)}</Badge>}
              {report.intent.region && <Badge tone="amber">{t('region')}: {report.intent.region}</Badge>}
              {report.intent.incoterm && <Badge>{report.intent.incoterm}</Badge>}
              {report.intent.matchedTerms.slice(0, 4).map((m) => (
                <Badge key={m}>#{m}</Badge>
              ))}
              <Badge tone={report.match.confidence === 'high' ? 'green' : report.match.confidence === 'medium' ? 'brand' : 'amber'}>
                {t('confidence')}: {report.match.confidence === 'high' ? t('confHigh') : report.match.confidence === 'medium' ? t('confMid') : t('confLow')}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {t('keyPoints')}
              </p>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {briefing.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <ListChecks className="size-4 text-brand-500" />
                {t('nextActions')}
              </p>
              <ol className="space-y-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {briefing.nextActions.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">{i + 1}</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('hsTop3')}</p>
          <ol className="space-y-2.5">
            {product.hs.map((h, i) => {
              const conf = h.fit >= 85 ? 'high' : h.fit >= 65 ? 'mid' : 'low';
              return (
                <li
                  key={h.code}
                  className={cx(
                    'rounded-xl border p-3',
                    i === 0 ? 'border-brand-500/60 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/5' : 'border-slate-200 dark:border-white/[0.07]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-md bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">{i + 1}</span>
                      <span className="font-mono text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{h.code}</span>
                    </span>
                    <Badge tone={conf === 'high' ? 'green' : conf === 'mid' ? 'brand' : 'amber'}>
                      {t('confidence')} {conf === 'high' ? t('confHigh') : conf === 'mid' ? t('confMid') : t('confLow')}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{p(h.desc)}</p>
                  {h.ahtn && <p className="text-[11px] text-slate-400">PH AHTN {h.ahtn}</p>}
                  {(() => {
                    const hs6 = h.code.replace(/\./g, '').slice(0, 6);
                    const v = product.verification;
                    const off = v?.mfnCheck && v.mfnCheck.hs6 === hs6 ? v.mfnCheck : v?.altMfn?.[hs6];
                    return off ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {t('officialMfnAlt')} {off.min === off.max ? `${off.min}%` : `${off.min}–${off.max}%`} · WITS {off.year} · {t('lines').replace('{n}', String(off.lines))}
                      </p>
                    ) : null;
                  })()}
                  {h.ruling && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                      <BadgeCheck className="size-3" />
                      {h.ruling.text} · {h.ruling.verifiedAt}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={h.fit} tone={conf === 'high' ? 'green' : conf === 'mid' ? 'brand' : 'amber'} />
                    <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t('fit')} {h.fit}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{p(h.rationale)}</p>
                </li>
              );
            })}
          </ol>
          <a
            href={AGENCY_LINKS.unipass}
            target="_blank"
            rel="noreferrer"
            className="no-print mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            {t('verifyUnipass')} <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </Card>
  );
}
