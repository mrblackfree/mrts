import { NextResponse } from 'next/server';
import { getProduct } from '@/data/kr-ph-trade-db';
import { getAiConfig } from '@/lib/ai-adapter';
import { llmBriefing } from '@/lib/engine/llm';
import { analyzeLocal } from '@/lib/engine/simulate';
import { allowLlmCall, clientKey } from '@/lib/rate-limit';
import type { AnalysisReport, Direction, Lang } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyzeInput {
  query: string;
  direction: Direction;
  lang: Lang;
}

function parseInput(body: unknown): AnalyzeInput {
  const raw = (body && typeof body === 'object' ? body : {}) as Partial<Record<keyof AnalyzeInput, unknown>>;
  const query = typeof raw.query === 'string' ? raw.query.trim().slice(0, 500) : '';
  const direction: Direction = raw.direction === 'KR_TO_PH' ? 'KR_TO_PH' : 'PH_TO_KR';
  const lang: Lang = raw.lang === 'en' ? 'en' : 'ko';
  const fallback =
    direction === 'PH_TO_KR'
      ? lang === 'en'
        ? 'Import banana chips from the Philippines to Korea'
        : '바나나칩 수입'
      : lang === 'en'
        ? 'Export Korean seasoned laver to the Philippines'
        : '조미김 수출';
  return { query: query || fallback, direction, lang };
}

/**
 * RAG pipeline:
 *  1) local retrieval + intent parsing over the embedded KR-PH knowledge base
 *  2) deterministic simulation report (always produced — this is the fallback)
 *  3) optional LLM briefing grounded on the retrieved context; any failure keeps step 2
 */
async function analyze(input: AnalyzeInput, opts: { allowLlm: boolean; clientId: string }) {
  const started = Date.now();
  const { report } = analyzeLocal(input.query, input.direction);
  const product = getProduct(report.productId)!;
  const cfg = getAiConfig();
  const simulation = (fallbackReason: string): AnalysisReport => ({ ...report, engine: { mode: 'simulation', latencyMs: Date.now() - started, fallbackReason } });

  if (!cfg.enabled) return simulation('no-api-key');
  if (!opts.allowLlm) return simulation('llm-disabled-for-get');
  const gate = allowLlmCall(opts.clientId);
  if (!gate.ok) return simulation(gate.reason);

  const llm = await llmBriefing(product, report.intent, input.query, input.lang);
  if ('briefing' in llm) {
    return {
      ...report,
      briefing: { ...report.briefing, [input.lang]: llm.briefing },
      engine: { mode: 'llm', model: llm.model, latencyMs: Date.now() - started, llmLang: input.lang },
    } satisfies AnalysisReport;
  }
  return simulation(llm.error);
}

function safeFallback(input: AnalyzeInput) {
  // Last-resort safety net: never surface an error to the dashboard.
  const { report } = analyzeLocal(input.query, input.direction);
  return NextResponse.json({ ok: true, report: { ...report, engine: { ...report.engine, fallbackReason: 'internal-error' } } });
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input = parseInput(body);
  try {
    return NextResponse.json({ ok: true, report: await analyze(input, { allowLlm: true, clientId: clientKey(req) }) });
  } catch {
    return safeFallback(input);
  }
}

/** GET is for sharing / testing: it never triggers a billable LLM call (crawlers, link previews). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const input = parseInput({ query: url.searchParams.get('q') ?? '', direction: url.searchParams.get('dir') ?? '', lang: url.searchParams.get('lang') ?? '' });
  try {
    return NextResponse.json({ ok: true, report: await analyze(input, { allowLlm: false, clientId: clientKey(req) }) });
  } catch {
    return safeFallback(input);
  }
}
