import type { Bilingual, Lang } from './types';

export const pick = (v: Bilingual, lang: Lang): string => v[lang] ?? v.ko;

export function formatUsd(value: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = false, decimals } = opts;
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}M`;
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
  }
  const d = decimals ?? (Math.abs(value) < 100 && value % 1 !== 0 ? 2 : 0);
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
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

export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
