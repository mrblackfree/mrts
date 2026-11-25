'use client';

import { Anchor, CheckCircle2, Circle, Container, Info, MapPin, Radar, RefreshCw, Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { noteSavedLookup, seen, sendMetric } from '@/lib/metrics/client';
import { STATIC_PREVIEW } from '@/lib/preview';
import { demoTrack } from '@/lib/tracking/demo';
import { isContainerNumber, normaliseReference, type Milestone, type TrackKind, type TrackResult } from '@/lib/tracking/types';
import type { TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, Button, Card, cx, ModuleHeader } from '../ui';

const MILESTONE_LABEL: Record<Milestone, { ko: string; en: string }> = {
  booked: { ko: '부킹 확정', en: 'Booked' },
  'empty-out': { ko: '공컨테이너 반출', en: 'Empty out' },
  'gate-in': { ko: '터미널 반입', en: 'Gate in' },
  loaded: { ko: '선적', en: 'Loaded' },
  departed: { ko: '출항', en: 'Departed' },
  transshipment: { ko: '환적', en: 'Transshipment' },
  arrived: { ko: '입항', en: 'Arrived' },
  discharged: { ko: '양하', en: 'Discharged' },
  customs: { ko: '통관 진행', en: 'Customs' },
  'customs-cleared': { ko: '통관 완료', en: 'Customs cleared' },
  'gate-out': { ko: '반출', en: 'Gate out' },
  delivered: { ko: '인도 완료', en: 'Delivered' },
  'empty-return': { ko: '공컨테이너 반납', en: 'Empty returned' },
  other: { ko: '기타', en: 'Other' },
};

const L = {
  ko: {
    titleShip: '컨테이너 추적',
    titleCustoms: '수입화물 통관 진행 조회',
    subShip: '컨테이너 번호나 B/L 번호를 넣으면 선사·추적 API에서 진행 상황을 가져옵니다.',
    subCustoms: '한국으로 들어오는 화물은 관세청 화물통관 진행정보로 반입·신고·수리·반출 단계를 확인합니다.',
    kind: '번호 종류',
    container: '컨테이너 번호',
    bl: 'B/L 번호',
    booking: '부킹 번호',
    carrier: '선사 (선택)',
    auto: '자동',
    track: '조회',
    tracking: '조회 중…',
    placeholderContainer: '예: MSKU1234565',
    placeholderBl: '예: HDMUPUSA1234567',
    badNumber: '컨테이너 번호 형식(영문 4자리 + 숫자 7자리)과 체크 디지트를 확인해 주세요.',
    demo: '예시 데이터',
    demoNote: '추적 API가 연결되지 않아 예시 타임라인을 보여 드립니다. 운영자가 추적 API 키를 설정하면(관리자 페이지 또는 서버 환경변수) 실제 정보로 바뀝니다.',
    source: '출처',
    eta: '도착 예정',
    vessel: '선박',
    status: '현재 단계',
    planned: '예정',
    failed: '조회하지 못했습니다.',
    notFound: '해당 번호의 정보를 찾지 못했습니다. 번호와 선사를 확인해 주세요.',
    tried: '시도한 소스',
    notCovered: '연결된 추적 소스가 이 선사·번호를 다루지 않습니다. 선사를 직접 고르거나, 관리자에게 ShipsGo(전 선사) 키 등록을 요청하세요.',
    rateLimited: '조회가 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
    pending: '추적을 등록했습니다. 추적 서비스가 선사 데이터를 받아 오는 중이니 몇 분 뒤 「다시 조회」를 눌러 주세요.',
    refresh: '다시 조회',
    saved: '이 거래의 화물',
    route: '구간',
    customsStatus: '통관 진행 상태',
    containers: '컨테이너',
    placeholderCustoms: '예: MEDUAB123456 (M B/L·H B/L) 또는 화물관리번호',
    phCustomsNote:
      '필리핀 관세청(BOC)은 공개 화물 조회 API가 없습니다. 아래에서 마닐라·세부 양하와 반출까지 컨테이너를 추적하고, 수입신고·관세 납부·반출 승인은 파트너 관세사가 단계마다 알려 드립니다.',
    partial: '선사가 이력의 일부만 보내왔습니다. 가장 최근 단계가 빠져 있을 수 있으니 선사 홈페이지에서도 확인하세요.',
    related: '같은 B/L의 다른 화물',
    sourceLabel: { demo: '예시 데이터 (API 미연결)', 'UNI-PASS': '관세청 UNI-PASS', ShipsGo: 'ShipsGo', 'Hapag-Lloyd': 'Hapag-Lloyd 공식 API', 'CMA CGM': 'CMA CGM 공식 API' } as Record<string, string>,
  },
  en: {
    titleShip: 'Container tracking',
    titleCustoms: 'Import cargo clearance status',
    subShip: 'Enter a container or B/L number to pull progress from carrier and tracking APIs.',
    subCustoms: 'For cargo entering Korea, Korea Customs cargo-progress data shows arrival, declaration, acceptance and release.',
    kind: 'Number type',
    container: 'Container no.',
    bl: 'B/L no.',
    booking: 'Booking no.',
    carrier: 'Carrier (optional)',
    auto: 'Auto',
    track: 'Track',
    tracking: 'Tracking…',
    placeholderContainer: 'e.g. MSKU1234565',
    placeholderBl: 'e.g. HDMUPUSA1234567',
    badNumber: 'Check the container number format (4 letters + 7 digits) and its check digit.',
    demo: 'Example data',
    demoNote: 'No tracking API is connected, so an example timeline is shown. Live data appears once the operator sets a tracking API key (admin page or server environment variables).',
    source: 'Source',
    eta: 'ETA',
    vessel: 'Vessel',
    status: 'Current step',
    planned: 'planned',
    failed: 'Could not fetch tracking.',
    notFound: 'Nothing found for this number. Check the number and carrier.',
    tried: 'Sources tried',
    notCovered: 'None of the connected tracking sources covers this carrier or number. Choose the carrier, or ask the admin to add a ShipsGo (all carriers) token.',
    rateLimited: 'Too many lookups. Please try again shortly.',
    pending: 'Tracking registered. The tracking service is fetching the carrier data; press “Refresh” in a few minutes.',
    refresh: 'Refresh',
    saved: 'Cargo for this trade',
    route: 'Route',
    customsStatus: 'Clearance status',
    containers: 'Containers',
    placeholderCustoms: 'e.g. MEDUAB123456 (master / house B/L) or cargo control no.',
    phCustomsNote:
      'The Philippine Bureau of Customs has no public cargo-tracking API. Track the container below through discharge and gate-out in Manila or Cebu; your partner customs broker reports the entry, duty payment and release at each step.',
    partial: 'The carrier sent only part of the history. The latest steps may be missing — check the carrier website too.',
    related: 'Other cargo on this B/L',
    sourceLabel: { demo: 'Example data (no API connected)', 'UNI-PASS': 'Korea Customs UNI-PASS', ShipsGo: 'ShipsGo', 'Hapag-Lloyd': 'Hapag-Lloyd official API', 'CMA CGM': 'CMA CGM official API' } as Record<string, string>,
  },
} as const;

/** Carriers on Korea–Philippines lanes (SCAC). */
const CARRIERS = [
  { code: 'HDMU', name: 'HMM' },
  { code: 'SMLM', name: 'SM Line' },
  { code: 'KMTU', name: 'KMTC' },
  { code: 'SNKO', name: 'Sinokor' },
  { code: 'HASL', name: 'Heung-A' },
  { code: 'ONEY', name: 'ONE' },
  { code: 'EGLV', name: 'Evergreen' },
  { code: 'WHLC', name: 'Wan Hai' },
  { code: 'CMDU', name: 'CMA CGM' },
  { code: 'MAEU', name: 'Maersk' },
  { code: 'HLCU', name: 'Hapag-Lloyd' },
  { code: 'MSCU', name: 'MSC' },
];

const fmt = (iso: string, lang: 'ko' | 'en') => {
  try {
    return new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

type Saved = { reference: string; kind: TrackKind; carrier: string };
const savedKey = (productId: string, mode: string) => `ts-track:v1:${productId}:${mode}`;
/** fired when a panel saves a reference, so another panel on the same key (shipping and PH customs) shows it */
const SAVED_EVENT = 'ts-track-saved';
function readSaved(productId: string, mode: string): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(savedKey(productId, mode)) ?? 'null') as Partial<Saved> | null;
    if (!v || typeof v.reference !== 'string' || !/^[A-Z0-9]{4,40}$/.test(v.reference)) return null;
    const kind: TrackKind = v.kind === 'bl' || v.kind === 'booking' ? v.kind : 'container';
    return { reference: v.reference, kind, carrier: typeof v.carrier === 'string' && /^[A-Z]{0,4}$/.test(v.carrier) ? v.carrier : '' };
  } catch {
    return null;
  }
}

