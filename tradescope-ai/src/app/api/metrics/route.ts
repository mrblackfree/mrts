import { NextResponse } from 'next/server';
import { readJsonLimited } from '@/lib/http';
import { eventKeys, optedOutHeaders, parseChannel, parseClientEvent } from '@/lib/metrics/events';
import { countMetrics } from '@/lib/metrics/store';
import { clientKey, windowLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// counted per accepted event, not per request: generous for real browsing, small enough that one client cannot
// skew the totals much (clients are only told apart behind a trusted proxy)
const allow = windowLimiter({ perClient: 300, overall: 30_000, windowMs: 60 * 60 * 1000 });
// events a page sends at most once; repeats inside one request are dropped
const ONCE = new Set(['visit', 'step_first', 'track_recheck2']);

/** Body: `{ events: [{ e, … }] (≤10), ch? }`. Unknown events are dropped; the answer is always 204. */
export async function POST(req: Request) {
  const parsed = await readJsonLimited(req, 2_000);
  if (!parsed.ok) return new NextResponse(null, { status: parsed.error === 'too-large' ? 413 : 400 });
  const done = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (optedOutHeaders(req.headers)) return done();
  const events = Array.isArray(parsed.body.events) ? parsed.body.events.slice(0, 10) : [];
  const channel = parseChannel(parsed.body.ch);
  const client = clientKey(req);
  const keys: string[] = [];
  const once = new Set<string>();
  let limited = false;
  for (const raw of events) {
    const ev = parseClientEvent(raw);
    if (!ev) continue;
    if (ONCE.has(ev.e)) {
      const id = JSON.stringify(ev);
      if (once.has(id)) continue;
      once.add(id);
    }
    if (!allow(client)) {
      limited = true;
      break;
    }
    keys.push(...eventKeys(ev, channel));
  }
  countMetrics(keys);
  return limited && !keys.length ? new NextResponse(null, { status: 429 }) : done();
}
