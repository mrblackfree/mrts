/** Country law firms and customs firms TradeScope contracts with (shared by the server store and the admin UI). */
export type PartnerCountry = 'PH' | 'KR' | 'VN' | 'ID' | 'TH' | 'MY';
export type PartnerType = 'law' | 'customs';
export type PipelineStatus = 'candidate' | 'contacted' | 'negotiating' | 'contracted' | 'on-hold' | 'dropped';

export const PARTNER_COUNTRIES: PartnerCountry[] = ['PH', 'KR', 'VN', 'ID', 'TH', 'MY'];
export const PARTNER_TYPES: PartnerType[] = ['law', 'customs'];
export const PIPELINE: PipelineStatus[] = ['candidate', 'contacted', 'negotiating', 'contracted', 'on-hold', 'dropped'];

/** Public facts about a firm (from research or entered by the admin). */
export interface PartnerFirm {
  id: string;
  country: PartnerCountry;
  type: PartnerType;
  name: string;
  nameLocal?: string;
  city: string;
  website: string;
  contactPage?: string;
  practice: string[];
  why: string;
  sources: string[];
  /** medium: rests on search-indexed pages, press or a site that blocked reading — confirm before signing */
  confidence?: 'high' | 'medium';
  /** research = shipped candidate list; custom = added on the admin page */
  origin: 'research' | 'custom';
}

/** Internal pipeline and contract details (admin only). */
export interface PartnerDeal {
  status: PipelineStatus;
  contactName: string;
  contactEmail: string;
  terms: string;
  contractDate: string;
  notes: string;
  updatedAt: string | null;
}

export const EMPTY_DEAL: PartnerDeal = { status: 'candidate', contactName: '', contactEmail: '', terms: '', contractDate: '', notes: '', updatedAt: null };

export const DEAL_MAX = { contactName: 80, contactEmail: 120, terms: 500, contractDate: 10, notes: 2000 } as const;
export const FIRM_MAX = { name: 120, nameLocal: 120, city: 60, website: 200, practice: 200, why: 300 } as const;
/** one practice tag (the form's comma-separated `practice` text is split into at most PRACTICE_MAX_TAGS tags) */
export const PRACTICE_TAG_MAX = 60;
export const PRACTICE_MAX_TAGS = 8;

export type PartnerRow = PartnerFirm & { deal: PartnerDeal };