/**
 * Shipment tracking for one step of the journey. `customs` on an import into Korea uses Korea Customs (UNI-PASS);
 * for the Philippines, which publishes no cargo API, it tracks the container to gate-out and says the broker
 * reports the clearance.
 */
export default function TrackingPanel({ product, mode }: { product: TradeProduct; mode: 'shipping' | 'customs' }) {
  const { lang } = useI18n();
  const s = L[lang];
  const uid = useId();
  const customs = mode === 'customs' && product.direction === 'PH_TO_KR';
  const phCustoms = mode === 'customs' && !customs;
  const apiMode = customs ? 'customs' : 'shipping';
  const [kind, setKind] = useState<TrackKind>(customs ? 'bl' : 'container');
  const [reference, setReference] = useState('');
  const [carrier, setCarrier] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);
  const [state, setState] = useState<{ kind: 'idle' | 'loading' | 'done' | 'error'; result?: TrackResult; message?: string; tried?: string[] }>({ kind: 'idle' });
  const [formError, setFormError] = useState('');

  // the reference of this trade's cargo is remembered on this device, so the last steps can be re-checked later
  useEffect(() => {
    const v = readSaved(product.id, apiMode);
    setSaved(v);
    if (v) {
      setReference(v.reference);
      setKind(customs && v.kind !== 'bl' ? 'bl' : v.kind);
      setCarrier(v.carrier);
    }
  }, [product.id, apiMode, customs]);
  useEffect(() => {
    const key = savedKey(product.id, apiMode);
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: Saved }>).detail;
      if (detail?.key !== key) return;
      setSaved(detail.value);
      setReference(detail.value.reference);
      // the old timeline belongs to the previous number: show the new number's saved row instead
      setState({ kind: 'idle' });
      setKind(customs && detail.value.kind !== 'bl' ? 'bl' : detail.value.kind);
      setCarrier(detail.value.carrier);
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, [product.id, apiMode, customs]);

  /** `save: false` looks a number up without making it this trade's saved reference (related cargo). */
  const lookup = async (q: Saved, opts: { save?: boolean } = {}) => {
    const save = opts.save !== false;
    setState({ kind: 'loading' });
    if (STATIC_PREVIEW) {
      // no tracking sources without the server: the labelled example timeline, as when no key is configured
      if (save) {
        try {
          localStorage.setItem(savedKey(product.id, apiMode), JSON.stringify(q));
        } catch {
          /* private mode */
        }
        setSaved(q);
        window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { key: savedKey(product.id, apiMode), value: q } }));
      }
      return setState({ kind: 'done', result: demoTrack({ reference: q.reference, kind: q.kind, carrier: q.carrier || undefined }, product, apiMode), tried: [] });
    }
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: q.reference, kind: q.kind, carrier: q.carrier || undefined, productId: product.id, mode: apiMode }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok && j.result) {
        // validation metrics (H7): looking the saved number up again on a live source, an hour or more later, is a
        // re-check; the second one is reported once per trade (shipping and customs numbers together), and only
        // where this browser opened the shipping step, so the count stays inside its base
        if (save && !(j.result as TrackResult).demo && seen(`step:${product.id}:shipping`) && noteSavedLookup(product.id, saved?.reference !== q.reference)) sendMetric({ e: 'track_recheck2' });
        if (save) {
          try {
            localStorage.setItem(savedKey(product.id, apiMode), JSON.stringify(q));
          } catch {
            /* private mode */
          }
          setSaved(q);
          window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { key: savedKey(product.id, apiMode), value: q } }));
        }
        return setState({ kind: 'done', result: j.result as TrackResult, tried: j.tried });
      }
      const message = j?.error === 'not-found' ? s.notFound : j?.error === 'not-covered' ? s.notCovered : j?.error === 'rate-limited' ? s.rateLimited : s.failed;
      setState({ kind: 'error', message, tried: j?.tried });
    } catch {
      setState({ kind: 'error', message: s.failed });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = normaliseReference(reference);
    if (!ref) return;
    if (kind === 'container' && !isContainerNumber(ref)) return setFormError(s.badNumber);
    setFormError('');
    void lookup({ reference: ref, kind, carrier });
  };

  const r = state.result;
  const events = r ? [...r.events].sort((a, b) => a.at.localeCompare(b.at)) : [];
  const field = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white';

  return (
    <Card>
      <ModuleHeader index={0} title={customs ? s.titleCustoms : s.titleShip} icon={customs ? <Anchor className="size-5" /> : <Radar className="size-5" />} />
      <div className="space-y-4 p-5">
        {phCustoms ? (
          <p role="note" className="flex gap-2 break-keep rounded-xl bg-sky-50 px-3 py-2.5 text-[13px] leading-relaxed text-sky-900 dark:bg-sky-400/10 dark:text-sky-100">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {s.phCustomsNote}
          </p>
        ) : (
          <p className="break-keep text-sm text-slate-600 dark:text-slate-300">{customs ? s.subCustoms : s.subShip}</p>
        )}
        {saved && state.kind === 'idle' && (
          <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-white/[0.08]">
            <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
              {s.saved}: <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{saved.reference}</span>
            </p>
            <Button size="sm" variant="subtle" onClick={() => void lookup(saved)}>
              <RefreshCw className="size-3.5" aria-hidden />
              {s.refresh}
            </Button>
          </div>
        )}
        <form onSubmit={submit} className="no-print grid gap-2 sm:grid-cols-[auto_1fr_auto_auto]" noValidate>
          <label className="sr-only" htmlFor={`${uid}-kind`}>
            {s.kind}
          </label>
          <select id={`${uid}-kind`} value={kind} onChange={(e) => setKind(e.target.value as TrackKind)} className={field}>
            {!customs && <option value="container">{s.container}</option>}
            <option value="bl">{s.bl}</option>
            {!customs && <option value="booking">{s.booking}</option>}
          </select>
          <label className="sr-only" htmlFor={`${uid}-ref`}>
            {kind === 'container' ? s.container : kind === 'bl' ? s.bl : s.booking}
          </label>
          <input
            id={`${uid}-ref`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={customs ? s.placeholderCustoms : kind === 'container' ? s.placeholderContainer : s.placeholderBl}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            className={cx(field, 'min-w-0 font-mono uppercase')}
          />
          {!customs && (
            <>
              <label className="sr-only" htmlFor={`${uid}-carrier`}>
                {s.carrier}
              </label>
              <select id={`${uid}-carrier`} value={carrier} onChange={(e) => setCarrier(e.target.value)} className={field} aria-label={s.carrier}>
                <option value="">
                  {s.carrier}: {s.auto}
                </option>
                {CARRIERS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </>
          )}
          <Button type="submit" variant="primary" size="md" loading={state.kind === 'loading'} className={customs ? 'sm:col-start-4' : ''}>
            {state.kind !== 'loading' && <Search className="size-4" aria-hidden />}
            {state.kind === 'loading' ? s.tracking : s.track}
          </Button>
        </form>
        {formError && (
          <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        )}
        {state.kind === 'error' && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {state.message}
            {state.tried?.length ? ` · ${s.tried}: ${state.tried.join(', ')}` : ''}
          </p>
        )}

        {r && (
          <div className="space-y-3" aria-live="polite">
            {r.demo && (
              <p role="note" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <Badge tone="amber" className="mr-1.5">
                  {s.demo}
                </Badge>
                {s.demoNote}
              </p>
            )}
            {r.pending && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900 dark:bg-sky-400/10 dark:text-sky-100">
                <span className="min-w-0 break-keep">{s.pending}</span>
                <Button size="sm" variant="subtle" onClick={() => saved && void lookup(saved)} className="no-print">
                  <RefreshCw className="size-3.5" aria-hidden />
                  {s.refresh}
                </Button>
              </div>
            )}
            {r.partial && (
              <p role="note" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {s.partial}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[11px] text-slate-500">{s.status}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{r.status === 'unknown' ? '—' : MILESTONE_LABEL[r.status][lang]}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[11px] text-slate-500">{s.eta}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{r.eta ? fmt(r.eta, lang) : '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[11px] text-slate-500">{s.vessel}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">{r.vessel ?? '—'}</p>
              </div>
            </div>
            {(r.pol || r.pod || r.customsStatus || r.containers?.length || r.relatedRefs?.length) && (
              <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                {(r.pol || r.pod) && (
                  <div className="flex gap-1.5">
                    <dt className="text-slate-400">{s.route}</dt>
                    <dd className="min-w-0 font-semibold">
                      {r.pol ?? '—'} → {r.pod ?? '—'}
                    </dd>
                  </div>
                )}
                {r.customsStatus && (
                  <div className="flex gap-1.5">
                    <dt className="text-slate-400">{s.customsStatus}</dt>
                    <dd className="min-w-0 font-semibold">{r.customsStatus}</dd>
                  </div>
                )}
                {r.relatedRefs?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
                    <dt className="text-slate-400">{s.related}</dt>
                    {r.relatedRefs.map((ref) => (
                      <dd key={ref} className="m-0">
                        <button type="button" onClick={() => void lookup({ reference: ref, kind: 'bl', carrier: '' }, { save: false })} className="no-print rounded-md px-1.5 py-0.5 font-mono text-[11.5px] text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 dark:text-brand-300 dark:ring-brand-400/30">
                          {ref}
                        </button>
                      </dd>
                    ))}
                  </div>
                ) : null}
                {r.containers?.length ? (
                  <div className="flex gap-1.5 sm:col-span-2">
                    <dt className="text-slate-400">{s.containers}</dt>
                    <dd className="min-w-0 break-all font-mono">{r.containers.join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
            )}
            <ol className="relative space-y-0 pl-1">
              {events.map((ev, i) => (
                <li key={`${ev.milestone}-${ev.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < events.length - 1 && <span aria-hidden className={cx('absolute left-[9px] top-5 h-[calc(100%-12px)] w-px', ev.actual ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-slate-200 dark:bg-white/10')} />}
                  {ev.actual ? <CheckCircle2 className="relative mt-0.5 size-[19px] shrink-0 text-emerald-500" aria-hidden /> : <Circle className="relative mt-0.5 size-[19px] shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />}
                  <div className="min-w-0">
                    <p className={cx('text-[13.5px] font-semibold', ev.actual ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                      {MILESTONE_LABEL[ev.milestone][lang]}
                      {!ev.actual && <span className="ml-1.5 text-[11px] font-medium text-slate-400">({s.planned})</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="tabular-nums">{fmt(ev.at, lang)}</span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="size-3" aria-hidden />
                          {ev.location}
                        </span>
                      )}
                      {ev.vessel && (
                        <span className="inline-flex items-center gap-0.5">
                          <Container className="size-3" aria-hidden />
                          {ev.vessel}
                        </span>
                      )}
                    </p>
                    {ev.description && <p className="mt-0.5 text-[11.5px] text-slate-400">{ev.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-slate-400">
              {s.source}: {s.sourceLabel[r.provider] ?? r.provider} · {fmt(r.fetchedAt, lang)}
              {state.tried && state.tried.length > 1 ? ` · ${s.tried}: ${state.tried.join(' → ')}` : ''}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
