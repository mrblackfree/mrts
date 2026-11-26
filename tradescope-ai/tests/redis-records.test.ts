/* Records the server keeps for itself on serverless hosting (Redis): expert requests, admin sign-outs and metric
   counts persist and are shared between instances; damaged or unreachable storage never loses requests and never
   lets a signed-out session back in. */
import { done, ok } from './assert';
import { startFakeUpstash } from './fake-upstash';

const fake = await startFakeUpstash();
process.env.KV_REST_API_URL = fake.url;
process.env.KV_REST_API_TOKEN = fake.token;
process.env.VERCEL = '1';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.ADMIN_SECRET = 'redis-records-test-secret-0123456789ab';
delete process.env.CONSULT_WEBHOOK_URL;
// keep console quiet for the expected outage warnings
console.warn = () => {};

const settings = await import('@/lib/settings');
const consultStore = await import('@/lib/consult/store');
const consultRoute = await import('@/app/api/consult/route');
const revocation = await import('@/lib/admin/revocation');
const auth = await import('@/lib/admin/auth');
const sessionRoute = await import('@/app/api/admin/session/route');
const metrics = await import('@/lib/metrics/store');
const metricsRoute = await import('@/app/api/metrics/route');
const { prepareRequest } = await import('@/lib/store/prepare');

const st = settings.recordStorageState();
ok('Vercel + Redis: records are kept', st.writable && st.backend === 'kv', st);

// ---- expert requests ------------------------------------------------------------------------------------------
const HASH = 'tradescope:consult-requests';
const input = { name: 'Kim', company: '', email: 'kim@example.com', phone: '', topic: 't', serviceIds: [] as string[], message: 'm', lang: 'ko' as const };
const a = await consultStore.appendRequest(input);
ok('stored in the Redis hash under its id', fake.hashes.get(HASH)?.has(a.id) === true && /^TS-[A-HJ-NP-Z2-9]{8}$/.test(a.id));
ok('empty list stays a list', JSON.parse(fake.hashes.get(HASH)!.get(a.id)!).serviceIds.length === 0);
await new Promise((r) => setTimeout(r, 5));
const b = await consultStore.appendRequest({ ...input, name: 'Lee' });
fake.hashes.get(HASH)!.set('TS-DAMAGED', '{"id":"TS-DAMAGED","name":"half');
let list = await consultStore.listRequests();
ok('newest first, damaged record skipped', list.length === 2 && list[0].id === b.id && list[1].id === a.id, list.map((r) => r.id));
ok('status change', (await consultStore.updateStatus(a.id, 'contacted')) && (await consultStore.listRequests()).find((r) => r.id === a.id)?.status === 'contacted');
const after = JSON.parse(fake.hashes.get(HASH)!.get(a.id)!);
ok('only the status changed', after.name === 'Kim' && after.createdAt === a.createdAt && after.message === 'm');
ok('damaged record kept as it was', fake.hashes.get(HASH)!.get('TS-DAMAGED') === '{"id":"TS-DAMAGED","name":"half');
ok('unknown id → false', (await consultStore.updateStatus('TS-NOPE0000', 'done')) === false);
ok('damaged record → false, untouched', (await consultStore.updateStatus('TS-DAMAGED', 'done')) === false && fake.hashes.get(HASH)!.get('TS-DAMAGED')!.endsWith('half'));

