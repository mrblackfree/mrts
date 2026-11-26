/**
 * The law each requirement rests on, matched against an official text of that law.
 *
 * An entry says: this instrument and article exist, and their operative text (quoted) says what the requirement
 * claims. It is a cross-check, not legal advice — how the rule applies to a given product and shipment still needs a
 * lawyer or customs broker, whose review (a `requirement` entry in verified-overrides.json) makes the item verified.
 *
 * Only texts on official hosts count (see OFFICIAL_LAW_HOSTS). Requirements without an entry stay at the seed level.
 */
import type { Bilingual, LegalBasis } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export interface LegalBasisEntry extends LegalBasis {
  /** requirement ids are shared across products; limit an entry to these products when the basis differs */
  products?: string[];
}

/**
 * Hosts whose texts count as official: government portals (KR, PH, and SG for its copy of an ASEAN text), the Korea
 * Legislation Research Institute, the ASEAN Secretariat, and the WTO (members' own notifications).
 */
const OFFICIAL_HOSTS = ['law.go.kr', 'elaw.klri.re.kr', 'asean.org', 'docs.wto.org'];
const OFFICIAL_SUFFIXES = ['.go.kr', '.gov.ph', '.gov.sg', '.wto.org'];

export function isOfficialLawUrl(url: string): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  return OFFICIAL_HOSTS.includes(bare) || OFFICIAL_SUFFIXES.some((s) => host.endsWith(s));
}

