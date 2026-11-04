/**
 * Server-side sign-out for admin sessions (server-side only).
 *
 * Session cookies are stateless signed tokens, so signing out has to be remembered on the server:
 * - a signed-out token's nonce, until the token would have expired anyway;
 * - a "not before" time: sessions issued earlier are no longer accepted ("sign out everywhere").
 *
 * Kept in TRADESCOPE_DATA_DIR/admin-sessions.json (0600). Several processes may share that folder, so every change
 * is made under a lock file (read, change, write) and none can overwrite another's sign-out. What this process has
 * signed out is also kept in memory and always counts, so a sign-out that could not be saved still holds here.
 * Without writable storage (Vercel, read-only) memory is all there is: it does not survive a restart and is not
 * shared between instances — there, rotating ADMIN_SECRET is the way to end every session.
 */
import { chmodSync, closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
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
const lockFile = () => `${file()}.lock`;
const nowS = () => Math.floor(Date.now() / 1000);
const nowMs = () => Date.now();
const empty = (): State => ({ format: 1, notBefore: 0, revoked: Object.create(null) });

/** How long a change waits for another process's change to finish. */
const LOCK_WAIT_MS = 2000;
/** A lock older than this was left by a process that died while holding it. */
const LOCK_STALE_MS = 10_000;

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

/** Sign-outs only ever add up: the later "not before" and every signed-out nonce of both. */
function union(a: State, b: State): State {
  const revoked: Record<string, number> = Object.create(null);
  for (const src of [a.revoked, b.revoked]) for (const [k, exp] of Object.entries(src)) revoked[k] = Math.max(exp, revoked[k] ?? 0);
  return { format: 1, notBefore: Math.max(a.notBefore, b.notBefore), revoked };
}

function prune(state: State): State {
  const t = nowS();
  for (const [k, exp] of Object.entries(state.revoked)) if (exp < t) delete state.revoked[k];
  return state;
}

/** Writes the file (atomically, by rename). False when it could not be written. */
function writeFile(state: State): boolean {
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
    return true;
  } catch {
    return false;
  }
}

/** The file's state, or null when there is none. A damaged file is set aside and every existing session ends. */
function readFile(): State | null {
  try {
    return clean(JSON.parse(readFileSync(file(), 'utf8')));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    // fail closed; signing in again still works
    try {
      renameSync(file(), `${file()}.corrupt-${Date.now()}-${process.pid}`);
    } catch {
      /* nothing to keep */
    }
    const fresh = empty();
    fresh.notBefore = nowMs();
    writeFile(fresh);
    return fresh;
  }
}

/** The current state: what every process has saved, plus what this process has signed out. */
function read(): State {
  if (!storageState().writable) return memory;
  const disk = readFile();
  return disk ? union(disk, memory) : memory;
}

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Runs `fn` while holding the lock file; false when the lock could not be taken in time. */
function withLock(fn: () => void): boolean {
  try {
    mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
  } catch {
    return false;
  }
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(lockFile(), 'wx', 0o600));
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      try {
        if (Date.now() - statSync(lockFile()).mtimeMs > LOCK_STALE_MS) {
          unlinkSync(lockFile());
          continue;
        }
      } catch {
        continue; // released meanwhile
      }
      if (Date.now() > deadline) return false;
      sleep(5);
    }
  }
  try {
    fn();
    return true;
  } finally {
    try {
      unlinkSync(lockFile());
    } catch {
      /* already gone */
    }
  }
}

/**
 * Applies one change: in memory first (so it holds in this process whatever happens next), then to the file under
 * the lock, on top of what other processes saved meanwhile. 'memory' when the file could not be updated.
 */
function update(change: (s: State) => void): RevocationStore {
  const mine = read();
  change(mine);
  memory = prune(union(memory, mine));
  if (!storageState().writable) return 'memory';
  let saved = false;
  const locked = withLock(() => {
    const disk = readFile() ?? empty();
    change(disk);
    saved = writeFile(prune(union(disk, memory)));
  });
  if (locked && saved) return 'stored';
  console.warn('[admin] sign-out kept in this process only: admin-sessions.json could not be updated');
  return 'memory';
}

/** True when a session issued at `issuedAtMs` (unix milliseconds) with `nonce` has been signed out. */
export function isRevoked(nonce: string, issuedAtMs: number): boolean {
  const s = read();
  return issuedAtMs < s.notBefore || Object.hasOwn(s.revoked, nonce);
}

/** Signs one session out until it would have expired. */
export function revokeSession(nonce: string, expiresAt: number): RevocationStore {
  return update((s) => {
    s.revoked[nonce] = expiresAt;
  });
}

/** Ends every session issued so far, including the caller's own. */
export function revokeAllSessions(current?: { nonce: string; expiresAt: number }): RevocationStore {
  // one millisecond past now, so a session issued in this very millisecond ends as well; a new sign-in cannot
  // complete within it
  const notBefore = nowMs() + 1;
  return update((s) => {
    s.notBefore = Math.max(s.notBefore, notBefore);
    if (current) s.revoked[current.nonce] = current.expiresAt;
  });
}

/** For tests: forget the in-memory state (as after a restart). */
export function resetRevocationForTest(): void {
  memory = empty();
}
