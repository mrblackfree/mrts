/** Sample timeline shown when no tracking source is configured — always labelled as an example in the UI. */
import type { TradeProduct } from '@/lib/types';
import { statusOf, type TrackEvent, type TrackQuery, type TrackResult } from './types';

const PORT_LOCODE: Record<string, string> = { Busan: 'KRPUS', Incheon: 'KRINC', Manila: 'PHMNL', Cebu: 'PHCEB', Davao: 'PHDVO' };

export function demoTrack(q: TrackQuery, product?: TradeProduct): TrackResult {
  const lane = product?.logistics[0];
  const from = lane?.from ?? 'Busan';
  const to = lane?.to ?? 'Manila';
  const transit = lane ? Math.round((lane.transitDays[0] + lane.transitDays[1]) / 2) : 5;
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const departed = now - Math.max(1, Math.floor(transit / 2)) * day;
  const iso = (t: number) => new Date(t).toISOString();
  const at = (offsetDays: number) => departed + offsetDays * day;
  const vessel = 'SAMPLE VESSEL / 2611S';
  const fromLoc = `${from} (${PORT_LOCODE[from] ?? ''})`;
  const toLoc = `${to} (${PORT_LOCODE[to] ?? ''})`;
  const plan: Array<Omit<TrackEvent, 'actual'>> = [
    { milestone: 'booked', description: 'Booking confirmed', at: iso(at(-6)), location: fromLoc },
    { milestone: 'empty-out', description: 'Empty container released to shipper', at: iso(at(-4)), location: fromLoc },
    { milestone: 'gate-in', description: 'Full container gate-in at terminal', at: iso(at(-2)), location: fromLoc },
    { milestone: 'loaded', description: 'Loaded on vessel', at: iso(at(-0.3)), location: fromLoc, vessel },
    { milestone: 'departed', description: 'Vessel departed', at: iso(at(0)), location: fromLoc, vessel },
    { milestone: 'arrived', description: 'Vessel arrived', at: iso(at(transit)), location: toLoc, vessel },
    { milestone: 'discharged', description: 'Discharged from vessel', at: iso(at(transit + 0.5)), location: toLoc },
    { milestone: 'customs-cleared', description: 'Import customs cleared', at: iso(at(transit + 2)), location: toLoc },
    { milestone: 'gate-out', description: 'Full container gate-out for delivery', at: iso(at(transit + 2.5)), location: toLoc },
  ];
  const events: TrackEvent[] = plan.map((e) => ({ ...e, actual: new Date(e.at).getTime() <= now }));
  return {
    provider: 'demo',
    reference: q.reference,
    kind: q.kind,
    carrier: q.carrier,
    status: statusOf(events),
    eta: iso(at(transit)),
    vessel,
    pol: fromLoc,
    pod: toLoc,
    events,
    demo: true,
    fetchedAt: new Date().toISOString(),
  };
}
