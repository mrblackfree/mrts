'use client';

import { Cpu, Database, FileDown, Moon, ScanSearch, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from './I18nProvider';
import { cx, Segmented } from './ui';

export interface HealthInfo {
  ai: { enabled: boolean; model: string | null; provider: string | null };
}

export default function Header({ health, canPrint }: { health: HealthInfo | null; canPrint: boolean }) {
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
  const sources = [t('srcUnipass'), t('srcComtrade'), t('srcPhFda')];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label="TradeScope AI home">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/30">
            <ScanSearch className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[16px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[17px] dark:text-white">TradeScope AI</span>
            <span className="block text-[10px] font-semibold text-slate-500 sm:hidden dark:text-slate-400">KR 🇰🇷 ↔ PH 🇵🇭 MVP</span>
            <span className="hidden text-[10.5px] font-semibold text-slate-500 sm:block dark:text-slate-400">{t('appBadge')}</span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 lg:flex" aria-label={t('sourcesConnected')}>
            {sources.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {s}
              </span>
            ))}
          </div>
          <span
            title={aiOn ? `${t('aiLlmTitle')} · ${health?.ai.model ?? ''}` : t('aiSimTitle')}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
              aiOn
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
                : 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/30',
            )}
          >
            <span className={cx('size-1.5 rounded-full', aiOn ? 'animate-pulse bg-emerald-500' : 'bg-brand-500')} />
            <Cpu className="size-3.5" />
            <span className="hidden sm:inline">{t('aiReady')}</span>
            <span className="hidden font-medium opacity-75 md:inline">· {aiOn ? (health?.ai.model ?? 'LLM') : t('aiSim')}</span>
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 sm:inline-flex lg:hidden dark:border-slate-700 dark:text-slate-400" title={sources.join(' · ')}>
            <Database className="size-3.5" />3
          </span>
          {canPrint && (
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 md:inline-flex dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <FileDown className="size-3.5" />
              {t('pdf')}
            </button>
          )}
          <Segmented
            size="sm"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ko', label: 'KO' },
              { value: 'en', label: 'EN' },
            ]}
          />
          <button
            type="button"
            onClick={toggleTheme}
            title={t('themeToggle')}
            aria-label={t('themeToggle')}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
