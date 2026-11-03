/**
 * Official-data layer.
 *
 * Seed data (kr-ph-trade-db.ts)  ──▶  + official snapshot (scripts/sync-official-data.mjs → snapshot.json)
 *                                ──▶  + human-verified overrides (../verified-overrides.json)
 *                                ──▶  product with per-datum verification levels and a trust score.
 *
 * Rules
 *  - Statistics come from the UN Comtrade snapshot (level: official).
 *  - MFN is cross-checked against World Bank WITS TRAINS (HS6). When every national line in the HS6 has the
 *    same rate, that rate is authoritative and replaces the seed (level: official, conflict noted).
 *  - Preferential (FTA) rates can never exceed MFN — values above MFN are capped.
 *  - Overrides raise a datum to 'verified' until their validUntil date passes.
 */
import overridesJson from '../verified-overrides.json';
import snapshotJson from './snapshot.json';
import type {
  Bilingual,
  CompetitorShare,
  LinkCheck,
  ProductVerification,
  TradeProduct,
  VerificationCategory,
  VerificationItem,
  VerificationLevel,
  YearValue,
} from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

// ---------------------------------------------------------------------------
// Snapshot & override shapes
// ---------------------------------------------------------------------------

interface SnapPartner {
  code: number;
  iso2: string;
  flag: string;
  ko: string;
  en: string;
  value: number;
  share: number;
}

interface SnapProduct {
  hsBasis: string;
  series: YearValue[];
  seriesSource: string;
  market: null | { year: number; reporter: number; world: number; competitors: SnapPartner[]; counterpart: SnapPartner; source: string };
}

interface WitsEntry {
  reporter: number;
  year: number;
  avg: number;
  min: number;
  max: number;
  lines: number;
  url: string;
}

export interface SourceStatus {
  status: 'ok' | 'partial' | 'error' | 'not-configured';
  fetchedAt?: string;
  endpoint?: string;
  errors?: string[];
  counts?: Record<string, number>;
  note?: string;
  entries?: number;
}

interface Snapshot {
  generatedAt?: string;
  sources?: Partial<Record<'comtrade' | 'wits' | 'kcs' | 'links' | 'overrides', SourceStatus>>;
  comtrade?: { products?: Record<string, SnapProduct>; overview?: { krExportsToPh: YearValue[]; krImportsFromPh: YearValue[] } };
  wits?: Record<string, Record<string, WitsEntry>>;
  kcs?: { ytd?: Record<string, { from: string; to: string; expUsd: number; impUsd: number; source: string }>; fx?: { usdKrw: number; appliedFrom: string; source: string } | null };
  links?: Record<string, LinkCheck>;
}

type OverrideTarget =
  | { type: 'tariff'; scheme: string; rate: number; roo?: string }
  | { type: 'hs'; code: string; ruling: string }
  | { type: 'partner'; id: string; license: string; licenseValidUntil?: string }
  | { type: 'requirement'; id: string }
  | { type: 'logistics'; index: number; cost?: [number, number]; transitDays?: [number, number] }
  | { type: 'pricing'; unitPrice?: number; moq?: number };

interface OverrideEntry {
  productId: string;
  target: OverrideTarget;
  source: string;
  reference: string;
  verifiedBy: string;
  verifiedAt: string;
  validUntil?: string;
}

const SNAP = snapshotJson as unknown as Snapshot;
const OVERRIDES = ((overridesJson as unknown as { entries?: OverrideEntry[] }).entries ?? []).filter(Boolean);

export const OFFICIAL = {
  generatedAt: SNAP.generatedAt,
  sources: SNAP.sources ?? {},
  overview: SNAP.comtrade?.overview,
  fx: SNAP.kcs?.fx ?? null,
  links: SNAP.links ?? {},
  overrideCount: OVERRIDES.length,
};

const ymd = (iso?: string) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : undefined);
const today = () => new Date().toISOString().slice(0, 10);
const isActive = (e: OverrideEntry) => !e.validUntil || e.validUntil >= today();
const dotted = (hs6: string) => `${hs6.slice(0, 4)}.${hs6.slice(4, 6)}`;

export const LEVEL_VALUE: Record<VerificationLevel, number> = { official: 1, verified: 1, crosscheck: 0.5, seed: 0 };

