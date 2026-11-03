'use client';

import { ChevronDown, Clock, ExternalLink, History, KeyRound, Link2, Map as MapIcon, PenLine, RefreshCw, ShieldCheck, TriangleAlert, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import changelogJson from '@/data/official/changelog.json';
import { CATEGORY_LABEL, categoryBreakdown, OFFICIAL, type SourceStatus } from '@/data/official';
import { ROADMAP, type RoadmapStatus } from '@/data/official/roadmap';
import type { DictKey } from '@/lib/i18n';
import type { VerificationLevel } from '@/lib/types';
import { useI18n } from './I18nProvider';
import OverrideHelper from './OverrideHelper';
import { Badge, cx, LevelBadge, ProgressBar, ScoreRing } from './ui';

const CHANGELOG = (changelogJson as { entries: Array<{ date: string; productId: string; field: string; from: string; to: string; source: string }> }).entries;

export function overallTrustScore(): number {
  const scores = PRODUCTS.map((p) => p.verification?.score ?? 0);
  return Math.round(scores.reduce((s, x) => s + x, 0) / Math.max(1, scores.length));
}

const STATUS_KEY: Record<SourceStatus['status'], DictKey> = { ok: 'srcOk', partial: 'srcPartial', error: 'srcError', 'not-configured': 'srcNotConfigured' };
const STATUS_TONE: Record<SourceStatus['status'], 'green' | 'amber' | 'red' | 'slate'> = { ok: 'green', partial: 'amber', error: 'red', 'not-configured': 'slate' };
const RM_META: Record<RoadmapStatus, { key: DictKey; tone: 'green' | 'brand' | 'amber'; icon: React.ReactNode }> = {
  live: { key: 'rmLive', tone: 'green', icon: <Zap className="size-3" /> },
  key: { key: 'rmKey', tone: 'brand', icon: <KeyRound className="size-3" /> },
  manual: { key: 'rmManual', tone: 'amber', icon: <PenLine className="size-3" /> },
};
const LEVELS: VerificationLevel[] = ['official', 'verified', 'crosscheck', 'seed'];
/** which roadmap item closes the gap of each category */
const CATEGORY_ROADMAP: Record<string, string> = {
  stats: 'kcs-trade',
  market: 'comtrade',
  mfn: 'tariff-10',
  fta: 'tariff-10',
  roo: 'tariff-10',
  hs: 'hs-ruling',
  requirements: 'regulation',
  partners: 'partners',
  logistics: 'freight',
  pricing: 'freight',
};
const LEVEL_BAR: Record<VerificationLevel, string> = { official: 'bg-emerald-500', verified: 'bg-violet-500', crosscheck: 'bg-brand-400', seed: 'bg-amber-300 dark:bg-amber-500/60' };

export default function DataTrustCenter({ focusProductId, onClose }: { focusProductId?: string; onClose: () => void }) {
  const { t, p, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(focusProductId ?? null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overall = useMemo(overallTrustScore, []);
  const feedbackUrl = process.env.NEXT_PUBLIC_DATA_FEEDBACK_URL;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const src = OFFICIAL.sources;
  const sourceCards: Array<{ id: string; name: string; st?: SourceStatus; extra?: string }> = [
    { id: 'comtrade', name: 'UN Comtrade', st: src.comtrade, extra: src.comtrade?.endpoint },
    { id: 'wits', name: 'World Bank WITS', st: src.wits, extra: 'TRAINS · MFN · HS6' },
    { id: 'kcs', name: '관세청 (data.go.kr)', st: src.kcs, extra: src.kcs?.status === 'not-configured' ? 'DATA_GO_KR_SERVICE_KEY' : undefined },
    {
      id: 'links',
      name: t('linkHealth'),
      st: src.links,
      extra: src.links?.counts ? Object.entries(src.links.counts).map(([k, v]) => `${k} ${v}`).join(' · ') : undefined,
    },
    { id: 'overrides', name: t('overridesLabel'), st: src.overrides, extra: `${OFFICIAL.overrideCount} entries` },
  ];
  const conflicts = PRODUCTS.flatMap((prod) => (prod.verification?.items ?? []).filter((i) => i.conflict).map((i) => ({ prod, item: i })));

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6" role="dialog" aria-modal="true" aria-label={t('trustTitle')}>
      <button type="button" aria-label={t('close')} className="fixed inset-0 cursor-default" onClick={onClose} />
      <div className="rise-in relative w-full min-w-0 max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        {/* header */}
        <div className="flex items-start gap-4 border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800">
          <ScoreRing value={overall} size={72} label={t('trustScore')} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
              {t('trustTitle')}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900 sm:text-xl dark:text-white">{t('trustSub')}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('trustDefinition')}</p>
            <p className="mt-1 text-[11px] text-slate-400">{t('trustFormula')}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t('close')}>
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {/* sync status */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
              <RefreshCw className="size-4 text-brand-500" />
              {t('syncStatus')}
              <span className="ml-1 text-xs font-medium text-slate-400">
                · {t('lastSync')} {OFFICIAL.generatedAt ? new Date(OFFICIAL.generatedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : '—'}
              </span>
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {sourceCards.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.name}</span>
                    {c.st && <Badge tone={STATUS_TONE[c.st.status]} className="shrink-0 whitespace-nowrap">{t(STATUS_KEY[c.st.status])}</Badge>}
                  </div>
                  {c.extra && <p className="mt-1 break-words text-[11px] text-slate-500 dark:text-slate-400">{c.extra}</p>}
                  {c.st?.fetchedAt && (
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-400">
                      <Clock className="size-3" />
                      {c.st.fetchedAt.slice(0, 16).replace('T', ' ')} UTC
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* conflicts + changelog */}
          <section className="grid items-start gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <TriangleAlert className="size-4 text-amber-500" />
                {t('conflicts')}
              </h3>
              {conflicts.length === 0 ? (
                <p className="text-xs text-slate-500">{t('noConflicts')}</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {conflicts.map(({ prod, item }) => (
                    <li key={`${prod.id}-${item.key}`} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                      {prod.emoji} {p(prod.name)} · {p(item.label)} — {item.conflict && p(item.conflict)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <History className="size-4 text-violet-500" />
                {lang === 'ko' ? '공식 데이터 기반 보정 이력' : 'Corrections from official data'}
              </h3>
              <ul className="thin-scroll max-h-52 space-y-1.5 overflow-y-auto text-xs">
                {CHANGELOG.map((c, i) => {
                  const prod = PRODUCTS.find((x) => x.id === c.productId);
                  return (
                    <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {prod?.emoji} {prod ? p(prod.name) : c.productId} · {c.field}
                      </span>{' '}
                      <span className="tabular-nums">
                        {c.from} → <b className="text-emerald-700 dark:text-emerald-400">{c.to}</b>
                      </span>
                      <span className="block text-[10.5px] text-slate-400">
                        {c.date} · {c.source}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* per product */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('byProduct')}</h3>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {LEVELS.map((lv) => (
                <span key={lv} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <span className={cx('size-2.5 rounded-sm', LEVEL_BAR[lv])} />
                  <LevelBadge level={lv} />
                </span>
              ))}
            </div>
            <ul className="space-y-2">
              {PRODUCTS.map((prod) => {
                const v = prod.verification!;
                const total = LEVELS.reduce((s, l) => s + v.counts[l], 0);
                const isOpen = open === prod.id;
                return (
                  <li key={prod.id} className={cx('rounded-2xl border transition', isOpen ? 'border-brand-500/60' : 'border-slate-200 dark:border-slate-800')}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : prod.id)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={isOpen}>
                      <span className="text-xl" aria-hidden>
                        {prod.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{p(prod.name)}</span>
                        <span className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          {LEVELS.map((lv) => (
                            <span key={lv} className={LEVEL_BAR[lv]} style={{ width: `${(v.counts[lv] / total) * 100}%` }} title={`${lv}: ${v.counts[lv]}`} />
                          ))}
                        </span>
                      </span>
                      <span className="w-16 shrink-0 text-right text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{v.score}</span>
                      <ChevronDown className={cx('size-4 shrink-0 text-slate-400 transition', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-100 p-3 dark:border-slate-800">
                        {(() => {
                          const cats = categoryBreakdown(prod);
                          const gains = cats
                            .filter((c) => c.value < 1)
                            .map((c) => ({ ...c, gain: Math.round(((1 - c.value) / cats.length) * 100), rm: ROADMAP.find((r) => r.id === CATEGORY_ROADMAP[c.category]) }))
                            .sort((a, b) => b.gain - a.gain)
                            .slice(0, 3);
                          return gains.length ? (
                            <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-500/10">
                              <p className="mb-1.5 text-xs font-bold text-violet-800 dark:text-violet-200">{lang === 'ko' ? '점수를 올리는 다음 검증' : 'Next verifications to raise the score'}</p>
                              <ul className="space-y-1 text-[11.5px] text-violet-900 dark:text-violet-200">
                                {gains.map((g) => (
                                  <li key={g.category}>
                                    <b>+{g.gain}</b> · {p(CATEGORY_LABEL[g.category])} — {g.rm ? p(g.rm.title) : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null;
                        })()}
                        {categoryBreakdown(prod).map((cat) => (
                          <div key={cat.category}>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="w-32 shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">{p(CATEGORY_LABEL[cat.category])}</span>
                              <ProgressBar value={cat.value * 100} tone={cat.value >= 0.99 ? 'green' : cat.value > 0 ? 'brand' : 'amber'} />
                              <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-slate-500">{Math.round(cat.value * 100)}</span>
                            </div>
                            <ul className="ml-0 space-y-1 sm:ml-32 sm:pl-2">
                              {cat.items.map((it) => (
                                <li key={it.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                                  <LevelBadge level={it.level} />
                                  <span className="font-medium">{p(it.label)}</span>
                                  {it.detail && <span className="text-slate-400">· {p(it.detail)}</span>}
                                  {it.source && <span className="text-slate-400">· {it.source}</span>}
                                  {it.checkedAt && <span className="text-slate-400">· {it.checkedAt.slice(0, 10)}</span>}
                                  {it.conflict && <span className="text-amber-600 dark:text-amber-400">· {p(it.conflict)}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* roadmap */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
              <MapIcon className="size-4 text-brand-500" />
              {t('roadmapTitle')}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {ROADMAP.map((r) => {
                const meta = RM_META[r.status];
                return (
                  <div key={r.id} className="flex flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={meta.tone}>
                        {meta.icon}
                        {t(meta.key)}
                      </Badge>
                      {r.categories.map((c) => (
                        <Badge key={c}>{p(CATEGORY_LABEL[c])}</Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{p(r.title)}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p(r.now)}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {r.steps.map((s, i) => (
                        <li key={i}>{p(s)}</li>
                      ))}
                    </ol>
                    {r.env && <p className="mt-2 font-mono text-[11px] text-violet-600 dark:text-violet-300">env: {r.env}</p>}
                    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2">
                      {r.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
                          {l.label} <ExternalLink className="size-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* verified-value entry helper */}
          <section className="rounded-2xl border border-violet-200 p-4 dark:border-violet-500/30">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
              <PenLine className="size-4 text-violet-500" />
              {lang === 'ko' ? '검증값 입력 도우미 (관세사·담당자용)' : 'Verified-value entry helper (for brokers / reviewers)'}
            </h3>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ko'
                ? '공식 문서로 확인한 값을 입력하면 verified-overrides.json 형식의 항목이 생성됩니다. 커밋 후 배포되면 해당 항목이 "전문가 검증"으로 승격됩니다.'
                : 'Enter a value confirmed on an official document to generate a verified-overrides.json entry. Once committed and deployed, the datum is promoted to “expert-verified”.'}
            </p>
            <OverrideHelper defaultProductId={focusProductId} />
          </section>

          {feedbackUrl && (
            <a href={feedbackUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-brand-500 dark:border-slate-700 dark:text-slate-200">
              <Link2 className="size-3.5" />
              {t('reportIssue')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
