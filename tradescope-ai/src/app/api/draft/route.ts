import { NextResponse } from 'next/server';
import { getProduct } from '@/data/kr-ph-trade-db';
import { getAiConfig } from '@/lib/ai-adapter';
import { llmPolishEmail } from '@/lib/engine/llm';
import { buildDraftLocal, defaultDraftOptions, priceForIncoterm } from '@/lib/engine/simulate';
import type { DraftOptions, DraftResult, Lang, TradeProduct } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAYMENTS: DraftOptions['payment'][] = ['TT_30_70', 'TT_100', 'LC_SIGHT'];
const SAMPLES: DraftOptions['sample'][] = ['free', 'paid-credit', 'none'];

function sanitizeOptions(product: TradeProduct, raw: Partial<DraftOptions> | undefined, fallback: DraftOptions): DraftOptions {
  const num = (v: unknown, d: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : d);
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v.slice(0, 80) : d);
  const incoterm = str(raw?.incoterm, fallback.incoterm);
  return {
    incoterm,
    moq: num(raw?.moq, fallback.moq, 10_000_000),
    // When only the incoterm is sent, derive the indicative price for that incoterm.
    unitPrice: num(raw?.unitPrice, priceForIncoterm(product, incoterm), 1_000_000),
    quantity: num(raw?.quantity, fallback.quantity, 10_000_000),
    sample: SAMPLES.includes(raw?.sample as DraftOptions['sample']) ? (raw!.sample as DraftOptions['sample']) : fallback.sample,
    sampleCourierByBuyer: typeof raw?.sampleCourierByBuyer === 'boolean' ? raw.sampleCourierByBuyer : fallback.sampleCourierByBuyer,
    payment: PAYMENTS.includes(raw?.payment as DraftOptions['payment']) ? (raw!.payment as DraftOptions['payment']) : fallback.payment,
    includeFtaNote: typeof raw?.includeFtaNote === 'boolean' ? raw.includeFtaNote : true,
    includeCertNote: typeof raw?.includeCertNote === 'boolean' ? raw.includeCertNote : true,
    senderCompany: str(raw?.senderCompany, ''),
    senderName: str(raw?.senderName, ''),
  };
}

export async function POST(req: Request) {
  let body: { productId?: unknown; partnerId?: unknown; options?: Partial<DraftOptions>; lang?: unknown; polish?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const product = typeof body.productId === 'string' ? getProduct(body.productId) : undefined;
  const partner = product?.partners.find((p) => p.id === body.partnerId);
  if (!product || !partner) {
    return NextResponse.json({ ok: false, error: 'unknown-product-or-partner' }, { status: 400 });
  }
  const lang: Lang = body.lang === 'en' ? 'en' : 'ko';
  const options = sanitizeOptions(product, body.options, defaultDraftOptions(product));
  const local = buildDraftLocal(product.id, partner.id, options)!;
  const started = Date.now();

  if (body.polish === true) {
    if (!getAiConfig().enabled) {
      return NextResponse.json({ ok: true, draft: { ...local, engine: { ...local.engine, fallbackReason: 'no-api-key' } } });
    }
    try {
      const llm = await llmPolishEmail(product, partner, options, local.email[lang], lang);
      if ('email' in llm) {
        const draft: DraftResult = {
          ...local,
          email: { ...local.email, [lang]: llm.email },
          engine: { mode: 'llm', model: llm.model, latencyMs: Date.now() - started },
        };
        return NextResponse.json({ ok: true, draft });
      }
      return NextResponse.json({ ok: true, draft: { ...local, engine: { ...local.engine, fallbackReason: llm.error } } });
    } catch {
      return NextResponse.json({ ok: true, draft: { ...local, engine: { ...local.engine, fallbackReason: 'internal-error' } } });
    }
  }
  return NextResponse.json({ ok: true, draft: local });
}
