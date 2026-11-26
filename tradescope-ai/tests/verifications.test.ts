/* Verified values saved on the admin page: validated against the product, applied to the product data right
   away (score rises), public list carries only active entries, expiry and removal undo the effect. */
import { done, ok } from './assert';

process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.ADMIN_SECRET = 'verifications-test-secret-0123456789ab';

const auth = await import('@/lib/admin/auth');
const route = await import('@/app/api/admin/verifications/route');
const pub = await import('@/app/api/verifications/route');
const db = await import('@/data/kr-ph-trade-db');
const { validateEntry } = await import('@/data/official/validate-entry');
const { todayIso } = await import('@/lib/format');

const today = todayIso();
const token = auth.issueSession().token;
const req = (method: string, body?: unknown, query = '', origin = 'http://localhost') =>
  new Request(`http://localhost/api/admin/verifications${query}`, { method, headers: { cookie: `${auth.SESSION_COOKIE}=${token}`, origin, host: 'localhost', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const json = async (r: Response) => (await r.json()) as Record<string, any>;

const product = db.PRODUCTS.find((p) => p.requirements.length > 0 && p.partners.length > 0)!;
const scoreOf = () => db.getProduct(product.id)!.verification!.score;
const before = scoreOf();
const reqItem = () => db.getProduct(product.id)!.verification!.items.find((i) => i.key === `req:${product.requirements[0].id}`)!;
ok('requirement starts unverified', reqItem().level === 'seed');

const entry = { productId: product.id, target: { type: 'requirement', id: product.requirements[0].id }, source: 'Law firm review memo', reference: 'MEMO-2026-118', verifiedBy: 'Partner law firm (PH)', verifiedAt: today };

// ---- validation ----------------------------------------------------------------------------------------------------
ok('unknown product rejected', !validateEntry({ ...entry, productId: 'nope' }, db.PRODUCTS).ok);
ok('foreign requirement id rejected', !validateEntry({ ...entry, target: { type: 'requirement', id: 'not-a-req' } }, db.PRODUCTS).ok);
ok('placeholder source rejected', !validateEntry({ ...entry, verifiedBy: '관세사 OOO' }, db.PRODUCTS).ok);
ok('future date rejected', !validateEntry({ ...entry, verifiedAt: '2999-01-01' }, db.PRODUCTS).ok);
ok('impossible date rejected', !validateEntry({ ...entry, verifiedAt: '2026-02-31' }, db.PRODUCTS).ok);
ok('expired validity rejected', !validateEntry({ ...entry, validUntil: '2000-01-01' }, db.PRODUCTS).ok);
const scheme = product.tariffs.find((t) => t.scheme !== 'MFN')!.scheme;
ok('tariff: rate 0–100 and a scheme of the table', validateEntry({ ...entry, target: { type: 'tariff', scheme, rate: 0 } }, db.PRODUCTS).ok && !validateEntry({ ...entry, target: { type: 'tariff', scheme, rate: 101 } }, db.PRODUCTS).ok);
ok('lane index must exist', !validateEntry({ ...entry, target: { type: 'logistics', index: 99, cost: [1, 2] } }, db.PRODUCTS).ok);
const extra = validateEntry({ ...entry, extra: 'x', target: { ...entry.target, evil: 1 } }, db.PRODUCTS);
ok('unknown fields are dropped', extra.ok && !('extra' in extra.entry) && !('evil' in extra.entry.target));

// ---- auth --------------------------------------------------------------------------------------------------------
let res = await route.POST(new Request('http://localhost/api/admin/verifications', { method: 'POST', body: JSON.stringify({ entry }) }));
ok('saving needs a session', res.status === 401);
res = await route.POST(req('POST', { entry }, '', 'https://evil.example'));
ok('cross-origin save refused', res.status === 403);

// ---- save → applied ------------------------------------------------------------------------------------------------
res = await route.POST(req('POST', { entry: { ...entry, source: '' } }));
let body = await json(res);
ok('invalid entry: 400 with reasons', res.status === 400 && body.errors.some((e: string) => e.startsWith('source')));
res = await route.POST(req('POST', { entry }));
body = await json(res);
const savedId = body.item?.id;
ok('valid entry saved', res.status === 200 && /^v-[0-9a-f]{12}$/.test(savedId), body);
ok('applied right away: requirement verified', reqItem().level === 'verified');
ok('…and the product score rose', scoreOf() > before, { before, after: scoreOf() });
res = await pub.GET();
body = await json(res);
ok('public list carries the active entry', body.entries.length === 1 && body.entries[0].reference === 'MEMO-2026-118' && !('id' in body.entries[0]));

// a second instance (fresh module state) applies the same entries on its first request
db.applyRuntimeOverrides([]);
ok('reset: back to seed', reqItem().level === 'seed');
const { loadVerifications } = await import('@/lib/verifications/store');
await loadVerifications(true);
ok('loaded again from the store', reqItem().level === 'verified');

// ---- list, remove ----------------------------------------------------------------------------------------------------
res = await route.GET(req('GET'));
body = await json(res);
ok('admin list', body.items.length === 1 && body.items[0].id === savedId && body.writable === true);
res = await route.DELETE(req('DELETE', undefined, `?id=${savedId}`));
ok('removed', res.status === 200);
ok('effect undone', reqItem().level === 'seed' && scoreOf() === before);
res = await route.DELETE(req('DELETE', undefined, '?id=v-000000000000'));
ok('unknown id → 404', res.status === 404);

// ---- an entry that has expired since it was saved no longer applies ------------------------------------------------
const store = await import('@/lib/verifications/store');
ok('expired entries are filtered', store.activeEntries([{ id: 'v-1', savedAt: '', entry: { ...entry, validUntil: '2001-01-01' } as never }]).length === 0);
ok('entries naming something that no longer exists are filtered', store.activeEntries([{ id: 'v-2', savedAt: '', entry: { ...entry, target: { type: 'requirement', id: 'gone' } } as never }]).length === 0);

// ---- read-only hosting -----------------------------------------------------------------------------------------------
process.env.SETTINGS_READONLY = '1';
res = await route.POST(req('POST', { entry }));
ok('read-only: 409', res.status === 409);
delete process.env.SETTINGS_READONLY;

done('verifications');
