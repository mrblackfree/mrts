/**
 * A lock file shared by processes on one data folder (server-side only): create-exclusive, released when `fn`
 * returns, taken over when a crashed process left it behind.
 */
import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

/** How long a change waits for another process's change to finish. */
const LOCK_WAIT_MS = 2000;
/** A lock older than this was left by a process that died while holding it. */
const LOCK_STALE_MS = 10_000;

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Runs `fn` while holding `lockPath`; false (and `fn` not run) when the lock could not be taken in time. */
export function withFileLock(lockPath: string, fn: () => void): boolean {
  try {
    mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  } catch {
    return false;
  }
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(lockPath, 'wx', 0o600));
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
          unlinkSync(lockPath);
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
      unlinkSync(lockPath);
    } catch {
      /* already gone */
    }
  }
}
