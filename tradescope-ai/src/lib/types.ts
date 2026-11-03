// Shared domain types for TradeScope AI (KR <-> PH).

export type Lang = 'ko' | 'en';
export type Bilingual = { ko: string; en: string };
export type Country = 'KR' | 'PH';

/** PH_TO_KR = 필리핀 → 한국 수입/소싱, KR_TO_PH = 한국 → 필리핀 수출/진출 */
export type Direction = 'PH_TO_KR' | 'KR_TO_PH';

export type FtaScheme = 'MFN' | 'AKFTA' | 'RCEP' | 'KRPH';

/**
 * Provenance for every tariff / regulation / statistic.
 * - `official`: copied from an official dataset (e.g. UN Comtrade API values)
 * - `seed`: curated reference value for the MVP — must be re-checked at the official source before filing
 */
export interface SourceMeta {
  sources: string[];
  asOf: string;
  status: 'official' | 'seed';
  note?: Bilingual;
}

export interface HsCandidate {
  /** 10-digit Korean HSK code, e.g. 2008.99.9000 */
  code: string;
  /** Philippine AHTN 8-digit code (where relevant) */
  ahtn?: string;
  desc: Bilingual;
  /** AI fit score 0-100 */
  fit: number;
  rationale: Bilingual;
  /** binding classification ruling (from verified-overrides.json) */
  ruling?: { text: string; verifiedBy: string; verifiedAt: string };
}

export interface TariffRate {
  scheme: FtaScheme;
  /** ad valorem % applied by the importing country in 2026 */
  rate: number;
  /** rule of origin, e.g. "CTH or RVC 40%" */
  roo: string;
  certificate: Bilingual;
  note?: Bilingual;
  /** attached by the official-data layer */
  level?: VerificationLevel;
  verifiedNote?: string;
}

export type RequirementCategory =
  | 'customs'
  | 'food-safety'
  | 'labeling'
  | 'quarantine'
  | 'registration'
  | 'certification'
  | 'halal'
  | 'origin';

export interface Requirement {
  id: string;
  side: Country;
  category: RequirementCategory;
  title: Bilingual;
  detail: Bilingual;
  agency: string;
  url: string;
  mandatory: boolean;
  /** typical lead time in days */
  leadDays?: number;
  /** attached by the official-data layer */
  linkCheck?: LinkCheck;
  reviewed?: { source: string; reference: string; verifiedBy: string; verifiedAt: string };
}

export interface YearValue {
  year: number;
  /** USD */
  value: number;
}

export interface CompetitorShare {
  country: Bilingual;
  flag: string;
  /** % of the importing market */
  share: number;
  highlight?: boolean;
}

export interface MarketStats {
  /** what the 3-year series measures */
  seriesLabel: Bilingual;
  hsBasis: string;
  series: YearValue[];
  /** importing-market size for the HS basis (USD) */
  marketSize: { year: number; value: number; label: Bilingual };
  competitors: CompetitorShare[];
  /** data year the (hand-written) insight text was based on */
  insightYear?: number;
  insight: Bilingual;
  meta: SourceMeta;
  /** latest monthly year-to-date figure from Korea Customs (when the KCS connector is configured) */
  latestMonthly?: { from: string; to: string; value: number; source: string };
  /** official customs unit value for the HS basis (USD/kg) */
  unitValue?: { year: number; usdPerKg: number; netWgtKg: number; basis: 'CIF' | 'FOB' };
  /** Korea-reported exports vs PH-reported imports from Korea for the same year (KR→PH products) */
  mirror?: { year: number; krReported: number; phReported: number; ratio: number };
}

// ---------- verification layer ----------

/**
 * official   — value pulled automatically from an official API (snapshot, timestamped)
 * verified   — checked by a person against an official document (verified-overrides.json)
 * crosscheck — seed value consistent with an official aggregate / web presence confirmed
 * seed       — curated reference value, not yet verified
 */
export type VerificationLevel = 'official' | 'verified' | 'crosscheck' | 'seed';

export type VerificationCategory = 'stats' | 'market' | 'mfn' | 'fta' | 'roo' | 'hs' | 'requirements' | 'partners' | 'logistics' | 'pricing';

export interface VerificationItem {
  key: string;
  category: VerificationCategory;
  label: Bilingual;
  level: VerificationLevel;
  source?: string;
  checkedAt?: string;
  detail?: Bilingual;
  /** set when an official source disagreed with the seed value */
  conflict?: Bilingual;
}

