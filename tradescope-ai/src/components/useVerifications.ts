'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyRuntimeOverrides } from '@/data/kr-ph-trade-db';
import type { OverrideEntry } from '@/data/official';
import { STATIC_PREVIEW } from '@/lib/preview';
import { useBusinessDay } from './useBusinessDay';

/**
 * Loads the verified values saved on the admin page (/api/verifications) and applies them to this page's copy of
 * the product data. Returns a version that changes whenever the data was rebuilt, plus `reload` (e.g. after the
 * admin saved a value) — use the version as a dependency wherever scores are computed.
 *
 * Only the latest load is applied (an earlier one answering late never replaces a newer save), and the values are
 * loaded again when the day changes, since they expire by date.
 */
export function useVerifications(): { version: number; reload: () => Promise<void> } {
  const [version, setVersion] = useState(0);
  const latest = useRef(0);
  const businessDay = useBusinessDay();
  const reload = useCallback(async () => {
    if (STATIC_PREVIEW) return;
    const id = ++latest.current;
    try {
      const res = await fetch('/api/verifications', { cache: 'no-store' });
      const j = (await res.json()) as { ok?: boolean; entries?: OverrideEntry[] };
      if (id !== latest.current) return; // a later load was started: its answer is the current one
      if (j.ok && Array.isArray(j.entries) && applyRuntimeOverrides(j.entries)) setVersion((v) => v + 1);
    } catch {
      /* offline or no server: the shipped data stays */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload, businessDay]);
  return { version, reload };
}
