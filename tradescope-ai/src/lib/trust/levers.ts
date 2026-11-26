/**
 * What raises the data trust score, and by how much.
 *
 * Each lever is a connection (an API or an automated check) or a verification done by a contracted partner. Its
 * projected gain is computed with the same formula as the live score (see `scoreOf`): the product's verification
 * items are re-scored as if the lever's categories had reached the stated level. Levels are only ever raised —
 * a lever never lowers an item that is already official or verified.
 *
 * Projections are estimates of what the score would be once the work is done. The live score itself only
 * changes when the data is actually synced or verified.
 */
import { scoreOf } from '@/data/official';
import type { Bilingual, TradeProduct, VerificationCategory, VerificationLevel } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export type LeverKind = 'api' | 'check' | 'expert';

export interface Lever {
  id: string;
  kind: LeverKind;
  name: Bilingual;
  /** who does it / where the data comes from */
  by: Bilingual;
  /** what it changes in the product data */
  effect: Bilingual;
  /** categories it raises, and to which level */
  raises: Partial<Record<VerificationCategory, VerificationLevel>>;
  /** admin settings involved (none = no key needed) */
  settings?: string[];
  /** admin section to open for setup */
  section?: 'data' | 'partners' | 'trust-center';
  /** official-data source name in the snapshot, for the "connected" status */
  source?: 'comtrade' | 'wits' | 'links' | 'kcs';
  getKey?: { label: Bilingual; url: string };
}

export const LEVERS: Lever[] = [
  {
    id: 'comtrade',
    kind: 'api',
    name: b('UN Comtrade 무역 통계', 'UN Comtrade trade statistics'),
    by: b('UN Comtrade API (키 없이도 동작, 구독키로 한도 확대)', 'UN Comtrade API (works keyless; a subscription key raises the limits)'),
    effect: b('3개년 교역 통계·수입시장 규모·경쟁국 점유율을 공식값으로', 'Official 3-year series, import market size and competitor shares'),
    raises: { stats: 'official', market: 'official' },
    settings: ['COMTRADE_API_KEY'],
    section: 'data',
    source: 'comtrade',
    getKey: { label: b('comtradedeveloper.un.org에서 구독키 발급', 'Get a key at comtradedeveloper.un.org'), url: 'https://comtradedeveloper.un.org/' },
  },
  {
    id: 'wits',
    kind: 'api',
    name: b('World Bank WITS 세율', 'World Bank WITS tariffs'),
    by: b('WITS TRAINS API (키 불필요)', 'WITS TRAINS API (no key needed)'),
    effect: b('기본세율(MFN)을 공식 HS6 세율로 대조·보정, HS 코드 유효성 확인', 'MFN checked against the official HS6 rate; HS code validity confirmed'),
    raises: { mfn: 'official', hs: 'crosscheck' },
    section: 'data',
    source: 'wits',
  },
  {
    id: 'links',
    kind: 'check',
    name: b('공식 링크·거래처 웹사이트 점검', 'Official links & partner websites'),
    by: b('자동 점검 (동기화에 포함)', 'Automated check (part of the sync)'),
    effect: b('거래처 공개 웹페이지 응답 확인으로 교차검증', 'Partner web pages checked for a response (cross-check)'),
    raises: { partners: 'crosscheck' },
    section: 'data',
    source: 'links',
  },
  {
    id: 'kcs',
    kind: 'api',
    name: b('관세청 수출입실적·과세환율 (data.go.kr)', 'Korea Customs trade & FX (data.go.kr)'),
    by: b('공공데이터포털 서비스키', 'data.go.kr service key'),
    effect: b('월별 최신 실적과 관세청 과세환율을 표시 (신뢰도 점수 항목은 아님)', 'Latest monthly trade and the customs FX rate (not a scored item)'),
    raises: {},
    settings: ['DATA_GO_KR_SERVICE_KEY'],
    section: 'data',
    source: 'kcs',
    getKey: { label: b('data.go.kr에서 「관세청_품목별 국가별 수출입실적」「관세청_관세환율정보」 활용신청', 'Apply for the KCS trade and FX APIs on data.go.kr'), url: 'https://www.data.go.kr/' },
  },
  {
    id: 'customs-fta',
    kind: 'expert',
    name: b('FTA 협정세율·원산지기준 확인', 'FTA rates & rules of origin'),
    by: b('국가별 계약 관세법인', 'Contracted customs firm in each country'),
    effect: b('RCEP·한–필 FTA·AKFTA 세율과 최적 협정 원산지기준을 관세사가 확인', 'A licensed broker confirms RCEP, Korea–PH FTA and AKFTA rates and the best agreement’s rule of origin'),
    raises: { fta: 'verified', roo: 'verified' },
    section: 'partners',
  },
  {
    id: 'customs-hs',
    kind: 'expert',
    name: b('HS 품목분류 확인', 'HS classification'),
    by: b('국가별 계약 관세법인 (필요 시 사전심사)', 'Contracted customs firm (advance ruling if needed)'),
    effect: b('품목별 HS 코드를 관세사 의견서·사전심사로 확정', 'HS codes confirmed by a broker’s opinion or an advance ruling'),
    raises: { hs: 'verified' },
    section: 'partners',
  },
  {
    id: 'law-requirements',
    kind: 'expert',
    name: b('인허가·통관 요건 검토', 'Permit & customs requirements'),
    by: b('국가별 계약 법무법인', 'Contracted law firm in each country'),
    effect: b('FDA·BAI·BOC 등 품목별 요건과 근거를 변호사가 검토', 'A lawyer reviews each product’s FDA, BAI, BOC… requirements and sources'),
    raises: { requirements: 'verified' },
    section: 'partners',
  },
  {
    id: 'law-partners',
    kind: 'expert',
    name: b('거래처 인허가(LTO 등) 확인', 'Partner licences (LTO…)'),
    by: b('국가별 계약 법무법인 · 현지 파트너', 'Contracted law firm · local partner'),
    effect: b('바이어·공급사의 영업허가·등록 번호와 유효기간을 공식 명단으로 확인', 'Buyers’ and suppliers’ licences and validity checked against official registers'),
    raises: { partners: 'verified' },
    section: 'partners',
  },
  {
    id: 'freight',
    kind: 'expert',
    name: b('운임 견적', 'Freight quotes'),
    by: b('포워더 파트너', 'Forwarder partner'),
    effect: b('노선별 운임·운송 기간을 실제 견적(유효기간 포함)으로', 'Lane freight and transit times from real quotes (with validity)'),
    raises: { logistics: 'verified' },
    section: 'trust-center',
  },
  {
    id: 'price',
    kind: 'expert',
    name: b('단가·MOQ 견적', 'Price & MOQ quotes'),
    by: b('바이어·공급사 견적서', 'Buyer / supplier quotations'),
    effect: b('기준 단가와 최소 주문량을 실제 견적으로', 'Reference price and MOQ from real quotations'),
    raises: { pricing: 'verified' },
    section: 'trust-center',
  },
];

