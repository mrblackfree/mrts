/**
 * Daily counters for the validation metrics, written to TRADESCOPE_DATA_DIR/metrics.json (0600) a few seconds
 * after the last change. Each flush re-reads the file and adds only this process's new counts, so several
 * processes or instances on one data folder keep each other's counts (two flushes in the same instant can still
 * lose one batch). Without writable storage (Vercel, read-only) counts live in memory and restart from zero.
 * Days older than 400 are dropped whenever the file is read or written.
 *
 * With Redis (lib/store/kv, e.g. Vercel) each request adds its counts straight away (HINCRBY) to one hash per day —
 * "metrics:<date>" and "metrics:<date>:ch" for channel keys — which expires after the 400 days. Server-side only.
 */
import { chmodSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileStorageState, recordStorageState } from '@/lib/settings';
import { settingsDir } from '@/lib/settings/core.mjs';
import { docBackend } from '@/lib/store/docs';
import { kvKey, kvPairs, kvPipeline } from '@/lib/store/kv';

type Day = Record<string, number>;
type Days = Record<string, Day>;
interface Doc {
  format: 1;
  days: Days;
}

const KEEP_DAYS = 400;
// channel names come from visitors' links, so channel keys have their own budget and can never crowd out the
// counters the verdicts use
const MAX_CHANNEL_KEYS_PER_DAY = 1000;
const MAX_OTHER_KEYS_PER_DAY = 1000;
const FLUSH_MS = 5_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const file = () => path.join(settingsDir(), 'metrics.json');
const today = () => new Date().toISOString().slice(0, 10);
const oldestKept = () => new Date(Date.parse(`${today()}T00:00:00Z`) - (KEEP_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
const isChannelKey = (k: string) => k.startsWith('ch:');

/** what this process sees: the file as last read or written, plus its own counts since */
let doc: Doc | null = null;
/** this process's counts that are not in the file yet */
let delta: Days = Object.create(null);
/** something to write: new counts, or expired days removed from what was read */
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let setAside = 0;

const emptyDoc = (): Doc => ({ format: 1, days: Object.create(null) });

function hasRoom(day: Day, key: string): boolean {
  const channel = isChannelKey(key);
  let n = 0;
  for (const k in day) if (isChannelKey(k) === channel) n++;
  return n < (channel ? MAX_CHANNEL_KEYS_PER_DAY : MAX_OTHER_KEYS_PER_DAY);
}

/** Adds `n` to `key` on `date`; a new key is refused when its budget for that day is spent. */
function add(days: Days, date: string, key: string, n: number): boolean {
  const day = (days[date] ??= Object.create(null) as Day);
  if (!(key in day) && !hasRoom(day, key)) return false;
  day[key] = (day[key] ?? 0) + n;
  return true;
}

function mergeInto(days: Days, extra: Days) {
  for (const [date, day] of Object.entries(extra)) for (const [k, v] of Object.entries(day)) add(days, date, k, v);
}

/** Drops days older than the retention window; true when something was removed. */
function prune(d: Doc): boolean {
  const from = oldestKept();
  let removed = false;
  for (const date of Object.keys(d.days)) {
    if (date < from) {
      delete d.days[date];
      removed = true;
    }
  }
  return removed;
}

/**
 * The file as it is now. A missing file is empty; one that cannot be parsed or has an unknown shape is set aside
 * (renamed to `.corrupt-<time>`) and never overwritten.
 */
function readDisk(): { doc: Doc; pruned: boolean } {
  let d: Doc;
  try {
    const v = JSON.parse(readFileSync(file(), 'utf8')) as Partial<Doc> | null;
    if (!v || typeof v !== 'object' || v.format !== 1 || !v.days || typeof v.days !== 'object' || Array.isArray(v.days)) throw new Error('unknown-format');
    d = emptyDoc();
    for (const [date, day] of Object.entries(v.days)) {
      if (!DATE.test(date) || !day || typeof day !== 'object') continue;
      const clean: Day = Object.create(null);
      for (const [k, n] of Object.entries(day)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) clean[k] = n;
      d.days[date] = clean;
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      try {
        // unique even when two damaged files are set aside in the same millisecond
        renameSync(file(), `${file()}.corrupt-${Date.now()}-${process.pid}-${++setAside}`);
      } catch {
        /* nothing to keep */
      }
    }
    d = emptyDoc();
  }
  return { doc: d, pruned: prune(d) };
}

function schedule() {
  if (timer) return;
  timer = setTimeout(flushMetrics, FLUSH_MS);
  timer.unref?.();
}

function load(): Doc {
  if (doc) return doc;
  const r = readDisk();
  doc = r.doc;
  if (r.pruned) {
    dirty = true;
    schedule();
  }
  return doc;
}

/** Writes this process's new counts into the file, on top of what other processes wrote meanwhile. */
export function flushMetrics(): boolean {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!dirty) return false;
  if (!fileStorageState().writable) {
    // keep the unwritten counts: storage may come back (a temporary error, a secret set later) and they are
    // then written with the next flush; expired days are dropped so this cannot grow without end
    prune({ format: 1, days: delta });
    return false;
  }
  const disk = readDisk().doc;
  mergeInto(disk.days, delta);
  prune(disk);
  try {
    mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
    const tmp = `${file()}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(disk), { mode: 0o600 });
    renameSync(tmp, file());
    try {
      chmodSync(file(), 0o600);
    } catch {
      /* not supported on every filesystem */
    }
    doc = disk;
    delta = Object.create(null);
    dirty = false;
    return true;
  } catch {
    return false; // kept for the next flush
  }
}

// ---- Redis ---------------------------------------------------------------------------------------------------------

const useRedis = () => docBackend() === 'kv' && recordStorageState().writable;
const dayHash = (date: string, channel: boolean) => kvKey(`metrics:${date}${channel ? ':ch' : ''}`);
/** unix seconds when a day's counts expire: the moment that day leaves the retention window */
const expiresAt = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000) + KEEP_DAYS * 86_400;
const KV_TIMEOUT_MS = 1500;
const PIPELINE_CHUNK = 100;

/**
 * Adds the counts to today's hashes. Keys already there always count; a new key only while its budget for the day
 * lasts (checked just before writing, so requests racing at the very limit can pass it by a few keys).
 */
async function countInRedis(keys: string[]): Promise<void> {
  const date = today();
  const want = new Map<string, number>();
  for (const k of keys) want.set(k, (want.get(k) ?? 0) + 1);
  const groups = [false, true]
    .map((channel) => ({ channel, hash: dayHash(date, channel), keys: [...want.keys()].filter((k) => isChannelKey(k) === channel) }))
    .filter((g) => g.keys.length);
  const seen = await kvPipeline(groups.flatMap((g) => [['HLEN', g.hash], ['HMGET', g.hash, ...g.keys]]), KV_TIMEOUT_MS);
  const writes: Array<Array<string | number>> = [];
  groups.forEach((g, i) => {
    let room = (g.channel ? MAX_CHANNEL_KEYS_PER_DAY : MAX_OTHER_KEYS_PER_DAY) - Number(seen[2 * i] ?? 0);
    const existing = Array.isArray(seen[2 * i + 1]) ? (seen[2 * i + 1] as unknown[]) : [];
    let wrote = false;
    g.keys.forEach((k, j) => {
      const known = existing[j] !== null && existing[j] !== undefined;
      if (!known) {
        if (room <= 0) return;
        room--;
      }
      writes.push(['HINCRBY', g.hash, k, want.get(k)!]);
      wrote = true;
    });
    if (wrote) writes.push(['EXPIREAT', g.hash, expiresAt(date)]);
  });
  if (writes.length) await kvPipeline(writes, KV_TIMEOUT_MS);
}

async function daysFromRedis(dates: string[]): Promise<Days> {
  const commands = dates.flatMap((d) => [['HGETALL', dayHash(d, false)], ['HGETALL', dayHash(d, true)]]);
  const chunks: Array<Array<Array<string>>> = [];
  for (let i = 0; i < commands.length; i += PIPELINE_CHUNK) chunks.push(commands.slice(i, i + PIPELINE_CHUNK));
  const results = (await Promise.all(chunks.map((c) => kvPipeline(c)))).flat();
  const days: Days = Object.create(null);
  dates.forEach((date, i) => {
    const day: Day = Object.create(null);
    for (const r of [results[2 * i], results[2 * i + 1]]) {
      for (const [k, v] of Object.entries(kvPairs(r))) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) day[k] = n;
      }
    }
    if (Object.keys(day).length) days[date] = day;
  });
  return days;
}

// ---- counting and reading -----------------------------------------------------------------------------------------

/**
 * Adds 1 to each key in today's bucket. Never throws: metrics are best effort, and a Redis error drops this
 * request's counts (logged) rather than failing the request.
 */
export async function countMetrics(keys: string[]): Promise<void> {
  if (!keys.length) return;
  if (useRedis()) {
    try {
      await countInRedis(keys);
    } catch (e) {
      console.warn('[metrics] counts not saved:', (e as Error).message);
    }
    return;
  }
  const d = load();
  const date = today();
  for (const k of keys) if (add(d.days, date, k, 1)) add(delta, date, k, 1);
  dirty = true;
  schedule();
}

export interface MetricsSummary {
  from: string;
  to: string;
  totals: Record<string, number>;
  daily: Array<{ date: string; counts: Day }>;
  /** false when counts are in memory only (no writable storage) */
  persistent: boolean;
}

/** Totals over the last `days` days (today included). Throws when Redis cannot be read. */
export async function metricsSummary(days: number): Promise<MetricsSummary> {
  const redis = useRedis();
  const persistent = redis || fileStorageState().writable;
  const n = Math.min(Math.max(1, Math.floor(days)), KEEP_DAYS);
  const to = today();
  const fromDate = new Date(Date.parse(`${to}T00:00:00Z`) - (n - 1) * 86_400_000).toISOString().slice(0, 10);
  let source: Doc;
  if (redis) {
    const dates = Array.from({ length: n }, (_, i) => new Date(Date.parse(`${fromDate}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));
    source = { format: 1, days: await daysFromRedis(dates) };
  } else if (persistent) {
    // the file has every process's written counts; add this process's unwritten ones
    const r = readDisk();
    source = r.doc;
    mergeInto(source.days, delta);
    if (r.pruned) {
      dirty = true;
      schedule();
    }
  } else source = load();
  const totals: Record<string, number> = Object.create(null);
  const daily: MetricsSummary['daily'] = [];
  for (const date of Object.keys(source.days).sort()) {
    if (date < fromDate || date > to) continue;
    const counts = source.days[date];
    daily.push({ date, counts });
    for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] ?? 0) + v;
  }
  return { from: fromDate, to, totals, daily, persistent };
}

/** For tests: forget the in-memory state. */
export function resetMetricsForTest(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  doc = null;
  delta = Object.create(null);
  dirty = false;
}
