/**
 * In-memory guard for billable LLM calls (server-side only).
 *
 * - per client: AI_MAX_CALLS_PER_IP_PER_HOUR (default 30)
 * - per server instance per UTC day: AI_DAILY_BUDGET (default 500)
 *
 * Limits are per process / serverless instance. For strict global limits put a shared store
 * (e.g. Upstash Redis / Vercel KV) behind the same interface.
 */
import { getSetting } from '@/lib/settings';

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
let budgetDay = '';
let budgetUsed = 0;

const positive = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/**
 * Client identity for the per-client limit. Forwarding headers are only trusted when a proxy we control sets them:
 *
 * - on Vercel (VERCEL=1) the edge overwrites `x-real-ip` with the connecting address;
 * - behind your own reverse proxy set TRUST_PROXY to the number of proxies in front of the app (Caddy / nginx
 *   alone = 1); the client is then the entry that many hops from the END of X-Forwarded-For, because
 *   anything to the left of it was supplied by the caller;
 * - otherwise headers are ignored and every caller shares one bucket (the daily budget still applies).
 */
export function clientKey(req: Request): string {
  if (process.env.VERCEL === '1') {
    const ip = req.headers.get('x-real-ip')?.trim();
    if (ip) return ip.slice(0, 64);
  }
  const hops = Number(getSetting('TRUST_PROXY'));
  if (Number.isInteger(hops) && hops > 0) {
    const chain = (req.headers.get('x-forwarded-for') ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const ip = chain[chain.length - hops];
    if (ip) return ip.slice(0, 64);
  }
  return 'shared';
}

export type LlmGate = { ok: true } | { ok: false; reason: 'rate-limited' | 'daily-budget' };

export function allowLlmCall(key: string): LlmGate {
  const perHour = positive(getSetting('AI_MAX_CALLS_PER_IP_PER_HOUR'), 30);
  const daily = positive(getSetting('AI_DAILY_BUDGET'), 500);
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