// the public route takes requests on Vercel without a webhook now
const body = { name: 'Park', email: 'park@example.com', consent: true, serviceIds: ['ph-fda-food'], topic: 'FDA', lang: 'ko' };
const post = async () => {
  const res = await consultRoute.POST(new Request('http://localhost/api/consult', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify(body) }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
};
ok('GET: accepting on Vercel with Redis, no webhook', ((await (await consultRoute.GET()).json()) as { accepting: boolean }).accepting === true);
let r = await post();
ok('POST stored in Redis', r.status === 200 && typeof r.json.id === 'string' && fake.hashes.get(HASH)!.has(r.json.id as string), r);
fake.failWith = 503;
r = await post();
fake.failWith = null;
ok('Redis down, no webhook → 503 storage-error (the trader is told, nothing is claimed)', r.status === 503 && r.json.error === 'storage-error', r);

// ---- admin sign-outs ------------------------------------------------------------------------------------------
const DOC = 'tradescope:admin-sessions';
const ORIGIN = 'http://localhost';
const withCookie = (token: string, init: RequestInit = {}, url = `${ORIGIN}/api/admin/session`) =>
  new Request(url, { ...init, headers: { cookie: `${auth.SESSION_COOKIE}=${token}`, origin: ORIGIN, host: 'localhost', ...(init.headers ?? {}) } });
const valid = (token: string) => auth.sessionExpiry(withCookie(token)) !== null;

revocation.resetRevocationForTest();
const s1 = auth.issueSession().token;
ok('fails closed before the first load (sign-outs elsewhere unknown)', !valid(s1));
await prepareRequest();
ok('after loading an empty store: valid', valid(s1));

let res = await sessionRoute.DELETE(withCookie(s1, { method: 'DELETE' }));
let out = (await res.json()) as { revoked: string | null };
ok('sign-out stored in Redis', out.revoked === 'stored' && Object.keys(JSON.parse(fake.data.get(DOC)!).revoked).length === 1, out);
ok('signed-out cookie rejected here', !valid(s1));
// another instance: no memory of its own, reads Redis
revocation.resetRevocationForTest();
await revocation.loadRevocations();
ok('…and on another instance', !valid(s1));

// several instances signing out at once: compare-and-set keeps every one
const exp = Math.floor(Date.now() / 1000) + 3600;
const where = await Promise.all(Array.from({ length: 5 }, (_, i) => revocation.revokeSession(`par-${i}`, exp)));
const revokedNow = JSON.parse(fake.data.get(DOC)!).revoked as Record<string, number>;
ok('concurrent sign-outs all stored', where.every((w) => w === 'stored') && Array.from({ length: 5 }, (_, i) => `par-${i}`).every((k) => k in revokedNow), where);

// sign out everywhere
const s2 = auth.issueSession().token;
const s3 = auth.issueSession().token;
res = await sessionRoute.DELETE(withCookie(s2, { method: 'DELETE' }, `${ORIGIN}/api/admin/session?all=1`));
out = (await res.json()) as { revoked: string | null };
revocation.resetRevocationForTest();
await revocation.loadRevocations();
ok('sign out everywhere: stored and seen by another instance', out.revoked === 'stored' && !valid(s2) && !valid(s3), out);
await new Promise((r) => setTimeout(r, 3));
const s4 = auth.issueSession().token;
ok('a new sign-in afterwards works', valid(s4));

// Redis down: the sign-out still holds in this process
fake.failWith = 503;
res = await sessionRoute.DELETE(withCookie(s4, { method: 'DELETE' }));
out = (await res.json()) as { revoked: string | null };
ok('Redis down: kept in memory, cookie rejected here', out.revoked === 'memory' && !valid(s4), out);
const s5 = auth.issueSession().token;
ok('a short outage keeps the last copy (fresh sessions still work)', valid(s5));
const realNow = Date.now;
Date.now = () => realNow() + 61_000;
await revocation.loadRevocations(true); // fails: Redis is down
ok('no answer from Redis for a minute → fail closed', !valid(s5));
Date.now = realNow;
fake.failWith = null;
await revocation.loadRevocations(true);
ok('Redis back → sessions work again', valid(s5));

// a damaged document ends every earlier session once, for every instance
fake.data.set(DOC, 'not json');
revocation.resetRevocationForTest();
await revocation.loadRevocations();
const repaired = JSON.parse(fake.data.get(DOC)!) as { format: number; notBefore: number };
ok('damaged document replaced by a fail-closed one', repaired.format === 1 && repaired.notBefore > 0 && !valid(s5));
await new Promise((r) => setTimeout(r, 3));
const s6 = auth.issueSession().token;
revocation.resetRevocationForTest();
await revocation.loadRevocations();
ok('…signing in again works, on any instance', valid(s6));

// ---- metrics --------------------------------------------------------------------------------------------------
const day = new Date().toISOString().slice(0, 10);
const H = `tradescope:metrics:${day}`;
const HC = `${H}:ch`;
await metrics.countMetrics(['a', 'a', 'b', 'ch:kotra:visit']);
ok('counted in today’s Redis hashes', fake.hashes.get(H)?.get('a') === '2' && fake.hashes.get(H)?.get('b') === '1' && fake.hashes.get(HC)?.get('ch:kotra:visit') === '1');
const until = Date.parse(`${day}T00:00:00Z`) / 1000 + 400 * 86_400;
ok('days expire when they leave the 400-day window', fake.expiries.get(H) === until && fake.expiries.get(HC) === until);
ok('nothing to flush with Redis', metrics.flushMetrics() === false);
let sum = await metrics.metricsSummary(7);
ok('summary from Redis, persistent', sum.persistent && sum.totals.a === 2 && sum.totals['ch:kotra:visit'] === 1, sum.totals);

// an older day in the window, and one outside it
const ago = (n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
fake.hashes.set(`tradescope:metrics:${ago(3)}`, new Map([['a', '5']]));
fake.hashes.set(`tradescope:metrics:${ago(30)}`, new Map([['a', '100']]));
ok('7 days: today + 3 days ago', (await metrics.metricsSummary(7)).totals.a === 7);
ok('1 day: today only', (await metrics.metricsSummary(1)).totals.a === 2);
sum = await metrics.metricsSummary(400);
ok('400 days (pipelined in chunks): everything', sum.totals.a === 107 && sum.daily.length === 3, sum.daily.map((d) => d.date));

// budgets per day, as with the data folder
await metrics.countMetrics(Array.from({ length: 1100 }, (_, i) => `ch:c${i}:visit`));
await metrics.countMetrics(['consult_first:card']);
ok('at most 1000 channel keys a day', fake.hashes.get(HC)!.size === 1000);
ok('verdict counters still counted after the channel budget is spent', fake.hashes.get(H)!.get('consult_first:card') === '1');
await metrics.countMetrics(Array.from({ length: 1100 }, (_, i) => `k${i}`));
ok('at most 1000 other keys a day', fake.hashes.get(H)!.size === 1000);
await metrics.countMetrics(['a', 'ch:kotra:visit']);
ok('existing keys still count at the cap', fake.hashes.get(H)!.get('a') === '3' && fake.hashes.get(HC)!.get('ch:kotra:visit') === '2');

// the beacon route writes to Redis
fake.hashes.delete(H);
fake.hashes.delete(HC);
res = await metricsRoute.POST(new Request('http://localhost/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [{ e: 'visit' }], ch: 'KOTRA' }) }));
ok('beacon counted in Redis', res.status === 204 && fake.hashes.get(H)?.get('visit') === '1' && fake.hashes.get(HC)?.get('ch:kotra:visit') === '1');

// Redis down: counting never fails a request; reading the summary does fail (shown as an error, not as zeros)
fake.failWith = 503;
let threw = false;
try {
  await metrics.countMetrics(['lost']);
} catch {
  threw = true;
}
ok('Redis down: counting does not throw', !threw);
threw = false;
try {
  await metrics.metricsSummary(7);
} catch {
  threw = true;
}
ok('Redis down: summary throws instead of showing zeros', threw);
fake.failWith = null;

// read-only flag: counts stay in memory, as with a read-only data folder
process.env.SETTINGS_READONLY = '1';
const before = fake.calls.length;
await metrics.countMetrics(['ro']);
ok('read-only: nothing sent to Redis', fake.calls.length === before);
ok('read-only: summary in memory, not persistent', (await metrics.metricsSummary(1)).persistent === false && (await metrics.metricsSummary(1)).totals.ro === 1);
delete process.env.SETTINGS_READONLY;

await fake.close();
done('redis records');
