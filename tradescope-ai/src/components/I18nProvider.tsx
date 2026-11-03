'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICT, type DictKey } from '@/lib/i18n';
import type { Bilingual, Lang } from '@/lib/types';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  p: (v: Bilingual) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ts-lang');
      if (saved === 'en' || saved === 'ko') setLangState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('ts-lang', l);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (k) => DICT[lang][k], p: (v) => v[lang] ?? v.ko }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