export const LEGAL_BASES: Record<string, LegalBasisEntry> = {
  // ---- Philippines -----------------------------------------------------------------------------------------------
  'ph-fda-lto': {
    citation: b('필리핀 보건부 행정명령 AO 2014-0029 제V.A.2·V.A.5조 (FDA법 RA 9711)', 'DOH Administrative Order 2014-0029 §V.A.2 and §V.A.5 (FDA Act, RA 9711)'),
    url: 'https://www.fda.gov.ph/wp-content/uploads/2021/03/Administrative-Order-No.-2014-0029.pdf',
    quote:
      '"All food establishment shall secure a License to Operate (LTO) before engaging in food manufacturing, importation, exportation, sale, offer for sale, distribution, transfer…" (§V.A.2) · "Food establishment shall first apply for LTO initial application. Once the FDA-LTO is secured, CPR initial application should be filed." (§V.A.5)',
    source: 'Philippine FDA (fda.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-fda-cpr': {
    citation: b('필리핀 보건부 행정명령 AO 2014-0029 제VI.A.1–2조', 'DOH Administrative Order 2014-0029 §VI.A.1–2'),
    url: 'https://www.fda.gov.ph/wp-content/uploads/2021/03/Administrative-Order-No.-2014-0029.pdf',
    quote:
      '"All processed food products … shall first be registered with the FDA before these are distributed, supplied, sold or offered for sale…" (§VI.A.1) · "Only one (1) Certificate of Product Registration CPR shall be issued to a product that has multiple packaging sizes provided that it meets all of the following conditions: a. The same brand name; b. The same product name/ variant; …" (§VI.A.2)',
    source: 'Philippine FDA (fda.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-label': {
    citation: b('필리핀 보건부 행정명령 AO 2014-0030 제VI.A.5·VI.B.2조 (식품 표시)', 'DOH Administrative Order 2014-0030 §VI.A.5 and §VI.B.2 (food labeling)'),
    url: 'https://www.fda.gov.ph/wp-content/uploads/2021/03/Administrative-Order-No.-2014-0030.pdf',
    quote:
      '"For imported products, the complete name and address of importer and the country of origin shall be declared." (§VI.A.5.c) · "In the case of imported food products, labels where in the information are declared in a foreign language shall always carry the corresponding English translation. In cases of exhaustion of existing labels permitted by the FDA, the use of provisionary sticker label … shall only be allowed for a maximum period of 6 months." (§VI.B.2)',
    source: 'Philippine FDA (fda.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-bfar': {
    citation: b('필리핀 농업부 행정회람 AC 6 (2022) 제II조 제1항·제2항(D), 제III조 제1항', 'DA Administrative Circular No. 6, s. 2022, Art. II §1 and §2(D), Art. III §1'),
    url: 'https://www.da.gov.ph/wp-content/uploads/2022/11/ac06_s2022.pdf',
    quote:
      'Scope includes "9. Seaweeds and aquatic plants" (Art. II §1(A)) · importers "must secure an SPS Import Clearance prior to importation" — the BPI issues it "only upon submission by the importer of the prerequisite documents … e. Seaweeds and aquatic plants (BFAR)" (Art. III §1) · "For imported food products derived from agriculture and fishery products that are processed and prepackaged, the SPS Import Clearance … shall cover plant and animal health, while the concern on human health shall be under the jurisdiction of the Food and Drug Administration (FDA)" (Art. II §2(D))',
    source: 'Philippine Department of Agriculture (da.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-meat-extract': {
    citation: b('필리핀 농업부 행정회람 AC 6 (2022) 제III조 제1항(A)(1), 제II조 제2항(D)', 'DA Administrative Circular No. 6, s. 2022, Art. III §1(A)(1) and Art. II §2(D)'),
    url: 'https://www.da.gov.ph/wp-content/uploads/2022/11/ac06_s2022.pdf',
    quote:
      'Importers "must secure an SPS Import Clearance prior to importation" from the "Bureau of Animal Industry (BAI) - for live animals; animal products and by-products including meat and meat by-products…" (Art. III §1(A)(1)) · for processed, prepackaged food it covers "plant and animal health, while the concern on human health shall be under the jurisdiction of the … (FDA)" (Art. II §2(D))',
    source: 'Philippine Department of Agriculture (da.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-fda-lto-cos': {
    citation: b('필리핀 FDA 시민헌장(2024) LTO 제1.22항 — 화장품 수입·유통사 (FDA법 RA 9711)', 'Philippine FDA Citizen’s Charter (2024), LTO §1.22 — cosmetics importers and distributors (FDA Act, RA 9711)'),
    url: 'https://www.fda.gov.ph/wp-content/uploads/2024/04/15.-License-to-Operate-LTO.pdf',
    quote:
      '"1.22. LICENSE TO OPERATE – INITIAL APPLICATION FOR TRADERS, DISTRIBUTORS (IMPORTER, EXPORTER, WHOLESALER) OF …" — "Who May Avail: All Traders, Distributors (Importer, Exporter, Wholesaler) Cosmetics, Toys and Child Care Articles (TCCAs) and …" (Center for Cosmetic and Household/Urban Hazardous Substances Regulation and Research)',
    source: 'Philippine FDA (fda.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-cpn': {
    citation: b('아세안 화장품 지침(ACD) 제1조 제3항', 'ASEAN Cosmetic Directive, Art. 1(3)'),
    url: 'https://asean.org/wp-content/uploads/2012/10/20707.pdf',
    quote:
      '"The company or person responsible for placing the cosmetic products in the market, shall notify the regulatory authority responsible for cosmetics … of each Member State where the product will be marketed of the place of the manufacture or of initial importation before the product is placed in the market."',
    source: 'ASEAN Secretariat (asean.org)',
    checkedAt: '2026-11-26',
  },
  'ph-acd-ingredients': {
    citation: b('아세안 화장품 지침(ACD) 제4조 제2항', 'ASEAN Cosmetic Directive, Art. 4(2)'),
    url: 'https://asean.org/wp-content/uploads/2012/10/20707.pdf',
    quote:
      '"Member States shall prohibit the marketing of cosmetic products containing: a) substances listed in Annex II; b) substances listed in the first part of Annex III, beyond the limits and outside the conditions laid down; … e) preservatives other than those listed in Annex VI, Part 1; … g) UV filters other than those listed in Annex VII, Part 1…"',
    source: 'ASEAN Secretariat (asean.org)',
    checkedAt: '2026-11-26',
  },
  'ph-pif': {
    citation: b('아세안 화장품 지침(ACD) 제8조 제1항 (제품정보파일)', 'ASEAN Cosmetic Directive, Art. 8(1) (product information)'),
    url: 'https://asean.org/wp-content/uploads/2012/10/20707.pdf',
    quote:
      '"The company or person responsible for placing the cosmetic product in the market shall keep the following information readily accessible to the regulatory authority …: a) the qualitative and quantitative composition of the product; … b) specifications of the raw materials and finished product; c) the method of manufacture complying with the good manufacturing practice …; d) assessment of the safety for human health of the finished product…"',
    source: 'ASEAN Secretariat (asean.org)',
    checkedAt: '2026-11-26',
  },
  'ph-label-cos': {
    citation: b('아세안 화장품 지침 부속서 II — 화장품 표시 요건 (2007)', 'ASEAN Cosmetic Directive, Appendix II — ASEAN Cosmetic Labeling Requirements (2007)'),
    url: 'https://file.go.gov.sg/appendix-ii-asean-cosmetic-labelling-requirements.pdf',
    quote:
      '"d) Country of manufacture; e) The name and address of the company or person responsible for placing the product on the local market; f) The contents …; g) The manufacturer’s batch number; h) The manufacturing or the expiry date of the product … Indication of the expiry date shall be mandatory for cosmetic products the minimum durability of which is less than 30 months."',
    source: 'Singapore Health Sciences Authority copy of the ASEAN text (go.gov.sg)',
    checkedAt: '2026-11-26',
  },
  'ph-ntc': {
    citation: b('필리핀 수입허가 WTO 통보(G/LIC/N/3/PHL/18) — 무선통신기기, RA 3846', 'Philippine import-licensing notification to the WTO (G/LIC/N/3/PHL/18) — radio equipment, RA 3846'),
    url: 'https://lic-public.wto.org/en/product-categories/692/procedure',
    quote:
      '"Import permits are required for the importation of radio communications equipment pursuant to Republic Act No. 3846" — dealers file with an "NTC Dealer’s Permit/ Manufacturer’s Permit" and an "NTC Type Acceptance Certificate (for commercial purposes)".',
    source: 'WTO import-licensing database (Philippine notification)',
    checkedAt: '2026-11-26',
  },
  'ph-bps': {
    citation: b('DTI 필리핀표준국(BPS) 의무 제품인증 제도 (RA 4109, DAO 05:2008)', 'DTI Bureau of Philippine Standards mandatory product certification (RA 4109, DAO 05:2008)'),
    url: 'https://bps.dti.gov.ph/product-certification/product-certification-schemes',
    quote:
      '"Products covered by the mandatory certification, whether locally manufactured or imported, are not allowed to be distributed in the Philippine market without the necessary PS or ICC marks."',
    source: 'DTI Bureau of Philippine Standards (bps.dti.gov.ph)',
    checkedAt: '2026-11-26',
  },
  'ph-label-consumer': {
    citation: b('필리핀 소비자법(RA 7394) 제77조', 'Consumer Act of the Philippines (RA 7394), Art. 77'),
    url: 'https://bps.dti.gov.ph/component/edocman/225-republic-act-no-7394-consumer-act-of-the-philippines/download',
    quote:
      '"All consumer products domestically sold whether manufactured locally or imported shall indicate the following …: a) its correct and registered trade name or brand name; b) its duly registered trademark; c) its duly registered business name; d) the address of the manufacturer, importer, repacker of the consumer product in the Philippines; e) its general make or active ingredients; f) the net quality of contents … in the metric system; g) country of manufacture, if imported…"',
    source: 'DTI Bureau of Philippine Standards (bps.dti.gov.ph)',
    checkedAt: '2026-11-26',
  },
};

/** The legal basis of a product's requirement, if one has been matched. */
export function legalBasisFor(requirementId: string, productId: string): LegalBasis | undefined {
  const e = LEGAL_BASES[requirementId];
  if (!e || (e.products && !e.products.includes(productId))) return undefined;
  const { products, ...basis } = e;
  void products;
  return basis;
}

/** Problems with an entry (empty when it is usable). Run by tests over every entry. */
export function legalBasisProblems(e: LegalBasisEntry, today: string): string[] {
  const out: string[] = [];
  if (!e.citation?.ko?.trim() || !e.citation?.en?.trim()) out.push('citation: ko and en required');
  if (!isOfficialLawUrl(e.url)) out.push(`url: not an official https law host (${e.url})`);
  if (!e.quote?.trim() || e.quote.trim().length < 20) out.push('quote: the operative text is required');
  if (!e.source?.trim()) out.push('source: required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt ?? '')) out.push('checkedAt: YYYY-MM-DD');
  else if (e.checkedAt > today) out.push('checkedAt: in the future');
  return out;
}
