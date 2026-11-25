/**
 * Local expert services that TradeScope arranges for the paperwork a trader cannot easily do alone — Philippine
 * FDA / BAI / BFAR registrations, customs brokerage on either side, product certification.
 *
 * TradeScope's operations team matches each request with a partner expert (licensed customs broker, registered
 * regulatory consultant). No individual names or prices are shown here: the network is arranged per request and
 * quoted after review.
 */
import type { Bilingual, Country, Requirement, TradeProduct } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export interface ExpertService {
  id: string;
  country: Country;
  title: Bilingual;
  /** who does the work */
  expert: Bilingual;
  /** what the expert handles for the client */
  handles: Bilingual[];
  /** what the client usually has to provide */
  needs: Bilingual[];
  /** requirements this service covers */
  covers: (req: Requirement, product: TradeProduct) => boolean;
  /** words in a free-text query that point to this service (for products outside the knowledge base) */
  keywords?: string[];
  /** official processing times (agency citizen's charter), excluding rounds of corrections */
  leadTime?: Bilingual;
  /** where the process and lead time come from */
  basis?: Array<{ label: string; url: string }>;
}

const isCosmetic = (p: TradeProduct) => p.id === 'k-beauty' || /화장품|cosmetic/i.test(p.category.en + p.category.ko);

