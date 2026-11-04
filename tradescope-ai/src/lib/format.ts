import type { Bilingual, Lang } from './types';

export const pick = (v: Bilingual, lang: Lang): string => v[lang] ?? v.ko;

export function formatUsd(value: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = false, decimals } = opts;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (compact) {
    const tiers: Array<[number, string, (v: number) => number]> = [
      [1e9, 'B', () => 2],
      [1e6, 'M', (v) => (v >= 100 ? 0 : 1)],
      [1e3, 'K', (v) => (v >= 100 ? 0 : 1)],
    ];
    for (let i = 0; i < tiers.length; i++) {
      const [div, unit, dec] = tiers[i];
      const v = abs / div;
      if (v < 1) continue;
      const d = dec(v);
      // Pick the unit after rounding so 999,999 renders as $1.00M, not $1000K.
      if (Number(v.toFixed(d)) >= 1000 && i > 0) return `${sign}$${(abs / tiers[i - 1][0]).toFixed(2)}${tiers[i - 1][1]}`;
      return `${sign}$${v.toFixed(d)}${unit}`;
    }
  }
  const d = decimals ?? (abs < 100 && abs % 1 !== 0 ? 2 : 0);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPct(value: number, decimals = 1, signed = false): string {
  if (!Number.isFinite(value)) return '—';
  const s = value.toFixed(decimals);
  return signed && value > 0 ? `+${s}%` : `${s}%`;
}

/** Year-over-year growth in %; NaN when the previous value is 0 (growth from zero is undefined). */
export function yoy(current: number, previous: number): number {
  if (!previous) return Number.NaN;
  return ((current - previous) / previous) * 100;
}

/** Direction of a change for colouring: 'flat' when the value is undefined (e.g. growth from zero). */
export function trend(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

/** Calendar zone shared by the browser and the server (which usually runs in UTC). */
export const BUSINESS_TZ = 'Asia/Seoul';

/** Calendar date (YYYY-MM-DD) in BUSINESS_TZ, identical in the browser and on the server. */
export function todayIso(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
