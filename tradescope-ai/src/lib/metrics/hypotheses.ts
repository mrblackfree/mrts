/**
 * Turning the counters into decisions for the hypotheses in docs/business-model-canvas.html. The thresholds are
 * the ones written on the canvas cards; a result is only called once the sample reaches the stated minimum.
 */
import type { Bilingual } from '@/lib/types';

export type Verdict = 'pass' | 'hold' | 'stop' | 'insufficient';

/** 95% Wilson score interval for k successes out of n (as fractions). */
export function wilson(k: number, n: number, z = 1.96): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 1 };
  const p = Math.min(Math.max(k, 0), n) / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** Sample needed to estimate a proportion near `p` within ± `margin` at 95%. */
export const sampleFor = (p: number, margin: number) => Math.ceil((1.96 * 1.96 * p * (1 - p)) / (margin * margin));

export interface RateCheck {
  id: string;
  title: Bilingual;
  /** what is counted, in words */
  measure: Bilingual;
  success: number;
  base: number;
  rate: number | null;
  ci: { low: number; high: number } | null;
  minBase: number;
  pass: number;
  stop: number;
  verdict: Verdict;
  /** why the verdict, in words */
  note: Bilingual;
  /** a second pass condition from the canvas card (H3: requesters who answer when contacted) */
  also?: AlsoCheck;
}

export interface AlsoCheck {
  label: Bilingual;
  success: number;
  base: number;
  /** pass needs at least this share … */
  target: number;
  /** … out of at least this many */
  minBase: number;
  /** null until `base` reaches `minBase` */
  met: boolean | null;
}

/** Requesters by what happened after contact, for the H3 response condition (the card asks about requesters). */
export interface RequestTally {
  /** requesters with at least one request the team acted on (contacted, in progress, done or closed) */
  handled: number;
  /** of those, requesters with a request in progress or done: they answered */
  responded: number;
}

/**
 * H3's response condition from the request records: permits-step requests (checklist, service cards) created on or
 * after `from`, grouped by requester (e-mail, case-insensitive), so a requester who sent several requests counts once.
 */
export function requestTally(rows: Array<{ createdAt: string; source?: string; status: string; email: string }>, from: string): RequestTally {
  const people = new Map<string, { handled: boolean; responded: boolean }>();
  for (const r of rows) {
    if (r.createdAt.slice(0, 10) < from || (r.source !== 'checklist' && r.source !== 'card')) continue;
    const key = r.email.trim().toLowerCase();
    const p = people.get(key) ?? { handled: false, responded: false };
    if (r.status !== 'new') p.handled = true;
    if (r.status === 'in-progress' || r.status === 'done') p.responded = true;
    people.set(key, p);
  }
  let handled = 0;
  let responded = 0;
  for (const p of people.values()) {
    if (p.handled) handled++;
    if (p.handled && p.responded) responded++;
  }
  return { handled, responded };
}

const b = (ko: string, en: string): Bilingual => ({ ko, en });
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** pass at ≥ `pass`, stop below `stop`, hold in between — only once `base` ≥ `minBase`. */
export function judgeRate(opts: { id: string; title: Bilingual; measure: Bilingual; success: number; base: number; minBase: number; pass: number; stop: number }): RateCheck {
  const { success, base, minBase, pass, stop } = opts;
  if (base < minBase) {
    return {
      ...opts,
      rate: base ? success / base : null,
      ci: base ? wilson(success, base) : null,
      verdict: 'insufficient',
      note: b(`표본 부족 — ${minBase}건 중 ${base}건 모임`, `Not enough data yet — ${base} of ${minBase}`),
    };
  }
  const rate = success / base;
  const ci = wilson(success, base);
  const verdict: Verdict = rate >= pass ? 'pass' : rate < stop ? 'stop' : 'hold';
  const note =
    verdict === 'pass'
      ? b(`통과 기준 ${pct(pass)} 이상`, `At or above the ${pct(pass)} pass line`)
      : verdict === 'stop'
        ? b(`중단 기준 ${pct(stop)} 미만`, `Below the ${pct(stop)} stop line`)
        : b(`보류 — ${pct(stop)} 이상 ${pct(pass)} 미만: 표본을 늘리거나 한 가지만 바꿔 다시 측정`, `Hold — between ${pct(stop)} and ${pct(pass)}: grow the sample or change one thing and measure again`);
  return { ...opts, rate, ci, verdict, note };
}

