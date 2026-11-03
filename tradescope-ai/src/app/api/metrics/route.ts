import { NextResponse } from 'next/server';
import { readJsonLimited } from '@/lib/http';
import { eventKeys, parseChannel, parseClientEvent } from '@/lib/metrics/events';
import { countMetrics } from '@/lib/metrics/store';
import { clientKey, windowLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// generous for real browsing, small enough that one client cannot skew the totals much
const allow = windowLimiter({ perClient: 300, overall: 30_000, windowMs: 60 * 60 * 1000 });

/** Body: `{ events: [{ e, … }] (≤10), ch? }`. Unknown events are dropped; the answer is always 204. */
export async function POST(req: Request) {
  const parsed = await readJsonLimited(req, 2_000);
  if (!parsed.ok) return new NextResponse(null, { status: parsed.error === 'too-large' ? 413 : 400 });
  if (!allow(clientKey(req))) return new NextResponse(null, { status: 429 });
  const events = Array.isArray(parsed.body.events) ? parsed.body.events.slice(0, 10) : [];
  const channel = parseChannel(parsed.body.ch);
  const keys: string[] = [];
  for (const raw of events) {
    const ev = parseClientEvent(raw);
    if (ev) keys.push(...eventKeys(ev, channel));
  }
  countMetrics(keys);
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
