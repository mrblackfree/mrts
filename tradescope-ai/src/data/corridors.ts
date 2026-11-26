/**
 * Trade corridors shown on the landing page. Korea ↔ Philippines is the one live corridor; the others are shown
 * as "coming soon" only — no data, analysis or service behind them yet.
 */
import type { Bilingual } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export interface Corridor {
  /** ISO 3166-1 alpha-2 of the partner country (Korea is always the other side) */
  code: 'PH' | 'VN' | 'ID' | 'TH' | 'MY';
  name: Bilingual;
  /** agreements that would apply between Korea and this country */
  agreements: Bilingual;
  status: 'live' | 'soon';
}

export const CORRIDORS: Corridor[] = [
  { code: 'PH', name: b('필리핀', 'Philippines'), agreements: b('한–필리핀 FTA · 한–아세안 FTA · RCEP', 'Korea–Philippines FTA · Korea–ASEAN FTA · RCEP'), status: 'live' },
  { code: 'VN', name: b('베트남', 'Vietnam'), agreements: b('한–베트남 FTA · 한–아세안 FTA · RCEP', 'Korea–Vietnam FTA · Korea–ASEAN FTA · RCEP'), status: 'soon' },
  { code: 'ID', name: b('인도네시아', 'Indonesia'), agreements: b('한–인도네시아 CEPA · 한–아세안 FTA · RCEP', 'Korea–Indonesia CEPA · Korea–ASEAN FTA · RCEP'), status: 'soon' },
  { code: 'TH', name: b('태국', 'Thailand'), agreements: b('한–아세안 FTA · RCEP', 'Korea–ASEAN FTA · RCEP'), status: 'soon' },
  { code: 'MY', name: b('말레이시아', 'Malaysia'), agreements: b('한–아세안 FTA · RCEP', 'Korea–ASEAN FTA · RCEP'), status: 'soon' },
];

export const COMING_SOON = CORRIDORS.filter((c) => c.status === 'soon');