export const EXPERT_SERVICES: ExpertService[] = [
  {
    id: 'ph-importer-partner',
    country: 'PH',
    title: b('필리핀 현지 수입자(Importer of Record) 연결', 'Philippine importer of record'),
    expert: b('FDA/BAI 영업허가와 BOC 등록을 가진 필리핀 수입·유통사', 'Philippine importer / distributor holding FDA or BAI licences and BOC accreditation'),
    handles: [
      b('한국 수출자는 FDA·BAI·BOC에 직접 신청할 수 없어, 허가를 가진 현지 법인이 수입자·등록 명의자가 됩니다', 'A Korean exporter cannot apply to FDA, BAI or BOC directly; a licensed Philippine company acts as importer and registration holder'),
      b('명의 대여형(인덴터)·유통 계약형 중 맞는 구조 제안과 계약 조건 정리', 'Propose the right set-up (indentor or distributor) and the contract terms'),
      b('등록증 명의 변경·이전 조건을 계약에 남기도록 안내', 'Make sure the contract covers transferring the registrations later'),
    ],
    needs: [b('제품 목록·예상 물량', 'Product list and expected volumes'), b('희망 판매 채널(유통·온라인·B2B)', 'Target channels (retail, online, B2B)')],
    covers: () => false,
    keywords: ['수입자', '현지 법인', 'importer of record', 'distributor', '유통사'],
  },
  {
    id: 'ph-fda-food',
    country: 'PH',
    title: b('필리핀 FDA 식품 인허가 대행 (LTO · CPR)', 'Philippine FDA food licensing (LTO · CPR)'),
    expert: b('필리핀 FDA 인허가 컨설턴트 + LTO를 가진 현지 수입자', 'Philippine FDA regulatory consultant + LTO-holding local importer'),
    handles: [
      b('수입자 영업허가(LTO) 신청 — 또는 이미 LTO가 있는 현지 수입자 연결 (LTO는 필리핀 등록 법인만 받을 수 있음)', 'Importer License to Operate (LTO), or a local importer that already holds one (only a Philippine-registered business can hold it)'),
      b('제품 등록증(CPR)을 LTO 보유자 명의로 신청하고 FDA 보완 요청에 대응', 'File the Certificate of Product Registration (CPR) in the LTO holder’s name and answer FDA queries'),
      b('라벨 검토: 영문, 수입자 이름·주소, 원산지, Nutrition Facts, 유통기한(일-월-년)', 'Label check: English, importer name & address, origin, Nutrition Facts, expiry as day-month-year'),
    ],
    needs: [
      b('현지 수입자와의 공급·대리점 계약서 또는 지정서', 'Supply / distribution agreement or appointment letter with the importer'),
      b('제조사 위생 인증 중 하나: GMP·HACCP·ISO 22000/FSSC 또는 인증받은 자유판매증명서', 'One manufacturer certificate: GMP, HACCP, ISO 22000/FSSC, or an authenticated certificate of free sale'),
      b('라벨 시안·제품 사진, 12개월 이내 성분 분석 성적서(COA)', 'Label artwork, product photos, and a certificate of analysis issued within 12 months'),
    ],
    leadTime: b('LTO 약 14영업일 · CPR 약 20영업일 (FDA 민원 안내 기준, 보완 기간 제외)', 'LTO about 14 working days · CPR about 20 working days (FDA citizen’s charter, excluding correction rounds)'),
    basis: [
      { label: 'FDA LTO checklist (2024)', url: 'https://www.fda.gov.ph/wp-content/uploads/2024/04/15.-License-to-Operate-LTO.pdf' },
      { label: 'FDA CFRR Citizen’s Charter (2023)', url: 'https://www.fda.gov.ph/wp-content/uploads/2023/06/CFRR_Citizens-Charter-2023.pdf' },
      { label: 'FDA AO 2014-0030 (labeling)', url: 'https://www.fda.gov.ph/wp-content/uploads/2021/03/Administrative-Order-No.-2014-0030.pdf' },
    ],
    covers: (r, p) => r.side === 'PH' && /FDA Philippines/.test(r.agency) && !isCosmetic(p),
    keywords: ['fda', '식품 등록', 'cpr', 'lto'],
  },
  {
    id: 'ph-fda-cosmetic',
    country: 'PH',
    title: b('필리핀 FDA 화장품 신고 대행 (LTO · CPN · PIF)', 'Philippine FDA cosmetics notification (LTO · CPN · PIF)'),
    expert: b('필리핀 FDA 화장품 인허가 컨설턴트 + 현지 수입자', 'Philippine FDA cosmetics consultant + local importer'),
    handles: [
      b('수입자 LTO와 화장품 신고(CPN) 진행', 'Importer LTO and Cosmetic Product Notification (CPN)'),
      b('ASEAN 화장품 지침 성분 검토·제품정보파일(PIF) 준비', 'ASEAN Cosmetic Directive ingredient review and Product Information File (PIF)'),
      b('영문 라벨 표시사항 검토', 'English label review'),
    ],
    needs: [b('전성분표·INCI 명칭', 'Full ingredient list with INCI names'), b('제조사 GMP 증명·자유판매증명서', 'Manufacturer GMP and certificate of free sale'), b('라벨 시안', 'Label artwork')],
    covers: (r, p) => r.side === 'PH' && /FDA Philippines|ASEAN Cosmetic/.test(r.agency) && isCosmetic(p),
    keywords: ['화장품', 'cosmetic', 'cpn'],
  },
  {
    id: 'ph-bai-petfood',
    country: 'PH',
    title: b('필리핀 BAI 펫푸드·사료 등록 대행 (LTO · CFPR · SPSIC)', 'Philippine BAI pet food & feed registration (LTO · CFPR · SPSIC)'),
    expert: b('필리핀 BAI(동물산업국) 인허가 컨설턴트 + 사료 수입 허가를 가진 현지 수입자', 'Philippine BAI regulatory consultant + local importer with a feed import licence'),
    handles: [
      b('사료 수입자 영업허가(LTO) — 사무실·창고 실사 포함, 매년 갱신 — 또는 허가를 가진 현지 수입자 연결', 'Feed importer LTO (office/warehouse inspection, renewed every year), or a licensed local importer'),
      b('제품별 사료 등록(CFPR): BAI 인정 시험기관 성분 분석 주선', 'Per-product feed registration (CFPR), arranging the analysis at a BAI-recognised lab'),
      b('선적마다 수입 검역 허가(SPS Import Clearance) 신청 — 발급 후 60일 안에 사용', 'SPS import clearance for every shipment (use within 60 days of issue)'),
      b('제조 공장이 BAI 인정 대상인지, 한국 검역증명서 문구가 필리핀 요건과 맞는지 확인', 'Check the plant’s BAI accreditation status and that the Korean health certificate matches Philippine wording'),
    ],
    needs: [
      b('자유판매증명서(CFS)와 GMP·HACCP 인증서 — 아포스티유 또는 영사 인증', 'Certificate of free sale and GMP/HACCP certificate, apostilled or authenticated'),
      b('제품 기술 설명서·제조 공정도·라벨 시안, 현지 수입자 지정서', 'Technical description, process flow, label artwork, and the importer appointment letter'),
      b('동물성 원료가 있으면 농림축산검역본부 수출검역증명서 (공장의 검역시설 지정 필요)', 'With animal-origin ingredients: APQA export health certificate (the plant must be a designated quarantine facility)'),
    ],
    leadTime: b('LTO 실사 14영업일 이내 · CFPR 약 20일 · SPSIC 약 3일 (BAI 민원 안내 기준)', 'LTO inspection within 14 working days · CFPR about 20 days · SPSIC about 3 days (BAI citizen’s charter)'),
    basis: [
      { label: 'BAI Citizen’s Charter (2024)', url: 'https://www.bai.gov.ph/CitizenCharters/View' },
      { label: 'WTO import licensing: PH animal feeds', url: 'https://importlicensing.wto.org/content/animal-and-animal-products-including-animal-feeds-and-feeds-ingredients-veterinary-drugs-and' },
      { label: 'APQA export quarantine (pet food)', url: 'https://eminwon.qia.go.kr/intro/ipstinfo/main1.do' },
    ],
    covers: (r) => r.side === 'PH' && /\bBAI\b|Bureau of Animal Industry/i.test(r.agency),
    keywords: ['펫푸드', '펫 푸드', '사료', '애견', '반려동물', 'pet food', 'petfood', 'dog food', 'cat food', 'animal feed', 'bai'],
  },
  {
    id: 'ph-bfar-da',
    country: 'PH',
    title: b('필리핀 수산·농산 수입허가 대행 (BFAR · DA SPS)', 'Philippine fishery / agriculture import clearance (BFAR · DA SPS)'),
    expert: b('필리핀 SPS 수입허가 컨설턴트', 'Philippine SPS import-clearance consultant'),
    handles: [b('BFAR·농업부 SPS 수입허가 대상 여부 확인과 신청', 'Check and file BFAR / Department of Agriculture SPS import clearance')],
    needs: [b('원산지·원료 정보', 'Origin and raw-material details'), b('한국 위생·검역 증명서', 'Korean health / quarantine certificate')],
    covers: (r) => r.side === 'PH' && /BFAR|Department of Agriculture/.test(r.agency),
    keywords: ['수산물', '검역', 'seafood', 'sps'],
  },
  {
    id: 'ph-standards',
    country: 'PH',
    title: b('필리핀 제품 인증 대행 (DTI-BPS · NTC)', 'Philippine product certification (DTI-BPS · NTC)'),
    expert: b('필리핀 인증 컨설턴트', 'Philippine certification consultant'),
    handles: [b('PS/ICC 의무인증 대상 확인과 신청', 'PS / ICC mandatory certification check and filing'), b('무선기기 NTC 형식승인', 'NTC type approval for wireless devices'), b('영문 라벨링 검토', 'English labeling review')],
    needs: [b('시험성적서·기술 사양서', 'Test reports and technical specifications'), b('제품 사진·라벨', 'Product photos and labels')],
    covers: (r) => r.side === 'PH' && /DTI|NTC|Fire Protection/.test(r.agency),
    keywords: ['인증', 'ntc', 'dti', 'certification'],
  },
  {
    id: 'ph-halal',
    country: 'PH',
    title: b('할랄 인증 대행', 'Halal certification'),
    expert: b('할랄 인증기관 연계 컨설턴트', 'Consultant working with halal certification bodies'),
    handles: [b('인증기관 선정과 신청 서류 준비', 'Choose a certification body and prepare the application')],
    needs: [b('원재료·공정 정보', 'Ingredient and process details')],
    covers: (r) => r.category === 'halal',
    keywords: ['할랄', 'halal'],
  },
  {
    id: 'ph-customs-broker',
    country: 'PH',
    title: b('필리핀 통관 대행 (면허 관세사)', 'Philippine customs clearance (licensed broker)'),
    expert: b('필리핀 PRC 면허 관세사', 'PRC-licensed Philippine customs broker'),
    handles: [
      b('수입자의 BOC 수입자 등록(Accreditation) 확인·신청', 'Check or file the importer’s BOC accreditation'),
      b('BOC 수입신고와 관세·VAT 납부, FTA 협정세율 적용(원산지증명서 제출)', 'Bureau of Customs import entry, duty / VAT payment, FTA rate claim with the certificate of origin'),
      b('반출 승인과 현지 배송 연결 — 단계마다 진행 상황 공유', 'Release and local delivery, reporting progress at each step'),
    ],
    needs: [b('상업송장·포장명세서·B/L', 'Commercial invoice, packing list, B/L'), b('원산지증명서와 인허가 사본 (LTO·CPR·SPSIC 등)', 'Certificate of origin and permit copies (LTO, CPR, SPSIC …)')],
    leadTime: b('BOC 수입자 등록 약 7영업일, 3년 유효 (CAO 01-2026)', 'BOC importer accreditation about 7 working days, valid 3 years (CAO 01-2026)'),
    // copy of the CAO text hosted by a law firm; the official BOC page was not reachable when this was checked
    basis: [{ label: 'BOC CAO 01-2026 — law-firm copy (official source to confirm)', url: 'https://www.divinalaw.com/wp-content/uploads/2026/05/BOC-01-BOC-CAO-01-2026.pdf' }],
    covers: (r) => r.side === 'PH' && /Bureau of Customs/.test(r.agency),
    keywords: ['통관', 'customs', 'broker'],
  },
  {
    id: 'kr-food-import',
    country: 'KR',
    title: b('한국 수입식품 등록·신고 대행', 'Korean imported-food registration & declaration'),
    expert: b('식품 수입 전문 관세사·행정사', 'Korean food-import customs broker / administrative agent'),
    handles: [b('해외제조업소 등록과 수입식품 신고', 'Overseas manufacturer registration and imported-food declaration'), b('수입식품등 수입·판매업 영업등록', 'Imported-food business registration'), b('한글표시사항 검토', 'Korean label review')],
    needs: [b('제조사 정보·제품 사양서', 'Manufacturer details and product specification'), b('원재료·제조공정 자료', 'Ingredient and process documents')],
    covers: (r) => r.side === 'KR' && /식약처|지방식약청/.test(r.agency),
    keywords: ['식약처', '수입식품'],
  },
  {
    id: 'kr-customs-broker',
    country: 'KR',
    title: b('한국 관세사 (품목분류 · FTA · 수입신고 · 검역)', 'Korean customs broker (classification · FTA · import · quarantine)'),
    expert: b('한국 관세사', 'Korean licensed customs broker'),
    handles: [b('HS 품목분류 확정과 사전심사 신청', 'Confirm the HS classification and file an advance ruling'), b('원산지증명서 발급·협정관세 적용신청', 'Certificate of origin and FTA preferential claim'), b('수입신고와 검역 절차', 'Import declaration and quarantine')],
    needs: [b('상업송장·포장명세서·B/L', 'Commercial invoice, packing list, B/L'), b('원산지 증빙', 'Origin evidence')],
    covers: (r) => r.side === 'KR' && /관세청|농림축산검역본부|대한상공회의소/.test(r.agency),
    keywords: ['관세사', '품목분류', '원산지증명'],
  },
];

