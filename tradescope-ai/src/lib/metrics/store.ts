/**
 * Daily counters for the validation metrics, written to TRADESCOPE_DATA_DIR/metrics.json (0600) a few seconds
 * after the last change. Each flush re-reads the file and adds only this process's new counts, so several
 * processes or instances on one data folder keep each other's counts (two flushes in the same instant can still
 * lose one batch). Without writable storage (Vercel, read-only) counts live in memory and restart from zero.
 * Days older than 400 are dropped whenever the file is read or written. Server-side only.
 */
import { chmodSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { storageState } from '@/lib/settings';
import { settingsDir } from '@/lib/settings/core.mjs';

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
  if (!storageState().writable) {
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

/** Adds 1 to each key in today's bucket. */
export function countMetrics(keys: string[]): void {
  if (!keys.length) return;
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

/** Totals over the last `days` days (today included). */
export function metricsSummary(days: number): MetricsSummary {
  const persistent = storageState().writable;
  let source: Doc;
  if (persistent) {
    // the file has every process's written counts; add this process's unwritten ones
    const r = readDisk();
    source = r.doc;
    mergeInto(source.days, delta);
    if (r.pruned) {
      dirty = true;
      schedule();
    }
  } else source = load();
  const n = Math.min(Math.max(1, Math.floor(days)), KEEP_DAYS);
  const to = today();
  const fromDate = new Date(Date.parse(`${to}T00:00:00Z`) - (n - 1) * 86_400_000).toISOString().slice(0, 10);
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
