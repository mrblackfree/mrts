import { NextResponse } from 'next/server';
import { EXPERT_INDEX } from '@/data/experts';
import { getProduct } from '@/data/kr-ph-trade-db';
import { appendRequest, type ConsultRequest } from '@/lib/consult/store';
import { readJsonLimited } from '@/lib/http';
import { clientKey, windowLimiter } from '@/lib/rate-limit';
import { getSetting, storageState } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// abuse limits: 5 requests per client per hour, 60 overall
const allow = windowLimiter({ perClient: 5, overall: 60, windowMs: 60 * 60 * 1000 });
const MAX_BODY_BYTES = 32_000;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Whether this server can take requests online, and the fallback contact otherwise. */
export function GET() {
  const contact = getSetting('CONSULT_CONTACT_EMAIL') ?? null;
  const accepting = storageState().writable || !!getSetting('CONSULT_WEBHOOK_URL');
  return NextResponse.json({ ok: true, accepting, contact }, { headers: { 'Cache-Control': 'no-store' } });
}

/** A trader asks TradeScope to arrange a local expert. Body: { name, company?, email, phone?, productId?, topic, serviceIds[], message?, lang, consent, website (honeypot) }. */
export async function POST(req: Request) {
  const parsed = await readJsonLimited(req, MAX_BODY_BYTES);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  const body = parsed.body;
  // bots fill every field; people never see this one
  if (text(body.website, 200)) return NextResponse.json({ ok: true, id: 'TS-RECEIVED' });

  const name = text(body.name, 60);
  const email = text(body.email, 200);
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'required';
  if (!EMAIL.test(email)) errors.email = 'invalid';
  if (body.consent !== true) errors.consent = 'required';
  const serviceIds = (Array.isArray(body.serviceIds) ? body.serviceIds : []).filter((x): x is string => typeof x === 'string' && x in EXPERT_INDEX).slice(0, 10);
  const topic = text(body.topic, 300);
  const message = text(body.message, 2000);
  if (!serviceIds.length && !topic && !message) errors.message = 'required';
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, error: 'invalid', errors }, { status: 400 });

  if (!allow(clientKey(req))) return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });

  const productId = typeof body.productId === 'string' && getProduct(body.productId) ? body.productId : undefined;
  const input: Omit<ConsultRequest, 'id' | 'createdAt' | 'status'> = {
    name,
    company: text(body.company, 100),
    email,
    phone: text(body.phone, 40),
    ...(productId ? { productId } : {}),
    topic,
    serviceIds: Array.from(new Set(serviceIds)),
    message,
    lang: body.lang === 'en' ? 'en' : 'ko',
  };

  const webhook = getSetting('CONSULT_WEBHOOK_URL');
  const canStore = storageState().writable;
  if (!canStore && !webhook) {
    return NextResponse.json({ ok: false, error: 'not-accepting', contact: getSetting('CONSULT_CONTACT_EMAIL') ?? null }, { status: 503 });
  }

  let record: ConsultRequest;
  try {
    record = canStore ? appendRequest(input) : { id: `TS-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), status: 'new', ...input };
  } catch {
    return NextResponse.json({ ok: false, error: 'storage-error', contact: getSetting('CONSULT_CONTACT_EMAIL') ?? null }, { status: 503 });
  }

  if (webhook && /^https:\/\//i.test(webhook)) {
    const services = record.serviceIds.map((id) => EXPERT_INDEX[id]?.title.ko ?? id).join(', ');
    const summary = `[TradeScope] 전문가 서비스 요청 ${record.id}\n${record.name}${record.company ? ` (${record.company})` : ''} · ${record.email}${record.phone ? ` · ${record.phone}` : ''}\n서비스: ${services || '-'}\n주제: ${record.topic || '-'}\n${record.message}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: summary, request: record }), signal: ctrl.signal });
    } catch {
      /* the request is stored; a failed notification must not fail it */
    } finally {
      clearTimeout(timer);
    }
  }
  return NextResponse.json({ ok: true, id: record.id });
}