/** A rate check that also needs `also` to pass: until it does, a pass becomes a hold. */
export function withAlso(check: RateCheck, also: Omit<AlsoCheck, 'met'>): RateCheck {
  const met = also.base < also.minBase ? null : also.success / also.base >= also.target;
  const full: AlsoCheck = { ...also, met };
  if (check.verdict !== 'pass' || met === true) return { ...check, also: full };
  return {
    ...check,
    also: full,
    verdict: 'hold',
    note:
      met === null
        ? b(`제출률은 통과 — 응답률(${pct(also.target)} 이상) 확인 전: 처리한 요청 ${also.base}/${also.minBase}건`, `Request rate passes — response rate (${pct(also.target)}+) not known yet: ${also.base} of ${also.minBase} handled requests`)
        : b(`제출률은 통과했지만 응답률이 ${pct(also.target)} 미만 — 요청의 질(연락처·의도)을 먼저 확인`, `Request rate passes but fewer than ${pct(also.target)} answer — check request quality (contact details, intent) first`),
  };
}

const n = (t: Record<string, number>, k: string) => t[k] ?? 0;

/** H3, H7 and H8 from the counter totals (same rules as the canvas). */
export function hypothesisChecks(t: Record<string, number>, requests?: RequestTally): RateCheck[] {
  // browser·product pairs that sent a request from the permits step (first request only), like the base
  const journeySubmits = n(t, 'consult_first:checklist') + n(t, 'consult_first:card');
  const liveOk = n(t, 'track:live') + n(t, 'track:pending');
  // not-covered (sources set up, none takes this number) is a coverage miss too; example data is left out
  const liveTried = liveOk + n(t, 'track:not-found') + n(t, 'track:failed') + n(t, 'track:not-covered');
  const h3 = judgeRate({
    id: 'H3',
    title: b('H3 인허가 단계에서 「맡기기」 요청을 남긴다', 'H3 Traders at the permits step send an expert request'),
    measure: b('인허가 단계를 연 브라우저·품목 가운데 그 단계(체크리스트·서비스 카드)에서 요청을 보낸 비율', 'Share of browser·product pairs that opened the permits step and sent a request from it (checklist, service cards)'),
    success: journeySubmits,
    base: n(t, 'step_first:permits'),
    minBase: 200,
    pass: 0.05,
    stop: 0.01,
  });
  return [
    withAlso(h3, {
      label: b('연락했을 때 응답한 요청자 (진행 중·완료 ÷ 연락한 요청자, 이메일 기준)', 'Requesters who answered when contacted (in progress or done ÷ contacted requesters, by e-mail)'),
      success: requests?.responded ?? 0,
      base: requests?.handled ?? 0,
      target: 0.7,
      minBase: 10,
    }),
    judgeRate({
      id: 'H7',
      title: b('H7 선적 후에도 돌아와 다시 조회한다', 'H7 Traders come back after shipping to track again'),
      measure: b('선적 단계를 연 브라우저·품목 가운데 실제 소스로 저장한 번호를 두 번 이상(1시간 이상 간격) 다시 조회한 비율', 'Share of browser·product pairs that opened the shipping step and re-checked their saved number on a live source twice (an hour or more apart)'),
      success: n(t, 'track_recheck2'),
      base: n(t, 'step_first:shipping'),
      minBase: 20,
      pass: 0.5,
      stop: 0.2,
    }),
    judgeRate({
      id: 'H8',
      title: b('H8 실제 추적 소스로 90% 이상 조회된다', 'H8 Live tracking sources answer 90% or more'),
      measure: b('실제 소스로 조회한 번호 중 결과(또는 등록 대기)를 받은 비율 — 미지원·실패도 분모에 포함, 예시 데이터는 제외', 'Share of live lookups that got a result (or a registered, pending one) — unsupported and failed lookups count against it, example data excluded'),
      success: liveOk,
      base: liveTried,
      minBase: 20,
      pass: 0.9,
      stop: 0.75,
    }),
  ];
}

export interface ChannelRow {
  channel: string;
  visits: number;
  permitsViews: number;
  expertOpens: number;
  requests: number;
}

/** H9: the funnel per acquisition channel (`?utm_source=` / `?ref=`), most requests first. */
export function channelRows(t: Record<string, number>): ChannelRow[] {
  const names = new Set<string>();
  for (const k of Object.keys(t)) {
    const m = /^ch:([a-z0-9_-]+):/.exec(k);
    if (m) names.add(m[1]);
  }
  return [...names]
    .map((c) => ({
      channel: c,
      visits: n(t, `ch:${c}:visit`),
      permitsViews: n(t, `ch:${c}:step_first:permits`),
      expertOpens: n(t, `ch:${c}:expert_open`),
      requests: n(t, `ch:${c}:consult_submit`),
    }))
    .sort((a, b2) => b2.requests - a.requests || b2.visits - a.visits);
}
