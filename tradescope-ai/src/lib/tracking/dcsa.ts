/**
 * DCSA Track & Trace (v2.2) events → TradeScope timeline. Carriers that publish the DCSA standard (Hapag-Lloyd,
 * CMA CGM group, …) share this mapper; only the URL and the key header differ.
 */
import { place } from './fetch';
import { statusOf, type Milestone, type TrackEvent, type TrackQuery, type TrackResult } from './types';

interface DcsaLocation {
  locationName?: string | null;
  UNLocationCode?: string | null;
}
export interface DcsaEvent {
  eventType?: 'SHIPMENT' | 'TRANSPORT' | 'EQUIPMENT' | string;
  eventDateTime?: string;
  eventCreatedDateTime?: string;
  eventClassifierCode?: 'ACT' | 'EST' | 'PLN' | 'REQ' | string;
  shipmentEventTypeCode?: string;
  transportEventTypeCode?: string;
  equipmentEventTypeCode?: string;
  emptyIndicatorCode?: 'EMPTY' | 'LADEN' | string;
  equipmentReference?: string;
  eventLocation?: DcsaLocation | null;
  transportCall?: {
    UNLocationCode?: string | null;
    location?: DcsaLocation | null;
    exportVoyageNumber?: string | null;
    importVoyageNumber?: string | null;
    carrierVoyageNumber?: string | null;
    vessel?: { vesselName?: string | null; vesselIMONumber?: string | null } | null;
  } | null;
}

const EQUIPMENT_TEXT: Record<string, string> = {
  LOAD: 'Loaded on vessel',
  DISC: 'Discharged from vessel',
  GTIN: 'Gate in',
  GTOT: 'Gate out',
  STUF: 'Container stuffed',
  STRP: 'Container stripped',
  PICK: 'Picked up',
  DROP: 'Dropped off',
  INSP: 'Inspected',
  RSEA: 'Resealed',
  RMVD: 'Removed',
};
const SHIPMENT_TEXT: Record<string, string> = {
  RECE: 'Booking received',
  CONF: 'Booking confirmed',
  ISSU: 'Transport document issued',
  APPR: 'Transport document approved',
  SURR: 'Transport document surrendered',
  REJE: 'Booking rejected',
  CANC: 'Booking cancelled',
};

/** `seenLoad`: a LOAD, departure, arrival or discharge came earlier, i.e. the container has started its voyage. */
function milestoneOf(e: DcsaEvent, seenLoad: boolean): Milestone | null {
  if (e.eventType === 'TRANSPORT') return e.transportEventTypeCode === 'DEPA' ? 'departed' : e.transportEventTypeCode === 'ARRI' ? 'arrived' : null;
  if (e.eventType === 'EQUIPMENT') {
    const empty = e.emptyIndicatorCode === 'EMPTY';
    switch (e.equipmentEventTypeCode) {
      case 'LOAD':
        return 'loaded';
      case 'DISC':
        return 'discharged';
      case 'GTIN':
        // an empty container coming back after the voyage is the return; a laden one entering is the export gate-in
        return empty && seenLoad ? 'empty-return' : empty ? 'other' : 'gate-in';
      case 'GTOT':
        // a laden gate-out before the voyage (e.g. depot to port) is not the delivery gate-out
        return empty && !seenLoad ? 'empty-out' : empty ? 'other' : seenLoad ? 'gate-out' : 'other';
      default:
        return 'other';
    }
  }
  if (e.eventType === 'SHIPMENT') return e.shipmentEventTypeCode === 'CONF' ? 'booked' : e.shipmentEventTypeCode ? 'other' : null;
  return null;
}

function describe(e: DcsaEvent): string {
  if (e.eventType === 'TRANSPORT') return e.transportEventTypeCode === 'DEPA' ? 'Vessel departure' : 'Vessel arrival';
  if (e.eventType === 'EQUIPMENT') {
    const base = EQUIPMENT_TEXT[e.equipmentEventTypeCode ?? ''] ?? e.equipmentEventTypeCode ?? 'Equipment event';
    return e.emptyIndicatorCode === 'EMPTY' ? `${base} (empty)` : base;
  }
  return SHIPMENT_TEXT[e.shipmentEventTypeCode ?? ''] ?? `Shipment ${e.shipmentEventTypeCode ?? 'event'}`;
}

