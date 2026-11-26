/* Partner pipeline: admin-only routes, contracted-only public list, validation, storage modes. */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { done, ok } from './assert';

process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.ADMIN_SECRET = 'partners-test-secret-0123456789abcdef';

const auth = await import('@/lib/admin/auth');
const route = await import('@/app/api/admin/partners/route');
const pub = await import('@/app/api/partners/route');
const { PARTNER_CANDIDATES } = await import('@/data/partner-candidates');

const dir = process.env.TRADESCOPE_DATA_DIR!;
const file = path.join(dir, 'partners.json');
const ORIGIN = 'http://localhost';
const token = auth.issueSession().token;
const req = (method: string, body?: unknown, query = '', headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/admin/partners${query}`, {
    method,
    headers: { cookie: `${auth.SESSION_COOKIE}=${token}`, origin: ORIGIN, host: 'localhost', 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const json = async (r: Response) => (await r.json()) as Record<string, any>;

// ---- auth ------------------------------------------------------------------------------------------------------
let res = await route.GET(new Request(`${ORIGIN}/api/admin/partners`));
ok('list needs a session', res.status === 401);
res = await route.POST(req('POST', { firm: { country: 'PH', type: 'law', name: 'X' } }, '', { origin: 'https://evil.example' }));
ok('cross-origin write refused', res.status === 403);

// ---- list ------------------------------------------------------------------------------------------------------
res = await route.GET(req('GET'));
let body = await json(res);
ok('list ok, writable', res.status === 200 && body.ok && body.writable === true, body);
ok('every researched candidate listed as a candidate', body.partners.length === PARTNER_CANDIDATES.length && body.partners.every((p: any) => p.deal.status === 'candidate'));

// ---- add, validate ---------------------------------------------------------------------------------------------
res = await route.POST(req('POST', { firm: { country: 'XX', type: 'bank', name: '', website: 'http://plain.example' } }));
body = await json(res);
ok('invalid firm rejected with per-field errors', res.status === 400 && body.errors.country && body.errors.type && body.errors.name && body.errors.website === 'not-https-url', body);
res = await route.POST(req('POST', { firm: { country: 'PH', type: 'customs', name: '  Manila Brokers Inc.  ', city: 'Manila', website: 'https://brokers.example', practice: 'BOC clearance, FDA permits · BAI', why: 'test' } }));
body = await json(res);
const added = body.firm;
ok('firm added with a custom id', res.status === 200 && added.id.startsWith('c-') && added.name === 'Manila Brokers Inc.' && added.practice.length === 3, body);
ok('file mode 0600', process.platform === 'win32' || (statSync(file).mode & 0o777) === 0o600);

// ---- pipeline and public list ----------------------------------------------------------------------------------
res = await pub.GET();
ok('public list empty before a contract', (await json(res)).partners.length === 0);
res = await route.PATCH(req('PATCH', { id: added.id, deal: { status: 'contracted', contactName: 'A. Cruz', contactEmail: 'a@brokers.example', terms: '15% of fee', contractDate: '2026-12-01', notes: 'signed', bogus: 1 } }));
body = await json(res);
ok('deal saved', res.status === 200 && body.deal.status === 'contracted' && body.deal.contractDate === '2026-12-01' && !('bogus' in body.deal), body);
res = await pub.GET();
body = await json(res);
ok('public list: contracted firm only', body.partners.length === 1 && body.partners[0].name === 'Manila Brokers Inc.');
ok('public list never carries contacts, terms or notes', !JSON.stringify(body).includes('Cruz') && !JSON.stringify(body).includes('15%') && !JSON.stringify(body).includes('signed'));
res = await route.PATCH(req('PATCH', { id: added.id, deal: { status: 'nonsense', contractDate: '1 Dec' } }));
body = await json(res);
ok('unknown status and bad date are cleaned', body.deal.status === 'candidate' && body.deal.contractDate === '');
res = await route.PATCH(req('PATCH', { id: 'nope', deal: { status: 'contacted' } }));
ok('unknown id → 404', res.status === 404);
res = await route.PATCH(req('PATCH', { id: '__proto__', deal: { status: 'contracted' } }));
ok('prototype key is not a firm', res.status === 404);
if (PARTNER_CANDIDATES.length) {
  res = await route.PATCH(req('PATCH', { id: PARTNER_CANDIDATES[0].id, deal: { status: 'contacted' } }));
  ok('researched candidate can move along the pipeline', (await json(res)).deal.status === 'contacted');
  res = await route.DELETE(req('DELETE', undefined, `?id=${PARTNER_CANDIDATES[0].id}`));
  ok('researched candidates cannot be deleted', res.status === 404);
}

// ---- remove ----------------------------------------------------------------------------------------------------
res = await route.DELETE(req('DELETE', undefined, `?id=${added.id}`));
ok('custom firm removed', res.status === 200);
ok('its deal is gone from the file', !readFileSync(file, 'utf8').includes(added.id));

// ---- damaged file is never overwritten ---------------------------------------------------------------------------
writeFileSync(file, '{"format":1,"deals":');
res = await route.GET(req('GET'));
ok('damaged file → 500 file-corrupt', res.status === 500 && (await json(res)).error === 'file-corrupt');
res = await route.POST(req('POST', { firm: { country: 'PH', type: 'law', name: 'Y' } }));
ok('…and writes refuse instead of overwriting it', res.status === 500 && readFileSync(file, 'utf8') === '{"format":1,"deals":');
res = await pub.GET();
ok('public list degrades to empty', (await json(res)).partners.length === 0);
writeFileSync(file, JSON.stringify({ format: 1, deals: {}, custom: [] }));

// ---- read-only hosting -----------------------------------------------------------------------------------------
process.env.SETTINGS_READONLY = '1';
res = await route.POST(req('POST', { firm: { country: 'PH', type: 'law', name: 'Z' } }));
ok('read-only: writes answer 409', res.status === 409 && (await json(res)).error === 'read-only');
res = await route.GET(req('GET'));
ok('read-only: list still works, flagged', (await json(res)).writable === false);
delete process.env.SETTINGS_READONLY;

// ---- the researched list itself -----------------------------------------------------------------------------------
const { PARTNER_COUNTRIES, PARTNER_TYPES } = await import('@/lib/partners/types');
ok('candidate ids are unique and never look like custom ids', new Set(PARTNER_CANDIDATES.map((c) => c.id)).size === PARTNER_CANDIDATES.length && PARTNER_CANDIDATES.every((c) => !c.id.startsWith('c-')));
ok('candidates: valid country and type, https website and sources', PARTNER_CANDIDATES.every((c) => PARTNER_COUNTRIES.includes(c.country) && PARTNER_TYPES.includes(c.type) && c.website.startsWith('https://') && c.sources.length > 0 && c.sources.every((u) => u.startsWith('https://'))));
ok('Philippines and Korea covered for both firm types', ['PH-law', 'PH-customs', 'KR-law', 'KR-customs'].every((k) => PARTNER_CANDIDATES.some((c) => `${c.country}-${c.type}` === k)));

done('partners');