const RANK: Record<VerificationLevel, number> = { seed: 0, crosscheck: 1, official: 2, verified: 2 };

type Item = { category: VerificationCategory; level: VerificationLevel };

/** Items with the levers' raises applied (levels only go up). */
export function applyLevers(items: Item[], levers: Lever[]): Item[] {
  return items.map((it) => {
    let level = it.level;
    for (const l of levers) {
      const to = l.raises[it.category];
      if (to && RANK[to] > RANK[level]) level = to;
    }
    return { category: it.category, level };
  });
}

const itemsOf = (p: TradeProduct): Item[] => (p.verification?.items ?? []).map((i) => ({ category: i.category, level: i.level }));
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

export interface LeverProjection {
  lever: Lever;
  /** average score gain across products if only this lever is added to today's data */
  gain: number;
  /** average score after this lever and every lever before it (in the order given) */
  cumulative: number;
  perProduct: Array<{ id: string; now: number; then: number }>;
}

export interface TrustProjection {
  now: number;
  /** with every lever */
  full: number;
  levers: LeverProjection[];
  products: Array<{ id: string; now: number; full: number }>;
}

/** Projected scores. Levers are listed by their own gain (largest first); `cumulative` follows that order. */
export function projectTrust(products: TradeProduct[], levers: Lever[] = LEVERS): TrustProjection {
  const base = products.map((p) => ({ id: p.id, items: itemsOf(p) }));
  const nowScores = base.map((x) => scoreOf(x.items));
  const single = levers.map((lever) => {
    const perProduct = base.map((x, i) => ({ id: x.id, now: nowScores[i], then: scoreOf(applyLevers(x.items, [lever])) }));
    return { lever, perProduct, gain: avg(perProduct.map((r) => r.then)) - avg(nowScores) };
  });
  single.sort((a, b) => b.gain - a.gain);
  const applied: Lever[] = [];
  const out: LeverProjection[] = single.map((s) => {
    applied.push(s.lever);
    return { ...s, cumulative: avg(base.map((x) => scoreOf(applyLevers(x.items, applied)))) };
  });
  return {
    now: avg(nowScores),
    full: avg(base.map((x) => scoreOf(applyLevers(x.items, levers)))),
    levers: out,
    products: base.map((x, i) => ({ id: x.id, now: nowScores[i], full: scoreOf(applyLevers(x.items, levers)) })),
  };
}
