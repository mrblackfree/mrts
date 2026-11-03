/**
 * In-memory guard for billable LLM calls (server-side only).
 *
 * - per client: AI_MAX_CALLS_PER_IP_PER_HOUR (default 30)
 * - per server instance per UTC day: AI_DAILY_BUDGET (default 500)
 *
 * Limits are per process / serverless instance. For strict global limits put a shared store
 * (e.g. Upstash Redis / Vercel KV) behind the same interface.
 */
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
let budgetDay = '';
let budgetUsed = 0;

const positive = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || req.headers.get('x-real-ip') || 'anonymous').slice(0, 64);
}

export type LlmGate = { ok: true } | { ok: false; reason: 'rate-limited' | 'daily-budget' };

export function allowLlmCall(key: string): LlmGate {
  const perHour = positive(process.env.AI_MAX_CALLS_PER_IP_PER_HOUR, 30);
  const daily = positive(process.env.AI_DAILY_BUDGET, 500);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) {
    budgetDay = today;
    budgetUsed = 0;
  }
  if (budgetUsed >= daily) return { ok: false, reason: 'daily-budget' };

  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= perHour) {
    hits.set(key, recent);
    return { ok: false, reason: 'rate-limited' };
  }
  recent.push(now);
  hits.set(key, recent);
  budgetUsed += 1;

  // keep memory bounded
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return { ok: true };
}
