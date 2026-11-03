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
}

export interface TariffRate {
  scheme: FtaScheme;
  /** ad valorem % applied by the importing country in 2026 */
  rate: number;
  /** rule of origin, e.g. "CTH or RVC 40%" */
  roo: string;
  certificate: Bilingual;
  note?: Bilingual;
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
  insight: Bilingual;
  meta: SourceMeta;
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
}

export interface PricingSeed {
  item: Bilingual;
  unit: string;
  /** indicative unit price at the default incoterm (USD) */
  unitPrice: number;
  moq: number;
  moqUnit: string;
  defaultIncoterm: string;
  incoterms: string[];
  leadTimeDays: number;
}

export interface TradeProduct {
  id: string;
  emoji: string;
  direction: Direction;
  name: Bilingual;
  category: Bilingual;
  /** keywords for retrieval (ko/en/HS) */
  aliases: string[];
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
}

// ---------- analysis / draft payloads ----------

export type IntentFocus = 'tariff' | 'regulation' | 'partners' | 'logistics' | 'market';

export interface QueryIntent {
  focus: IntentFocus[];
  amountUsd?: number;
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
}

export interface AnalysisReport {
  id: string;
  query: string;
  direction: Direction;
  productId: string;
  match: { score: number; confidence: 'high' | 'medium' | 'low'; directionAdjusted: boolean };
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
