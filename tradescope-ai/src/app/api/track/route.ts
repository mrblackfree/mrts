import { NextResponse } from 'next/server';
import { getProduct } from '@/data/kr-ph-trade-db';
import { readJsonLimited } from '@/lib/http';
import { eventKeys } from '@/lib/metrics/events';
import { countMetrics } from '@/lib/metrics/store';
import { clientKey, windowLimiter } from '@/lib/rate-limit';
import { trackShipment, type TrackMode } from '@/lib/tracking';
import { isContainerNumber, normaliseReference, type TrackKind } from '@/lib/tracking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// tracking APIs are metered: 30 lookups per client per hour, 300 overall
const allow = windowLimiter({ perClient: 30, overall: 300, windowMs: 60 * 60 * 1000 });

/** Body: { reference, kind: "container" | "bl" | "booking", carrier?, productId?, mode: "shipping" | "customs" }. */
export async function POST(req: Request) {
  const parsed = await readJsonLimited(req, 4_000);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  const body = parsed.body;
  const kind: TrackKind = body.kind === 'bl' || body.kind === 'booking' ? body.kind : 'container';
  const reference = normaliseReference(typeof body.reference === 'string' ? body.reference : '');
  const mode: TrackMode = body.mode === 'customs' ? 'customs' : 'shipping';
  const carrier = typeof body.carrier === 'string' && /^[A-Z]{2,4}$/.test(body.carrier) ? body.carrier : undefined;
  if (!reference || !/^[A-Z0-9]{4,40}$/.test(reference)) return NextResponse.json({ ok: false, error: 'bad-reference' }, { status: 400 });
  if (kind === 'container' && !isContainerNumber(reference)) return NextResponse.json({ ok: false, error: 'bad-container-number' }, { status: 400 });
  if (!allow(clientKey(req))) return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  const product = typeof body.productId === 'string' ? getProduct(body.productId) : undefined;
  const out = await trackShipment({ reference, kind, carrier }, { mode, product });
  // validation metrics (H8): how live lookups end, without the number itself
  const outcome = out.result ? (out.result.demo ? 'demo' : out.result.pending ? 'pending' : 'live') : (out.error ?? 'not-found');
  countMetrics(eventKeys({ e: 'track', kind: outcome, provider: out.result && !out.result.demo ? out.result.provider : undefined }));
  if (out.result) return NextResponse.json({ ok: true, result: out.result, tried: out.tried }, { headers: { 'Cache-Control': 'no-store' } });
  const status = out.error === 'failed' ? 502 : out.error === 'not-covered' ? 422 : 404;
  return NextResponse.json({ ok: false, error: out.error ?? 'not-found', tried: out.tried }, { status, headers: { 'Cache-Control': 'no-store' } });
}
