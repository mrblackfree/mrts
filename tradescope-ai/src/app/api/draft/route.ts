import { NextResponse } from 'next/server';
import { getProduct } from '@/data/kr-ph-trade-db';
import { getAiConfig } from '@/lib/ai-adapter';
import { llmPolishEmail } from '@/lib/engine/llm';
import { buildDraftLocal, defaultDraftOptions, DRAFT_LIMITS, priceForIncoterm } from '@/lib/engine/simulate';
import { allowLlmCall, clientKey } from '@/lib/rate-limit';
import type { DraftOptions, DraftResult, Lang, TradeProduct } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAYMENTS: DraftOptions['payment'][] = ['TT_30_70', 'TT_100', 'LC_SIGHT'];
const SAMPLES: DraftOptions['sample'][] = ['free', 'paid-credit', 'none'];
const LIMITS = DRAFT_LIMITS;

type Parsed = { ok: true; options: DraftOptions } | { ok: false; field: string };

function sanitizeOptions(product: TradeProduct, raw: Partial<DraftOptions> | undefined, fallback: DraftOptions): Parsed {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DraftOptions>;
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v.slice(0, 80) : d);
  // Only incoterms offered for this product are accepted (they drive the price uplift and the PI). Like the
  // numbers below, an unknown value is rejected rather than replaced, so a client price is never paired with
  // an incoterm the client did not choose.
  if (r.incoterm !== undefined && (typeof r.incoterm !== 'string' || !product.pricing.incoterms.includes(r.incoterm))) return { ok: false, field: 'incoterm' };
  const incoterm = r.incoterm ?? fallback.incoterm;
  const numbers: Partial<Record<keyof typeof LIMITS, number>> = {};
  for (const key of Object.keys(LIMITS) as Array<keyof typeof LIMITS>) {
    const v = r[key];
    if (v === undefined) continue;
    // Reject instead of silently replacing — otherwise the email and the PI could disagree.
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIMITS[key]) return { ok: false, field: key };
    numbers[key] = v;
  }
  return {
    ok: true,
    options: {
      incoterm,
      moq: numbers.moq ?? fallback.moq,
      // When only the incoterm is sent, derive the indicative price for that incoterm.
      unitPrice: numbers.unitPrice ?? priceForIncoterm(product, incoterm),
      quantity: numbers.quantity ?? fallback.quantity,
      sample: SAMPLES.includes(r.sample as DraftOptions['sample']) ? (r.sample as DraftOptions['sample']) : fallback.sample,
      sampleCourierByBuyer: typeof r.sampleCourierByBuyer === 'boolean' ? r.sampleCourierByBuyer : fallback.sampleCourierByBuyer,
      payment: PAYMENTS.includes(r.payment as DraftOptions['payment']) ? (r.payment as DraftOptions['payment']) : fallback.payment,
      includeFtaNote: typeof r.includeFtaNote === 'boolean' ? r.includeFtaNote : true,
      includeCertNote: typeof r.includeCertNote === 'boolean' ? r.includeCertNote : true,
      senderCompany: str(r.senderCompany, ''),
      senderName: str(r.senderName, ''),
    },
  };
}

export async function POST(req: Request) {
  let parsedBody: unknown = {};
  try {
    parsedBody = await req.json();
  } catch {
    parsedBody = {};
  }
  const body = (parsedBody && typeof parsedBody === 'object' ? parsedBody : {}) as {
    productId?: unknown;
    partnerId?: unknown;
    options?: Partial<DraftOptions>;
    lang?: unknown;
    polish?: unknown;
  };
  const product = typeof body.productId === 'string' ? getProduct(body.productId) : undefined;
  const partner = product?.partners.find((p) => p.id === body.partnerId);
  if (!product || !partner) {
    return NextResponse.json({ ok: false, error: 'unknown-product-or-partner' }, { status: 400 });
  }
  const lang: Lang = body.lang === 'en' ? 'en' : 'ko';
  const parsed = sanitizeOptions(product, body.options, defaultDraftOptions(product, undefined, partner));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: 'invalid-option', field: parsed.field }, { status: 400 });
  }
  const options = parsed.options;
  const local = buildDraftLocal(product.id, partner.id, options)!;
  const started = Date.now();

  if (body.polish === true) {
    const keep = (fallbackReason: string) => NextResponse.json({ ok: true, draft: { ...local, engine: { ...local.engine, fallbackReason } } });
    if (!getAiConfig().enabled) return keep('no-api-key');
    const gate = allowLlmCall(clientKey(req));
    if (!gate.ok) return keep(gate.reason);
    try {
      const llm = await llmPolishEmail(product, partner, options, local.email[lang], lang);
      if ('email' in llm) {
        const draft: DraftResult = {
          ...local,
          email: { ...local.email, [lang]: llm.email },
          engine: { mode: 'llm', model: llm.model, latencyMs: Date.now() - started, llmLang: lang },
        };
        return NextResponse.json({ ok: true, draft });
      }
      return keep(llm.error);
    } catch {
      return keep('internal-error');
    }
  }
  return NextResponse.json({ ok: true, draft: local });
}
