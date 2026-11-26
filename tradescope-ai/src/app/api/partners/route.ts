import { NextResponse } from 'next/server';
import { contractedPartners } from '@/lib/partners/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contracted law and customs firms per country: country, type, name, local name, city and website — never contacts, terms or notes. */
export async function GET()  {
  return NextResponse.json({ ok: true, partners: await contractedPartners() }, { headers: { 'Cache-Control': 'no-store' } });
}
