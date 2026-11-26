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
 *
 * With Redis (lib/store/kv, e.g. Vercel) the same document is the Redis key "admin-sessions", changed by
 * compare-and-set. `loadRevocations()` (run by prepareRequest at the start of every API route) refreshes this
 * instance's copy at most once a second, so `isRevoked` stays synchronous. Fails closed: when Redis has not
 * answered for a minute, no session is accepted, since sign-outs on other instances would be unknown.
 *
 * Without any writable storage (read-only) memory is all there is: it does not survive a restart and is not shared
 * between instances — there, rotating ADMIN_SECRET is the way to end every session.
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withFileLock } from '@/lib/file-lock';
import { fileStorageState, recordStorageState } from '@/lib/settings';
import { settingsDir } from '@/lib/settings/core.mjs';
import { docBackend, readDoc, updateDoc } from '@/lib/store/docs';
import { refresher } from '@/lib/store/refresh';

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

let memory: State = empty();

const DOC = 'admin-sessions';
/** Redis mode: this instance's copy of the shared document, and when it was last read successfully */
let shared: { state: State; at: number } | null = null;
const SHARED_TTL_MS = 1000;
const SHARED_MAX_AGE_MS = 60_000;

function clean(v: unknown): State {
  const s = v as Partial<State> | null;
  if (!s || typeof s !== 'object' || s.format !== 1 || typeof s.notBefore !== 'number' || !Number.isFinite(s.notBefore) || !s.revoked || typeof s.revoked !== 'object' || Array.isArray(s.revoked)) {
    throw new Error('unknown-format');
  }
  const revoked: Record<string, number> = Object.create(null);
  for (const [k, exp] of Object.entries(s.revoked)) {
    // one damaged entry makes the whole document damaged: dropping it would quietly let that session back in
    if (typeof exp !== 'number' || !Number.isFinite(exp)) throw new Error('unknown-format');
    revoked[k] = exp;
  }
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

function valid(raw: string): boolean {
  try {
    clean(JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

/** The shared document's text → state; a damaged one ends every session issued before now (fail closed). */
function parseShared(raw: string | null): State {
  if (raw === null) return empty();
  if (valid(raw)) return clean(JSON.parse(raw));
  const fresh = empty();
  fresh.notBefore = nowMs();
  return fresh;
}

/** Redis mode: reads the shared document; a damaged one is replaced once by its fail-closed state. Throws when Redis does not answer. */
async function readShared(): Promise<State> {
  let raw = await readDoc(DOC);
  if (raw !== null && !valid(raw)) {
    // replaced once, so every instance agrees on the cut-off; signing in again still works
    const fresh = JSON.stringify(parseShared(raw));
    try {
      raw = (await updateDoc(DOC, (cur) => (cur !== null && !valid(cur) ? fresh : null))) ?? (await readDoc(DOC));
    } catch {
      /* still damaged: read as fail-closed below */
    }
  }
  return parseShared(raw);
}

const sharedRefresh = refresher<State>({
  read: readShared,
  apply: (state) => {
    shared = { state, at: Date.now() };
  },
  // no answer: keep the last copy; isRevoked fails closed once it is too old
  ttlMs: SHARED_TTL_MS,
});

/** Redis mode: refreshes this instance's copy (at most once a second unless forced). No-op for the data folder. */
export async function loadRevocations(force = false): Promise<void> {
  if (docBackend() !== 'kv') return;
  await sharedRefresh.refresh(force);
}

/** The current state: what every process has saved, plus what this process has signed out. */
function read(): State {
  if (docBackend() === 'kv') return shared ? union(shared.state, memory) : memory;
  if (!fileStorageState().writable) return memory;
  const disk = readFile();
  return disk ? union(disk, memory) : memory;
}

/**
 * Applies one change: in memory first (so it holds in this process whatever happens next), then to the file under
 * the lock, on top of what other processes saved meanwhile. 'memory' when the file could not be updated.
 */
async function update(change: (s: State) => void): Promise<RevocationStore> {
  const mine = read();
  change(mine);
  memory = prune(union(memory, mine));
  if (docBackend() === 'kv') {
    if (!recordStorageState().writable) return 'memory';
    try {
      const written = await updateDoc(DOC, (cur) => {
        const base = parseShared(cur);
        change(base);
        return JSON.stringify(prune(union(base, memory)));
      });
      if (written !== null) sharedRefresh.set(clean(JSON.parse(written)));
      return 'stored';
    } catch {
      console.warn('[admin] sign-out kept in this process only: Redis could not be updated');
      return 'memory';
    }
  }
  if (!fileStorageState().writable) return 'memory';
  let saved = false;
  const locked = withFileLock(lockFile(), () => {
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
  // Redis mode without a recent copy: sign-outs elsewhere are unknown, so no session is accepted
  if (docBackend() === 'kv' && (!shared || Date.now() - shared.at > SHARED_MAX_AGE_MS)) return true;
  const s = read();
  return issuedAtMs < s.notBefore || Object.hasOwn(s.revoked, nonce);
}

/** Signs one session out until it would have expired. */
export function revokeSession(nonce: string, expiresAt: number): Promise<RevocationStore> {
  return update((s) => {
    s.revoked[nonce] = expiresAt;
  });
}

/** Ends every session issued so far, including the caller's own. */
export function revokeAllSessions(current?: { nonce: string; expiresAt: number }): Promise<RevocationStore> {
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
  shared = null;
  sharedRefresh.reset();
}
