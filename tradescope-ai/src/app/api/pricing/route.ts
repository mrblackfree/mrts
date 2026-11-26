import { NextResponse } from 'next/server';
import { publicPricing } from '@/lib/pricing';
import { prepareRequest } from '@/lib/store/prepare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Current plan prices and checkout links (set on /admin → 요금제). */
export async function GET()  {
  await prepareRequest();
  return NextResponse.json({ ok: true, pricing: publicPricing() }, { headers: { 'Cache-Control': 'no-store' } });
}
