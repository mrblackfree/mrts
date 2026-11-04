'use client';

import { Moon, ScanSearch, ShieldCheck, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from './I18nProvider';
import { LANDING_SECTIONS } from './Landing';
import { Button, cx, Segmented } from './ui';
import { Flag } from './Flag';

export interface HealthInfo {
  ai: { enabled: boolean; model: string | null; provider: string | null };
  links?: { feedbackUrl: string | null; overridesEditUrl: string | null };
}

/**
 * One quiet bar: the brand, the landing page's sections (when it is shown), and three controls. Source and engine
 * status live in the Trust Center behind the trust button, not as chips a trader has to decode.
 */
export default function Header({ health, trustScore, onOpenTrust, nav }: { health: HealthInfo | null; trustScore: number; onOpenTrust: () => void; nav?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('ts-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  const aiOn = !!health?.ai.enabled;
  const engine = aiOn ? `${t('aiLlmTitle')} · ${health?.ai.model ?? 'LLM'}` : t('aiSimTitle');

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-[#060a12]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3.5 sm:gap-3 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="TradeScope AI home">
          <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-ink-900 text-white shadow-ink dark:bg-white dark:text-ink-900">
            <ScanSearch className="size-[18px]" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-[16px] font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
              TradeScope <span className="text-brand-700 dark:text-brand-300">AI</span>
            </span>
            <span className="hidden items-center gap-1 whitespace-nowrap text-[11px] font-medium text-slate-500 sm:flex dark:text-slate-400">
              <Flag code="KR" label={t('countryKR')} />
              <span aria-hidden>↔</span>
              <Flag code="PH" label={t('countryPH')} />
              {t('appPilot')}
            </span>
          </span>
        </a>

        {nav && (
          <nav aria-label={t('landingNav')} className="ml-6 hidden items-center gap-1 lg:flex">
            {LANDING_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white">
                {t(s.key)}
              </a>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenTrust}
            title={`${t('trustTitle')} · ${engine}`}
            aria-label={`${t('trustTitle')} · ${t('trustScore')} ${trustScore} · ${engine}`}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white pl-2 pr-1 sm:pl-2.5 text-[12px] font-semibold text-slate-700 shadow-hairline transition hover:border-slate-300 hover:bg-slate-50',
              'dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]',
            )}
          >
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="hidden sm:inline">{t('trustShort')}</span>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold tabular-nums text-white dark:bg-emerald-400 dark:text-emerald-950">{trustScore}</span>
          </button>
          <Segmented
            size="sm"
            value={lang}
            onChange={setLang}
            ariaLabel={t('language')}
            options={[
              { value: 'ko', label: 'KO' },
              { value: 'en', label: 'EN' },
            ]}
          />
          <Button variant="ghost" size="sm" icon pill onClick={toggleTheme} title={t('themeToggle')} aria-label={t('themeToggle')} className="max-sm:size-7">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