function locationOf(e: DcsaEvent): string | undefined {
  const tc = e.transportCall;
  return place(e.eventLocation?.locationName ?? tc?.location?.locationName, e.eventLocation?.UNLocationCode ?? tc?.location?.UNLocationCode ?? tc?.UNLocationCode);
}

function vesselOf(e: DcsaEvent): string | undefined {
  const tc = e.transportCall;
  const name = tc?.vessel?.vesselName?.trim();
  if (!name) return undefined;
  const voyage = tc?.carrierVoyageNumber ?? tc?.exportVoyageNumber ?? tc?.importVoyageNumber;
  return voyage ? `${name} / ${voyage}` : name;
}

/** Normalised result from a list of DCSA events; null when nothing usable came back. */
export function fromDcsa(provider: string, q: TrackQuery, carrier: string | undefined, raw: DcsaEvent[]): TrackResult | null {
  const valid = raw.filter((e) => e && typeof e.eventDateTime === 'string' && !Number.isNaN(Date.parse(e.eventDateTime)));
  // shipping order: by event time; ties keep the source order
  valid.sort((a, b) => Date.parse(a.eventDateTime!) - Date.parse(b.eventDateTime!));
  let seenLoad = false;
  const mapped: Array<TrackEvent & { created: number }> = [];
  for (const e of valid) {
    const m = milestoneOf(e, seenLoad);
    if (!m) continue;
    // any voyage event counts, so a feed without LOAD still classifies the final gate-out
    if (m === 'loaded' || m === 'departed' || m === 'arrived' || m === 'discharged') seenLoad = true;
    mapped.push({
      milestone: m,
      description: describe(e),
      at: new Date(e.eventDateTime!).toISOString(),
      actual: e.eventClassifierCode === 'ACT',
      location: locationOf(e),
      vessel: vesselOf(e),
      created: Date.parse(e.eventCreatedDateTime ?? '') || 0,
    });
  }
  if (!mapped.length) return null;

  // an estimate is superseded by the actual event, and by a newer estimate, for the same milestone and place;
  // without a place there is nothing to match on, so such events are kept apart by their time
  const key = (e: TrackEvent) => `${e.milestone}|${e.location ?? `@${e.at}`}|${e.description}`;
  const actualKeys = new Set(mapped.filter((e) => e.actual).map(key));
  const latestEstimate = new Map<string, number>();
  for (const e of mapped) if (!e.actual) latestEstimate.set(key(e), Math.max(latestEstimate.get(key(e)) ?? 0, e.created));
  const kept = mapped.filter((e) => e.actual || (!actualKeys.has(key(e)) && e.created === latestEstimate.get(key(e))));
  // several estimates created at once (or without a creation time): keep only the last of each
  const events: TrackEvent[] = [];
  const seenEst = new Set<string>();
  for (let i = kept.length - 1; i >= 0; i--) {
    const e = kept[i];
    if (!e.actual) {
      if (seenEst.has(key(e))) continue;
      seenEst.add(key(e));
    }
    const { created: _created, ...rest } = e;
    events.unshift(rest);
  }

  const pol = events.find((e) => e.milestone === 'loaded')?.location ?? events.find((e) => e.milestone === 'departed')?.location;
  const pod = [...events].reverse().find((e) => e.milestone === 'discharged')?.location ?? [...events].reverse().find((e) => e.milestone === 'arrived')?.location;
  if (pol && pod && pol !== pod) {
    for (const e of events) {
      if (['arrived', 'departed', 'loaded', 'discharged'].includes(e.milestone) && e.location && e.location !== pol && e.location !== pod) {
        e.description = `${e.description} (transshipment)`;
        e.milestone = 'transshipment';
      }
    }
  }
  const arrival = [...events].reverse().find((e) => e.milestone === 'arrived' && (!pod || e.location === pod));
  const vessel = [...events].reverse().find((e) => e.actual && e.vessel)?.vessel ?? events.find((e) => e.vessel)?.vessel;
  return {
    provider,
    reference: q.reference,
    kind: q.kind,
    carrier,
    status: statusOf(events),
    eta: arrival?.at,
    vessel,
    pol,
    pod,
    events,
    fetchedAt: new Date().toISOString(),
  };
}

/** DCSA query parameter for each reference kind. */
export const dcsaParam = (q: TrackQuery) =>
  q.kind === 'container' ? 'equipmentReference' : q.kind === 'bl' ? 'transportDocumentReference' : 'carrierBookingReference';
