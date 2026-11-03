'use client';

import { BadgeCheck, Check, Copy, Database, FlaskConical, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { SourceMeta, VerificationLevel } from '@/lib/types';
import { useI18n } from './I18nProvider';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className={cx(
        'print-card rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ModuleHeader({ index, title, icon, right }: { index: number; title: string; icon: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Module {index}</p>
          <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

export function Badge({ tone = 'slate', children, className, title }: { tone?: 'slate' | 'brand' | 'green' | 'amber' | 'red' | 'violet'; children: React.ReactNode; className?: string; title?: string }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    brand: 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
    red: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  };
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}

/** `[출처: … | 기준일: 2026.11]` provenance tag required on every tariff / regulation / statistic block. */
export function SourceTag({ meta, className }: { meta: SourceMeta; className?: string }) {
  const { t, p } = useI18n();
  const official = meta.status === 'official';
  return (
    <p className={cx('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500', className)}>
      <span className={cx('inline-flex items-center gap-1 font-semibold', official ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
        {official ? <Database className="size-3" /> : <FlaskConical className="size-3" />}
        {official ? t('officialTag') : t('seedTag')}
      </span>
      <span>
        [{t('source')}: {meta.sources.join(' / ')} | {t('asOf')}: {meta.asOf}]
      </span>
      {meta.note && <span className="text-slate-400/90">· {p(meta.note)}</span>}
    </p>
  );
}

export function ScoreRing({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 90 ? '#10b981' : value >= 80 ? '#06b6d4' : value >= 70 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`${value}% ${label ?? ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{value}%</span>
        {label && <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'amber' }) {
  const color = tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }
      }}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-brand-400',
        className,
      )}
    >
      {done ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {done ? t('copied') : (label ?? t('copy'))}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md', className }: { value: T; options: Array<{ value: T; label: React.ReactNode }>; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div role="radiogroup" className={cx('inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'rounded-full border px-3 py-1 text-xs font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-400',
      )}
    >
      {children}
    </button>
  );
}

const LEVEL_STYLE: Record<VerificationLevel, { tone: 'green' | 'violet' | 'brand' | 'amber'; key: 'lvOfficial' | 'lvVerified' | 'lvCrosscheck' | 'lvSeed' }> = {
  official: { tone: 'green', key: 'lvOfficial' },
  verified: { tone: 'violet', key: 'lvVerified' },
  crosscheck: { tone: 'brand', key: 'lvCrosscheck' },
  seed: { tone: 'amber', key: 'lvSeed' },
};

/** Verification level chip: 공식 API · 전문가 검증 · 교차검증 · 시드 */
export function LevelBadge({ level, title, className }: { level: VerificationLevel; title?: string; className?: string }) {
  const { t } = useI18n();
  const st = LEVEL_STYLE[level];
  const Icon = level === 'official' ? Database : level === 'verified' ? BadgeCheck : level === 'crosscheck' ? ShieldCheck : FlaskConical;
  return (
    <Badge tone={st.tone} title={title} className={className}>
      <Icon className="size-3" />
      {t(st.key)}
    </Badge>
  );
}
