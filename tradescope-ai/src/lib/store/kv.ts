/**
 * Redis over HTTPS (Upstash REST API) — the persistent store for serverless hosting (Vercel), where the
 * filesystem is not kept between requests. Server-side only.
 *
 * Configured by environment variables, as set by the Vercel Marketplace "Upstash for Redis" integration
 * (KV_REST_API_URL / KV_REST_API_TOKEN) or by Upstash directly (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 * Keys are prefixed (KV_PREFIX, default "tradescope:") so one database can serve several apps.
 */

export interface KvConfig {
  url: string;
  token: string;
  prefix: string;
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** A complete URL + token pair from one provider's variables, or null. */
function pair(urlVar: string, tokenVar: string): { url: string; token: string } | null {
  const url = (process.env[urlVar] ?? '').trim().replace(/\/+$/, '');
  const token = (process.env[tokenVar] ?? '').trim();
  return url && token ? { url, token } : null;
}

/**
 * The Redis connection, or null. URL and token come as a pair from the same provider (Vercel's KV_REST_API_* first,
 * then UPSTASH_REDIS_REST_*), never mixed. The token is sent with every request, so the URL must be HTTPS — plain
 * HTTP only to this machine (a local test server).
 */
export function kvConfig(): KvConfig | null {
  const p = pair('KV_REST_API_URL', 'KV_REST_API_TOKEN') ?? pair('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
  if (!p) return null;
  let u: URL;
  try {
    u = new URL(p.url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && LOOPBACK.has(u.hostname))) return null;
  return { ...p, prefix: (process.env.KV_PREFIX ?? 'tradescope:').trim() };
}

export class KvError extends Error {}

/** When Redis last failed and last answered (unix ms), across every request of this instance. */
let lastFailure = 0;
let lastSuccess = 0;
const UNHEALTHY_FOR_MS = 60_000;

/**
 * False while Redis's latest answer on this instance was a failure (within the last minute) — so a form can say it is
 * not taking requests instead of accepting one and failing to store it. Any successful command clears it.
 */
export function kvHealthy(): boolean {
  return !(lastFailure > lastSuccess && Date.now() - lastFailure < UNHEALTHY_FOR_MS);
}

/** For tests: forget the health history. */
export function resetKvHealthForTest(): void {
  lastFailure = 0;
  lastSuccess = 0;
}

async function post(pathSuffix: string, payload: unknown, timeoutMs: number): Promise<unknown> {
  const cfg = kvConfig();
  if (!cfg) throw new KvError('kv-not-configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.url}${pathSuffix}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as unknown;
    const error = body && typeof body === 'object' && !Array.isArray(body) ? (body as { error?: string }).error : undefined;
    if (!res.ok || !body || error) throw new KvError(error ? 'kv-error' : `kv-http-${res.status}`);
    lastSuccess = Date.now();
    return body;
  } catch (e) {
    lastFailure = Date.now();
    if (e instanceof KvError) throw e;
    throw new KvError((e as Error).name === 'AbortError' ? 'kv-timeout' : 'kv-unreachable');
  } finally {
    clearTimeout(timer);
  }
}

/** One Redis command; throws KvError on a transport or Redis error (never returns a partial result). */
export async function kv(command: Array<string | number>, timeoutMs = 8000): Promise<unknown> {
  const body = (await post('', command.map(String), timeoutMs)) as { result?: unknown };
  return body.result ?? null;
}

/**
 * Several commands in one request (Upstash /pipeline — run in order, not atomically). Throws KvError when the
 * request or any command fails, so a caller never mistakes a partial answer for a whole one.
 */
export async function kvPipeline(commands: Array<Array<string | number>>, timeoutMs = 8000): Promise<unknown[]> {
  if (!commands.length) return [];
  const body = await post('/pipeline', commands.map((c) => c.map(String)), timeoutMs);
  if (!Array.isArray(body) || body.length !== commands.length) throw new KvError('kv-error');
  return body.map((r) => {
    if (!r || typeof r !== 'object' || (r as { error?: string }).error) throw new KvError('kv-error');
    return (r as { result?: unknown }).result ?? null;
  });
}

/** HGETALL's flat [field, value, field, value…] answer as an object (no prototype, so any field name is safe). */
export function kvPairs(result: unknown): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  if (!Array.isArray(result)) return out;
  for (let i = 0; i + 1 < result.length; i += 2) if (typeof result[i] === 'string' && typeof result[i + 1] === 'string') out[result[i]] = result[i + 1];
  return out;
}

export const kvKey = (name: string) => `${kvConfig()?.prefix ?? 'tradescope:'}${name}`;

export async function kvGet(name: string): Promise<string | null> {
  const r = await kv(['GET', kvKey(name)]);
  return typeof r === 'string' ? r : null;
}

/** Compare-and-set: writes `next` only when the stored value is still `expected` (null = must not exist). */
const CAS = `local cur = redis.call('GET', KEYS[1])
if ARGV[1] == '1' then
  if cur then return 0 end
elseif cur ~= ARGV[2] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[3])
return 1`;

export async function kvCompareAndSet(name: string, expected: string | null, next: string): Promise<boolean> {
  const r = await kv(['EVAL', CAS, 1, kvKey(name), expected === null ? '1' : '0', expected ?? '', next]);
  return Number(r) === 1;
}
