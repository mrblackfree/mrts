/**
 * Browser side of the validation metrics: sends aggregate events to /api/metrics with sendBeacon, batched per
 * tick. Nothing is sent when the browser asks not to be tracked (Do Not Track / Global Privacy Control).
 * "First" checks live in localStorage, the channel in sessionStorage — no identifiers leave the browser.
 * The static preview measures nothing and leaves no markers either: it may be served from the live site's origin,
 * where its markers would stop the real site from counting that browser's first visit or step.
 */
import { STATIC_PREVIEW } from '../preview';
import { parseChannel, type ClientEvent } from './events';

const ENDPOINT = '/api/metrics';
const CH_KEY = 'ts-m:channel';

function optedOut(): boolean {
  if (STATIC_PREVIEW || typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return nav.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
}

/** The acquisition channel of this visit: `?utm_source=` or `?ref=` on landing, kept for the tab session. */
export function currentChannel(): string | undefined {
  if (optedOut()) return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseChannel(params.get('utm_source') ?? params.get('ref'));
    if (fromUrl) {
      sessionStorage.setItem(CH_KEY, fromUrl);
      return fromUrl;
    }
    return parseChannel(sessionStorage.getItem(CH_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}

let queue: ClientEvent[] = [];
let scheduled = false;

function flush() {
  scheduled = false;
  const events = queue.splice(0, 10);
  if (!events.length) return;
  const body = JSON.stringify({ events, ch: currentChannel() });
  try {
    const sent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    if (!sent) void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* metrics must never break the page */
  }
  if (queue.length) schedule();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 0);
}

export function sendMetric(ev: ClientEvent): void {
  if (typeof window === 'undefined' || optedOut()) return;
  queue.push(ev);
  schedule();
}

/** True the first time `key` is seen in this browser (then false); false when storage is unavailable. */
export function firstTime(key: string): boolean {
  if (STATIC_PREVIEW) return false;
  try {
    const k = `ts-m:${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, '1');
    return true;
  } catch {
    return false;
  }
}

/** Whether `key` was marked in this browser (by `firstTime` or `mark`); null when storage is unavailable. */
export function seen(key: string): boolean | null {
  try {
    return localStorage.getItem(`ts-m:${key}`) !== null;
  } catch {
    return null;
  }
}

export function mark(key: string): void {
  if (STATIC_PREVIEW) return;
  try {
    localStorage.setItem(`ts-m:${key}`, '1');
  } catch {
    /* storage unavailable */
  }
}

/** Opted out of measurement (Do Not Track / Global Privacy Control). */
export const measurementOff = () => typeof navigator === 'undefined' || optedOut();

/** True once per tab session for `key`. */
export function oncePerSession(key: string): boolean {
  if (STATIC_PREVIEW) return false;
  try {
    const k = `ts-m:s:${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, '1');
    return true;
  } catch {
    return false;
  }
}

/** A lookup of the saved number counts as a re-check only this long after the last counted one (no refresh spam). */
export const RECHECK_GAP_MS = 60 * 60 * 1000;

/**
 * Notes a successful lookup of a trade's saved number (H7). `first` is the lookup that saved it and only starts the
 * clock; later lookups at least `RECHECK_GAP_MS` apart are re-checks. True exactly once per key, at the second
 * re-check, so the success count never exceeds the browsers that reached the step.
 */
export function noteSavedLookup(key: string, first: boolean, now = Date.now()): boolean {
  if (STATIC_PREVIEW) return false;
  try {
    const k = `ts-m:recheck:${key}`;
    const raw = JSON.parse(localStorage.getItem(k) ?? 'null') as { n?: unknown; last?: unknown; done?: unknown } | null;
    const cur = { n: Number(raw?.n) || 0, last: Number(raw?.last) || 0, done: raw?.done === true };
    if (cur.done) return false;
    if (first || !cur.last) {
      if (!cur.last) localStorage.setItem(k, JSON.stringify({ n: cur.n, last: now }));
      return false;
    }
    if (now - cur.last < RECHECK_GAP_MS) return false;
    const n = cur.n + 1;
    localStorage.setItem(k, JSON.stringify({ n, last: now, ...(n >= 2 ? { done: true } : {}) }));
    return n >= 2;
  } catch {
    return false;
  }
}
