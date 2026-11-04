/**
 * Server-side sign-out for admin sessions (server-side only).
 *
 * Session cookies are stateless signed tokens, so signing out has to be remembered on the server:
 * - a signed-out token's nonce, until the token would have expired anyway;
 * - a "not before" time: sessions issued earlier are no longer accepted ("sign out everywhere").
 *
 * Kept in TRADESCOPE_DATA_DIR/admin-sessions.json (0600). Without writable storage (Vercel, read-only) the state lives
 * in this process's memory only, so it does not survive a restart and is not shared between instances — there,
 * rotating ADMIN_SECRET is the way to end every session.
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { storageState } from '@/lib/settings';
import { settingsDir } from '@/lib/settings/core.mjs';

interface State {
  format: 1;
  /** unix milliseconds: sessions issued before this are rejected */
  notBefore: number;
  /** nonce → expiry (unix seconds) */
  revoked: Record<string, number>;
}

export type RevocationStore = 'stored' | 'memory';

const file = () => path.join(settingsDir(), 'admin-sessions.json');
const nowS = () => Math.floor(Date.now() / 1000);
const nowMs = () => Date.now();
const empty = (): State => ({ format: 1, notBefore: 0, revoked: Object.create(null) });

let memory: State = empty();

function clean(v: unknown): State {
  const s = v as Partial<State> | null;
  if (!s || typeof s !== 'object' || s.format !== 1 || typeof s.notBefore !== 'number' || !Number.isFinite(s.notBefore) || !s.revoked || typeof s.revoked !== 'object' || Array.isArray(s.revoked)) {
    throw new Error('unknown-format');
  }
  const revoked: Record<string, number> = Object.create(null);
  for (const [k, exp] of Object.entries(s.revoked)) if (typeof exp === 'number' && Number.isFinite(exp)) revoked[k] = exp;
  return { format: 1, notBefore: s.notBefore, revoked };
}

function write(state: State): RevocationStore {
  const t = nowS();
  for (const [k, exp] of Object.entries(state.revoked)) if (exp < t) delete state.revoked[k];
  memory = state;
  if (!storageState().writable) return 'memory';
  try {
    mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
    const tmp = `${file()}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    renameSync(tmp, file());
    try {
      chmodSync(file(), 0o600);
    } catch {
      /* not supported on every filesystem */
    }
    return 'stored';
  } catch {
    return 'memory';
  }
}

/** The current state: the file when storage is writable (every process sees the same sign-outs), else memory. */
function read(): State {
  if (!storageState().writable) return memory;
  try {
    return clean(JSON.parse(readFileSync(file(), 'utf8')));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return memory;
    // a damaged file is set aside and every existing session ends (fail closed); signing in again still works
    try {
      renameSync(file(), `${file()}.corrupt-${Date.now()}-${process.pid}`);
    } catch {
      /* nothing to keep */
    }
    const fresh = empty();
    fresh.notBefore = nowMs();
    write(fresh);
    return fresh;
  }
}

/** True when a session issued at `issuedAtMs` (unix milliseconds) with `nonce` has been signed out. */
export function isRevoked(nonce: string, issuedAtMs: number): boolean {
  const s = read();
  return issuedAtMs < s.notBefore || Object.hasOwn(s.revoked, nonce);
}

/** Signs one session out until it would have expired. */
export function revokeSession(nonce: string, expiresAt: number): RevocationStore {
  const s = read();
  s.revoked[nonce] = expiresAt;
  return write(s);
}

/** Ends every session issued so far, including the caller's own. */
export function revokeAllSessions(current?: { nonce: string; expiresAt: number }): RevocationStore {
  const s = read();
  // one millisecond past now, so a session issued in this very millisecond ends as well; a new sign-in cannot
  // complete within it
  s.notBefore = nowMs() + 1;
  s.revoked = Object.create(null);
  if (current) s.revoked[current.nonce] = current.expiresAt;
  return write(s);
}

/** For tests: forget the in-memory state. */
export function resetRevocationForTest(): void {
  memory = empty();
}
