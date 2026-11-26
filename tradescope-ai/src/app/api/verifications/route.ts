import { NextResponse } from 'next/server';
import { activeEntries, listVerifications } from '@/lib/verifications/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verified values saved on the admin page that apply today, in the verified-overrides.json entry format — the
 * browser applies them to its copy of the product data. The same facts the Trust Center shows (value, source,
 * reference, verifier, date); nothing internal.
 */
export async function GET() {
  try {
    return NextResponse.json({ ok: true, entries: activeEntries(await listVerifications()) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, entries: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
