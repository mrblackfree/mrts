'use client';

import { Cpu, Database, Moon, ScanSearch, ShieldCheck, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OFFICIAL } from '@/data/official';
import { useI18n } from './I18nProvider';
import { Button, cx, Segmented } from './ui';

export interface HealthInfo {
  ai: { enabled: boolean; model: string | null; provider: string | null };
}

export default function Header({ health, trustScore, onOpenTrust }: { health: HealthInfo | null; trustScore: number; onOpenTrust: () => void }) {
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
  // live = the last sync from the official API succeeded; degraded = API source whose last sync failed or was
  // partial (previous snapshot values are shown); reference = official site linked, not synced
  type SrcState = 'live' | 'degraded' | 'reference';
  const apiState = (k: 'comtrade' | 'wits' | 'kcs'): SrcState => {
    const st = OFFICIAL.sources[k]?.status;
    return st === 'ok' ? 'live' : st === 'not-configured' || st === undefined ? (k === 'kcs' ? 'reference' : 'degraded') : 'degraded';
  };
  const sources: Array<{ label: string; short: string; state: SrcState }> = [
    { label: t('srcComtrade'), short: 'Comtrade', state: apiState('comtrade') },
    { label: 'World Bank WITS', short: 'WITS', state: apiState('wits') },
    { label: t('srcUnipass'), short: 'UNI-PASS', state: apiState('kcs') },
    { label: t('srcPhFda'), short: 'PH FDA', state: 'reference' },
  ];
  const SRC_TITLE: Record<SrcState, string> = { live: t('srcLiveTitle'), degraded: t('srcDegradedTitle'), reference: t('srcRefTitle') };
  const SRC_DOT: Record<SrcState, string> = {
    live: 'bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.15)]',
    degraded: 'bg-amber-400 shadow-[0_0_0_3px_rgb(251_191_36/0.18)]',
    reference: 'bg-slate-300 dark:bg-slate-600',
  };
  // display is set per element (`inline-flex` or `hidden …:inline-flex`) so responsive visibility never conflicts
  const pill = 'h-8 items-center gap-1.5 whitespace-nowrap rounded-full border text-[11.5px] font-semibold shadow-hairline';

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-[#060a12]/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3.5 sm:gap-3 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2 rounded-xl sm:gap-2.5" aria-label="TradeScope AI home">
          <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-950 text-white shadow-brand ring-1 ring-inset ring-white/15">
            <ScanSearch className="size-[18px]" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-baseline gap-1 whitespace-nowrap text-[15.5px] font-bold tracking-[-0.025em] text-slate-900 sm:text-[16.5px] dark:text-white">
              TradeScope
              <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent dark:from-brand-300 dark:to-brand-400">AI</span>
            </span>
            <span className="block whitespace-nowrap text-[10.5px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
              <span className="sm:hidden">KR ↔ PH · MVP</span>
              <span className="hidden sm:inline">{t('appBadge')}</span>
            </span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* data sources: full list from xl, status dots from sm; on phones there is no room, so the status is
              available through the trust-score button (Trust Center) instead */}
          <div
            role="group"
            aria-label={t('sourcesConnected')}
            className={cx(pill, 'hidden border-slate-200/80 bg-white/70 pl-3 pr-1.5 text-slate-600 xl:inline-flex dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300')}
          >
            <Database className="size-3.5 text-slate-400" aria-hidden />
            {sources.map((s) => (
              <span key={s.label} title={`${s.label} — ${SRC_TITLE[s.state]}`} className="flex items-center gap-1.5 border-l border-slate-200 pl-2 first-of-type:border-l-0 dark:border-white/10">
                <span className={cx('size-1.5 rounded-full', SRC_DOT[s.state])} aria-hidden />
                <span className={s.state === 'reference' ? 'text-slate-400 dark:text-slate-500' : undefined}>{s.short}</span>
                {/* the dot colour is decorative; the state is also given in text */}
                <span className="sr-only">: {SRC_TITLE[s.state]}</span>
                {s.state === 'reference' && (
                  <span aria-hidden className="rounded bg-slate-100 px-1 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-white/[0.06]">
                    {t('srcRef')}
                  </span>
                )}
              </span>
            ))}
          </div>
          <span
            role="img"
            title={sources.map((s) => `${s.label}: ${SRC_TITLE[s.state]}`).join('\n')}
            aria-label={`${t('sourcesConnected')}: ${sources.map((s) => `${s.label} (${SRC_TITLE[s.state]})`).join(', ')}`}
            className={cx(pill, 'hidden border-slate-200/80 bg-white/70 px-2.5 text-slate-500 sm:inline-flex xl:hidden dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400')}
          >
            <Database className="size-3.5" aria-hidden />
            {sources.map((s) => (
              <span key={s.label} className={cx('size-1.5 rounded-full', SRC_DOT[s.state])} aria-hidden />
            ))}
          </span>

          <button
            type="button"
            onClick={onOpenTrust}
            title={t('trustTitle')}
            aria-label={`${t('trustTitle')} · ${t('trustScore')} ${trustScore}`}
            className={cx(
              pill,
              'inline-flex border-emerald-200/80 bg-emerald-50/80 pl-1.5 pr-1 sm:pl-2.5 text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15',
            )}
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('trustShort')}</span>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold tabular-nums text-white dark:bg-emerald-400 dark:text-emerald-950">{trustScore}</span>
          </button>

          <span
            title={aiOn ? `${t('aiLlmTitle')} · ${health?.ai.model ?? ''}` : t('aiSimTitle')}
            className={cx(
              pill,
              'hidden px-2.5 sm:inline-flex',
              aiOn
                ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300',
            )}
          >
            <span className="relative flex size-1.5" aria-hidden>
              {aiOn && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={cx('relative inline-flex size-1.5 rounded-full', aiOn ? 'bg-emerald-500' : 'bg-brand-500')} />
            </span>
            <Cpu className="size-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">{t('aiReady')}</span>
            <span className="hidden font-medium text-slate-400 lg:inline dark:text-slate-500">· {aiOn ? (health?.ai.model ?? 'LLM') : t('aiSim')}</span>
          </span>

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
          <Button variant="secondary" size="sm" icon pill onClick={toggleTheme} title={t('themeToggle')} aria-label={t('themeToggle')} className="max-sm:size-7">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