export interface MfnCheck {
  hs6: string;
  year: number;
  avg: number;
  min: number;
  max: number;
  lines: number;
  seedRate: number;
  appliedRate: number;
  status: 'exact-match' | 'corrected' | 'within-range' | 'out-of-range';
  url: string;
  /** set when an expert-verified override replaced the checked rate afterwards */
  override?: { rate: number; source: string };
}

/**
 * Preferential rate the importer actually applied to the counterpart's goods (WITS TARIFFTYPE=PREF).
 * scheme 'AKFTA' — observation from before June 2023, when AKFTA was the only KR-PH agreement in force,
 *                  so it is the official AKFTA rate.
 * scheme 'BEST'  — later observation: the best of AKFTA / RCEP / KR-PH FTA, so it does NOT verify any single
 *                  agreement and is shown for information only.
 */
export interface PrefCheck {
  hs6: string;
  year: number;
  min: number;
  max: number;
  lines: number;
  scheme: 'AKFTA' | 'BEST';
  seedRate?: number;
  status: 'exact-match' | 'corrected' | 'within-range' | 'out-of-range' | 'info';
  url: string;
  /** set when an expert-verified override replaced the checked rate afterwards */
  override?: { rate: number; source: string };
}

/** Separate tariff table for an HS candidate whose duty differs from the primary code (e.g. flooring vs locks). */
export interface HsTariffTable {
  label: Bilingual;
  tariffs: TariffRate[];
  bestFta: { scheme: FtaScheme; reason: Bilingual };
  /** attached by the official-data layer */
  mfnCheck?: MfnCheck;
  prefCheck?: PrefCheck;
}

export interface LinkCheck {
  state: 'ok' | 'protected' | 'unavailable' | 'unreachable' | 'broken';
  status: number;
  checkedAt: string;
}

export interface ProductVerification {
  items: VerificationItem[];
  score: number;
  counts: Record<VerificationLevel, number>;
  mfnCheck?: MfnCheck;
  /** official preferential rate applied by the importer to the counterpart (WITS TARIFFTYPE=PREF) */
  prefCheck?: PrefCheck;
  /** seed price vs official customs unit value */
  priceCheck?: { year: number; usdPerKg: number; basis: 'CIF' | 'FOB'; seedPerKg: number; ratio: number; status: 'consistent' | 'outlier' | 'not-comparable' };
  /** official MFN summaries for the alternative HS candidates, keyed by HS6 */
  altMfn?: Record<string, { year: number; min: number; max: number; lines: number }>;
  insightStale?: boolean;
}

export interface LogisticsLane {
  from: string;
  to: string;
  mode: 'FCL 20ft' | 'FCL 40ft' | 'LCL';
  /** USD range (per container, or per CBM for LCL) */
  cost: [number, number];
  transitDays: [number, number];
  frequency: Bilingual;
  note?: Bilingual;
  /** forwarder quotation that replaced the seed range (verified-overrides.json) */
  quote?: { reference: string; verifiedBy: string; verifiedAt: string; validUntil?: string };
}

export type PartnerRole = 'buyer' | 'seller';
export type PartnerType = 'importer' | 'retail' | 'distributor' | 'manufacturer' | 'oem' | 'developer' | 'ecommerce' | 'foodservice';

export interface Partner {
  id: string;
  name: string;
  nameLocal?: string;
  country: Country;
  city: string;
  region: string;
  role: PartnerRole;
  type: PartnerType;
  products: Bilingual;
  website: string;
  /** 'official' = company site, 'listing' = public exhibitor / directory page */
  linkType: 'official' | 'listing';
  /** AI fit score 0-100 (simulated matching score) */
  score: number;
  comment: Bilingual;
  strengths: Bilingual[];
  appeal: Bilingual[];
  caution: Bilingual;
  /** attached by the official-data layer */
  linkCheck?: LinkCheck;
  license?: { text: string; validUntil?: string; source: string; verifiedBy: string; verifiedAt: string };
}

