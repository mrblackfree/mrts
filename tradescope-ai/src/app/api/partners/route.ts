import { NextResponse } from 'next/server';
import { contractedPartners } from '@/lib/partners/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contracted law and customs firms per country (public: names, country, city, website only). */
export function GET() {
  return NextResponse.json({ ok: true, partners: contractedPartners() }, { headers: { 'Cache-Control': 'no-store' } });
}
