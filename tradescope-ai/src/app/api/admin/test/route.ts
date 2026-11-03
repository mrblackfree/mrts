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

// ---- tracking keys: authenticated read-only calls that spend no credits ----
async function testShipsGo(): Promise<TestResult> {
  const token = getSetting('TRACK_SHIPSGO_TOKEN');
  if (!token) return { ok: false, message: 'no-key', latencyMs: 0 };
  const started = Date.now();
  const r = await timedFetch('https://api.shipsgo.com/v2/ocean/carriers?take=1', { headers: { 'X-Shipsgo-User-Token': token, Accept: 'application/json' } });
  const latencyMs = Date.now() - started;
  if ('error' in r) return { ok: false, message: r.error, latencyMs };
  if (r.status === 200) return { ok: true, message: 'ok', latencyMs, detail: 'ShipsGo Ocean API v2' };
  return { ok: false, message: r.status === 401 || r.status === 403 ? 'invalid-key' : `http-${r.status}`, latencyMs };
}

async function testUnipass(): Promise<TestResult> {
  const key = getSetting('UNIPASS_CARGO_KEY');
  if (!key) return { ok: false, message: 'no-key', latencyMs: 0 };
  const started = Date.now();
  const year = new Date().getUTCFullYear();
  // a B/L that does not exist: a valid key answers "no result", a bad one a key notice
  const r = await timedFetch(
    `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?${new URLSearchParams({ crkyCn: key, mblNo: 'TSCHECK0000001', blYy: String(year) }).toString()}`,
  );
  const latencyMs = Date.now() - started;
  if ('error' in r) return { ok: false, message: r.error, latencyMs };
  if (r.status !== 200) return { ok: false, message: `http-${r.status}`, latencyMs };
  const notice = r.text.match(/<ntceInfo>([^<]{1,120})</)?.[1]?.trim();
  if (notice && /인증|crkyCn|key|권한|유효/i.test(notice)) return { ok: false, message: 'invalid-key', latencyMs, detail: notice };
  if (/cargCsclPrgsInfoQryRtnVo/.test(r.text)) return { ok: true, message: 'ok', latencyMs, detail: notice ? `UNI-PASS API001 · ${notice}` : 'UNI-PASS API001' };
  return { ok: false, message: 'unexpected-response', latencyMs };
}

async function testDcsa(name: string, url: string, headers: Record<string, string>): Promise<TestResult> {
  const started = Date.now();
  const r = await timedFetch(url, { headers: { Accept: 'application/json', ...headers } });
  const latencyMs = Date.now() - started;
  if ('error' in r) return { ok: false, message: r.error, latencyMs };
  // signed in: events (200/206) or "no such container" (400/404)
  if ([200, 206, 400, 404].includes(r.status)) return { ok: true, message: 'ok', latencyMs, detail: `${name} DCSA Track & Trace` };
  return { ok: false, message: r.status === 401 || r.status === 403 ? 'invalid-key' : `http-${r.status}`, latencyMs };
}

async function testHapag(): Promise<TestResult> {
  const id = getSetting('TRACK_HLAG_CLIENT_ID');
  const secret = getSetting('TRACK_HLAG_CLIENT_SECRET');
  if (!id || !secret) return { ok: false, message: 'no-key', latencyMs: 0 };
  return testDcsa('Hapag-Lloyd', 'https://api.hlag.com/hlag/external/v2/events/?equipmentReference=HLXU0000000', { 'X-IBM-Client-Id': id, 'X-IBM-Client-Secret': secret });
}

async function testCmaCgm(): Promise<TestResult> {
  const key = getSetting('TRACK_CMACGM_KEY');
  if (!key) return { ok: false, message: 'no-key', latencyMs: 0 };
  return testDcsa('CMA CGM', 'https://apis.cma-cgm.net/operation/trackandtrace/v1/events?equipmentReference=CMAU0000000', { KeyId: key });
}

const TESTS: Record<string, () => Promise<TestResult>> = {
  ai: testAi,
  dataGoKr: testDataGoKr,
  comtrade: testComtrade,
  shipsgo: testShipsGo,
  unipass: testUnipass,
  hapag: testHapag,
  cmacgm: testCmaCgm,
};

/** Connectivity test for a saved key: body `{ target }` (see TESTS). Keys are never echoed. */
export async function POST(req: Request) {
  const denied = requireAdmin(req, { mutating: true });
  if (denied) return denied;
  let target = '';
  try {
    target = String(((await req.json()) as { target?: unknown })?.target ?? '');
  } catch {
    /* empty */
  }
  const run = Object.hasOwn(TESTS, target) ? TESTS[target] : undefined;
  if (!run) return adminJson({ ok: false, error: 'unknown-target' }, { status: 400 });
  return adminJson({ ok: true, target, result: await run() });
}