export interface PricingSeed {
  item: Bilingual;
  unit: string;
  /** net kg per pricing unit — used for the official customs unit-value cross-check */
  unitKg?: number;
  /** false when the HS-basis unit value is not comparable with this item */
  priceComparable?: boolean;
  /** indicative unit price at the default incoterm (USD) */
  unitPrice: number;
  moq: number;
  moqUnit: string;
  defaultIncoterm: string;
  incoterms: string[];
  leadTimeDays: number;
  verified?: { reference: string; verifiedBy: string; verifiedAt: string };
}

export interface TradeProduct {
  id: string;
  emoji: string;
  direction: Direction;
  name: Bilingual;
  category: Bilingual;
  /** keywords for retrieval (ko/en/HS) — words that name the product itself, not regions or channels */
  aliases: string[];
  /**
   * Terms naming a different form or product that shares an alias ("생바나나" vs banana chips, "아이스크림" vs
   * "크림"). When one appears, the aliases are not evidence for this product: its data (HS, duty, requirements)
   * would be wrong for what was asked.
   */
  excludeTerms?: string[];
  tagline: Bilingual;
  hs: HsCandidate[];
  /** tariffs applied by the importing country */
  tariffs: TariffRate[];
  tariffMeta: SourceMeta;
  bestFta: { scheme: FtaScheme; reason: Bilingual };
  requirements: Requirement[];
  requirementMeta: SourceMeta;
  market: MarketStats;
  logistics: LogisticsLane[];
  logisticsMeta: SourceMeta;
  partners: Partner[];
  pricing: PricingSeed;
  keyRisks: Bilingual[];
  /** HS-specific tariff tables for alternative HS candidates, keyed by the 10-digit code */
  tariffsByHs?: Record<string, HsTariffTable>;
  /** attached by the official-data layer (src/data/official) */
  verification?: ProductVerification;
}

// ---------- analysis / draft payloads ----------

export type IntentFocus = 'tariff' | 'regulation' | 'partners' | 'logistics' | 'market';

export interface QueryIntent {
  focus: IntentFocus[];
  /** amount stated in the query, on the basis of `incoterm` when one was given */
  amountUsd?: number;
  /**
   * The stated amount converted to the CIF value both Korea (관세법 제30조) and the Philippines (CMTA s.701)
   * assess duty on — set only when the query names a non-CIF incoterm (FOB, EXW, DDP, …). An estimate: freight
   * and insurance use the indicative incoterm uplift, not a quote.
   */
  customsValueUsd?: number;
  region?: string;
  incoterm?: string;
  matchedTerms: string[];
}

export interface Briefing {
  headline: string;
  summary: string;
  keyPoints: string[];
  nextActions: string[];
}

export interface EngineInfo {
  mode: 'llm' | 'simulation';
  model?: string;
  latencyMs: number;
  fallbackReason?: string;
  /** language of the LLM-generated text (the other language stays simulation output) */
  llmLang?: Lang;
}

export interface AnalysisReport {
  id: string;
  query: string;
  direction: Direction;
  productId: string;
  match: {
    score: number;
    confidence: 'high' | 'medium' | 'low';
    directionAdjusted: boolean;
    /**
     * false when the query names no product in the knowledge base. The report then holds an example product's
     * data, which must not be presented as the answer (the UI says so and the LLM is not called).
     */
    supported: boolean;
    /** why it is unsupported: nothing matched, a different form of a known product, or only an HS heading */
    unsupportedReason?: 'no-match' | 'other-form' | 'heading-only';
  };
  intent: QueryIntent;
  briefing: Record<Lang, Briefing>;
  engine: EngineInfo;
  generatedAt: string;
}

export interface DraftOptions {
  incoterm: string;
  moq: number;
  unitPrice: number;
  quantity: number;
  sample: 'free' | 'paid-credit' | 'none';
  sampleCourierByBuyer: boolean;
  payment: 'TT_30_70' | 'TT_100' | 'LC_SIGHT';
  includeFtaNote: boolean;
  includeCertNote: boolean;
  senderCompany: string;
  senderName: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
}

export interface ProformaLine {
  description: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface ProformaInvoice {
  number: string;
  date: string;
  validUntil: string;
  seller: string;
  buyer: string;
  incoterm: string;
  portOfLoading: string;
  portOfDischarge: string;
  payment: string;
  leadTime: string;
  lines: ProformaLine[];
  total: number;
  remarks: string[];
}

export interface DraftResult {
  email: Record<Lang, EmailDraft>;
  pi: ProformaInvoice;
  engine: EngineInfo;
}
