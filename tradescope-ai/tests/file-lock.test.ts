/* Lock file: exclusive, released only by its owner, stale locks taken over, every wait bounded. */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { done, ok } from './assert';

const { withFileLock } = await import('@/lib/file-lock');
const dir = process.env.TRADESCOPE_DATA_DIR!;
const lock = path.join(dir, 'x.lock');

let ran = false;
ok('runs and returns true', withFileLock(lock, () => (ran = true)) && ran);
ok('released afterwards', !existsSync(lock));

// someone else holds a fresh lock: bounded wait, their lock untouched
writeFileSync(lock, 'other-holder');
let t0 = Date.now();
ran = false;
ok('busy lock: false, fn not run', withFileLock(lock, () => (ran = true)) === false && !ran);
ok('busy lock: bounded wait', Date.now() - t0 < 4000);
ok('busy lock: the other holder keeps its lock', readFileSync(lock, 'utf8') === 'other-holder');

// a stale lock (crashed holder) is taken over and nothing is left behind
const old = new Date(Date.now() - 60_000);
utimesSync(lock, old, old);
ran = false;
ok('stale lock taken over', withFileLock(lock, () => (ran = true)) && ran);
ok('no lock or stale leftovers afterwards', !existsSync(lock) && readdirSync(dir).every((f) => !f.startsWith('x.lock')));

// release never removes a lock that is no longer ours
withFileLock(lock, () => writeFileSync(lock, 'taken-over-meanwhile'));
ok("someone else's lock survives our release", readFileSync(lock, 'utf8') === 'taken-over-meanwhile');
rmSync(lock);

// a path that can never become a lock (a directory) fails in time instead of spinning
mkdirSync(lock);
t0 = Date.now();
ok('directory in the way: false', withFileLock(lock, () => undefined) === false);
ok('directory in the way: bounded wait', Date.now() - t0 < 4000);
rmSync(lock, { recursive: true });

// an error inside still releases the lock
let threw = false;
try {
  withFileLock(lock, () => {
    throw new Error('boom');
  });
} catch {
  threw = true;
}
ok('error propagates and the lock is released', threw && !existsSync(lock));

done('file lock');
