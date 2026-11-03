/**
 * Daily counters for the validation metrics, kept in memory and written to TRADESCOPE_DATA_DIR/metrics.json
 * (0600) a few seconds after the last change. Without writable storage (Vercel, read-only) they live only in
 * memory and restart from zero. Counts are per server process. Server-side only.
 */
import { chmodSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { storageState } from '@/lib/settings';
import { settingsDir } from '@/lib/settings/core.mjs';

type Day = Record<string, number>;
interface Doc {
  format: 1;
  days: Record<string, Day>;
}

const KEEP_DAYS = 400;
const MAX_KEYS_PER_DAY = 2000; // channel keys are open-ended; cap them
const FLUSH_MS = 5_000;

const file = () => path.join(settingsDir(), 'metrics.json');
const today = () => new Date().toISOString().slice(0, 10);

let doc: Doc | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function load(): Doc {
  if (doc) return doc;
  try {
    const v = JSON.parse(readFileSync(file(), 'utf8')) as Doc;
    doc = v && v.format === 1 && v.days && typeof v.days === 'object' ? v : { format: 1, days: {} };
  } catch (e) {
    // a missing file starts empty; a damaged one is set aside, never overwritten
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      try {
        renameSync(file(), `${file()}.corrupt-${Date.now()}`);
      } catch {
        /* nothing to keep */
      }
    }
    doc = { format: 1, days: {} };
  }
  return doc;
}

export function flushMetrics(): boolean {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!doc || !storageState().writable) return false;
  const days = Object.keys(doc.days).sort();
  for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete doc.days[d];
  try {
    mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
    const tmp = `${file()}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(doc), { mode: 0o600 });
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

/** Adds 1 to each key in today's bucket. */
export function countMetrics(keys: string[]): void {
  if (!keys.length) return;
  const d = load();
  const day = (d.days[today()] ??= Object.create(null) as Day);
  for (const k of keys) {
    if (!(k in day) && Object.keys(day).length >= MAX_KEYS_PER_DAY) continue;
    day[k] = (day[k] ?? 0) + 1;
  }
  if (!timer) {
    timer = setTimeout(flushMetrics, FLUSH_MS);
    timer.unref?.();
  }
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
  const d = load();
  const n = Math.min(Math.max(1, Math.floor(days)), KEEP_DAYS);
  const to = today();
  const fromDate = new Date(Date.parse(`${to}T00:00:00Z`) - (n - 1) * 86_400_000).toISOString().slice(0, 10);
  const totals: Record<string, number> = Object.create(null);
  const daily: MetricsSummary['daily'] = [];
  for (const date of Object.keys(d.days).sort()) {
    if (date < fromDate || date > to) continue;
    const counts = d.days[date];
    daily.push({ date, counts });
    for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] ?? 0) + v;
  }
  return { from: fromDate, to, totals, daily, persistent: storageState().writable };
}

/** For tests: forget the in-memory state. */
export function resetMetricsForTest(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  doc = null;
}
