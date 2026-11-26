import { NextResponse } from 'next/server';
import { contractedPartners } from '@/lib/partners/store';
import { prepareRequest } from '@/lib/store/prepare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contracted law and customs firms per country: country, type, name, local name, city and website — never contacts, terms or notes. */
export async function GET()  {
  await prepareRequest();
  return NextResponse.json({ ok: true, partners: await contractedPartners() }, { headers: { 'Cache-Control': 'no-store' } });
}
