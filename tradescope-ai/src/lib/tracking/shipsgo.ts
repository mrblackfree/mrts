/**
 * ShipsGo Ocean API v2 (paid aggregator, most carriers). A reference is registered once as a "shipment"
 * (one credit) and read back by its id; registering it again answers 409 with the existing id at no cost.
 */
import { callApi, parseJson, place, TrackApiError } from './fetch';
import { statusOf, type Milestone, type TrackEvent, type TrackQuery, type TrackResult } from './types';

const BASE = 'https://api.shipsgo.com/v2';
const SOURCE = 'ShipsGo';

interface SgLocation {
  code?: string | null;
  name?: string | null;
}
interface SgMovement {
  event?: string;
  status?: 'ACT' | 'EST' | string;
  location?: SgLocation | null;
  vessel?: { name?: string | null } | null;
  voyage?: string | null;
  timestamp?: string;
}
interface SgShipment {
  id?: number;
  status?: string;
  carrier?: { scac?: string | null; name?: string | null } | null;
  route?: {
    port_of_loading?: { location?: SgLocation | null } | null;
    port_of_discharge?: { location?: SgLocation | null; date_of_discharge?: string | null; date_of_discharge_predicted?: string | null } | null;
  } | null;
  containers?: Array<{ number?: string; movements?: SgMovement[] }>;
}

const EVENT: Record<string, { milestone: Milestone; text: string }> = {
  EMSH: { milestone: 'empty-out', text: 'Empty container released to shipper' },
  GTIN: { milestone: 'gate-in', text: 'Gate in at port of loading' },
  LOAD: { milestone: 'loaded', text: 'Loaded on vessel' },
  DEPA: { milestone: 'departed', text: 'Vessel departure' },
  ARRV: { milestone: 'arrived', text: 'Vessel arrival' },
  DISC: { milestone: 'discharged', text: 'Discharged from vessel' },
  GTOT: { milestone: 'gate-out', text: 'Gate out for delivery' },
  EMRT: { milestone: 'empty-return', text: 'Empty container returned' },
};

/** ShipsGo carrier field: a SCAC (or SG_ code); anything else is left for ShipsGo to detect. */
const carrierParam = (c?: string) => (c && /^[A-Z0-9]{4}$/.test(c) ? c : undefined);

// reference → shipment id, so a known shipment is read directly next time
const ids = new Map<string, number>();

// new registrations cost credits: cap them per UTC day (TRACK_SHIPSGO_DAILY_NEW)
let day = '';
let spent = 0;
function takeCredit(limit: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    spent = 0;
  }
  if (spent >= limit) return false;
  spent++;
  return true;
}
const refundCredit = () => {
  spent = Math.max(0, spent - 1);
};

async function register(token: string, q: TrackQuery, dailyNew: number): Promise<number | null> {
  if (!takeCredit(dailyNew)) throw new TrackApiError(SOURCE, 429, 'daily new-shipment limit reached');
  const body: Record<string, unknown> = { reference: `TradeScope ${q.reference}`.slice(0, 128), tags: ['TRADESCOPE'] };
  if (q.kind === 'container') body.container_number = q.reference;
  else body.booking_number = q.reference;
  const carrier = carrierParam(q.carrier);
  if (carrier) body.carrier = carrier;
  let res: { status: number; text: string };
  try {
    res = await callApi(SOURCE, `${BASE}/ocean/shipments`, {
      method: 'POST',
      headers: { 'X-Shipsgo-User-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    refundCredit();
    throw e;
  }
  if (res.status !== 200) refundCredit(); // 409 = already registered (no credit); errors cost nothing either
  if (res.status === 200 || res.status === 409) {
    const j = parseJson<{ shipment?: { id?: number } }>(SOURCE, res.text);
    return typeof j.shipment?.id === 'number' ? j.shipment.id : null;
  }
  if (res.status === 400 || res.status === 404 || res.status === 422) return null; // reference not accepted
  throw new TrackApiError(SOURCE, res.status, res.status === 402 ? 'not enough credits' : res.status === 401 ? 'token rejected' : `HTTP ${res.status}`);
}

async function read(token: string, id: number): Promise<SgShipment | null> {
  const res = await callApi(SOURCE, `${BASE}/ocean/shipments/${id}`, { headers: { 'X-Shipsgo-User-Token': token, Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (res.status !== 200) throw new TrackApiError(SOURCE, res.status, `HTTP ${res.status}`);
  return parseJson<{ shipment?: SgShipment }>(SOURCE, res.text).shipment ?? null;
}

export function fromShipsGo(q: TrackQuery, s: SgShipment): TrackResult {
  const containers = (s.containers ?? []).filter((c) => typeof c.number === 'string');
  const shown = (q.kind === 'container' && containers.find((c) => c.number === q.reference)) || containers[0];
  const events: TrackEvent[] = (shown?.movements ?? [])
    .filter((m) => typeof m.timestamp === 'string' && !Number.isNaN(Date.parse(m.timestamp)))
    .map((m) => {
      const known = EVENT[m.event ?? ''];
      const vessel = m.vessel?.name?.trim();
      return {
        milestone: known?.milestone ?? 'other',
        description: known?.text ?? m.event ?? 'Event',
        at: new Date(m.timestamp!).toISOString(),
        actual: m.status === 'ACT',
        location: place(m.location?.name, m.location?.code),
        vessel: vessel ? (m.voyage ? `${vessel} / ${m.voyage}` : vessel) : undefined,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  const pod = s.route?.port_of_discharge;
  const eta = pod?.date_of_discharge_predicted ?? pod?.date_of_discharge ?? undefined;
  return {
    provider: SOURCE,
    reference: q.reference,
    kind: q.kind,
    carrier: s.carrier?.name ?? s.carrier?.scac ?? q.carrier,
    status: statusOf(events),
    eta: eta && !Number.isNaN(Date.parse(eta)) ? new Date(eta).toISOString() : undefined,
    vessel: [...events].reverse().find((e) => e.actual && e.vessel)?.vessel ?? events.find((e) => e.vessel)?.vessel,
    pol: place(s.route?.port_of_loading?.location?.name, s.route?.port_of_loading?.location?.code),
    pod: place(pod?.location?.name, pod?.location?.code),
    events,
    containers: containers.length > 1 ? containers.map((c) => c.number!) : undefined,
    // just registered: ShipsGo is still asking the carrier
    pending: !events.length && s.status !== 'UNTRACKED',
    fetchedAt: new Date().toISOString(),
  };
}

export async function trackShipsGo(token: string, q: TrackQuery, dailyNew: number): Promise<TrackResult | null> {
  const key = `${q.kind}:${q.reference}`;
  let id = ids.get(key);
  if (id === undefined) {
    const got = await register(token, q, dailyNew);
    if (got === null) return null;
    id = got;
    if (ids.size > 5000) ids.clear();
    ids.set(key, id);
  }
  const s = await read(token, id);
  if (!s) {
    ids.delete(key);
    return null;
  }
  if (s.status === 'UNTRACKED' && !(s.containers ?? []).some((c) => c.movements?.length)) return null;
  return fromShipsGo(q, s);
}
