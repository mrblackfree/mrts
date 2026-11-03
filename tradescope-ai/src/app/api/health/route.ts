import { NextResponse } from 'next/server';
import { DATA_AS_OF, PRODUCTS } from '@/data/kr-ph-trade-db';
import { OFFICIAL } from '@/data/official';
import { publicAiStatus } from '@/lib/ai-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness + capability probe (used by the header status bar and the Docker HEALTHCHECK). */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'tradescope-ai',
    version: process.env.npm_package_version ?? '0.1.0',
    time: new Date().toISOString(),
    ai: { ...publicAiStatus(), fallback: 'kr-ph-simulation-engine' },
    data: {
      asOf: DATA_AS_OF,
      products: PRODUCTS.length,
      partners: PRODUCTS.reduce((n, p) => n + p.partners.length, 0),
      sources: ['UNI-PASS', 'UN Comtrade', 'PH FDA', 'PH Tariff Commission', 'KITA'],
    },
    officialData: {
      generatedAt: OFFICIAL.generatedAt ?? null,
      sources: Object.fromEntries(Object.entries(OFFICIAL.sources).map(([k, v]) => [k, v?.status])),
      verifiedOverrides: OFFICIAL.overrideCount,
      trustScore: Math.round(PRODUCTS.reduce((s, p) => s + (p.verification?.score ?? 0), 0) / PRODUCTS.length),
      byProduct: Object.fromEntries(PRODUCTS.map((p) => [p.id, p.verification?.score ?? 0])),
    },
  });
}
