/**
 * Admin authentication (server-side only).
 *
 * - Enabled only when ADMIN_PASSWORD (≥ 10 characters) is set in the server environment.
 * - Login issues a stateless session cookie: `<expiry>.<nonce>.<HMAC-SHA256>`, HttpOnly + SameSite=Strict (+ Secure
 *   over HTTPS). The HMAC key derives from ADMIN_SECRET / ADMIN_PASSWORD, so changing either signs everyone out.
 * - Failed logins are rate-limited per client and globally.
 * - State-changing admin requests must come from the same origin (CSRF defence on top of SameSite).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { masterSecret } from '@/lib/settings/core.mjs';

export const SESSION_COOKIE = 'ts_admin';
const SESSION_TTL_S = 8 * 60 * 60;
const MIN_PASSWORD = 10;

export type AdminAvailability = { enabled: true } | { enabled: false; reason: 'not-set' | 'too-short' };

export function adminAvailability(): AdminAvailability {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw) return { enabled: false, reason: 'not-set' };
  if (pw.length < MIN_PASSWORD) return { enabled: false, reason: 'too-short' };
  return { enabled: true };
}

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** Constant-time password comparison (hashes first, so lengths never leak). */
export function passwordMatches(candidate: string): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw || adminAvailability().enabled === false) return false;
  return timingSafeEqual(digest(candidate), digest(pw));
}

function sessionKey(): Buffer {
  return createHash('sha256').update(`tradescope-admin-session\0${masterSecret() ?? ''}`).digest();
}

function sign(payload: string): string {
  return createHmac('sha256', sessionKey()).update(payload).digest('base64url');
}

export function issueSession(): { token: string; maxAge: number; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const payload = `${expiresAt}.${randomBytes(9).toString('base64url')}`;
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

/** Returns the session expiry (unix seconds) when the request carries a valid session, else null. */
export function sessionExpiry(req: Request): number | null {
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
  return expiresAt;
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
const WINDOW_MS = 15 * 60 * 1000;
const PER_CLIENT = 8;
const GLOBAL = 100;
const failures = new Map<string, number[]>();
let globalFailures: number[] = [];

export function loginBlocked(client: string): boolean {
  const now = Date.now();
  globalFailures = globalFailures.filter((t) => now - t < WINDOW_MS);
  const mine = (failures.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(client, mine);
  return mine.length >= PER_CLIENT || globalFailures.length >= GLOBAL;
}

export function recordLoginFailure(client: string): void {
  const now = Date.now();
  failures.set(client, [...(failures.get(client) ?? []), now]);
  globalFailures.push(now);
  if (failures.size > 5000) for (const [k, v] of failures) if (!v.some((t) => now - t < WINDOW_MS)) failures.delete(k);
}

export function clearLoginFailures(client: string): void {
  failures.delete(client);
}
