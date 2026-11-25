/* Admin sign-out: a signed-out cookie stops working, "sign out everywhere" ends earlier sessions, storage modes. */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { done, ok } from './assert';

process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.ADMIN_SECRET = 'admin-session-test-secret-0123456789';

const auth = await import('@/lib/admin/auth');
const revocation = await import('@/lib/admin/revocation');
const route = await import('@/app/api/admin/session/route');

const dir = process.env.TRADESCOPE_DATA_DIR!;
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(dir, 'admin-sessions.json');
const ORIGIN = 'http://localhost';
const withCookie = (token: string, init: RequestInit = {}, url = `${ORIGIN}/api/admin/session`) =>
  new Request(url, { ...init, headers: { cookie: `${auth.SESSION_COOKIE}=${token}`, origin: ORIGIN, host: 'localhost', ...(init.headers ?? {}) } });
const valid = (token: string) => auth.sessionExpiry(withCookie(token)) !== null;

// ---- signing out one session ----------------------------------------------------------------------------------
const a = auth.issueSession().token;
const b = auth.issueSession().token;
ok('fresh sessions are valid', valid(a) && valid(b));
let res = await route.DELETE(withCookie(a, { method: 'DELETE' }));
let body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('sign-out answers ok, stored in the data folder', res.status === 200 && body.ok && body.revoked === 'stored', body);
ok('sign-out clears the cookie', /Max-Age=0/.test(res.headers.get('set-cookie') ?? ''));
ok('the signed-out cookie no longer works (a copy cannot be reused)', !valid(a));
ok('other sessions keep working', valid(b));
ok('file mode 0600', process.platform === 'win32' || (statSync(file).mode & 0o777) === 0o600);

// a request with an already signed-out or missing cookie still gets a cleared cookie
res = await route.DELETE(withCookie(a, { method: 'DELETE' }));
body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('signing out a dead session is harmless', res.status === 200 && body.revoked === null);

// cross-site requests are refused
res = await route.DELETE(withCookie(b, { method: 'DELETE', headers: { origin: 'https://evil.example' } }));
ok('cross-origin sign-out refused', res.status === 403 && valid(b));

// ---- signing out everywhere ------------------------------------------------------------------------------------
const c = auth.issueSession().token;
res = await route.DELETE(withCookie(a, { method: 'DELETE' }, `${ORIGIN}/api/admin/session?all=1`));
ok('sign out everywhere needs a live session', res.status === 401 && valid(b) && valid(c));
res = await route.DELETE(withCookie(b, { method: 'DELETE' }, `${ORIGIN}/api/admin/session?all=1`));
body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('sign out everywhere ok', res.status === 200 && body.ok && body.revoked === 'stored', body);
ok('every earlier session ends, the caller’s too', !valid(b) && !valid(c));
await new Promise((r) => setTimeout(r, 2));
const d = auth.issueSession().token;
ok('signing in again works afterwards', valid(d));

// ---- the state is shared through the file (another process sees the sign-out) ---------------------------------
revocation.resetRevocationForTest();
ok('after a restart the earlier sign-outs still hold', !valid(b) && !valid(c) && valid(d));

// ---- a damaged file fails closed but does not lock the admin out -----------------------------------------------
writeFileSync(file, '{"format":1,"notBefore":');
ok('damaged file: existing sessions end', !valid(d));
ok('damaged file is set aside', readdirSync(dir).some((f) => f.startsWith('admin-sessions.json.corrupt-')));
await new Promise((r) => setTimeout(r, 2));
const e = auth.issueSession().token;
ok('damaged file: signing in again works', valid(e));
// raw JSON: an object literal would drop `__proto__` instead of writing it as a key
writeFileSync(file, '{"format":1,"notBefore":0,"revoked":{"__proto__":1,"constructor":2,"toString":3}}');
ok('odd keys in the file do not revoke unrelated sessions', valid(e));
ok('odd keys are read as plain entries', !revocation.isRevoked('hasOwnProperty', Date.now()) && revocation.isRevoked('__proto__', Date.now()));

