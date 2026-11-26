import { NextResponse } from 'next/server';
import { publicPricing } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Current plan prices and checkout links (set on /admin → 요금제). */
export function GET() {
  return NextResponse.json({ ok: true, pricing: publicPricing() }, { headers: { 'Cache-Control': 'no-store' } });
}