export const EXPERT_INDEX: Record<string, ExpertService> = Object.assign(Object.create(null), Object.fromEntries(EXPERT_SERVICES.map((s) => [s.id, s])));

/** The service that covers a requirement, if any. */
export function serviceForRequirement(req: Requirement, product: TradeProduct): ExpertService | undefined {
  return EXPERT_SERVICES.find((s) => s.covers(req, product));
}

/** Services for a product's requirements, importing side first, without duplicates. */
export function servicesForProduct(product: TradeProduct): ExpertService[] {
  const out = new Map<string, ExpertService>();
  const importing: Country = product.direction === 'PH_TO_KR' ? 'KR' : 'PH';
  const reqs = [...product.requirements].sort((a, b2) => Number(b2.side === importing) - Number(a.side === importing));
  // exports into the Philippines need a licensed local importer before any FDA / BAI / BOC filing
  if (importing === 'PH' && product.requirements.some((r) => r.side === 'PH' && /FDA Philippines|ASEAN Cosmetic|\bBAI\b|Bureau of Customs/.test(r.agency))) {
    out.set('ph-importer-partner', EXPERT_INDEX['ph-importer-partner']);
  }
  for (const r of reqs) {
    const s = serviceForRequirement(r, product);
    if (s) out.set(s.id, s);
  }
  return [...out.values()];
}

/** Services hinted by a free-text query (used when the product is not in the knowledge base). */
export function servicesForQuery(query: string): ExpertService[] {
  const q = query.toLowerCase();
  const hits = EXPERT_SERVICES.filter((s) => (s.keywords ?? []).some((k) => keywordIn(q, k)));
  // a Philippine FDA / BAI filing needs a licensed local importer first
  if (hits.some((s) => PH_REGISTRATION.has(s.id)) && !hits.some((s) => s.id === 'ph-importer-partner')) hits.push(EXPERT_INDEX['ph-importer-partner']);
  return hits;
}
const PH_REGISTRATION = new Set(['ph-fda-food', 'ph-fda-cosmetic', 'ph-bai-petfood']);

/**
 * Latin keywords match as whole words (so "crisps" is not `sps` and "Dubai" is not `bai`); Korean keywords
 * match inside words, since Korean attaches particles (펫푸드를, 사료용).
 */
function keywordIn(q: string, k: string): boolean {
  if (!/^[a-z0-9 ]+$/.test(k)) return q.includes(k);
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(q);
}