// ---- several processes signing out at the same moment keep each other's sign-outs -------------------------------
const WORKERS = 4;
const EACH = 40;
const startAt = Date.now() + 1500;
const runs = await Promise.all(
  Array.from({ length: WORKERS }, (_, w) => {
    const child = spawn(process.execPath, [path.join(here, 'load.mjs'), path.join(here, 'revoke-worker.ts'), String(w), String(EACH), String(startAt)], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    return new Promise<{ code: number | null; out: string }>((r) => child.on('close', (code) => r({ code, out })));
  }),
);
ok('concurrent workers finished', runs.every((r) => r.code === 0), runs);
ok('every concurrent sign-out was stored', runs.every((r) => r.out === '["stored"]'), runs.map((r) => r.out));
const onDisk = JSON.parse(readFileSync(file, 'utf8')) as { revoked: Record<string, number> };
const missing = Array.from({ length: WORKERS * EACH }, (_, i) => `w${Math.floor(i / EACH)}-${i % EACH}`).filter((k) => !(k in onDisk.revoked));
ok('no concurrent sign-out was overwritten by another process', missing.length === 0, missing.slice(0, 5));
ok('the lock is released', !existsSync(`${file}.lock`));

// ---- a lock left by a crashed process is taken over --------------------------------------------------------------
writeFileSync(`${file}.lock`, '');
const old = new Date(Date.now() - 60_000);
utimesSync(`${file}.lock`, old, old);
const staleTok = auth.issueSession().token;
res = await route.DELETE(withCookie(staleTok, { method: 'DELETE' }));
body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('stale lock: sign-out still stored', body.revoked === 'stored' && !valid(staleTok) && !existsSync(`${file}.lock`), body);

// ---- a lock that is not released: the sign-out holds in this process and is saved with the next one --------------
writeFileSync(`${file}.lock`, '');
const busyA = auth.issueSession().token;
const busyB = auth.issueSession().token;
const warn = console.warn;
console.warn = () => undefined;
const t0 = Date.now();
res = await route.DELETE(withCookie(busyA, { method: 'DELETE' }));
console.warn = warn;
body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('busy lock: reported as memory only, after a bounded wait', body.revoked === 'memory' && Date.now() - t0 < 5000, body);
ok('busy lock: the signed-out cookie is still refused here', !valid(busyA) && valid(busyB));
unlinkSync(`${file}.lock`);
res = await route.DELETE(withCookie(busyB, { method: 'DELETE' }));
body = (await res.json()) as { ok: boolean; revoked: string | null };
revocation.resetRevocationForTest();
ok('the next stored sign-out also saves the earlier one', body.revoked === 'stored' && !valid(busyA) && !valid(busyB) && valid(e), body);

// ---- read-only hosting: kept in memory -------------------------------------------------------------------------
process.env.SETTINGS_READONLY = '1';
revocation.resetRevocationForTest();
const f = auth.issueSession().token;
res = await route.DELETE(withCookie(f, { method: 'DELETE' }));
body = (await res.json()) as { ok: boolean; revoked: string | null };
ok('read-only: sign-out kept in memory', body.revoked === 'memory' && !valid(f));
delete process.env.SETTINGS_READONLY;

// ---- tampered tokens -------------------------------------------------------------------------------------------
const g = auth.issueSession().token;
const [exp, nonce, mac] = g.split('.');
ok('a changed expiry breaks the signature', !valid(`${Number(exp) + 3600}.${nonce}.${mac}`));
ok('a changed nonce breaks the signature', !valid(`${exp}.x${nonce.slice(1)}.${mac}`));
ok('nonce carries the issue time', /^[0-9a-z]+~[A-Za-z0-9_-]+$/.test(nonce), nonce);
// sessions issued in the same second as a sign-out everywhere are still ended
const h1 = auth.issueSession().token;
const h2 = auth.issueSession().token;
res = await route.DELETE(withCookie(h1, { method: 'DELETE' }, `${ORIGIN}/api/admin/session?all=1`));
ok('same-second sessions end too', res.status === 200 && !valid(h1) && !valid(h2));

done('admin sessions');
