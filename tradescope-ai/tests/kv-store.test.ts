/* Redis (Upstash REST) backend on serverless hosting: settings and partner pipeline persist, secrets stay
   encrypted, concurrent saves are kept, a damaged or unreachable store never loses data. */
import { done, ok } from './assert';
import { startFakeUpstash } from './fake-upstash';

const fake = await startFakeUpstash();
process.env.KV_REST_API_URL = fake.url;
process.env.KV_REST_API_TOKEN = fake.token;
// the assertions address `tradescope:*` keys: never pick up a KV_PREFIX from the environment
process.env.KV_PREFIX = 'tradescope:';
process.env.VERCEL = '1';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.ADMIN_SECRET = 'kv-store-test-secret-0123456789abcdef';

const settings = await import('@/lib/settings');
const auth = await import('@/lib/admin/auth');
const partnersRoute = await import('@/app/api/admin/partners/route');
const { PARTNER_CANDIDATES } = await import('@/data/partner-candidates');

await settings.loadSettings(true);
let st = settings.storageState();
ok('Vercel + Redis: admin documents are writable', st.writable && st.backend === 'kv', st);
ok('…while the data folder is not (Vercel); expert requests, sign-outs and metrics use Redis too', settings.fileStorageState().writable === false && settings.recordStorageState().writable);

// ---- save and read back ----------------------------------------------------------------------------------------
let r = await settings.updateSettings({ PRICE_CASE_KRW: '490000', AI_API_KEY: 'sk-test-supersecret-123456' });
ok('save ok', r.ok, r);
const stored = fake.data.get('tradescope:settings') ?? '';
ok('stored in Redis under the prefixed key', stored.includes('PRICE_CASE_KRW'));
ok('secrets are encrypted in Redis', !stored.includes('sk-test-supersecret') && stored.includes('"enc"'));
ok('value readable right away', settings.getSetting('PRICE_CASE_KRW') === '490000' && settings.getSetting('AI_API_KEY') === 'sk-test-supersecret-123456');

// another instance starts cold: nothing until it loads, then the saved values
settings.resetSettingsCacheForTest();
ok('cold instance before loading: not yet', settings.getSetting('PRICE_CASE_KRW') === undefined);
await settings.loadSettings();
ok('cold instance after loading: saved values', settings.getSetting('PRICE_CASE_KRW') === '490000');

// concurrent saves from two instances both survive (compare-and-set)
const results = await Promise.all([settings.updateSettings({ PRICE_SUB_MONTHLY_KRW: '99000' }), settings.updateSettings({ CONSULT_CONTACT_EMAIL: 'ops@example.com' })]);
ok('both concurrent saves ok', results.every((x) => x.ok), results);
await settings.loadSettings(true);
ok('both values kept', settings.getSetting('PRICE_SUB_MONTHLY_KRW') === '99000' && settings.getSetting('CONSULT_CONTACT_EMAIL') === 'ops@example.com' && settings.getSetting('PRICE_CASE_KRW') === '490000');

// clearing a value
r = await settings.updateSettings({ PRICE_SUB_MONTHLY_KRW: null });
ok('a value can be cleared', r.ok && settings.getSetting('PRICE_SUB_MONTHLY_KRW') === undefined);

