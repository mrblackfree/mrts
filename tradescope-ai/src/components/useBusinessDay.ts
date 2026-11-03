'use client';

import { useEffect, useState } from 'react';
import { refreshOfficialLayer } from '@/data/kr-ph-trade-db';
import { todayIso } from '@/lib/format';

/**
 * Calendar day in BUSINESS_TZ (checked every minute). When the day changes, the official-data layer is re-applied
 * first — so `validUntil` / licence expiry takes effect — and then the caller re-renders with the fresh PRODUCTS.
 * Use it in components that stay open for a long time (the workspace, the override helper).
 */
export function useBusinessDay(): string {
  const [day, setDay] = useState(todayIso);
  useEffect(() => {
    const id = setInterval(() => {
      refreshOfficialLayer(); // no-op unless the day changed
      setDay(todayIso()); // same value → React skips the re-render
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return day;
}
