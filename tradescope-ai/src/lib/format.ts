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
  const s = value.toFixed(decimals);
  return signed && value > 0 ? `+${s}%` : `${s}%`;
}

export function yoy(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

/** Local calendar date (YYYY-MM-DD) — not UTC, so invoices never shift a day around midnight. */
export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
