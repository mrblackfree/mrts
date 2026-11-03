/**
 * Tracking sources. Each is switched on by its key on /admin (or the environment) and tried in this order:
 *  1. the carrier's own DCSA API when the reference belongs to it (free with a developer key),
 *  2. ShipsGo for any carrier (paid, credits per new shipment),
 *  3. UNI-PASS for customs progress of cargo entering Korea (free).
 * A source answers null when it does not know the reference, so the next one is asked.
 */
import { getSetting } from '@/lib/settings';
import { dcsaParam, fromDcsa, type DcsaEvent } from './dcsa';
import { callApi, parseJson, TrackApiError, ttlCache } from './fetch';
import { trackShipsGo } from './shipsgo';
import type { TrackKind, TrackQuery, TrackResult } from './types';
import { trackUnipass } from './unipass';

export interface TrackProvider {
  name: string;
  modes: Array<'shipping' | 'customs'>;
  kinds: TrackKind[];
  enabled: () => boolean;
  /** whether this source can answer for the reference at all (e.g. the carrier's own API) */
  accepts?: (q: TrackQuery) => boolean;
  track: (q: TrackQuery) => Promise<TrackResult | null>;
}

/** Carrier groups whose DCSA API is wired up: SCACs and the container / B/L prefixes they own. */
const HAPAG = { scac: ['HLCU'], prefixes: ['HLCU', 'HLXU', 'HLBU', 'HAMU', 'UACU', 'UASU', 'CPSU'] };
const CMA = { scac: ['CMDU', 'APLU', 'ANNU'], prefixes: ['CMAU', 'CGMU', 'ECMU', 'APZU', 'APHU', 'APLU', 'CMDU', 'ANNU'] };

/** Whether a reference belongs to a carrier group: the user's choice wins, otherwise the 4-letter prefix. */
export function belongsTo(group: { scac: string[]; prefixes: string[] }, q: TrackQuery): boolean {
  if (q.carrier) return group.scac.includes(q.carrier);
  return group.prefixes.includes(q.reference.slice(0, 4));
}

const cache = ttlCache<TrackResult | null>(10 * 60 * 1000);
/** One cached call per provider and reference for 10 minutes (tracking data rarely moves faster). */
function cached(name: string, fn: (q: TrackQuery) => Promise<TrackResult | null>) {
  return async (q: TrackQuery) => {
    const key = `${name}|${q.kind}|${q.carrier ?? ''}|${q.reference}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const r = await fn(q);
    // a pending answer is not cached, so the next lookup can pick up the first events
    if (!r?.pending) cache.set(key, r);
    return r;
  };
}

async function dcsaEvents(source: string, url: string, headers: Record<string, string>): Promise<DcsaEvent[] | null> {
  const res = await callApi(source, url, { headers: { Accept: 'application/json', ...headers } });
  if (res.status === 404) return null;
  // CMA CGM pages with 206 Partial Content; the first page is enough for a timeline
  if (res.status !== 200 && res.status !== 206) throw new TrackApiError(source, res.status, res.status === 401 || res.status === 403 ? 'key rejected' : `HTTP ${res.status}`);
  const j = parseJson<unknown>(source, res.text);
  return Array.isArray(j) ? (j as DcsaEvent[]) : null;
}

const hapag: TrackProvider = {
  name: 'Hapag-Lloyd',
  modes: ['shipping'],
  kinds: ['container', 'bl', 'booking'],
  enabled: () => !!(getSetting('TRACK_HLAG_CLIENT_ID') && getSetting('TRACK_HLAG_CLIENT_SECRET')),
  accepts: (q) => belongsTo(HAPAG, q),
  track: cached('hlag', async (q) => {
    const url = `https://api.hlag.com/hlag/external/v2/events/?${new URLSearchParams({ [dcsaParam(q)]: q.reference }).toString()}`;
    const events = await dcsaEvents('Hapag-Lloyd', url, {
      'X-IBM-Client-Id': getSetting('TRACK_HLAG_CLIENT_ID') ?? '',
      'X-IBM-Client-Secret': getSetting('TRACK_HLAG_CLIENT_SECRET') ?? '',
    });
    return events ? fromDcsa('Hapag-Lloyd', q, 'Hapag-Lloyd', events) : null;
  }),
};

const cmaCgm: TrackProvider = {
  name: 'CMA CGM',
  modes: ['shipping'],
  kinds: ['container', 'bl', 'booking'],
  enabled: () => !!getSetting('TRACK_CMACGM_KEY'),
  accepts: (q) => belongsTo(CMA, q),
  track: cached('cma', async (q) => {
    const url = `https://apis.cma-cgm.net/operation/trackandtrace/v1/events?${new URLSearchParams({ [dcsaParam(q)]: q.reference }).toString()}`;
    const events = await dcsaEvents('CMA CGM', url, { KeyId: getSetting('TRACK_CMACGM_KEY') ?? '' });
    return events ? fromDcsa('CMA CGM', q, 'CMA CGM', events) : null;
  }),
};

const shipsGo: TrackProvider = {
  name: 'ShipsGo',
  modes: ['shipping'],
  kinds: ['container', 'bl', 'booking'],
  enabled: () => !!getSetting('TRACK_SHIPSGO_TOKEN'),
  track: cached('shipsgo', async (q) => {
    const limit = Number(getSetting('TRACK_SHIPSGO_DAILY_NEW') ?? '30');
    return trackShipsGo(getSetting('TRACK_SHIPSGO_TOKEN') ?? '', q, Number.isFinite(limit) && limit >= 0 ? limit : 30);
  }),
};

const unipass: TrackProvider = {
  name: 'UNI-PASS',
  modes: ['customs'],
  kinds: ['bl'],
  enabled: () => !!getSetting('UNIPASS_CARGO_KEY'),
  track: cached('unipass', (q) => trackUnipass(getSetting('UNIPASS_CARGO_KEY') ?? '', q)),
};

export const PROVIDERS: TrackProvider[] = [hapag, cmaCgm, shipsGo, unipass];