// ---- partner pipeline in Redis -----------------------------------------------------------------------------------
const token = auth.issueSession().token;
const req = (method: string, body?: unknown) =>
  new Request('http://localhost/api/admin/partners', { method, headers: { cookie: `${auth.SESSION_COOKIE}=${token}`, origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const id = PARTNER_CANDIDATES[0].id;
let res = await partnersRoute.PATCH(req('PATCH', { id, deal: { status: 'negotiating', terms: '20% referral' } }));
ok('partner change saved', res.status === 200);
ok('…in Redis', (fake.data.get('tradescope:partners') ?? '').includes('negotiating'));
res = await partnersRoute.GET(req('GET'));
let body = (await res.json()) as { partners: Array<{ id: string; deal: { status: string } }>; writable: boolean };
ok('read back from Redis, writable', body.writable && body.partners.find((p) => p.id === id)?.deal.status === 'negotiating');

// ---- a damaged document is never overwritten ---------------------------------------------------------------------
fake.data.set('tradescope:settings', '{"format":1,"salt":');
await settings.loadSettings(true);
st = settings.storageState();
ok('damaged settings: not writable', !st.writable && 'reason' in st && st.reason === 'file-corrupt', st);
r = await settings.updateSettings({ PRICE_CASE_KRW: '1' });
ok('…save refused, document untouched', !r.ok && fake.data.get('tradescope:settings') === '{"format":1,"salt":');
fake.data.delete('tradescope:settings');

// ---- Redis unreachable: last good copy kept, saving refused -------------------------------------------------------
await settings.updateSettings({ PRICE_CASE_KRW: '510000' });
fake.failWith = 503;
await settings.loadSettings(true);
ok('outage: last values still served', settings.getSetting('PRICE_CASE_KRW') === '510000');
st = settings.storageState();
ok('outage: not writable (kv-error)', !st.writable && 'reason' in st && st.reason === 'kv-error');
r = await settings.updateSettings({ PRICE_CASE_KRW: '2' });
ok('outage: save refused', !r.ok);
res = await partnersRoute.GET(req('GET'));
ok('outage: partner list answers an error instead of an empty list', res.status === 500);
fake.failWith = null;
await settings.loadSettings(true);
ok('recovered: writable again', settings.storageState().writable);

// ---- wrong token ---------------------------------------------------------------------------------------------------
process.env.KV_REST_API_TOKEN = 'wrong';
await settings.loadSettings(true);
ok('wrong token: not writable', !settings.storageState().writable);
process.env.KV_REST_API_TOKEN = fake.token;

// ---- connection settings: a complete pair from one provider, HTTPS (plain HTTP to this machine only) ---------------
const { kvConfig } = await import('@/lib/store/kv');
const env = (vars: Record<string, string | undefined>, fn: () => void) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
};
const none = { KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };
env({ ...none, KV_REST_API_URL: 'https://a.upstash.io', UPSTASH_REDIS_REST_URL: 'https://b.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tb' }, () =>
  ok('half a Vercel pair: the complete Upstash pair is used, never mixed', kvConfig()?.url === 'https://b.upstash.io' && kvConfig()?.token === 'tb'),
);
env({ ...none, KV_REST_API_TOKEN: 'ta' }, () => ok('a token alone: no Redis', kvConfig() === null));
env({ ...none, KV_REST_API_URL: 'http://redis.example.com', KV_REST_API_TOKEN: 'ta', NODE_ENV: 'development' }, () =>
  ok('plain HTTP to another host: refused even outside production (the token would travel in clear)', kvConfig() === null),
);
env({ ...none, KV_REST_API_URL: 'http://127.0.0.1:8079', KV_REST_API_TOKEN: 'ta', NODE_ENV: 'production' }, () => ok('plain HTTP to this machine: allowed', kvConfig() !== null));
env({ ...none, KV_REST_API_URL: 'not a url', KV_REST_API_TOKEN: 'ta' }, () => ok('invalid URL: no Redis', kvConfig() === null));

// ---- refresher: shared reads, and an older read never replaces a newer one ---------------------------------------
const { refresher } = await import('@/lib/store/refresh');
let reads = 0;
const gates: Array<(v: string) => void> = [];
let installed = '';
const rf = refresher<string>({ read: () => (reads++, new Promise<string>((r) => gates.push(r))), apply: (v) => (installed = v), ttlMs: 60_000 });
const first = rf.refresh();
const second = rf.refresh();
ok('concurrent callers share one read', reads === 1);
const forced = rf.refresh(true);
ok('force starts a new read', reads === 2);
gates[1]('new');
await forced;
gates[0]('old');
await Promise.all([first, second]);
ok('the older read finishing last is discarded', installed === 'new');
const third = rf.refresh(true);
rf.set('written');
gates[2]('stale');
await third;
ok('a value just written wins over a read still in flight', installed === 'written');
await rf.refresh();
ok('fresh within the TTL: no read', reads === 3);

// ---- the per-request refresh is bounded: slow Redis never holds a request long ----------------------------------
const { prepareRequest, PREPARE_BUDGET_MS } = await import('@/lib/store/prepare');
settings.resetSettingsCacheForTest();
fake.delayMs = 4000;
let t0 = Date.now();
await prepareRequest();
const waited = Date.now() - t0;
ok('slow Redis: the request goes on after the budget', waited >= PREPARE_BUDGET_MS - 50 && waited < PREPARE_BUDGET_MS + 1000, waited);
const health = await import('@/app/api/health/route');
settings.resetSettingsCacheForTest();
t0 = Date.now();
res = await health.GET();
ok('health check answers within the Docker timeout while Redis hangs', res.status === 200 && Date.now() - t0 < 3000, Date.now() - t0);
fake.delayMs = 0;
await new Promise((r) => setTimeout(r, 4200)); // let the slow reads finish before closing

// ---- admin routes: no storage read without a validly signed session --------------------------------------------
settings.resetSettingsCacheForTest();
let before = fake.calls.length;
res = await partnersRoute.GET(new Request('http://localhost/api/admin/partners', { headers: { cookie: `${auth.SESSION_COOKIE}=forged.token.value` } }));
ok('forged cookie: 401 without touching Redis', res.status === 401 && fake.calls.length === before);
before = fake.calls.length;
res = await partnersRoute.GET(new Request('http://localhost/api/admin/partners'));
ok('no cookie: 401 without touching Redis', res.status === 401 && fake.calls.length === before);

await fake.close();
done('kv store');
