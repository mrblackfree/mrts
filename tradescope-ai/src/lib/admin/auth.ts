/**
 * Admin authentication (server-side only).
 *
 * - Enabled only when ADMIN_PASSWORD (≥ 10 characters) is set in the server environment, and ADMIN_SECRET, when
 *   set, is ≥ 32 characters.
 * - Login issues a signed session cookie: `<expiry>.<nonce>.<HMAC-SHA256>`, HttpOnly + SameSite=Strict (+ Secure
 *   over HTTPS). The HMAC key derives from ADMIN_SECRET and ADMIN_PASSWORD, so changing either signs everyone out.
 * - Signing out revokes the token on the server, and "sign out everywhere" ends every session issued so far
 *   (`revocation.ts`), so a copied cookie stops working too.
 * - Failed logins are rate-limited per client (when the client can be identified) and globally.
 * - State-changing admin requests must come from the same origin (CSRF defence on top of SameSite).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SHARED_CLIENT } from '@/lib/rate-limit';
import { isRevoked } from './revocation';
import { masterSecret, MIN_ADMIN_SECRET } from '@/lib/settings/core.mjs';

export const SESSION_COOKIE = 'ts_admin';
export const SESSION_TTL_S = 8 * 60 * 60;
const MIN_PASSWORD = 10;
/** Upper bound so a sign-in request body can be size-limited without making a valid password impossible. */
export const MAX_PASSWORD = 1024;

export type AdminAvailability = { enabled: true } | { enabled: false; reason: 'not-set' | 'too-short' | 'too-long' | 'secret-too-short' };

export function adminAvailability(): AdminAvailability {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw) return { enabled: false, reason: 'not-set' };
  if (pw.length < MIN_PASSWORD) return { enabled: false, reason: 'too-short' };
  if (pw.length > MAX_PASSWORD) return { enabled: false, reason: 'too-long' };
  const secret = process.env.ADMIN_SECRET?.trim();
  if (secret && secret.length < MIN_ADMIN_SECRET) return { enabled: false, reason: 'secret-too-short' };
  return { enabled: true };
}

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** Constant-time password comparison (hashes first, so lengths never leak). */
export function passwordMatches(candidate: string): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw || adminAvailability().enabled === false) return false;
  return timingSafeEqual(digest(candidate), digest(pw));
}

/** Both secrets go into the key, so rotating either ADMIN_SECRET or ADMIN_PASSWORD invalidates every session. */
function sessionKey(): Buffer {
  return createHash('sha256')
    .update(`tradescope-admin-session\0${masterSecret() ?? ''}\0${process.env.ADMIN_PASSWORD?.trim() ?? ''}`)
    .digest();
}

function sign(payload: string): string {
  return createHmac('sha256', sessionKey()).update(payload).digest('base64url');
}

// The nonce carries the issue time in milliseconds (`<ms base36>~<random>`), inside the signed payload, so a sign-out
// everywhere can end every earlier session exactly. base64url never contains `~`.
const issuedAtMs = (nonce: string, expiresAt: number) => {
  const i = nonce.indexOf('~');
  const ms = i > 0 ? parseInt(nonce.slice(0, i), 36) : NaN;
  return Number.isFinite(ms) ? ms : (expiresAt - SESSION_TTL_S) * 1000;
};

export function issueSession(): { token: string; maxAge: number; expiresAt: number } {
  const now = Date.now();
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_S;
  const payload = `${expiresAt}.${now.toString(36)}~${randomBytes(9).toString('base64url')}`;
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_S, expiresAt };
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}

/** The signed-in session the request carries (valid signature, not expired, not signed out), else null. */
export function currentSession(req: Request): { nonce: string; expiresAt: number } | null {
  if (!adminAvailability().enabled) return null;
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [exp, nonce, mac] = parts;
  const expected = sign(`${exp}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return null;
  if (isRevoked(nonce, issuedAtMs(nonce, expiresAt))) return null;
  return { nonce, expiresAt };
}

/** Returns the session expiry (unix seconds) when the request carries a valid session, else null. */
export function sessionExpiry(req: Request): number | null {
  return currentSession(req)?.expiresAt ?? null;
}

function isHttps(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (proto) return proto === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function sessionCookie(req: Request, token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}

export function clearedCookie(req: Request): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(req) ? '; Secure' : ''}`;
}

/** CSRF guard for state-changing requests: the Origin header must be present and match the request host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host');
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ---- login attempt limit (per process) ----------------------------------------------
// `clientKey` returns 'shared' when the client cannot be identified (no trusted proxy). A per-client limit on that
// bucket would let any visitor lock every admin out, so only the global limit applies to it.
const WINDOW_MS = 15 * 60 * 1000;
const PER_CLIENT = 8;
const GLOBAL = 100;
const failures = new Map<string, number[]>();
let globalFailures: number[] = [];

const recent = (list: number[], now: number) => list.filter((t) => now - t < WINDOW_MS);

/** Callers must not await between this check and recording the outcome, or a burst could slip past the limit. */
export function loginBlocked(client: string): boolean {
  const now = Date.now();
  globalFailures = recent(globalFailures, now);
  if (globalFailures.length >= GLOBAL) return true;
  if (client === SHARED_CLIENT) return false;
  const mine = recent(failures.get(client) ?? [], now);
  if (mine.length) failures.set(client, mine);
  else failures.delete(client);
  return mine.length >= PER_CLIENT;
}

export function recordLoginFailure(client: string): void {
  const now = Date.now();
  globalFailures.push(now);
  if (client === SHARED_CLIENT) return;
  failures.set(client, [...(failures.get(client) ?? []), now]);
  if (failures.size > 5000) for (const [k, v] of failures) if (!v.some((t) => now - t < WINDOW_MS)) failures.delete(k);
}

export function clearLoginFailures(client: string): void {
  failures.delete(client);
}
