import { adminJson, requireAdmin } from '@/lib/admin/http';
import { chatCompletion, getAiConfig } from '@/lib/ai-adapter';
import { todayIso } from '@/lib/format';
import { getSetting } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TestResult = { ok: boolean; message: string; latencyMs: number; detail?: string };

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<{ status: number; text: string } | { error: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    return { status: res.status, text: (await res.text()).slice(0, 4000) };
  } catch (e) {
    return { error: (e as Error).name === 'AbortError' ? 'timeout' : 'network-error' };
  } finally {
    clearTimeout(timer);
  }
}

async function testAi(): Promise<TestResult> {
  const cfg = getAiConfig();
  if (!cfg.apiKey) return { ok: false, message: 'no-api-key', latencyMs: 0 };
  // a direct, minimal call — admin tests do not count against the public LLM budget
  const r = await chatCompletion([{ role: 'user', content: 'Reply with the single word: OK' }], { timeoutMs: Math.min(cfg.timeoutMs, 20_000) });
  if (!r.ok) return { ok: false, message: r.reason, latencyMs: r.latencyMs };
  return { ok: true, message: 'ok', latencyMs: r.latencyMs, detail: r.model };
}

async function testDataGoKr(): Promise<TestResult> {
  const key = getSetting('DATA_GO_KR_SERVICE_KEY');
  if (!key) return { ok: false, message: 'no-key', latencyMs: 0 };
  const started = Date.now();
  // data.go.kr issues an already URL-encoded key and a raw one; accept both
  const serviceKey = key.includes('%') ? key : encodeURIComponent(key);
  const day = todayIso().replace(/-/g, '');
  const r = await timedFetch(`https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo?serviceKey=${serviceKey}&aplyBgnDt=${day}&weekFxrtTpcd=2`);
  const latencyMs = Date.now() - started;
  if ('error' in r) return { ok: false, message: r.error, latencyMs };
  if (/<resultCode>\s*0+\s*<\/resultCode>/.test(r.text) || /"resultCode"\s*:\s*"0+"/.test(r.text)) return { ok: true, message: 'ok', latencyMs, detail: 'KCS customs FX API' };
  const code = r.text.match(/SERVICE_KEY_[A-Z_]+|[A-Z][A-Z_]{5,}_ERROR/)?.[0] ?? r.text.match(/<resultMsg>([^<]{1,80})</)?.[1];
  return { ok: false, message: code ?? `http-${r.status}`, latencyMs };
}

async function testComtrade(): Promise<TestResult> {
  const key = getSetting('COMTRADE_API_KEY');
  if (!key) return { ok: false, message: 'no-key', latencyMs: 0 };
  const started = Date.now();
  const year = new Date().getUTCFullYear() - 2;
  const r = await timedFetch(`https://comtradeapi.un.org/data/v1/get/C/A/HS?reporterCode=410&partnerCode=608&period=${year}&cmdCode=TOTAL&flowCode=X`, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  });
  const latencyMs = Date.now() - started;
  if ('error' in r) return { ok: false, message: r.error, latencyMs };
  if (r.status === 200) return { ok: true, message: 'ok', latencyMs, detail: `UN Comtrade · KR→PH ${year}` };
  return { ok: false, message: r.status === 401 || r.status === 403 ? 'invalid-key' : `http-${r.status}`, latencyMs };
}

const TESTS: Record<string, () => Promise<TestResult>> = { ai: testAi, dataGoKr: testDataGoKr, comtrade: testComtrade };

/** Connectivity test for a saved key: body `{ target: "ai" | "dataGoKr" | "comtrade" }`. Keys are never echoed. */
export async function POST(req: Request) {
  const denied = requireAdmin(req, { mutating: true });
  if (denied) return denied;
  let target = '';
  try {
    target = String(((await req.json()) as { target?: unknown })?.target ?? '');
  } catch {
    /* empty */
  }
  const run = TESTS[target];
  if (!run) return adminJson({ ok: false, error: 'unknown-target' }, { status: 400 });
  return adminJson({ ok: true, target, result: await run() });
}
