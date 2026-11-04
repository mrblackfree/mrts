/**
 * Validation metrics: the events the site counts to test the business-model hypotheses (H3 request conversion,
 * H7 return visits after shipping, H8 tracking coverage, H9 channels). Shared by the browser and the server.
 *
 * Only aggregate counters are kept: no cookies, no user or device id, no IP, no free text. "First" events are
 * deduplicated in the browser (localStorage) per product, so counts are browser·product pairs, not people.
 */

export const STEP_IDS = ['product', 'tariff', 'permits', 'partners', 'contract', 'shipping', 'customs'] as const;
export type MetricStep = (typeof STEP_IDS)[number];

/** where an expert request was started */
export const EXPERT_SOURCES = ['checklist', 'card', 'unsupported', 'customs', 'landing'] as const;
export type ExpertSource = (typeof EXPERT_SOURCES)[number];

export const TRACK_KINDS = ['demo', 'live', 'pending', 'not-found', 'not-covered', 'failed'] as const;
export type TrackKindMetric = (typeof TRACK_KINDS)[number];

/** Events a browser may send. Server-side events (request submitted, tracking result) are counted by the routes. */
export type ClientEvent =
  | { e: 'visit' }
  | { e: 'report'; supported: boolean }
  | { e: 'step_first'; step: MetricStep }
  | { e: 'expert_open'; src: ExpertSource }
  | { e: 'track_recheck2' };

/** True when the request carries Do Not Track or Global Privacy Control: nothing is counted for it. */
export function optedOutHeaders(h: Headers): boolean {
  return h.get('sec-gpc') === '1' || h.get('dnt') === '1';
}

/** Events that are also counted per acquisition channel (H9). */
const CHANNEL_EVENTS = new Set(['visit', 'step_first:permits', 'expert_open', 'consult_submit']);

const includes = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/** A channel name from `?utm_source=` / `?ref=`: lower-case letters, digits, `-` and `_`, up to 32 characters. */
export function parseChannel(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(v) ? v : undefined;
}

export function parseClientEvent(raw: unknown): ClientEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  switch (r.e) {
    case 'visit':
      return { e: 'visit' };
    case 'report':
      return typeof r.supported === 'boolean' ? { e: 'report', supported: r.supported } : null;
    case 'step_first':
      return includes(STEP_IDS, r.step) ? { e: 'step_first', step: r.step } : null;
    case 'expert_open':
      return includes(EXPERT_SOURCES, r.src) ? { e: 'expert_open', src: r.src } : null;
    case 'track_recheck2':
      return { e: 'track_recheck2' };
    default:
      return null;
  }
}

/** Counter keys one event increments: the event, its dimension and, for funnel events, the channel. */
export function eventKeys(
  ev: ClientEvent | { e: 'consult_submit'; src?: ExpertSource; first?: boolean } | { e: 'track'; kind: TrackKindMetric; provider?: string },
  channel?: string,
): string[] {
  const keys: string[] = [];
  let base: string;
  switch (ev.e) {
    case 'report':
      base = `report:${ev.supported ? 'supported' : 'unsupported'}`;
      keys.push('report', base);
      break;
    case 'step_first':
      base = `step_first:${ev.step}`;
      keys.push(base);
      break;
    case 'expert_open':
      base = 'expert_open';
      keys.push(base, `expert_open:${ev.src}`);
      break;
    case 'consult_submit':
      base = 'consult_submit';
      keys.push(base);
      if (ev.src) keys.push(`consult_submit:${ev.src}`);
      // the first request this browser sent for this product from the permits step (H3 counts pairs, not requests)
      if (ev.first && (ev.src === 'checklist' || ev.src === 'card')) keys.push(`consult_first:${ev.src}`);
      break;
    case 'track':
      base = `track:${ev.kind}`;
      keys.push(base);
      if ((ev.kind === 'live' || ev.kind === 'pending') && ev.provider && /^[A-Za-z0-9 -]{1,24}$/.test(ev.provider)) keys.push(`track_provider:${ev.provider}`);
      break;
    default:
      base = ev.e;
      keys.push(base);
  }
  if (channel && CHANNEL_EVENTS.has(base)) keys.push(`ch:${channel}:${base}`);
  return keys;
}