export const CATEGORY_LABEL: Record<VerificationCategory, Bilingual> = {
  stats: b('교역 통계', 'Trade statistics'),
  market: b('시장규모·점유율', 'Market size & shares'),
  mfn: b('기본세율 (MFN)', 'MFN rate'),
  fta: b('FTA 협정세율', 'FTA preferential rates'),
  roo: b('원산지 결정기준', 'Rules of origin'),
  hs: b('HS 품목분류', 'HS classification'),
  requirements: b('통관·인증 요건', 'Customs & certification'),
  partners: b('바이어·공급사', 'Buyers & suppliers'),
  logistics: b('물류 운임', 'Freight'),
  pricing: b('단가', 'Pricing'),
};

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export function applyOfficialLayer(seed: TradeProduct): TradeProduct {
  const p: TradeProduct = structuredClone(seed);
  const items: VerificationItem[] = [];
  const syncAt = SNAP.sources?.comtrade?.fetchedAt;
  const importerKo = p.direction === 'PH_TO_KR' ? '한국' : '필리핀';
  const importerEn = p.direction === 'PH_TO_KR' ? 'Korea' : 'PH';
  const verification: ProductVerification = { items, score: 0, counts: { official: 0, verified: 0, crosscheck: 0, seed: 0 } };

  // 1) statistics ------------------------------------------------------------
  const snapP = SNAP.comtrade?.products?.[p.id];
  if (snapP && snapP.series.length >= 2) p.market.series = snapP.series;
  items.push({
    key: 'stats',
    category: 'stats',
    label: b('3개년 교역 통계', '3-year trade series'),
    level: 'official',
    source: snapP?.seriesSource ?? 'UN Comtrade',
    checkedAt: syncAt,
  });

  if (snapP?.market) {
    const m = snapP.market;
    const ph = p.direction === 'KR_TO_PH';
    p.market.marketSize = {
      year: m.year,
      value: m.world,
      label: b(`${importerKo} HS ${dotted(snapP.hsBasis)} 총수입 (${m.year}${ph ? ', 필리핀 신고' : ''})`, `${importerEn} total HS ${dotted(snapP.hsBasis)} imports (${m.year}${ph ? ', PH-reported' : ''})`),
    };
    const toShare = (x: SnapPartner): CompetitorShare => ({ country: b(x.ko, x.en), flag: x.flag, share: x.share, highlight: x.code === m.counterpart.code });
    const comps = m.competitors.slice(0, 5).map(toShare);
    if (!comps.some((c) => c.highlight)) comps.push(toShare(m.counterpart));
    p.market.competitors = comps;
    p.market.meta = {
      sources: ['UN Comtrade API', ...p.market.meta.sources.filter((s) => s !== 'UN Comtrade')],
      asOf: ymd(syncAt) ?? p.market.meta.asOf,
      status: 'official',
      note: p.market.meta.note,
    };
    verification.insightStale = p.market.insightYear !== undefined && p.market.insightYear !== m.year;
  }
  items.push({ key: 'market', category: 'market', label: b('수입시장 규모·경쟁국 점유율', 'Import market size & competitor shares'), level: 'official', source: snapP?.market?.source ?? 'UN Comtrade', checkedAt: syncAt });

  const ytd = SNAP.kcs?.ytd?.[p.id];
  if (ytd) p.market.latestMonthly = { from: ytd.from, to: ytd.to, value: p.direction === 'PH_TO_KR' ? ytd.impUsd : ytd.expUsd, source: ytd.source };

  // 2) MFN cross-check (WITS) --------------------------------------------------
  const mfn = p.tariffs.find((t) => t.scheme === 'MFN');
  const primary6 = p.hs[0].code.replace(/\./g, '').slice(0, 6);
  const wits = SNAP.wits?.[p.id] ?? {};
  const w = wits[primary6];
  let mfnLevel: VerificationLevel = 'seed';
  let mfnConflict: Bilingual | undefined;
  if (w && mfn) {
    const seedRate = mfn.rate;
    let status: NonNullable<ProductVerification['mfnCheck']>['status'];
    if (w.min === w.max) {
      if (seedRate === w.min) status = 'exact-match';
      else {
        status = 'corrected';
        mfn.rate = w.min;
        mfnConflict = b(`시드 ${seedRate}% → WITS ${w.year} 공식 ${w.min}%로 자동 보정`, `Seed ${seedRate}% auto-corrected to official ${w.min}% (WITS ${w.year})`);
      }
      mfnLevel = 'official';
    } else if (seedRate >= w.min && seedRate <= w.max) {
      status = 'within-range';
      mfnLevel = 'crosscheck';
    } else {
      status = 'out-of-range';
      mfnConflict = b(`시드 ${seedRate}%가 공식 HS6 범위(${w.min}~${w.max}%) 밖 — 확인 필요`, `Seed ${seedRate}% is outside the official HS6 range (${w.min}–${w.max}%) — review`);
    }
    verification.mfnCheck = { hs6: primary6, year: w.year, avg: w.avg, min: w.min, max: w.max, lines: w.lines, seedRate, appliedRate: mfn.rate, status, url: w.url };
    mfn.level = mfnLevel;
  }
  verification.altMfn = Object.fromEntries(
    Object.entries(wits)
      .filter(([hs6]) => hs6 !== primary6)
      .map(([hs6, v]) => [hs6, { year: v.year, min: v.min, max: v.max, lines: v.lines }]),
  );

  // Preferential rates can never exceed MFN.
  if (mfn) {
    for (const t of p.tariffs) {
      if (t.scheme !== 'MFN' && t.rate > mfn.rate) {
        t.rate = mfn.rate;
        t.verifiedNote = 'capped-at-mfn';
      }
    }
  }

  // 3) human-verified overrides ------------------------------------------------
  for (const e of OVERRIDES.filter((o) => o.productId === p.id && isActive(o))) {
    const stamp = `${e.source} · ${e.verifiedBy} · ${e.verifiedAt}`;
    const tg = e.target;
    if (tg.type === 'tariff') {
      const t = p.tariffs.find((x) => x.scheme === tg.scheme);
      if (t) {
        t.rate = tg.rate;
        if (tg.roo) t.roo = tg.roo;
        t.level = 'verified';
        t.verifiedNote = stamp;
        if (t.scheme === 'MFN') mfnLevel = 'verified';
      }
    } else if (tg.type === 'hs') {
      const h = p.hs.find((x) => x.code === tg.code);
      if (h) h.ruling = { text: tg.ruling, verifiedBy: e.verifiedBy, verifiedAt: e.verifiedAt };
    } else if (tg.type === 'partner') {
      const pt = p.partners.find((x) => x.id === tg.id);
      if (pt) pt.license = { text: tg.license, validUntil: tg.licenseValidUntil, source: e.source, verifiedBy: e.verifiedBy, verifiedAt: e.verifiedAt };
    } else if (tg.type === 'requirement') {
      const r = p.requirements.find((x) => x.id === tg.id);
      if (r) r.reviewed = { source: e.source, reference: e.reference, verifiedBy: e.verifiedBy, verifiedAt: e.verifiedAt };
    } else if (tg.type === 'logistics') {
      const l = p.logistics[tg.index];
      if (l) {
        if (tg.cost) l.cost = tg.cost;
        if (tg.transitDays) l.transitDays = tg.transitDays;
        l.quote = { reference: e.reference, verifiedBy: e.verifiedBy, verifiedAt: e.verifiedAt, validUntil: e.validUntil };
      }
    } else if (tg.type === 'pricing') {
      if (tg.unitPrice) p.pricing.unitPrice = tg.unitPrice;
      if (tg.moq) p.pricing.moq = tg.moq;
      p.pricing.verified = { reference: e.reference, verifiedBy: e.verifiedBy, verifiedAt: e.verifiedAt };
    }
  }

  // 4) link checks ---------------------------------------------------------------
  const links = SNAP.links ?? {};
  for (const r of p.requirements) r.linkCheck = links[r.url];
  for (const pt of p.partners) pt.linkCheck = links[pt.website];

  // 5) verification items -------------------------------------------------------
  const mc = verification.mfnCheck;
  items.push({
    key: 'tariff:MFN',
    category: 'mfn',
    label: b('기본세율 (MFN)', 'MFN rate'),
    level: mfnLevel,
    source: mc ? `World Bank WITS TRAINS · HS ${mc.hs6} · ${mc.year}` : undefined,
    checkedAt: SNAP.sources?.wits?.fetchedAt,
    detail: mc ? b(`공식 HS6 MFN ${mc.min === mc.max ? `${mc.min}%` : `${mc.min}~${mc.max}%`} (${mc.lines}개 세번)`, `Official HS6 MFN ${mc.min === mc.max ? `${mc.min}%` : `${mc.min}–${mc.max}%`} (${mc.lines} lines)`) : undefined,
    conflict: mfnConflict,
  });
  for (const t of p.tariffs.filter((x) => x.scheme !== 'MFN')) {
    items.push({
      key: `tariff:${t.scheme}`,
      category: 'fta',
      label: b(`${t.scheme} 협정세율`, `${t.scheme} preferential rate`),
      level: t.level === 'verified' ? 'verified' : 'seed',
      source: t.level === 'verified' ? t.verifiedNote : undefined,
      conflict: t.verifiedNote === 'capped-at-mfn' ? b('시드값이 MFN보다 높아 MFN으로 상한 적용', 'Seed exceeded MFN — capped at MFN') : undefined,
    });
  }
  const best = p.tariffs.find((t) => t.scheme === p.bestFta.scheme);
  items.push({ key: 'roo', category: 'roo', label: b('최적 협정 원산지기준', 'Rule of origin (best FTA)'), level: best?.level === 'verified' ? 'verified' : 'seed', source: best?.level === 'verified' ? best.verifiedNote : undefined });
  items.push({
    key: 'hs',
    category: 'hs',
    label: b(`HS ${p.hs[0].code} 품목분류`, `HS ${p.hs[0].code} classification`),
    level: p.hs[0].ruling ? 'verified' : 'seed',
    source: p.hs[0].ruling?.text,
  });
  for (const r of p.requirements) {
    items.push({
      key: `req:${r.id}`,
      category: 'requirements',
      label: r.title,
      level: r.reviewed ? 'verified' : 'seed',
      source: r.reviewed ? `${r.reviewed.source} · ${r.reviewed.verifiedBy}` : undefined,
      checkedAt: r.reviewed?.verifiedAt ?? r.linkCheck?.checkedAt,
    });
  }
  for (const pt of p.partners) {
    const webOk = pt.linkCheck && (pt.linkCheck.state === 'ok' || pt.linkCheck.state === 'protected');
    items.push({
      key: `partner:${pt.id}`,
      category: 'partners',
      label: b(pt.name, pt.name),
      level: pt.license ? 'verified' : webOk ? 'crosscheck' : 'seed',
      source: pt.license ? `${pt.license.source} · ${pt.license.verifiedBy}` : webOk ? b('공개 웹페이지 응답 확인', 'Public web page responded').ko : undefined,
      checkedAt: pt.license?.verifiedAt ?? pt.linkCheck?.checkedAt,
      detail: pt.license ? b(pt.license.text, pt.license.text) : b('인허가(LTO 등)는 미검증', 'Licences (e.g. LTO) not yet verified'),
    });
  }
  p.logistics.forEach((l, i) =>
    items.push({ key: `lane:${i}`, category: 'logistics', label: b(`${l.from}→${l.to} ${l.mode}`, `${l.from}→${l.to} ${l.mode}`), level: l.quote ? 'verified' : 'seed', source: l.quote?.reference, checkedAt: l.quote?.verifiedAt }),
  );
  items.push({ key: 'pricing', category: 'pricing', label: b('기준 단가·MOQ', 'Reference price & MOQ'), level: p.pricing.verified ? 'verified' : 'seed', source: p.pricing.verified?.reference });

  // 6) score: every category weighs the same; inside a category items are averaged
  const byCat = new Map<VerificationCategory, number[]>();
  for (const it of items) {
    verification.counts[it.level] += 1;
    byCat.set(it.category, [...(byCat.get(it.category) ?? []), LEVEL_VALUE[it.level]]);
  }
  const catScores = [...byCat.values()].map((v) => v.reduce((s, x) => s + x, 0) / v.length);
  verification.score = Math.round((catScores.reduce((s, x) => s + x, 0) / catScores.length) * 100);
  p.verification = verification;
  return p;
}

/** Per-category breakdown used by the trust center. */
export function categoryBreakdown(p: TradeProduct): Array<{ category: VerificationCategory; value: number; items: VerificationItem[] }> {
  const items = p.verification?.items ?? [];
  const cats = Object.keys(CATEGORY_LABEL) as VerificationCategory[];
  return cats
    .map((category) => {
      const its = items.filter((i) => i.category === category);
      const value = its.length ? its.reduce((s, i) => s + LEVEL_VALUE[i.level], 0) / its.length : 0;
      return { category, value, items: its };
    })
    .filter((c) => c.items.length);
}
