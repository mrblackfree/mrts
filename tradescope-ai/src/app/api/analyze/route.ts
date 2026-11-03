import { NextResponse } from 'next/server';
import { getProduct } from '@/data/kr-ph-trade-db';
import { getAiConfig } from '@/lib/ai-adapter';
import { llmBriefing } from '@/lib/engine/llm';
import { analyzeLocal } from '@/lib/engine/simulate';
import type { AnalysisReport, Direction, Lang } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyzeInput {
  query: string;
  direction: Direction;
  lang: Lang;
}

function parseInput(raw: Partial<Record<keyof AnalyzeInput, unknown>>): AnalyzeInput {
  const query = typeof raw.query === 'string' ? raw.query.trim().slice(0, 500) : '';
  const direction: Direction = raw.direction === 'KR_TO_PH' ? 'KR_TO_PH' : 'PH_TO_KR';
  const lang: Lang = raw.lang === 'en' ? 'en' : 'ko';
  return { query: query || (direction === 'PH_TO_KR' ? '바나나칩 수입' : '조미김 수출'), direction, lang };
}

/**
 * RAG pipeline:
 *  1) local retrieval + intent parsing over the embedded KR-PH knowledge base
 *  2) deterministic simulation report (always produced — this is the fallback)
 *  3) optional LLM briefing grounded on the retrieved context; any failure keeps step 2
 */
async function analyze(input: AnalyzeInput) {
  const started = Date.now();
  const { report } = analyzeLocal(input.query, input.direction);
  const product = getProduct(report.productId)!;
  const cfg = getAiConfig();

  if (cfg.enabled) {
    const llm = await llmBriefing(product, report.intent, input.query, input.lang);
    if ('briefing' in llm) {
      const enriched: AnalysisReport = {
        ...report,
        briefing: { ...report.briefing, [input.lang]: llm.briefing },
        engine: { mode: 'llm', model: llm.model, latencyMs: Date.now() - started },
      };
      return enriched;
    }
    return { ...report, engine: { mode: 'simulation' as const, latencyMs: Date.now() - started, fallbackReason: llm.error } };
  }
  return { ...report, engine: { mode: 'simulation' as const, latencyMs: Date.now() - started, fallbackReason: 'no-api-key' } };
}

export async function POST(req: Request) {
  let body: Partial<Record<keyof AnalyzeInput, unknown>> = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const input = parseInput(body);
  try {
    return NextResponse.json({ ok: true, report: await analyze(input) });
  } catch {
    // Last-resort safety net: never surface an error to the dashboard.
    const { report } = analyzeLocal(input.query, input.direction);
    return NextResponse.json({ ok: true, report: { ...report, engine: { ...report.engine, fallbackReason: 'internal-error' } } });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const input = parseInput({ query: url.searchParams.get('q') ?? '', direction: url.searchParams.get('dir') ?? '', lang: url.searchParams.get('lang') ?? '' });
  try {
    return NextResponse.json({ ok: true, report: await analyze(input) });
  } catch {
    const { report } = analyzeLocal(input.query, input.direction);
    return NextResponse.json({ ok: true, report });
  }
}
