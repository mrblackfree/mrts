/* Verified values saved on the admin page: validated against the product, applied to the product data right
   away (score rises), public list carries only active entries, expiry and removal undo the effect. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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
// the starting level is the seed or, when its law was matched in an official text, a cross-check — never verified
const reqBase = reqItem().level;
ok('requirement starts below verified', reqBase === 'seed' || reqBase === 'crosscheck');

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
ok('reset: back to the starting level', reqItem().level === reqBase);
const { loadVerifications } = await import('@/lib/verifications/store');
await loadVerifications(true);
ok('loaded again from the store', reqItem().level === 'verified');

// ---- list, remove ----------------------------------------------------------------------------------------------------
res = await route.GET(req('GET'));
body = await json(res);
ok('admin list', body.items.length === 1 && body.items[0].id === savedId && body.writable === true);
res = await route.DELETE(req('DELETE', undefined, `?id=${savedId}`));
ok('removed', res.status === 200);
ok('effect undone', reqItem().level === reqBase && scoreOf() === before);
res = await route.DELETE(req('DELETE', undefined, '?id=v-000000000000'));
ok('unknown id → 404', res.status === 404);

// ---- an entry that has expired since it was saved no longer applies ------------------------------------------------
const store = await import('@/lib/verifications/store');
const saved = (id: string, e: Record<string, unknown>) => ({ id, savedAt: '', entry: e as never });
const past = { ...entry, verifiedAt: '2000-06-01' };
ok('control: an old entry still valid today applies', store.activeEntries([saved('v-0', { ...past, validUntil: '2999-01-01' })]).length === 1);
ok('expired entries are filtered (only the expiry differs)', store.activeEntries([saved('v-1', { ...past, validUntil: '2001-01-01' })]).length === 0);
ok('entries naming something that no longer exists are filtered', store.activeEntries([saved('v-2', { ...entry, target: { type: 'requirement', id: 'gone' } })]).length === 0);
const partnerEntry = (until: string) => ({ ...past, target: { type: 'partner', id: product.partners[0].id, license: 'LTO-2000-0451', licenseValidUntil: until } });
ok('partner licence still valid: applies', store.activeEntries([saved('v-3', partnerEntry('2999-01-01'))]).length === 1);
ok('partner licence expired: filtered', store.activeEntries([saved('v-4', partnerEntry('2001-01-01'))]).length === 0);

// the runtime layer itself: a stored entry that has expired is not applied on reload
const docFile = path.join(process.env.TRADESCOPE_DATA_DIR!, 'verifications.json');
writeFileSync(docFile, JSON.stringify({ format: 1, items: [saved('v-exp', { ...past, validUntil: '2001-01-01' })] }));
await store.loadVerifications(true);
ok('reload: an expired stored entry leaves the product at its starting level', reqItem().level === reqBase && scoreOf() === before);
writeFileSync(docFile, JSON.stringify({ format: 1, items: [saved('v-ok', { ...past, validUntil: '2999-01-01' })] }));
await store.loadVerifications(true);
ok('reload: a valid stored entry is applied', reqItem().level === 'verified');

// the public route, from the stored document: an expired licence is left out, a valid one is listed
writeFileSync(docFile, JSON.stringify({ format: 1, items: [saved('v-lic-old', partnerEntry('2001-01-01')), saved('v-lic-ok', partnerEntry('2999-01-01'))] }));
const pubBody = (await (await pub.GET()).json()) as { entries: Array<{ target: { licenseValidUntil?: string } }> };
ok('public list: expired licence left out, valid one listed', pubBody.entries.length === 1 && pubBody.entries[0].target.licenseValidUntil === '2999-01-01', pubBody);

// records this version cannot use are kept, never dropped by a later save or removal
writeFileSync(docFile, JSON.stringify({ format: 1, items: [{ id: 'v-bad' }, 'junk', { id: 'v-notarget', entry: { productId: product.id } }, saved('v-ok', { ...past, validUntil: '2999-01-01' })] }));
res = await route.GET(req('GET'));
body = await json(res);
ok('admin list shows only usable records (no crash on a record without a target)', res.status === 200 && body.items.length === 1 && body.items[0].id === 'v-ok', body);
res = await route.POST(req('POST', { entry }));
const afterAdd = JSON.parse(readFileSync(docFile, 'utf8')) as { items: unknown[] };
ok('a save keeps the unusable records as they were', res.status === 200 && afterAdd.items.length === 5 && afterAdd.items.includes('junk') && afterAdd.items.some((i) => JSON.stringify(i) === '{"id":"v-bad"}'));
res = await route.DELETE(req('DELETE', undefined, '?id=v-ok'));
const afterRemove = JSON.parse(readFileSync(docFile, 'utf8')) as { items: unknown[] };
ok('a removal keeps them too', res.status === 200 && afterRemove.items.length === 4 && afterRemove.items.includes('junk'));

// a save is applied from the written document right away, newer than any read still in flight
const inflight = store.loadVerifications(true);
res = await route.POST(req('POST', { entry: { ...entry, reference: 'MEMO-2026-119' } }));
await inflight;
ok('a read that started before the save does not undo it', res.status === 200 && reqItem().level === 'verified');

// ---- malformed targets are rejected, never read as defaults -------------------------------------------------------
const tariffBase = { ...entry, target: { type: 'tariff', scheme: product.tariffs[0].scheme, rate: 0 } };
ok('tariff without hs: main table', validateEntry(tariffBase, db.PRODUCTS).ok);
for (const bad of [null, 5, '']) ok(`tariff with hs ${JSON.stringify(bad)}: rejected`, !validateEntry({ ...tariffBase, target: { ...tariffBase.target, hs: bad } }, db.PRODUCTS).ok);
const lane = { ...entry, target: { type: 'logistics', index: 0, cost: [100, 200] } };
ok('lane index 0 (a number): accepted', validateEntry(lane, db.PRODUCTS).ok);
for (const bad of [null, '', true, '0']) ok(`lane index ${JSON.stringify(bad)}: rejected`, !validateEntry({ ...lane, target: { ...lane.target, index: bad } }, db.PRODUCTS).ok);

// ---- basis: a value read from an official schedule is shown as official, never as expert-verified ------------
// KRPH: a line the shipped verified-overrides.json does not cover, so clearing runtime entries returns it to the seed
const tariffEntry = { productId: 'banana-chips', target: { type: 'tariff', scheme: 'KRPH', rate: 5, roo: 'CC or RVC 40%' }, source: 'Official schedule', reference: 'Schedule line 2008.99', verifiedBy: 'Data team', verifiedAt: today };
const withBasis = validateEntry({ ...tariffEntry, basis: 'official' }, db.PRODUCTS);
ok("basis 'official' is accepted and kept", withBasis.ok && (withBasis as { entry: { basis?: string } }).entry.basis === 'official');
ok('any other basis is rejected', !validateEntry({ ...tariffEntry, basis: 'expert' }, db.PRODUCTS).ok);
ok('basis only on tariff entries (a requirement with basis is rejected)', !validateEntry({ ...entry, basis: 'official' }, db.PRODUCTS).ok);
const krphItem = () => db.getProduct('banana-chips')!.verification!.items.find((i) => i.key === 'tariff:KRPH')!;
const krphRate = () => db.getProduct('banana-chips')!.tariffs.find((t) => t.scheme === 'KRPH')!;
db.applyRuntimeOverrides([withBasis.ok ? withBasis.entry : (null as never)]);
ok("official-basis entry: level 'official', marked as an official-schedule value", krphItem().level === 'official' && krphRate().overrideBasis === 'official' && krphItem().checkedAt === today);
const expert = validateEntry(tariffEntry, db.PRODUCTS);
db.applyRuntimeOverrides([expert.ok ? expert.entry : (null as never)]);
ok("entry without basis: still 'verified' (expert), as before", krphItem().level === 'verified' && krphRate().overrideBasis === 'expert');
db.applyRuntimeOverrides([]);
ok('cleared: back to the seed level', krphItem().level === 'seed' && krphRate().overrideBasis === undefined);
// the shipped PH Tariff Finder checks carry basis 'official'
const laver = db.getProduct('seasoned-laver')!;
ok("shipped PH schedule checks show as official, not expert-verified", ['AKFTA', 'RCEP', 'KRPH'].every((sc) => laver.verification!.items.find((i) => i.key === `tariff:${sc}`)!.level === 'official'));

// ---- read-only hosting -----------------------------------------------------------------------------------------------
process.env.SETTINGS_READONLY = '1';
res = await route.POST(req('POST', { entry }));
ok('read-only: 409', res.status === 409);
delete process.env.SETTINGS_READONLY;

done('verifications');
