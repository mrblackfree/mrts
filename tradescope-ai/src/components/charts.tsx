'use client';

import { formatPct, formatUsd, trend, yoy } from '@/lib/format';
import type { CompetitorShare, YearValue } from '@/lib/types';
import { cx } from './ui';

/** 3-year column chart in pure SVG with value + YoY labels. */
export function TrendColumns({ series, ariaLabel, accent = '#06b6d4' }: { series: YearValue[]; ariaLabel: string; accent?: string }) {
  const W = 360;
  const H = 190;
  const padX = 28;
  const top = 34;
  const bottom = 28;
  const max = Math.max(...series.map((s) => s.value)) * 1.08 || 1;
  const slot = (W - padX * 2) / series.length;
  const barW = Math.min(64, slot * 0.55);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={y(max * g)} y2={y(max * g)} className="stroke-slate-100 dark:stroke-slate-800" strokeDasharray="3 4" />
      ))}
      <line x1={padX} x2={W - padX} y1={H - bottom} y2={H - bottom} className="stroke-slate-200 dark:stroke-slate-700" />
      {series.map((s, i) => {
        const cx0 = padX + slot * i + slot / 2;
        const growth = i > 0 ? yoy(s.value, series[i - 1].value) : null;
        const isLast = i === series.length - 1;
        return (
          <g key={s.year}>
            <rect
              x={cx0 - barW / 2}
              y={y(s.value)}
              width={barW}
              height={Math.max(2, H - bottom - y(s.value))}
              rx={6}
              fill={accent}
              opacity={isLast ? 1 : 0.45}
            />
            <text x={cx0} y={y(s.value) - 8} textAnchor="middle" className="fill-slate-700 text-[12px] font-bold dark:fill-slate-200">
              {formatUsd(s.value, { compact: true })}
            </text>
            <text x={cx0} y={H - 9} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400">
              {s.year}
            </text>
            {growth !== null && (
              <text x={cx0} y={top - 18} textAnchor="middle" className={cx('text-[10.5px] font-bold', { up: 'fill-emerald-600 dark:fill-emerald-400', down: 'fill-rose-600 dark:fill-rose-400', flat: 'fill-slate-400' }[trend(growth)])}>
                {formatPct(growth, 1, true)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Grouped columns (exports vs imports) for the bilateral overview. */
export function GroupedColumns({ a, b, labelA, labelB }: { a: YearValue[]; b: YearValue[]; labelA: string; labelB: string }) {
  const W = 420;
  const H = 200;
  const padX = 24;
  const top = 26;
  const bottom = 26;
  const max = Math.max(...a.map((s) => s.value), ...b.map((s) => s.value)) * 1.1;
  const slot = (W - padX * 2) / a.length;
  const barW = Math.min(44, slot * 0.32);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${labelA} / ${labelB}`} className="h-auto w-full">
      <line x1={padX} x2={W - padX} y1={H - bottom} y2={H - bottom} className="stroke-slate-200 dark:stroke-slate-700" />
      {a.map((s, i) => {
        const c = padX + slot * i + slot / 2;
        const bv = b[i]?.value ?? 0;
        return (
          <g key={s.year}>
            <rect x={c - barW - 3} y={y(s.value)} width={barW} height={H - bottom - y(s.value)} rx={5} fill="#cd2e3a" />
            <rect x={c + 3} y={y(bv)} width={barW} height={H - bottom - y(bv)} rx={5} fill="#0038a8" className="dark:fill-[#3b82f6]" />
            <text x={c - barW / 2 - 3} y={y(s.value) - 6} textAnchor="middle" className="fill-slate-700 text-[10.5px] font-bold dark:fill-slate-200">
              {formatUsd(s.value, { compact: true })}
            </text>
            <text x={c + barW / 2 + 3} y={y(bv) - 6} textAnchor="middle" className="fill-slate-700 text-[10.5px] font-bold dark:fill-slate-200">
              {formatUsd(bv, { compact: true })}
            </text>
            <text x={c} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400">
              {s.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ShareBars({ rows, label }: { rows: Array<CompetitorShare & { name: string }>; label: string }) {
  const max = Math.max(...rows.map((r) => r.share), 1);
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3.25rem] items-center gap-3 text-sm">
          <span className={cx('flex min-w-0 items-center gap-1.5', r.highlight ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>
            <span aria-hidden>{r.flag}</span>
            <span className="truncate">{r.name}</span>
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span
              className={cx('block h-full rounded-full transition-all duration-700', r.highlight ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600')}
              style={{ width: `${Math.max(1.5, (r.share / max) * 100)}%` }}
            />
          </span>
          <span className={cx('text-right tabular-nums', r.highlight ? 'font-bold text-brand-700 dark:text-brand-400' : 'text-slate-500')}>{r.share.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}
