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
// lpr.adb.org: the Asian Development Bank's Law and Policy Reform database, which hosts scans of enacted laws
const OFFICIAL_SUFFIXES = ['.go.kr', '.gov.ph', '.gov.sg', '.wto.org', '.adb.org'];

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
  'ph-halal': {
    citation: b('필리핀 할랄 수출진흥법(RA 10817) 제9조·제11조(c)', 'Philippine Halal Export Development and Promotion Act (RA 10817), Sec. 9 and Sec. 11(c)'),
    url: 'https://lpr.adb.org/sites/default/files/2024-07/philippines-ra-10817.pdf',
    quote:
      '"Halal certification of products, processes and services for domestic consumption or use is voluntary on the part of the producer, manufacturer, trader, retailer, or service provider" (Sec. 11(c)) · "the Philippine Accreditation Bureau (PAB) is hereby empowered to … grant or deny accreditation of Halal certification bodies" (Sec. 9)',
    source: 'Asian Development Bank Law and Policy Reform database (lpr.adb.org) — scan of the enrolled Act',
    checkedAt: '2026-11-27',
  },
  'ph-halal-cos': {
    citation: b('필리핀 할랄 수출진흥법(RA 10817) 제9조·제11조(c)', 'Philippine Halal Export Development and Promotion Act (RA 10817), Sec. 9 and Sec. 11(c)'),
    url: 'https://lpr.adb.org/sites/default/files/2024-07/philippines-ra-10817.pdf',
    quote:
      '"Halal certification of products, processes and services for domestic consumption or use is voluntary on the part of the producer, manufacturer, trader, retailer, or service provider" (Sec. 11(c)) · "the Philippine Accreditation Bureau (PAB) is hereby empowered to … grant or deny accreditation of Halal certification bodies" (Sec. 9)',
    source: 'Asian Development Bank Law and Policy Reform database (lpr.adb.org) — scan of the enrolled Act',
    checkedAt: '2026-11-27',
  },
  'ph-fire-code': {
    citation: b('필리핀 소방법(RA 9514) 제7조(d)(8)·제8조(f)(g)', 'Fire Code of the Philippines (RA 9514), Sec. 7(d)(8) and Sec. 8(f)–(g)'),
    url: 'https://lpr.adb.org/sites/default/files/2024-05/philippines-ra-09514.pdf',
    quote:
      '"(8) Self-closing fire resistive doors leading to corridors" (Sec. 7(d)) · prohibited acts: "(f) Locking fire exits during period when people are inside the building; (g) Prevention or obstruction of the automatic closure of fire doors or smoke partitions or dampers" (Sec. 8)',
    source: 'Asian Development Bank Law and Policy Reform database (lpr.adb.org) — scan of the enrolled Act',
    checkedAt: '2026-11-27',
  },
  'ph-boc-clearance': {
    citation: b('필리핀 관세청 행정명령 CAO 07-2022(수입자 인증) 제3.2조·제4.1조', 'BOC Customs Administrative Order 07-2022 (accreditation of importers), Sec. 3.2 and 4.1'),
    url: 'https://www.dof.gov.ph/download/accreditation-of-importers-cao-07-2022/',
    quote:
      '"Enrollment in the Bureau\'s CPRS shall be mandatory for transactions through the Bureau\'s automated cargo clearance system." (Sec. 3.2) · "Only accredited Importers can transact with the Bureau using the Bureau\'s automated customs processing system." (Sec. 4.1)',
    source: 'Philippine Department of Finance (dof.gov.ph) — certified true copy of CAO 07-2022',
    checkedAt: '2026-11-27',
  },
  // ---- Korea -----------------------------------------------------------------------------------------------------
  'kr-foreign-facility': {
    citation: b('수입식품안전관리 특별법 제5조 제1항', 'Special Act on Imported Food Safety Control, Art. 5(1)'),
    url: 'https://www.law.go.kr/법령/수입식품안전관리특별법/제5조',
    quote:
      '"수입식품등을 국내로 수입하려는 자 또는 해외제조업소의 설치ㆍ운영자…는 해당 해외제조업소의 명칭, 소재지 및 생산 품목 등 총리령으로 정하는 사항을 제20조에 따른 수입신고 전까지 식품의약품안전처장에게 등록을 신청하여야 한다." · "제1항에 따른 해외제조업소 등록의 유효기간은 등록한 날부터 2년으로 하며…"',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-import-business': {
    citation: b('수입식품안전관리 특별법 제15조 제1항·제17조 제2항', 'Special Act on Imported Food Safety Control, Art. 15(1) and Art. 17(2)'),
    url: 'https://www.law.go.kr/법령/수입식품안전관리특별법/제15조',
    quote:
      '"제14조제1항 각 호에 따른 영업을 하려는 자는 식품의약품안전처장에게 영업등록을 하여야 한다." (제15조) · "제14조제1항 각 호에 따른 영업을 하려는 자는 … 미리 수입식품등의 위생관리 등에 관한 교육을 받아야 한다. 다만, 부득이한 사유로 미리 교육을 받을 수 없는 경우에는 영업을 시작한 뒤에 … 교육을 받을 수 있다." (제17조)',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-import-declaration': {
    citation: b('수입식품안전관리 특별법 제21조 제1항·제2항 (검사 구분은 시행규칙 별표 9·10)', 'Special Act on Imported Food Safety Control, Art. 21(1)–(2) (inspection classes in Enforcement Rule Annexes 9–10)'),
    url: 'https://www.law.go.kr/법령/수입식품안전관리특별법/제21조',
    quote:
      '"식품의약품안전처장은 제20조제1항에 따라 수입신고된 수입식품등에 대하여 통관 절차가 끝나기 전에 … 필요한 검사를 하게 하여야 한다." · "… 수입식품등의 검사이력, 국내외 식품안전정보 등에 따라 수입식품등을 구분하여 차등 검사할 수 있다." · 시행규칙 별표 10: "Imported food, etc. imported for the first time" — re-imports of the same product "within five years … after undergoing laboratory tests"',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조) · 식약처 시행규칙 영문본(총리령 제1800호)',
    checkedAt: '2026-11-26',
  },
  'kr-label': {
    citation: b('식품 등의 표시·광고에 관한 법률 제4조 제1항 · 대외무역법 제33조 제1항(원산지)', 'Act on Labeling and Advertising of Foods, Art. 4(1) · Foreign Trade Act, Art. 33(1) (origin)'),
    url: 'https://www.law.go.kr/법령/식품등의표시ㆍ광고에관한법률/제4조',
    quote:
      '"식품등에는 다음 각 호의 구분에 따른 사항을 표시하여야 한다. … 1. 식품, 식품첨가물 또는 축산물 가. 제품명, 내용량 및 원재료명 나. 영업소 명칭 및 소재지 다. 소비자 안전을 위한 주의사항 라. 제조연월일, 소비기한 또는 품질유지기한…" · 대외무역법 제33조: "원산지표시대상물품…을 수출하거나 수입하려는 자는 그 물품등에 대하여 원산지를 표시하여야 한다."',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-plant-quarantine': {
    citation: b('식물방역법 제2조 제1호 나목 (검역 대상 식물의 정의)', 'Plant Protection Act, Art. 2(1)(b) (plants subject to quarantine)'),
    url: 'https://www.law.go.kr/법령/식물방역법/제2조',
    quote: '"가목에 규정된 것의 씨앗ㆍ과실 및 가공품(병해충이 잠복할 수 없도록 가공한 것으로서 농림축산식품부령으로 정하는 것은 제외한다)"',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-fta-origin': {
    citation: b('FTA 관세특례법 제8조 제1항·제9조 제1항·제15조', 'Act on Special Cases of the Customs Act for FTAs, Art. 8(1), Art. 9(1) and Art. 15'),
    url: 'https://www.law.go.kr/법령/자유무역협정의이행을위한관세법의특례에관한법률/제8조',
    quote:
      '"협정관세를 적용받으려는 자…는 수입신고의 수리 전까지 … 세관장에게 협정관세의 적용을 신청하여야 한다." (제8조) · "수입자는 해당 물품의 수입신고 수리일부터 1년 이내에 … 협정관세의 적용을 신청할 수 있다." (제9조) · "…원산지증빙서류 등 대통령령으로 정하는 서류를 5년의 범위에서 대통령령으로 정하는 기간 … 동안 보관하여야 한다." (제15조)',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-customs-docs': {
    citation: b('관세법 시행령 제250조 (관세법 제245조 신고서류)', 'Enforcement Decree of the Customs Act, Art. 250 (documents under Customs Act Art. 245)'),
    url: 'https://www.law.go.kr/법령/관세법시행령/제250조',
    quote:
      '"법 제245조제1항에서 \"대통령령으로 정하는 서류\"란 다음 각 호의 서류를 말한다. 1. 선하증권 사본 또는 항공화물운송장 사본 2. 원산지증명서(제236조제1항이 적용되는 경우로 한정한다) 3. 기타 참고서류" · "수출입신고를 하는 물품이 법 제226조의 규정에 의한 증명을 필요로 하는 것인 때에는 관련증명서류를 첨부하여 수출입신고를 하여야 한다."',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-sulfite': {
    citation: b('식품첨가물의 기준 및 규격(식약처 고시) — 이산화황 잔류 기준 · 표시·광고법 시행규칙 별표 2(아황산류)', 'MFDS Food Additives Code — SO₂ residue limits · Labeling Act Enforcement Rule Annex 2 (sulfites)'),
    url: 'https://www.mfds.go.kr/eng/brd/m_15/down.do?brd_id=eng0001&seq=72436&data_tp=A&file_seq=1',
    quote:
      'Food Additives Code (No. 2021-19): residue "as sulfur dioxide should be less than … 7. Dried fruits: 1.0g/kg" · Labeling Act Enforcement Rule Annex 2 lists "sulfurous acids (included only if the final product contains more than 10 milligrams of sulfur dioxide per kilogram)"',
    source: '식약처 영문 법령 자료 (mfds.go.kr) — 식품첨가물공전 2021-19 · 표시·광고법 시행규칙(총리령 제1813호)',
    checkedAt: '2026-11-26',
  },
  'kr-cosmetic-route': {
    citation: b('수입식품안전관리 특별법 제20조 제1항 · 화장품법 제8조', 'Special Act on Imported Food Safety Control, Art. 20(1) · Cosmetics Act, Art. 8'),
    url: 'https://www.law.go.kr/법령/수입식품안전관리특별법/제20조',
    quote:
      '"영업자가 판매를 목적으로 하거나 영업상 사용할 목적으로 수입식품등을 수입…하려면 해당 수입식품등을 … 식품의약품안전처장에게 수입신고를 하여야 한다." · 화장품법 제8조: "식품의약품안전처장은 화장품의 제조 등에 사용할 수 없는 원료를 지정하여 고시하여야 한다."',
    source: '국가법령정보센터 법령 (한국법제연구원 elaw.klri.re.kr 국영문 원문으로 대조)',
    checkedAt: '2026-11-26',
  },
  'kr-export-co': {
    citation: b('관세청 고시 「FTA 관세특례법 사무처리에 관한 고시」 제22조 (증명서발급기관)', 'Korea Customs Service notice on FTA customs procedures, Art. 22 (certificate issuers)'),
    url: 'https://www.law.go.kr/행정규칙/자유무역협정의이행을위한관세법의특례에관한법률사무처리에관한고시',
    quote:
      '"…증명서발급기관은 다음 각 호와 같다. 1. 「관세청과 그 소속기관 직제」 제22조에 따른 세관 2. 「상공회의소법」에 따라 설립된 상공회의소 및 대한상공회의소"',
    source: '국가법령정보센터 행정규칙 원문 (관세청 고시)',
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
