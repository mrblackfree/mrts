/**
 * A lock file shared by processes on one data folder (server-side only).
 *
 * - Taken with an exclusive create; the file holds a token unique to this holder.
 * - Released only when the file still holds our token, so a holder never removes someone else's lock.
 * - A lock older than LOCK_STALE_MS was left by a process that died while holding it (the protected sections are
 *   a few small file operations). It is taken over by moving it aside; if the move caught a newer lock created
 *   after we looked, that lock is put back.
 * - Every retry respects the deadline: a path that can never become a lock (e.g. a directory) fails in time.
 */
import { randomBytes } from 'node:crypto';
import { linkSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** How long a change waits for another process's change to finish. */
const LOCK_WAIT_MS = 2000;
/** A lock older than this was left by a process that died while holding it. */
const LOCK_STALE_MS = 10_000;

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Moves a stale lock aside. True when the caller should try to take the lock again right away. */
function takeOverStale(lockPath: string): boolean {
  let held: string;
  let mtime: number;
  try {
    held = readFileSync(lockPath, 'utf8');
    mtime = statSync(lockPath).mtimeMs;
  } catch (e) {
    // gone meanwhile: try again; anything else (e.g. a directory in the way) is not ours to fix
    return (e as NodeJS.ErrnoException).code === 'ENOENT';
  }
  if (Date.now() - mtime <= LOCK_STALE_MS) return false;
  const aside = `${lockPath}.stale-${randomBytes(6).toString('hex')}`;
  try {
    renameSync(lockPath, aside);
  } catch {
    return true; // another process moved it first
  }
  let moved = '';
  try {
    moved = readFileSync(aside, 'utf8');
  } catch {
    /* unreadable: treat as moved by mistake below */
  }
  // the rename caught a lock created after we read the stale one: put it back (fails if yet another exists)
  if (moved !== held) {
    try {
      linkSync(aside, lockPath);
    } catch {
      /* a newer lock is in place */
    }
  }
  try {
    unlinkSync(aside);
  } catch {
    /* already gone */
  }
  return moved === held;
}

function releaseIfOwned(lockPath: string, token: string): void {
  try {
    if (readFileSync(lockPath, 'utf8') === token) unlinkSync(lockPath);
  } catch {
    /* already gone */
  }
}

/** Runs `fn` while holding `lockPath`; false (and `fn` not run) when the lock could not be taken in time. */
export function withFileLock(lockPath: string, fn: () => void): boolean {
  try {
    mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  } catch {
    return false;
  }
  const token = `${process.pid}.${randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      writeFileSync(lockPath, token, { flag: 'wx', mode: 0o600 });
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      const retryNow = takeOverStale(lockPath);
      if (Date.now() > deadline) return false;
      if (!retryNow) sleep(5);
    }
  }
  try {
    fn();
    return true;
  } finally {
    releaseIfOwned(lockPath, token);
  }
}
