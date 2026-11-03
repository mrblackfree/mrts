'use client';

import { BadgeCheck, Check, Copy, Database, FlaskConical, Loader2, ShieldCheck } from 'lucide-react';
import { forwardRef, useState } from 'react';
import type { SourceMeta, VerificationLevel } from '@/lib/types';
import { useI18n } from './I18nProvider';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Buttons — one system for every action (variants × sizes), shared by <button> and <a>
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'brand' | 'ai' | 'secondary' | 'ghost' | 'subtle';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const BTN_BASE =
  'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-ink-900 text-white shadow-ink hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:shadow-hairline dark:hover:bg-slate-100',
  brand: 'bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-brand hover:brightness-[1.08]',
  ai: 'bg-gradient-to-br from-violet-500 via-brand-600 to-brand-700 text-white shadow-brand hover:brightness-[1.08]',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-hairline hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white',
  ghost: 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white',
  subtle:
    'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-100/70 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20 dark:hover:bg-brand-400/15',
};
const BTN_SIZE: Record<ButtonSize, string> = {
  xs: 'h-7 rounded-lg px-2.5 text-[11.5px]',
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-9 rounded-xl px-3.5 text-[13px]',
  lg: 'h-12 rounded-xl px-6 text-sm',
};
const ICON_SIZE: Record<ButtonSize, string> = { xs: 'size-7 rounded-lg', sm: 'size-8 rounded-lg', md: 'size-9 rounded-xl', lg: 'size-12 rounded-xl' };

/**
 * Class string for anything that should look like a button (also used on links).
 *
 * `className` is for layout only (margins, flex, width, responsive size variants). Do not pass utilities that the
 * base/variant/size already set (radius, padding, shadow, display): Tailwind resolves conflicts by stylesheet order,
 * not class order, so such an override is not guaranteed to win. Use the props instead — `pill` for a fully rounded
 * shape — and toggle visibility on a wrapper element.
 */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  pill,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: boolean; pill?: boolean; className?: string } = {}): string {
  const sizing = icon ? ICON_SIZE[size] : BTN_SIZE[size];
  return cx(BTN_BASE, BTN_VARIANT[variant], pill ? sizing.replace(/\brounded-\S+/, 'rounded-full') : sizing, block && 'w-full', className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: boolean; pill?: boolean; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, block, icon, pill, loading, className, children, type = 'button', disabled, ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass({ variant, size, block, icon, pill, className })} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className={cx(
        'print-card rounded-[20px] border border-slate-200/80 bg-white shadow-soft dark:border-white/[0.07] dark:bg-[#0c121d] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ModuleHeader({ index, title, icon, right }: { index: number; title: string; icon: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-white/[0.06]">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-white text-brand-700 shadow-hairline ring-1 ring-inset ring-brand-100 dark:from-brand-400/15 dark:to-brand-400/5 dark:text-brand-300 dark:ring-brand-400/20">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Module <span className="tabular-nums text-brand-600 dark:text-brand-400">{String(index).padStart(2, '0')}</span>
          </p>
          <h2 className="truncate text-[17px] font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

export function Badge({ tone = 'slate', children, className, title }: { tone?: 'slate' | 'brand' | 'green' | 'amber' | 'red' | 'violet'; children: React.ReactNode; className?: string; title?: string }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100/80 text-slate-600 ring-slate-200/80 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
    brand: 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20',
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
  const color = value >= 90 ? '#10b981' : value >= 80 ? '#2a85a6' : value >= 70 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`${value}% ${label ?? ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-white/10" />
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
  const color = tone === 'green' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : tone === 'amber' ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-brand-400 to-brand-600';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
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
    <>
      <Button
        size="sm"
        onClick={async () => {
          if (await copyText(text)) {
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          }
        }}
        className={className}
      >
        {done ? <Check className="size-3.5 text-emerald-500" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {done ? t('copied') : (label ?? t('copy'))}
      </Button>
      {/* button content is presentational for assistive tech, so the confirmation is announced from a sibling */}
      <span role="status" className="sr-only">
        {done ? t('copied') : ''}
      </span>
    </>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
  ariaLabel,
  block,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode }>;
  onChange: (v: T) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
  block?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'inline-flex gap-0.5 rounded-xl bg-slate-900/[0.05] p-1 ring-1 ring-inset ring-slate-900/[0.04] dark:bg-white/[0.05] dark:ring-white/[0.06]',
        block && 'flex w-full',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-[background-color,color,box-shadow] duration-150',
            block && 'flex-1',
            size === 'sm' ? 'h-7 rounded-lg px-2.5 text-xs' : size === 'lg' ? 'h-10 rounded-[10px] px-4 text-sm' : 'h-8 rounded-lg px-3 text-[13px]',
            value === o.value
              ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.08),0_1px_1px_rgb(15_23_42/0.04)] ring-1 ring-slate-900/[0.06] dark:bg-white/[0.12] dark:text-white dark:ring-white/10'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle chip for filters. The active state also shows a check mark, so it does not rely on colour alone. */
export function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-[background-color,border-color,color] duration-150',
        active
          ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white',
        className,
      )}
    >
      {active && <Check className="-ml-0.5 size-3" aria-hidden />}
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
