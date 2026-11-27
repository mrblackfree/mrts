/**
 * TradeScope AI — embedded KR <-> PH trade knowledge base (RAG seed).
 *
 * Provenance policy (shown in the UI next to every number):
 *  - Trade statistics (`market.series`, `marketSize`, `competitors`, `KR_PH_OVERVIEW`) are real values pulled
 *    from the UN Comtrade public API (reporter = Korea 410 or Philippines 608, annual HS, fetched 2026-11-03).
 *  - Tariff rates, rules of origin, freight costs, prices and partner fit scores are curated MVP seed values.
 *    They are marked `status: 'seed'` and must be re-checked (UNI-PASS / PH Tariff Commission / forwarder quote)
 *    before any filing or commercial commitment.
 *  - Partner companies are publicly listed businesses with a verified public web page (official site or a
 *    public exhibitor / directory listing). Scores and comments are simulated matching output, not endorsements.
 */
import type { Bilingual, Requirement, SourceMeta, TariffRate, TradeProduct } from '@/lib/types';
import { todayIso } from '@/lib/format';
import { applyOfficialLayer, OFFICIAL, setRuntimeOverrides, type OverrideEntry } from './official';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export const DATA_AS_OF = '2026.11';

// ---------------------------------------------------------------------------
// Source metadata
// ---------------------------------------------------------------------------

const TARIFF_META_KR: SourceMeta = {
  sources: ['관세청 UNI-PASS', '관세청 FTA 포털', 'KITA'],
  asOf: DATA_AS_OF,
  status: 'seed',
  note: b(
    'MVP 참고 시드값 — 수입신고 전 UNI-PASS 세율정보·협정 양허표(연차별 세율)로 반드시 재확인',
    'MVP reference seed values — re-check UNI-PASS tariff data and FTA schedules (year-specific rates) before filing',
  ),
};

const TARIFF_META_PH: SourceMeta = {
  sources: ['PH Tariff Commission', 'BOC Philippines', 'KITA'],
  asOf: DATA_AS_OF,
  status: 'seed',
  note: b(
    'MVP 참고 시드값 — 선적 전 필리핀 관세위원회 Tariff Finder(AKFTA/RCEP/PH-KR FTA)에서 AHTN 기준 재확인',
    'MVP reference seed values — verify by AHTN code in the PH Tariff Commission Tariff Finder (AKFTA/RCEP/PH-KR FTA) before shipment',
  ),
};

const REQ_META_KR: SourceMeta = {
  sources: ['식약처 수입식품정보마루', '농림축산검역본부', '관세청 UNI-PASS'],
  asOf: DATA_AS_OF,
  status: 'seed',
  note: b('규정 요약본 — 최신 고시·지침 원문 확인 필요', 'Regulatory summary — confirm against the latest official notices'),
};

const REQ_META_PH: SourceMeta = {
  sources: ['FDA Philippines', 'BOC Philippines', 'DTI / NTC'],
  asOf: DATA_AS_OF,
  status: 'seed',
  note: b('규정 요약본 — 최신 FDA Circular·AO 원문 확인 필요', 'Regulatory summary — confirm against the latest FDA circulars / AOs'),
};

const comtradeMeta = (note: Bilingual): SourceMeta => ({
  sources: ['UN Comtrade', 'KITA'],
  asOf: DATA_AS_OF,
  status: 'official',
  note,
});

const LOGISTICS_META: SourceMeta = {
  sources: ['포워더 공시운임 기반 시뮬레이션', '부산항·마닐라항 서비스 스케줄'],
  asOf: DATA_AS_OF,
  status: 'seed',
  note: b(
    '운임은 변동성이 큼 — 부킹 전 포워더 견적(유류할증료·THC·서류비 포함)으로 확정',
    'Freight is volatile — confirm with a forwarder quote (BAF, THC, doc fees) before booking',
  ),
};

// ---------------------------------------------------------------------------
// Official agency links (shared)
// ---------------------------------------------------------------------------

export const AGENCY_LINKS = {
  unipass: 'https://unipass.customs.go.kr',
  ftaPortal: 'https://www.customs.go.kr/ftaportalkor',
  impfood: 'https://impfood.mfds.go.kr',
  foodsafety: 'https://www.foodsafetykorea.go.kr',
  mfds: 'https://www.mfds.go.kr',
  qia: 'https://www.qia.go.kr',
  kmf: 'https://www.kmf.or.kr',
  korcham: 'https://cert.korcham.net',
  phFda: 'https://www.fda.gov.ph',
  phFdaVerify: 'https://verification.fda.gov.ph',
  phBoc: 'https://customs.gov.ph',
  phDa: 'https://www.da.gov.ph',
  phNcmf: 'https://ncmf.gov.ph',
  phBps: 'https://bps.dti.gov.ph',
  phNtc: 'https://ntc.gov.ph',
  phBfp: 'https://bfp.gov.ph',
  phTcPhkr: 'https://finder.tariffcommission.gov.ph/phkrfta',
  phTcAkfta: 'https://finder.tariffcommission.gov.ph/akfta',
  phTcRcep: 'https://finder.tariffcommission.gov.ph/rcep',
  comtrade: 'https://comtradeplus.un.org',
  kita: 'https://www.kita.net',
} as const;

// ---------------------------------------------------------------------------
// KR <-> PH bilateral overview (UN Comtrade, reporter = Korea)
// ---------------------------------------------------------------------------

const SEED_OVERVIEW = {
  krExportsToPh: [
    { year: 2023, value: 9_008_417_184 },
    { year: 2024, value: 10_246_502_988 },
    { year: 2025, value: 11_616_343_765 },
  ],
  krImportsFromPh: [
    { year: 2023, value: 4_645_088_721 },
    { year: 2024, value: 4_431_022_132 },
    { year: 2025, value: 3_500_718_734 },
  ],
};

export const KR_PH_OVERVIEW = {
  // Official snapshot (scripts/sync-official-data.mjs) wins over the embedded values.
  krExportsToPh: OFFICIAL.overview?.krExportsToPh?.length ? OFFICIAL.overview.krExportsToPh : SEED_OVERVIEW.krExportsToPh,
  krImportsFromPh: OFFICIAL.overview?.krImportsFromPh?.length ? OFFICIAL.overview.krImportsFromPh : SEED_OVERVIEW.krImportsFromPh,
  ftaInForce: b('한-필리핀 FTA 2024.12.31 발효 · 한-아세안 FTA · RCEP 중첩 적용', 'KR-PH FTA in force since 2024-12-31 · AKFTA · RCEP overlap'),
  meta: comtradeMeta(b('한국 신고 기준 총교역 (HS TOTAL)', 'Korea-reported total trade (HS TOTAL)')),
};

// ---------------------------------------------------------------------------
// Reusable requirement builders
// ---------------------------------------------------------------------------

const krFoodImportRequirements = (opts: { quarantine: Bilingual; extra?: Requirement[] }): Requirement[] => [
  {
    id: 'kr-foreign-facility',
    side: 'KR',
    category: 'registration',
    title: b('해외제조업소 등록', 'Overseas manufacturing facility registration'),
    detail: b(
      '수입식품안전관리 특별법 제5조 — 필리핀 현지 공장(명칭·소재지·생산 품목 등)을 수입신고 전까지 식약처에 등록. 등록 유효기간은 2년이며, 연장 신청은 만료 7일 전까지.',
      'Special Act on Imported Food Safety Control Art. 5 — register the Philippine plant (name, location, products and more) with MFDS before the import declaration. Registration is valid for 2 years; apply to renew at least 7 days before it expires.',
    ),
    agency: '식약처 (MFDS)',
    url: AGENCY_LINKS.impfood,
    mandatory: true,
    leadDays: 7,
  },
  {
    id: 'kr-import-business',
    side: 'KR',
    category: 'registration',
    title: b('수입식품등 수입·판매업 영업등록', 'Imported-food import & sales business registration'),
    detail: b(
      '수입자는 지방식약청에 수입식품등 수입·판매업 영업등록을 하고, 영업 전에 수입식품 위생교육(4시간)을 이수 — 부득이한 경우 영업 시작 후 이수 가능. 영업등록을 해야 수입신고 가능.',
      'The Korean importer registers an imported-food import & sales business with the regional MFDS office and completes the imported-food hygiene training (4 hours) beforehand — or after starting, for unavoidable reasons. Imports can be declared only once registered.',
    ),
    agency: '지방식약청',
    url: AGENCY_LINKS.impfood,
    mandatory: true,
    leadDays: 14,
  },
  {
    id: 'kr-import-declaration',
    side: 'KR',
    category: 'food-safety',
    title: b('수입식품 신고 및 정밀검사 (최초 수입)', 'Imported-food declaration & first-time laboratory inspection'),
    detail: b(
      '처음 수입하는 식품은 정밀검사 — 검사 항목은 식품 유형별 기준(예: 기름에 튀긴 과채가공품은 산가·과산화물가, 타르색소·이물). 같은 업체가 같은 제품을 5년 안에 다시 들여오면 서류검사로 바뀌고, 무작위표본검사 등 이력에 따라 차등 적용. 검사는 통관 전에 끝나야 함.',
      'Food imported for the first time gets a laboratory inspection — items follow its food type (e.g. acid and peroxide value for oil-fried fruit products, tar colours, foreign matter). Re-imports of the same product by the same company within 5 years move to document review, with random sampling and other checks varied by history. Inspection is completed before customs clearance.',
    ),
    agency: '식약처 (MFDS)',
    url: AGENCY_LINKS.impfood,
    mandatory: true,
    leadDays: 10,
  },
  {
    id: 'kr-label',
    side: 'KR',
    category: 'labeling',
    title: b('한글표시사항 부착', 'Korean-language label'),
    detail: b(
      '식품 등의 표시·광고에 관한 법률 제4조 — 제품명·식품유형·원재료명 및 함량·내용량·소비기한·알레르기 유발물질·수입판매업소 명칭과 소재지 등을 한글로 표시. 원산지(필리핀) 표시는 대외무역법 제33조. 한글 스티커는 떨어지지 않게 붙이면 사용 가능.',
      "Act on Labeling and Advertising of Foods Art. 4 — Korean label with product name, food type, ingredients and content, net content, use-by date, allergens and the importer's name and address. Origin (Philippines) marking comes from the Foreign Trade Act Art. 33. Korean stickers are allowed if attached so they will not come off.",
    ),
    agency: '식약처 (MFDS)',
    url: AGENCY_LINKS.foodsafety,
    mandatory: true,
  },
  {
    id: 'kr-plant-quarantine',
    side: 'KR',
    category: 'quarantine',
    title: b('식물방역법 검역 대상 여부 확인', 'Plant Protection Act quarantine check'),
    detail: opts.quarantine,
    agency: '농림축산검역본부 (APQA)',
    url: AGENCY_LINKS.qia,
    mandatory: true,
    leadDays: 3,
  },
  {
    id: 'kr-fta-origin',
    side: 'KR',
    category: 'origin',
    title: b('FTA 원산지증명서 & 협정관세 적용신청', 'FTA certificate of origin & preferential tariff claim'),
    detail: b(
      '최적 협정의 필리핀 측 원산지증명서(Form AK / RCEP / 한-필 FTA)를 받아 수입신고 수리 전까지 협정관세 적용 신청 — 놓쳤으면 수리일부터 1년 안에 사후 신청 가능. 원산지증빙서류는 신청한 다음 날부터 5년 보관.',
      'Obtain the Philippine certificate of origin for the best agreement (Form AK / RCEP / KR-PH FTA) and claim the preferential rate before the import declaration is accepted — or within 1 year of acceptance afterwards. Keep origin documents for 5 years from the day after the claim.',
    ),
    agency: '관세청 FTA 포털',
    url: AGENCY_LINKS.ftaPortal,
    mandatory: false,
  },
  {
    id: 'kr-customs-docs',
    side: 'KR',
    category: 'customs',
    title: b('수입통관 서류 (UNI-PASS 전자신고)', 'Import clearance documents (UNI-PASS e-filing)'),
    detail: b(
      '화주 또는 관세사 명의로 UNI-PASS 전자신고. 과세가격 자료(상업송장 등)·선하증권 사본, 협정관세를 받을 때 원산지증명서, 포장명세서 등 참고서류 제출. 식약처 「수입식품등의 수입신고 확인증」을 받은 뒤 통관. 위생증명서는 특별위생관리 대상 식품만 필요(이 품목은 해당 없음).',
      "Declare via UNI-PASS in the owner's or a customs broker's name, with valuation documents (commercial invoice etc.), a copy of the B/L, the certificate of origin when claiming a preferential rate, and other references such as the packing list. Clear customs after MFDS issues its imported-food declaration confirmation. A health certificate is needed only for special-sanitation foods (not this product).",
    ),
    agency: '관세청 UNI-PASS',
    url: AGENCY_LINKS.unipass,
    mandatory: true,
    leadDays: 2,
  },
  {
    id: 'kr-halal-marketing',
    side: 'KR',
    category: 'halal',
    title: b('할랄 인증 마케팅 활용 (선택)', 'Halal certification as a marketing lever (optional)'),
    detail: b(
      '필리핀 NCMF 인정 기관(IDCP·HDIP 등) 할랄 인증 제품은 국내 무슬림 유학생·동남아 관광객·할랄 편집숍 채널에 소구 가능. 국내 별도 인증은 한국이슬람교중앙회(KMF) 확인.',
      'Halal certificates from NCMF-accredited PH bodies (e.g. IDCP, HDIP) help reach Muslim students, SE-Asian tourists and halal specialty stores in Korea. For a Korean halal mark check KMF.',
    ),
    agency: 'KMF / NCMF',
    url: AGENCY_LINKS.kmf,
    mandatory: false,
  },
  ...(opts.extra ?? []),
];

const phCommonExportRequirements = (): Requirement[] => [
  {
    id: 'kr-export-co',
    side: 'KR',
    category: 'origin',
    title: b('한국 측 원산지증명서 발급 (Form AK / RCEP / KR-PH)', 'Korean certificate of origin (Form AK / RCEP / KR-PH)'),
    detail: b(
      '대한상공회의소(상공회의소) 또는 세관에서 기관발급. 원산지 판정 근거(자재명세서 BOM·원가산출내역서) 사전 준비 — 필리핀 세관 협정세율 적용의 전제.',
      'Issued by a chamber of commerce (KCCI) or Korea Customs. Prepare origin evidence (bill of materials, cost statement) in advance — required for the PH preferential rate.',
    ),
    agency: '대한상공회의소 / 관세청',
    url: AGENCY_LINKS.korcham,
    mandatory: true,
    leadDays: 3,
  },
  {
    id: 'ph-boc-clearance',
    side: 'PH',
    category: 'customs',
    title: b('필리핀 BOC 수입통관', 'Philippine Bureau of Customs import clearance'),
    detail: b(
      '수입신고서(Goods Declaration)를 전자 제출하고 C/I·P/L·B/L·원산지증명서 등 증빙 첨부. FDA 등 규제 품목은 선적 전에 허가·요건을 갖춰야 함. 부가세 12%는 관세 과세가격에 관세·소비세 등을 더한 금액에 붙고 반출 전 납부. 수입자 등록(BOC Client Profile Registration)은 최신 요건을 관세사에게 확인.',
      'Lodge the goods declaration electronically with supporting documents (CI, PL, B/L, CO). Regulated goods such as FDA products need their clearances before shipment. The 12% VAT is charged on the customs value plus duties, excise and other charges and paid before release. Check the current importer registration (BOC Client Profile Registration) rules with a broker.',
    ),
    agency: 'Bureau of Customs (BOC)',
    url: AGENCY_LINKS.phBoc,
    mandatory: true,
    leadDays: 3,
  },
];

const phFoodRequirements = (extra: Requirement[]): Requirement[] => [
  {
    id: 'ph-fda-lto',
    side: 'PH',
    category: 'registration',
    title: b('FDA LTO (수입자 영업허가)', 'FDA License to Operate (importer/distributor)'),
    detail: b(
      '필리핀 수입·유통사는 FDA CFRR에 Food Importer/Distributor LTO 보유 필수. 바이어가 LTO를 이미 보유했는지가 진입 속도를 좌우.',
      'The PH importer/distributor must hold an FDA (CFRR) LTO. A buyer that already has an LTO shortens time-to-shelf significantly.',
    ),
    agency: 'FDA Philippines',
    url: AGENCY_LINKS.phFda,
    mandatory: true,
    leadDays: 45,
  },
  {
    id: 'ph-fda-cpr',
    side: 'PH',
    category: 'registration',
    title: b('FDA CPR (제품 등록증)', 'FDA Certificate of Product Registration (CPR)'),
    detail: b(
      '제품별 CPR 1건 — 브랜드·제품명·배합·라벨이 같으면 포장 단위가 달라도 한 건. FDA eServices로 신청: 모든 포장 단위의 영문 라벨·제품 사진·제품 정보 입력, 유효한 LTO, 공급사 지정서, 그리고 GMP·위생(SPS)증명서·ISO 22000/FSSC·HACCP 인증서·자유판매증명서(CFS) 중 하나. LTO를 먼저 받아야 CPR 신청 가능.',
      "One CPR per product — pack sizes with the same brand, product name, formulation and label share one. Filed on FDA eServices: English labels for every pack size, product photos and data, a valid LTO, the supplier's appointment letter, and one of a GMP, health/SPS, ISO 22000/FSSC or HACCP certificate or a Certificate of Free Sale. The LTO must come first.",
    ),
    agency: 'FDA Philippines',
    url: AGENCY_LINKS.phFda,
    mandatory: true,
    leadDays: 60,
  },
  {
    id: 'ph-label',
    side: 'PH',
    category: 'labeling',
    title: b('영문 라벨 & 영양성분표 (Nutrition Facts)', 'English label & Nutrition Facts panel'),
    detail: b(
      '영어(또는 필리핀어) 표기: 제품명·원재료(많이 쓴 순)·순중량(미터법)·제조사, 수입품은 수입자 이름·주소와 원산지·로트 번호·소비기한(일-월-연, 월은 글자로)·알레르기 유발 성분·영양성분표. 상온이 아닌 보관 조건은 따로 표기. 외국어 라벨에는 영문 번역 필수 — 스티커 라벨은 FDA가 기존 라벨 소진을 허용한 경우 최대 6개월만 가능.',
      "In English (or Filipino): product name, ingredients in descending order, metric net content, manufacturer and, for imports, the importer's name and address and the country of origin, lot code, expiry date (day-month-year, month in words), allergens and Nutrition Facts; storage conditions when not normal room temperature. Foreign-language labels need an English translation — a sticker label is allowed only for up to 6 months when FDA permits label exhaustion.",
    ),
    agency: 'FDA Philippines',
    url: AGENCY_LINKS.phFda,
    mandatory: true,
  },
  {
    id: 'ph-halal',
    side: 'PH',
    category: 'halal',
    title: b('할랄 인증 (IDCP·HDIP 등)', 'Halal certification (IDCP, HDIP, etc.)'),
    detail: b(
      '선택 사항 — 국내 유통용 할랄 인증은 자율(RA 10817). DTI 필리핀인정기구(PAB) 또는 NCMF가 인정한 인증기관에서 받으며, 바이어가 어느 쪽을 요구하는지 확인. 민다나오·BARMM 유통과 중동 재수출에 유리. 한국 KMF 인증과의 상호인정 여부 확인.',
      "Optional — halal certification for domestic sale is voluntary (RA 10817). Certify through a body accredited by DTI's Philippine Accreditation Bureau (PAB) or NCMF, and check which the buyer requires. Helps Mindanao/BARMM retail and Middle-East re-export. Check mutual recognition with Korean KMF certificates.",
    ),
    agency: 'DTI-PAB / NCMF',
    url: AGENCY_LINKS.phNcmf,
    mandatory: false,
    leadDays: 45,
  },
  ...extra,
  ...phCommonExportRequirements(),
];

// ---------------------------------------------------------------------------
// Tariff tables
// ---------------------------------------------------------------------------

const CERT = {
  none: b('불필요', 'Not required'),
  ak: b('Form AK (한-아세안 원산지증명서)', 'Form AK (AKFTA CO)'),
  rcep: b('RCEP 원산지증명서 / 인증수출자 신고', 'RCEP CO / approved-exporter declaration'),
  krph: b('한-필 FTA 원산지증명서 (기관발급)', 'KR-PH FTA CO (authority-issued)'),
};

const krTariffPreparedFruit = (): TariffRate[] => [
  { scheme: 'MFN', rate: 45, roo: '-', certificate: CERT.none, note: b('관세법 별표 관세율표 2008.99 「6. 기타」 기본세율 45%. 2026년 할당관세 15%(과실, 연 7,500톤 한도, 한국식품산업협회 추천 — 농식품부 공고 2026-383호, 확인 필요)', 'Customs Act tariff schedule, 2008.99 "6. Other": 45%. A 2026 quota tariff of 15% (fruit, 7,500 t a year, recommendation by the Korea Food Industry Association — MAFRA notice 2026-383, to be confirmed)') },
  { scheme: 'AKFTA', rate: 36, roo: 'CC or RVC 40%', certificate: CERT.ak, note: b('한-아세안 FTA 한국 양허표 초민감품목(HSL) B그룹(기준 45%에서 20% 감축) — FTA 관세특례법 시행령 별표 4: 36%', "Korea's AKFTA schedule, Highly Sensitive Group B (45% base cut by 20%) — FTA Customs Act Decree Annex 4: 36%") },
  { scheme: 'RCEP', rate: 36, roo: 'CC', certificate: CERT.rcep, note: b('FTA 관세특례법 시행령 별표 17의6 — 필리핀산은 한-필 간 RCEP 발효일(2023.6.2)이 속한 해가 1년차(주2)라 2026년은 4년차 36%(아세안 6개국산은 5년차 33.8%). 기준 45%에서 20년 균등 철폐', 'FTA Customs Act Decree Annex 17-6 — for Philippine goods year 1 is the year RCEP took effect between Korea and the Philippines (2 Jun 2023, note 2), so 2026 is year 4: 36% (33.8% for six other ASEAN members in year 5). 45% base cut evenly over 20 years') },
  { scheme: 'KRPH', rate: 32.4, roo: 'CC or RVC 40%', certificate: CERT.krph, note: b('FTA 관세특례법 시행령 별표 17의8 — 34.8%(1년차·2024) → 33.6%(2025) → 32.4%(2026) → … → 18%(15년차 이후). 협정 부속서 2-가 일반주석상 1년차 = 발효 연도(2024)', 'FTA Customs Act Decree Annex 17-8 — 34.8% (year 1, 2024) → 33.6% (2025) → 32.4% (2026) → … → 18% (year 15 on). Under the Annex 2-A general notes year 1 is the year of entry into force (2024)') },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const SEED_PRODUCTS: TradeProduct[] = [
  // =========================================================================
  // 1. Banana chips — PH -> KR
  // =========================================================================
  {
    id: 'banana-chips',
    emoji: '🍌',
    direction: 'PH_TO_KR',
    name: b('필리핀 세부·민다나오산 바나나칩', 'Philippine banana chips (Cebu / Mindanao)'),
    category: b('가공식품 · 스낵', 'Processed food · Snacks'),
    aliases: ['바나나칩', '바나나 칩', '바나나', '말린바나나', '건조바나나', 'banana chips', 'banana chip', 'banana', 'dried banana', '2008.99', '0803.90', '0803'],
    excludeTerms: ['생바나나', '생 바나나', '바나나 생과', '신선 바나나', '바나나 원물', 'fresh banana', 'fresh bananas', '바나나케첩', '바나나 케첩', 'banana ketchup', '바나나우유', '바나나 우유', 'banana milk'],
    tagline: b('유탕·가당 처리 여부가 HS 분류와 식물검역을 동시에 결정합니다.', 'Frying / sugaring decides both HS classification and plant quarantine.'),
    hs: [
      {
        code: '2008.99.9000',
        ahtn: '2008.99.90',
        desc: b('기타 조제·저장 처리한 과실 (유탕·가당 바나나칩)', 'Other prepared or preserved fruit (fried / sweetened banana chips)'),
        fit: 92,
        rationale: b(
          '코코넛오일에 튀기고 설탕·꿀로 코팅한 일반적 바나나칩은 제8류(신선·건조 과실)의 가공 범위를 넘어 제20류 조제과실에 해당 — 관세율표 해석에 관한 통칙 1·6 적용.',
          'Typical banana chips are fried in coconut oil and coated with sugar/honey, exceeding the processing allowed in Chapter 8 → Chapter 20 prepared fruit (GRI 1 & 6).',
        ),
      },
      {
        code: '0803.90.0000',
        ahtn: '0803.90.90',
        desc: b('바나나 (신선 또는 건조, 플랜틴 제외)', 'Bananas, fresh or dried (excluding plantains)'),
        fit: 74,
        rationale: b(
          '첨가물 없이 단순 건조(동결·열풍)한 바나나 슬라이스라면 제0803호 건조 과실로 분류. 이 경우 식물검역 대상이 될 수 있어 사전 확인 필요.',
          'Plain dried (freeze/air-dried) banana slices without additives stay in heading 0803 — but may then be subject to plant quarantine.',
        ),
      },
      {
        code: '2006.00.9000',
        ahtn: '2006.00.00',
        desc: b('설탕으로 조제한 과실 (당절임·글레이즈)', 'Fruit preserved by sugar (glacé / crystallised)'),
        fit: 41,
        rationale: b(
          '당액에 침지 후 건조해 표면이 결정화된 당절임 형태라면 제2006호 검토. 바나나칩 상용품에서는 드묾.',
          'Only if slices are soaked in syrup and crystallised (glacé). Rare for commercial banana chips.',
        ),
      },
    ],
    tariffs: krTariffPreparedFruit(),
    tariffMeta: TARIFF_META_KR,
    bestFta: {
      scheme: 'KRPH',
      reason: b(
        '한-필 FTA 32.4%(2026년)가 가장 낮음 — MFN 45% 대비 12.6%p 절감, 매년 1.2%p씩 내려감. RCEP는 필리핀산 기준 4년차라 36%, 한-아세안 FTA도 36%. 원산지기준은 CC(류 변경) 또는 역내부가가치 40%로, 바나나(제8류)·식용유(제15류)·설탕(제17류)으로 만든 칩(제20류)은 CC 충족. 2026년 할당관세 15%(연 7,500톤, 추천 필요)를 받으면 그쪽이 더 낮으니 함께 확인. 대체 세번 0803.90(단순 건조)은 한-필 FTA로 2026년 12% → 2028년 0%이지만 RCEP·한-아세안 FTA에서는 양허 제외라, 분류 확정이 절세의 핵심.',
        'The KR-PH FTA rate of 32.4% (2026) is the lowest — 12.6 pp below MFN 45%, falling 1.2 pp a year. RCEP is 36% for Philippine goods (year 4) and AKFTA 36%. The rule is CC (change of chapter) or 40% regional value: chips (chapter 20) made from bananas (ch. 8), cooking oil (ch. 15) and sugar (ch. 17) meet CC. The 2026 quota tariff of 15% (7,500 t, recommendation needed) is lower still if you can get it. The alternative 0803.90 (plain dried) is 12% under the KR-PH FTA in 2026 and 0% from 2028 but excluded under RCEP and AKFTA, so locking the classification is the key to savings.',
      ),
    },
    tariffsByHs: {
      '0803.90.0000': {
        label: b('단순 건조 바나나 (HS 0803.90)', 'Plain dried banana (HS 0803.90)'),
        tariffs: [
          { scheme: 'MFN', rate: 30, roo: '-', certificate: CERT.none, note: b('기본세율 — 한-필 FTA·RCEP 한국 양허표의 기준세율과 같음', 'Basic (MFN) rate — same as the base rate in Korea’s KR-PH FTA and RCEP schedules') },
          { scheme: 'AKFTA', rate: 30, roo: 'WO', certificate: CERT.ak, note: b('한-아세안 FTA 초민감품목 E그룹 — 시행령 별표 4 「미양허」: 기본세율 적용', "AKFTA Highly Sensitive Group E — Decree Annex 4 'no concession': the MFN rate applies") },
          { scheme: 'RCEP', rate: 30, roo: 'CC', certificate: CERT.rcep, note: b('RCEP 한국 양허표 양허 제외(U) — 시행령 별표 17의6 「미양허」: 기본세율 적용', "RCEP schedule excluded (U) — Decree Annex 17-6 'no concession': the MFN rate applies") },
          { scheme: 'KRPH', rate: 12, roo: 'WO', certificate: CERT.krph, note: b('FTA 관세특례법 시행령 별표 17의8 — 24%(2024) → 18%(2025) → 12%(2026) → 6%(2027) → 0%(2028~). 수입량이 협정 부속서 2-나 기준물량을 넘으면 세이프가드 관세(최대 30%) 가능', 'FTA Customs Act Decree Annex 17-8 — 24% (2024) → 18% (2025) → 12% (2026) → 6% (2027) → 0% (2028 on). A safeguard duty (up to 30%) can apply when imports exceed the Annex 2-B trigger volume') },
        ],
        bestFta: {
          scheme: 'KRPH',
          reason: b(
            '단순 건조 바나나는 한-필 FTA만 특혜가 있음 — RCEP(U)·한-아세안 FTA(E그룹)는 양허 제외. 원산지기준은 완전생산(WO)이라 필리핀에서 재배·수확한 바나나여야 함. 해마다 세율이 내려가므로 선적 연도 세율을 관세청에서 확인하세요.',
            'Only the KR-PH FTA gives a preference for plain dried banana — RCEP (U) and AKFTA (Group E) exclude it. The rule is wholly obtained (WO), so the bananas must be grown and harvested in the Philippines. The rate steps down every year, so check the shipment year’s rate with Korea Customs.',
          ),
        },
      },
    },
    requirements: krFoodImportRequirements({
      quarantine: b(
        '병해충이 잠복할 수 없도록 가공한 식물 가공품은 식물방역법 검역 대상에서 제외 — 기름에 튀기거나 설탕으로 처리한 바나나칩이 이런 경우로, 검역본부 「가공품 품목의 예」 해당 여부와 가공품목확인서를 확인. 단순 건조 바나나 슬라이스는 검역 대상 여부를 농림축산검역본부에 사전 확인.',
        "Plant products processed so pests cannot hide in them are outside plant quarantine — oil-fried or sugared banana chips are such a case; check APQA's list of processed-item examples and get its processed-item confirmation. Plain dried banana slices: confirm with APQA in advance.",
      ),
    }),
    requirementMeta: REQ_META_KR,
    market: {
      seriesLabel: b('한국의 필리핀산 HS 2008.99 수입액', 'Korea imports from PH — HS 2008.99'),
      hsBasis: '2008.99',
      series: [
        { year: 2023, value: 6_458_672 },
        { year: 2024, value: 6_817_821 },
        { year: 2025, value: 4_443_236 },
      ],
      insightYear: 2025,
      marketSize: { year: 2025, value: 123_993_939, label: b('한국 HS 2008.99 총수입 (2025)', 'Korea total HS 2008.99 imports (2025)') },
      competitors: [
        { country: b('중국', 'China'), flag: '🇨🇳', share: 36.7 },
        { country: b('베트남', 'Vietnam'), flag: '🇻🇳', share: 15.1 },
        { country: b('미국', 'USA'), flag: '🇺🇸', share: 13.6 },
        { country: b('태국', 'Thailand'), flag: '🇹🇭', share: 8.7 },
        { country: b('인도네시아', 'Indonesia'), flag: '🇮🇩', share: 4.5 },
        { country: b('필리핀', 'Philippines'), flag: '🇵🇭', share: 3.6, highlight: true },
      ],
      insight: b(
        '필리핀은 한국 바나나(0803.90) 수입의 59.9%를 차지하는 1위 공급국이지만, 조제과실(2008.99)에서는 3.6%에 그침 — 원료 경쟁력 대비 가공품 점유율이 낮음 — 한-필 FTA 32.4%(2026년, MFN 45% 대비 12.6%p↓)로 중국·베트남산과 가격 경쟁 가능. 2025년 수입액은 전년 대비 -34.8%.',
        'The Philippines supplies 59.9% of Korea’s bananas (0803.90) but only 3.6% of prepared fruit (2008.99) — the KR-PH FTA rate of 32.4% (2026, 12.6 pp below MFN 45%) helps compete with Chinese / Vietnamese products. 2025 imports fell 34.8% YoY.',
      ),
      meta: comtradeMeta(b('한국 신고 수입액(CIF). 2008.99에는 건망고 등 타 조제과실 포함', 'Korea-reported imports (CIF); 2008.99 also includes other prepared fruit such as dried mango')),
    },
    logistics: [
      { from: 'Cebu', to: 'Busan', mode: 'FCL 20ft', cost: [550, 950], transitDays: [7, 12], frequency: b('주 2~3항차 (마닐라·가오슝 환적 포함)', '2–3 sailings/week (incl. Manila / Kaohsiung T/S)') },
      { from: 'Davao', to: 'Busan', mode: 'FCL 20ft', cost: [600, 1050], transitDays: [8, 14], frequency: b('주 1~2항차', '1–2 sailings/week') },
      { from: 'Manila', to: 'Incheon', mode: 'FCL 20ft', cost: [450, 800], transitDays: [5, 7], frequency: b('주 3항차 직항', '3 direct sailings/week') },
      { from: 'Cebu', to: 'Incheon', mode: 'LCL', cost: [45, 80], transitDays: [10, 16], frequency: b('주 1회 혼재 (CBM당)', 'Weekly consolidation (per CBM)'), note: b('샘플·테스트 물량에 적합', 'Good for samples / trial lots') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'freshco-cebu',
        name: 'Freshco Cebu',
        country: 'PH',
        city: 'Cebu',
        region: 'Cebu',
        role: 'seller',
        type: 'manufacturer',
        products: b('바나나칩, 건망고(초콜릿·그린망고), 건파인애플, 망고퓨레', 'Banana chips, dried mango (chocolate / green), dried pineapple, mango purée'),
        website: 'https://freshcocebu.com',
        linkType: 'official',
        score: 94,
        comment: b(
          '세부 소재로 바나나칩과 건망고를 함께 생산 — 한 컨테이너에 두 품목 혼적 소싱이 가능해 물류비를 낮출 수 있음. 수출 인증(HACCP·FDA) 정보는 공개 자료로 미확인 → 공장 실사 필요.',
          'Cebu-based maker of both banana chips and dried mango — enables mixed-container sourcing to cut freight. Export certifications (HACCP/FDA) are not public → factory audit needed.',
        ),
        strengths: [b('세부항 근접 생산', 'Production near Cebu port'), b('건과일 풀 라인업', 'Full dried-fruit line-up'), b('필리핀 대형마트·면세점 납품', 'Supplies PH supermarkets & duty-free')],
        appeal: [
          b('한-필 FTA 32.4%(MFN 45% 대비 12.6%p↓, 매년 인하) 적용으로 한국 시장 가격경쟁력 확보 제안', 'Pitch the KR-PH FTA rate of 32.4% (12.6 pp below MFN 45%, falling yearly) in Korea'),
          b('바나나칩+건망고 혼적 정기 발주(분기) 제안', 'Quarterly mixed-container orders (chips + mango)'),
          b('한국향 한글라벨·소비기한 표기 공동 개발', 'Co-develop Korean label & use-by date format'),
        ],
        caution: b('해외제조업소 등록에 필요한 공장 정보 제공 의사 확인', 'Confirm willingness to share plant data for MFDS facility registration'),
      },
      {
        id: 'sees-international',
        name: "See's International Food Manufacturing Corp.",
        country: 'PH',
        city: 'Davao City',
        region: 'Mindanao',
        role: 'seller',
        type: 'manufacturer',
        products: b('바나나칩 (벌크·소매), 열대과일 스낵', 'Banana chips (bulk & retail), tropical-fruit snacks'),
        website: 'https://sialparis.com/EXHIBITORS-2024/exhibitor/SEE-S-INTERNATIONAL-FOOD-MANUFACTURING-CORP',
        linkType: 'listing',
        score: 91,
        comment: b(
          '다바오 바나나 산지 직결 제조사, SIAL Paris 2024 출품 프로필 기준 약 30년 수출 경력. 벌크 OEM 단가 경쟁력이 높아 한국 PB·업소용에 적합.',
          'Davao manufacturer next to banana farms; SIAL Paris 2024 profile cites ~30 years of exporting. Strong bulk OEM pricing for Korean private label / food service.',
        ),
        strengths: [b('산지 직결 원료 수급', 'Direct raw-material access'), b('장기 수출 경력', 'Long export track record'), b('벌크 OEM 대응', 'Bulk OEM capability')],
        appeal: [
          b('한국 PB 바나나칩 OEM(무가당·저당 라인) 제안', 'Korean private-label OEM (unsweetened / low-sugar)'),
          b('연간 물량 계약으로 단가 고정 요청', 'Annual volume contract with fixed pricing'),
          b('RCEP·한-필 CO 발급 경험 확인 및 공동 원산지 관리', 'Joint origin management (RCEP / KR-PH CO)'),
        ],
        caution: b('공식 홈페이지 미확인 — 전시회 프로필 기반, 사업자 실사 필요', 'No official site found — exhibitor-profile based; run due diligence'),
      },
      {
        id: 'four-seasons-fruits',
        name: 'Four Seasons Fruits Corp.',
        country: 'PH',
        city: 'Davao del Norte',
        region: 'Mindanao',
        role: 'seller',
        type: 'manufacturer',
        products: b('바나나칩 제조·수출 (2001년 설립, 디렉터리 기준)', 'Banana chips manufacturer-exporter (est. 2001 per directory)'),
        website: 'https://nutrada.com/suppliers/four-seasons-fruits-corp',
        linkType: 'listing',
        score: 86,
        comment: b(
          '민다나오 바나나 벨트 소재 바나나칩 전문 수출사. 복수 공급선(듀얼 소싱) 확보용으로 적합 — 태풍 시즌 공급 리스크 분산.',
          'Banana-chip exporter in the Mindanao banana belt. Ideal as a second source to hedge typhoon-season supply risk.',
        ),
        strengths: [b('바나나칩 전문', 'Banana-chip specialist'), b('민다나오 산지', 'Mindanao origin'), b('수출 전문 디렉터리 등록', 'Listed in export directories')],
        appeal: [
          b('듀얼 소싱 파트너로 소량 트라이얼 오더 제안', 'Trial order as a dual-sourcing partner'),
          b('다바오→부산 직항 루트 공동 활용', 'Use Davao → Busan routing'),
          b('잔류농약·산가 사전 시험성적서 요청', 'Request pre-shipment pesticide / acid-value test reports'),
        ],
        caution: b('디렉터리 정보 기반 — 최신 연락처·생산능력 확인 필요', 'Directory-based info — verify current contacts & capacity'),
      },
      {
        id: 'three-sisters',
        name: '3 Sisters Banana Chips',
        country: 'PH',
        city: 'Santa Cruz, Marinduque',
        region: 'Other PH',
        role: 'seller',
        type: 'manufacturer',
        products: b('가당·무가당 바나나칩 150g, 50g 소포장', 'Sweetened / unsweetened banana chips 150 g & 50 g bite-size'),
        website: 'https://www.dti.gov.ph/regions/mimaropa/mimaropa-success-stories/success-story-decades-success-banana-chips/',
        linkType: 'listing',
        score: 78,
        comment: b(
          '마린두케주 바나나칩 제조사로 필리핀 무역산업부(DTI) MIMAROPA 지역 성공사례에 소개됨. Gulfood 2026 출품. 무가당 SKU와 50g 소포장 보유 → 한국 편의점·이커머스 건강간식 카테고리에 적합. 가족 경영 규모라 물량 대응력 확인 필요.',
          'Marinduque banana-chip maker featured in a Philippine DTI MIMAROPA success story; Gulfood 2026 exhibitor. Unsweetened SKUs and 50 g packs fit Korean convenience-store / e-commerce healthy-snack shelves. Family-run, so check capacity.',
        ),
        strengths: [b('무가당 SKU 보유', 'Unsweetened SKU'), b('소포장 완제품', 'Retail-ready small packs'), b('국제 전시회 참가', 'International trade-show presence')],
        appeal: [
          b('무가당 50g 소포장 한국 편의점 테스트 입점 제안', 'Convenience-store trial with unsweetened 50 g packs'),
          b('한글 라벨 인쇄 완제품 공급 요청', 'Ask for Korean-label printed packs'),
          b('LCL 소량 정기 발주로 시작', 'Start with small regular LCL orders'),
        ],
        caution: b('생산능력·수출 서류 대응력 확인 필요', 'Check capacity and export-document readiness'),
      },
      {
        id: 'kurly-kr',
        name: 'Kurly (컬리)',
        nameLocal: '컬리',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'ecommerce',
        products: b('프리미엄 신선·가공식품 이커머스 (수입 간식 큐레이션)', 'Premium grocery e-commerce (curated imported snacks)'),
        website: 'https://www.kurly.com',
        linkType: 'official',
        score: 84,
        comment: b(
          '수입 건강간식 큐레이션 수요가 큰 채널. 무가당·코코넛오일 프라잉 등 스토리가 있는 SKU가 유리하며 소용량·고마진 구조.',
          'Strong demand for curated healthy imported snacks. Story-driven SKUs (unsweetened, coconut-oil fried) win; small-pack, high-margin model.',
        ),
        strengths: [b('프리미엄 고객층', 'Premium customer base'), b('수입 간식 큐레이션', 'Imported-snack curation'), b('빠른 신상품 테스트', 'Fast new-product testing')],
        appeal: [
          b('세부 산지 스토리·FTA 기반 합리적 가격 제안', 'Cebu origin story + FTA-driven pricing'),
          b('단독 SKU(무가당) 기획 제안', 'Exclusive unsweetened SKU'),
          b('품질 시험성적서·해외제조업소 등록 완료 상태로 제안', 'Pitch with test reports and MFDS facility registration done'),
        ],
        caution: b('벤더 입점 기준(품질·물류) 충족 필요', 'Must meet vendor quality & logistics standards'),
      },
      {
        id: 'costco-kr',
        name: 'Costco Korea (코스트코 코리아)',
        nameLocal: '코스트코 코리아',
        country: 'KR',
        city: 'Gwangmyeong, Gyeonggi',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'retail',
        products: b('창고형 할인점 — 대용량 수입 스낵', 'Warehouse club — bulk imported snacks'),
        website: 'https://www.costco.co.kr',
        linkType: 'official',
        score: 80,
        comment: b(
          '대용량(500g~1kg) 팩 중심 채널. 입점 시 단일 SKU 물량이 커 컨테이너 단위 정기 수입이 가능하나 벤더 심사가 엄격.',
          'Bulk (500 g–1 kg) pack channel. Listing brings container-level repeat volume, but vendor audits are strict.',
        ),
        strengths: [b('대량 물량', 'Large volume'), b('전국 매장', 'Nationwide stores'), b('수입 스낵 수요', 'Imported-snack demand')],
        appeal: [
          b('1kg 대용량 팩 + FTA 가격 경쟁력 제안', '1 kg bulk pack with FTA price edge'),
          b('연간 공급 안정성(듀얼 소싱) 강조', 'Stress annual supply stability (dual sourcing)'),
          b('시즌 프로모션 공동 기획', 'Co-plan seasonal promotions'),
        ],
        caution: b('국내 수입·판매업 등록된 벤더를 통한 공급 구조 필요', 'Needs a registered Korean importer-vendor in between'),
      },
    ],
    pricing: {
      item: b('바나나칩 (가당, 10kg 벌크 카톤)', 'Banana chips (sweetened, 10 kg bulk carton)'),
      unit: 'kg',
      unitKg: 1,
      unitPrice: 3.1,
      moq: 2000,
      moqUnit: 'kg',
      defaultIncoterm: 'FOB Cebu',
      incoterms: ['FOB Cebu', 'FOB Davao', 'CFR Busan', 'CIF Busan', 'CIF Incheon', 'DDP Seoul'],
      leadTimeDays: 21,
    },
    keyRisks: [
      b('유탕 공정 산가·과산화물가 기준 초과 시 부적합 → 선적 전 시험 권장', 'Acid / peroxide value failures on fried products — test before shipment'),
      b('태풍 시즌(7~10월) 원료 수급·선적 지연', 'Typhoon season (Jul–Oct) supply and sailing delays'),
      b('세번 오분류 시 관세 추징 (2008.99 vs 0803.90)', 'Duty reassessment risk if misclassified (2008.99 vs 0803.90)'),
    ],
  },

  // =========================================================================
  // 2. Dried mango — PH -> KR
  // =========================================================================
  {
    id: 'dried-mango',
    emoji: '🥭',
    direction: 'PH_TO_KR',
    name: b('필리핀 세부산 건조 망고', 'Philippine dried mango (Cebu)'),
    category: b('가공식품 · 건과일', 'Processed food · Dried fruit'),
    aliases: ['건망고', '건조망고', '건조 망고', '말린망고', '망고', 'dried mango', 'mango', '7d', '0804.50', '0804'],
    excludeTerms: ['생망고', '생 망고', '망고 생과', '신선 망고', '망고 원물', 'fresh mango', 'fresh mangoes', '망고주스', '망고 주스', 'mango juice', '망고퓨레', '망고 퓨레', 'mango puree', '냉동망고', '냉동 망고', 'frozen mango'],
    tagline: b('시판 세부 건망고 대부분은 가당 제품 — 0804.50이 아닌 2008.99 검토가 출발점입니다.', 'Most Cebu dried mango is sugared — start from 2008.99, not 0804.50.'),
    hs: [
      {
        code: '2008.99.9000',
        ahtn: '2008.99.90',
        desc: b('기타 조제·저장 처리한 과실 (가당 건망고)', 'Other prepared fruit (sweetened dried mango)'),
        fit: 88,
        rationale: b(
          '세부 건망고 상용품은 설탕·보존료를 첨가해 건조 → 단순 건조를 넘는 조제과실(제2008호). 통계상 한국의 필리핀산 0804.50 수입은 2025년 9.4만 달러에 불과해 실제 건망고는 2008.99로 신고되는 것으로 추정.',
          'Commercial Cebu dried mango is sugared before drying → prepared fruit (2008). Korea imported only $94k of PH 0804.50 in 2025, suggesting dried mango is declared under 2008.99.',
        ),
      },
      {
        code: '0804.50.2000',
        ahtn: '0804.50.20',
        desc: b('망고 (신선 또는 건조)', 'Mangoes, fresh or dried'),
        fit: 70,
        rationale: b(
          '설탕 무첨가 순수 건조 망고(Unsweetened)인 경우. 단, 생과·반건조 형태는 식물검역(열처리 요건) 대상이 될 수 있음.',
          'For unsweetened, plain dried mango. Semi-dried forms may fall under plant-quarantine (heat-treatment) rules.',
        ),
      },
      {
        code: '2006.00.9000',
        ahtn: '2006.00.00',
        desc: b('설탕으로 조제한 과실 (당절임 망고)', 'Fruit preserved by sugar (candied mango)'),
        fit: 45,
        rationale: b('당액 침지 후 표면 결정화된 캔디형 망고일 때 검토.', 'Only for candied / crystallised mango.'),
      },
    ],
    tariffs: krTariffPreparedFruit(),
    tariffMeta: TARIFF_META_KR,
    bestFta: {
      scheme: 'KRPH',
      reason: b(
        '가당 건망고(2008.99.9000)는 한-필 FTA 32.4%(2026년)가 가장 낮음 — MFN 45% 대비 12.6%p 절감. RCEP는 필리핀산 기준 4년차라 36%, 한-아세안 FTA도 36%. 원산지기준 CC는 망고(제8류)·설탕(제17류)으로 만든 건망고(제20류)라 충족. 2026년 할당관세 15%(연 7,500톤, 추천 필요)도 확인. 설탕을 넣지 않은 단순 건조 망고(0804.50.2000)는 RCEP·한-필 FTA 모두 양허 제외라 한-아세안 FTA 24%가 유일한 특혜.',
        'Sweetened dried mango (2008.99.9000) gets the lowest rate under the KR-PH FTA: 32.4% in 2026, 12.6 pp below MFN 45%. RCEP is 36% for Philippine goods (year 4) and AKFTA 36%. The CC rule is met because dried mango (chapter 20) is made from mangoes (ch. 8) and sugar (ch. 17). Check the 2026 quota tariff of 15% (7,500 t, recommendation needed) too. Unsweetened plain dried mango (0804.50.2000) is excluded under both RCEP and the KR-PH FTA, so AKFTA 24% is its only preference.',
      ),
    },
    tariffsByHs: {
      '0804.50.2000': {
        label: b('무가당 단순 건조 망고 (HS 0804.50)', 'Unsweetened plain dried mango (HS 0804.50)'),
        tariffs: [
          { scheme: 'MFN', rate: 30, roo: '-', certificate: CERT.none, note: b('기본세율 — RCEP 한국 양허표의 기준세율과 같음', 'Basic (MFN) rate — same as the base rate in Korea’s RCEP schedule') },
          { scheme: 'AKFTA', rate: 24, roo: 'WO', certificate: CERT.ak, note: b('한-아세안 FTA 초민감품목(HSL) B그룹(기준 30%에서 20% 감축) — 시행령 별표 4: 24%, 필리핀 제한 품목(별표 5) 아님', "AKFTA Highly Sensitive Group B (30% base cut by 20%) — Decree Annex 4: 24%; not restricted for the Philippines (Annex 5)") },
          { scheme: 'RCEP', rate: 30, roo: 'CC', certificate: CERT.rcep, note: b('RCEP 망고(0804.50.20) 양허 제외(U) — 시행령 별표 17의6 「미양허」: 기본세율 적용', "RCEP mangoes (0804.50.20) excluded (U) — Decree Annex 17-6 'no concession': the MFN rate applies") },
          { scheme: 'KRPH', rate: 30, roo: 'WO', certificate: CERT.krph, note: b('한-필 FTA 망고 양허 제외(EX) — 시행령 별표 17의8 「미양허」: 기본세율 적용', "KR-PH FTA mangoes excluded (EX) — Decree Annex 17-8 'no concession': the MFN rate applies") },
        ],
        bestFta: {
          scheme: 'AKFTA',
          reason: b(
            '무가당 건조 망고는 한-아세안 FTA 24%가 유일한 특혜 — MFN 30% 대비 6%p 절감. RCEP(U)·한-필 FTA(EX)는 망고를 양허에서 제외. 원산지기준은 완전생산(WO)이라 필리핀에서 재배·수확한 망고여야 하며, Form AK가 필요.',
            'AKFTA 24% is the only preference for unsweetened dried mango — 6 pp below MFN 30%. RCEP (U) and the KR-PH FTA (EX) exclude mangoes. The rule is wholly obtained (WO), so the mangoes must be grown and harvested in the Philippines, with a Form AK.',
          ),
        },
      },
    },
    requirements: krFoodImportRequirements({
      quarantine: b(
        '병해충이 잠복할 수 없도록 가공한 식물 가공품은 식물방역법 검역 대상에서 제외 — 설탕으로 처리해 건조한 건망고가 이런 경우로, 검역본부 가공품목확인서를 받아 둠. 생망고는 증열처리(VHT) 조건부 수입 품목이므로 반건조·생과 혼입 금지.',
        "Plant products processed so pests cannot hide in them are outside plant quarantine — sugared dried mango is such a case; get APQA's processed-item confirmation. Fresh mango is import-conditional (vapor-heat treatment), so avoid semi-dried / fresh mixing.",
      ),
      extra: [
        {
          id: 'kr-sulfite',
          side: 'KR',
          category: 'food-safety',
          title: b('이산화황(보존료) 잔류 기준 확인', 'Sulphur dioxide (preservative) residue limits'),
          detail: b(
            '「식품첨가물의 기준 및 규격」상 건조과일류의 이산화황 잔류량은 1.0g/kg 미만이어야 함. 최종 제품에 이산화황이 1kg당 10mg 이상 남으면 한글표시에 알레르기 유발물질(아황산류)로 표시.',
            'Under the Food Additives Code, sulfur-dioxide residue in dried fruits must be under 1.0 g/kg. If the final product holds 10 mg/kg of SO₂ or more, list sulfites as an allergen on the Korean label.',
          ),
          agency: '식약처 (MFDS)',
          url: AGENCY_LINKS.foodsafety,
          mandatory: true,
        },
      ],
    }),
    requirementMeta: REQ_META_KR,
    market: {
      seriesLabel: b('한국의 필리핀산 HS 0804.50 (망고 등) 수입액', 'Korea imports from PH — HS 0804.50 (mangoes etc.)'),
      hsBasis: '0804.50',
      series: [
        { year: 2023, value: 2_186_286 },
        { year: 2024, value: 1_210_712 },
        { year: 2025, value: 94_228 },
      ],
      insightYear: 2025,
      marketSize: { year: 2025, value: 129_966_980, label: b('한국 HS 0804.50 총수입 (2025)', 'Korea total HS 0804.50 imports (2025)') },
      competitors: [
        { country: b('태국', 'Thailand'), flag: '🇹🇭', share: 58.6 },
        { country: b('페루', 'Peru'), flag: '🇵🇪', share: 17.7 },
        { country: b('브라질', 'Brazil'), flag: '🇧🇷', share: 13.5 },
        { country: b('베트남', 'Vietnam'), flag: '🇻🇳', share: 7.9 },
        { country: b('대만', 'Taiwan'), flag: '🇹🇼', share: 0.9 },
        { country: b('필리핀', 'Philippines'), flag: '🇵🇭', share: 0.1, highlight: true },
      ],
      insight: b(
        '0804.50(생·건 망고) 시장은 태국 58.6% 독주, 필리핀은 0.1%로 급감(2023 $2.19M → 2025 $0.09M). 반면 가당 건망고가 포함되는 2008.99에서 필리핀산은 2025년 $4.44M — 필리핀 망고는 "가공품"으로 승부해야 하는 구조.',
        'Thailand holds 58.6% of 0804.50 (fresh/dried mango) while PH collapsed to 0.1% ($2.19M in 2023 → $0.09M in 2025). PH still shipped $4.44M under 2008.99 (incl. sweetened dried mango) — PH mango competes as a processed product.',
      ),
      meta: comtradeMeta(b('한국 신고 수입액(CIF)', 'Korea-reported imports (CIF)')),
    },
    logistics: [
      { from: 'Cebu', to: 'Incheon', mode: 'FCL 20ft', cost: [600, 1000], transitDays: [8, 13], frequency: b('주 2항차 (환적)', '2 sailings/week (T/S)') },
      { from: 'Cebu', to: 'Busan', mode: 'FCL 20ft', cost: [550, 950], transitDays: [7, 12], frequency: b('주 2~3항차', '2–3 sailings/week') },
      { from: 'Cebu', to: 'Incheon', mode: 'LCL', cost: [45, 80], transitDays: [10, 16], frequency: b('주 1회 혼재 (CBM당)', 'Weekly consolidation (per CBM)'), note: b('고온다습 구간 — 방습 포장 필수', 'Hot & humid lane — moisture-proof packing required') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: '7d-food',
        name: '7D Food International, Inc.',
        country: 'PH',
        city: 'Cebu',
        region: 'Cebu',
        role: 'seller',
        type: 'manufacturer',
        products: b('7D 건망고 (필리핀 대표 건망고 브랜드)', '7D Dried Mangoes (flagship PH brand)'),
        website: 'https://www.7dmangoes.com',
        linkType: 'official',
        score: 95,
        comment: b(
          '세부 건망고 대표 브랜드로 한국 소비자 인지도가 높음. 브랜드 완제품 수입 시 마케팅 비용이 낮지만, 기존 국내 유통사와 독점 계약 여부 확인이 선결 과제.',
          'Iconic Cebu dried-mango brand with high awareness among Korean consumers. Low marketing cost for branded imports, but check existing exclusive distributors in Korea first.',
        ),
        strengths: [b('브랜드 인지도', 'Brand awareness'), b('대규모 생산', 'Large-scale production'), b('수출 경험', 'Export experience')],
        appeal: [
          b('한국 특정 채널(이커머스/면세) 한정 공급 제안', 'Channel-specific supply (e-commerce / duty-free)'),
          b('한-필 FTA 32.4%(MFN 45% 대비 12.6%p↓) 반영 소비자가 시뮬레이션 공유', 'Share a retail-price simulation at the KR-PH FTA rate of 32.4% (12.6 pp below MFN 45%)'),
          b('한국향 소포장(30g) 기획 제안', 'Propose 30 g packs for Korea'),
        ],
        caution: b('기존 국내 독점 유통 계약 존재 가능성', 'Possible existing exclusive distributor in Korea'),
      },
      {
        id: 'freshco-cebu-mango',
        name: 'Freshco Cebu',
        country: 'PH',
        city: 'Cebu',
        region: 'Cebu',
        role: 'seller',
        type: 'manufacturer',
        products: b('건망고(다크·화이트 초콜릿, 그린망고), 망고롤', 'Dried mango (dark/white chocolate, green), mango rolls'),
        website: 'https://freshcocebu.com',
        linkType: 'official',
        score: 90,
        comment: b(
          '초콜릿 코팅·그린망고 등 차별화 SKU 보유 — 한국 디저트·선물세트 시장에 적합. 초콜릿 코팅 제품은 HS 1806 검토 필요.',
          'Differentiated SKUs (chocolate-coated, green mango) suit Korea’s dessert / gift-set market. Chocolate-coated items may need HS 1806 review.',
        ),
        strengths: [b('차별화 SKU', 'Differentiated SKUs'), b('PB 대응 가능성', 'Possible private label'), b('바나나칩 혼적 가능', 'Mixable with banana chips')],
        appeal: [
          b('명절 선물세트용 초콜릿 건망고 공동 기획', 'Chocolate dried-mango gift sets for holidays'),
          b('PB 라벨 OEM 제안', 'Private-label OEM'),
          b('혼적 컨테이너로 물류비 절감', 'Mixed container to save freight'),
        ],
        caution: b('초콜릿 코팅 제품은 별도 세번(1806) 및 유지 기준 확인', 'Chocolate items: separate HS (1806) and fat standards'),
      },
      {
        id: 'emart-kr',
        name: 'E-mart (이마트)',
        nameLocal: '이마트',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'retail',
        products: b('대형마트·트레이더스 — 수입 간식 정규 매대', 'Hypermarket & Traders — imported-snack shelves'),
        website: 'https://emart.ssg.com',
        linkType: 'official',
        score: 86,
        comment: b(
          '전국 대형마트 + 창고형(트레이더스) 이원 채널. 대용량 건망고는 트레이더스, 소포장은 이마트 매대로 SKU 분리 전략 가능.',
          'Two channels: hypermarkets + Traders warehouse stores. Split SKUs — bulk mango for Traders, small packs for E-mart shelves.',
        ),
        strengths: [b('전국 점포망', 'Nationwide stores'), b('창고형 채널 보유', 'Warehouse format'), b('수입식품 바잉 조직', 'Import-food buying team')],
        appeal: [
          b('FTA 절감분을 반영한 가격 경쟁력', 'FTA-driven price competitiveness'),
          b('안정적 공급(복수 공장) 제시', 'Stable supply via multiple factories'),
          b('시식 프로모션 공동 진행', 'Joint sampling promotions'),
        ],
        caution: b('국내 수입벤더 경유 거래 구조가 일반적', 'Usually via a Korean import vendor'),
      },
      {
        id: 'kurly-kr-mango',
        name: 'Kurly (컬리)',
        nameLocal: '컬리',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'ecommerce',
        products: b('프리미엄 이커머스 — 건과일·디저트', 'Premium e-commerce — dried fruit & desserts'),
        website: 'https://www.kurly.com',
        linkType: 'official',
        score: 84,
        comment: b('무가당·저당 건망고, 그린망고 등 건강·이색 콘셉트 SKU에 반응이 큰 채널.', 'Responds well to unsweetened / low-sugar and novelty SKUs like green mango.'),
        strengths: [b('트렌드 민감', 'Trend-sensitive'), b('고객 리뷰 데이터', 'Review data'), b('빠른 테스트', 'Fast testing')],
        appeal: [b('무가당 라인 단독 런칭', 'Exclusive unsweetened launch'), b('산지 스토리 콘텐츠', 'Origin-story content'), b('소용량 구독 상품', 'Small-pack subscription')],
        caution: b('콜드체인 불필요하나 방습 포장 기준 확인', 'No cold chain, but moisture-proof packing standards apply'),
      },
      {
        id: 'costco-kr-mango',
        name: 'Costco Korea (코스트코 코리아)',
        nameLocal: '코스트코 코리아',
        country: 'KR',
        city: 'Gwangmyeong, Gyeonggi',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'retail',
        products: b('창고형 할인점 — 대용량 건과일', 'Warehouse club — bulk dried fruit'),
        website: 'https://www.costco.co.kr',
        linkType: 'official',
        score: 81,
        comment: b('500g 이상 대용량 건망고 수요. 컨테이너 단위 정기 수입 가능하나 가격 협상력이 강함.', 'Demand for 500 g+ bulk packs; container-level repeat orders but tough price negotiation.'),
        strengths: [b('대량 물량', 'High volume'), b('정기 발주', 'Repeat orders'), b('수입품 선호 고객', 'Import-loving shoppers')],
        appeal: [b('1kg 패밀리팩', '1 kg family pack'), b('연간 단가 고정', 'Fixed annual pricing'), b('품질 일관성 데이터', 'Quality-consistency data')],
        caution: b('벤더 품질 심사 및 반품 조건 확인', 'Vendor audit and return terms'),
      },
    ],
    pricing: {
      item: b('건망고 100g 소매 포장', 'Dried mango 100 g retail pack'),
      unit: 'pack',
      unitKg: 0.1,
      // HS 0804.50 unit value is dominated by fresh mango — not comparable with dried retail packs
      priceComparable: false,
      unitPrice: 1.05,
      moq: 10000,
      moqUnit: 'packs',
      defaultIncoterm: 'FOB Cebu',
      incoterms: ['FOB Cebu', 'CFR Incheon', 'CIF Incheon', 'CIF Busan', 'DDP Seoul'],
      leadTimeDays: 25,
    },
    keyRisks: [
      b('이산화황 잔류 기준 부적합 — 한국 정밀검사 다발 항목', 'SO₂ residue failures are common in Korean inspections'),
      b('망고 작황(엘니뇨) 따른 원가 급등', 'Cost spikes from poor mango harvests (El Niño)'),
      b('브랜드 제품의 국내 병행수입·독점권 충돌', 'Parallel-import / exclusivity conflicts for branded goods'),
    ],
  },

  // =========================================================================
  // 3. Coconut oil — PH -> KR
  // =========================================================================
  {
    id: 'coconut-oil',
    emoji: '🥥',
    direction: 'PH_TO_KR',
    name: b('필리핀산 코코넛 오일 (VCO·정제유)', 'Philippine coconut oil (VCO / refined)'),
    category: b('식물성 유지', 'Vegetable oils'),
    aliases: ['코코넛오일', '코코넛 오일', '코코넛유', '버진코코넛오일', 'vco', 'coconut oil', 'virgin coconut oil', 'coconut', '코코넛', '1513', '1513.19', '1513.11'],
    excludeTerms: ['코코넛워터', '코코넛 워터', 'coconut water', '코코넛밀크', '코코넛 밀크', 'coconut milk', '코코넛칩', '코코넛 칩', 'coconut chips', '건조코코넛', '코코넛 가루', 'desiccated coconut', '코코넛 슈가', 'coconut sugar', '코코피트', 'coco peat', 'coir'],
    tagline: b('한국 코코넛유(1513.19) 수입의 53%가 필리핀산 — 3년간 2배 성장한 소싱 품목입니다.', 'PH supplies 53% of Korea’s coconut oil (1513.19) — doubled in 3 years.'),
    hs: [
      {
        code: '1513.19.1000',
        ahtn: '1513.19.90',
        desc: b('정제 코코넛유 (RBD, 정제유)', 'Refined (RBD) coconut oil'),
        fit: 88,
        rationale: b(
          '탈산·탈색·탈취(RBD) 등 정제한 코코넛유는 제1513.19호(조유 외)의 「정제유」(HSK 1513.19.1000). 독일 세관 구속력 있는 품목분류(EBTI DE28296/16-1)도 정제 코코넛유를 1513.19로 분류. 식용 목적 수입 시 식품 기준, 화장품 원료 시 화장품법 경로로 분리.',
          'Refined (RBD) coconut oil falls under 1513.19 (other than crude), "refined oil" (HSK 1513.19.1000); the German customs binding ruling EBTI DE28296/16-1 also classifies refined coconut oil in 1513.19. Food use follows food rules; cosmetic-ingredient use follows the Cosmetics Act.',
        ),
      },
      {
        code: '1513.11.0000',
        ahtn: '1513.11.00',
        desc: b('코코넛유 조유 — 정제하지 않은 버진코코넛오일(VCO) 포함', 'Crude coconut oil, incl. unrefined virgin coconut oil (VCO)'),
        fit: 85,
        rationale: b(
          '압착·원심분리로 얻고 정제하지 않은 VCO는 미국 CBP(NY L81481 — 필리핀산 냉압착 미정제 코코넛유)와 EU 세관(EBTI DEBTI16528/21-1 등)이 모두 「조유」 1513.11로 분류 — 흡착 여과 등 정제 공정을 거치면 1513.19(EBTI GB502216013). 코프라를 압착한 산업용 조유(비누·올레오케미컬)도 여기. 한국 관세청 품목분류 사전심사로 확정 권장.',
          'VCO obtained by pressing or centrifuging and not refined is classified as crude oil, 1513.11, by US CBP (NY L81481 — cold-pressed, unrefined Philippine coconut oil) and EU customs (EBTI DEBTI16528/21-1 and others); after adsorption filtering or other refining it moves to 1513.19 (EBTI GB502216013). Crude copra oil for industry (soap, oleochemicals) is here too. Confirm with a Korea Customs advance ruling.',
        ),
      },
      {
        code: '1516.20.9000',
        ahtn: '1516.20.99',
        desc: b('식물성 유지 (경화·에스테르화 등 가공)', 'Vegetable fats, hydrogenated / interesterified'),
        fit: 28,
        rationale: b('수소첨가 경화 코코넛유(제과용 쇼트닝 원료)인 경우에 한함.', 'Only for hydrogenated coconut fat (confectionery shortening).'),
      },
    ],
    tariffs: [
      { scheme: 'MFN', rate: 3, roo: '-', certificate: CERT.none, note: b('기본세율 — WITS 2023 공식값과 일치', 'Basic (MFN) rate — matches WITS 2023 official value') },
      { scheme: 'AKFTA', rate: 3, roo: 'CTH or RVC 40%', certificate: CERT.ak, note: b('시행령 별표 4는 0%지만 별표 5가 필리핀산 1513.19를 협정세율 적용 제한 품목으로 지정(상호주의 R(PH)) — 재정경제부 고시 상호대응세율(MFN 3% 이하)이 적용. 한-필 FTA 기준세율 3%와도 일치 — 관세청 확인 필요', 'Decree Annex 4 shows 0%, but Annex 5 restricts the rate for Philippine 1513.19 (reciprocity R(PH)) — a reciprocal rate set by the Ministry of Economy and Finance (at most MFN 3%) applies. Consistent with the 3% KR-PH base rate — confirm with Korea Customs') },
      { scheme: 'RCEP', rate: 1.8, roo: 'CC', certificate: CERT.rcep, note: b('시행령 별표 17의6 — 필리핀산 2026년은 4년차(주2): 정제유(1513.19.1000) 2.7 → 2.4 → 2.1 → 1.8%. 그 밖의 것(1513.19.9000)은 0%', 'Decree Annex 17-6 — 2026 is year 4 for Philippine goods (note 2): refined oil (1513.19.1000) 2.7 → 2.4 → 2.1 → 1.8%. Other (1513.19.9000) is 0%') },
      { scheme: 'KRPH', rate: 2.1, roo: 'CTH or RVC 40%', certificate: CERT.krph, note: b('FTA 관세특례법 시행령 별표 17의8 — 1513.19(정제유·그 밖의 것) 모두 2.7%(2024) → 2.4%(2025) → 2.1%(2026) → … → 0%(2033~)', 'FTA Customs Act Decree Annex 17-8 — both 1513.19 lines: 2.7% (2024) → 2.4% (2025) → 2.1% (2026) → … → 0% (2033 on)') },
    ],
    tariffMeta: TARIFF_META_KR,
    bestFta: {
      scheme: 'RCEP',
      reason: b(
        'RCEP가 가장 낮음 — 필리핀산 2026년 정제유(1513.19.1000) 1.8%, 원산지기준 CC는 코프라(제12류)→오일(제15류)로 충족. 한-필 FTA는 2.1%(2033년 0%), 한-아세안 FTA는 필리핀산 제한 품목이라 상호대응세율(최대 MFN 3%). 정제하지 않은 VCO는 해외 세관 결정례상 조유(1513.11)로 분류되는 경우가 많고, 그러면 세 협정 모두 0% — VCO는 사전심사로 분류를 먼저 확정하세요.',
        'RCEP is the lowest — for Philippine goods in 2026 refined oil (1513.19.1000) is 1.8%, and its CC rule is met by copra (ch. 12) → oil (ch. 15). The KR-PH FTA is 2.1% (0% from 2033) and AKFTA restricts Philippine 1513.19 to a reciprocal rate (at most MFN 3%). Unrefined VCO is usually classified as crude oil (1513.11) in foreign customs rulings, which is 0% under all three agreements — settle the VCO classification with an advance ruling first.',
      ),
    },
    tariffsByHs: {
      '1513.11.0000': {
        label: b('조유·미정제 VCO (HS 1513.11)', 'Crude oil incl. unrefined VCO (HS 1513.11)'),
        tariffs: [
          { scheme: 'MFN', rate: 3, roo: '-', certificate: CERT.none, note: b('기본세율 — 한-아세안 FTA·RCEP 한국 양허표의 기준세율과 같음', 'Basic (MFN) rate — same as the base rate in Korea’s AKFTA and RCEP schedules') },
          { scheme: 'AKFTA', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.ak, note: b('한-아세안 FTA 한국 양허표 — 일반품목(NT) 0%, 조유에는 상호주의 표시 없음', "Korea's AKFTA schedule — normal track 0%, with no reciprocity remark on crude oil") },
          { scheme: 'RCEP', rate: 0, roo: 'CC', certificate: CERT.rcep, note: b('RCEP 한국 양허표(아세안용) — 1513.11.00.00 발효 즉시 0%', "Korea's RCEP schedule for ASEAN — 1513.11.00.00 duty-free from entry into force") },
          { scheme: 'KRPH', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.krph, note: b('한-필 FTA Cat 0 — 시행령 별표 17의8: 모든 연차 0%', 'KR-PH FTA Cat 0 — Decree Annex 17-8: 0% in every year') },
        ],
        bestFta: {
          scheme: 'AKFTA',
          reason: b(
            '조유는 한-아세안 FTA·RCEP·한-필 FTA 모두 0% — 필리핀 코코넛 수출사의 Form AK 발급 경험이 많아 서류 부담이 가장 적은 한-아세안 FTA 권장. 코프라(1203)→조유(1513) 세번 변경으로 원산지 충족.',
            'Crude oil is 0% under AKFTA, RCEP and the KR-PH FTA — AKFTA is recommended because PH coconut exporters routinely issue Form AK. Copra (1203) → crude oil (1513) meets the change-of-heading rule.',
          ),
        },
      },
    },
    requirements: krFoodImportRequirements({
      quarantine: b(
        '착유·정제한 유지는 병해충이 잠복할 수 없도록 가공한 것으로 식물검역 대상에서 제외되는 것이 일반적 — 검역본부에 가공품목 해당 여부 확인. 코프라·코코넛 원물(1203·0801)을 함께 들여오면 검역 대상.',
        'Pressed and refined oils are generally treated as processed so pests cannot hide in them, and fall outside plant quarantine — confirm the processed-item status with APQA. Copra or whole coconuts (1203 / 0801) shipped together are inspected.',
      ),
      extra: [
        {
          id: 'kr-cosmetic-route',
          side: 'KR',
          category: 'registration',
          title: b('화장품 원료 용도 시 화장품법 경로 분리', 'Separate Cosmetics Act route for cosmetic-grade VCO'),
          detail: b(
            '식품이 아닌 화장품 원료로 들여오는 VCO는 식품 수입신고 대상이 아님(수입신고는 판매·영업용 식품에 적용). 식품으로 신고한 물량과 섞이지 않게 용도별로 로트를 분리. 화장품 제조사는 사용 금지 원료·사용 기준(화장품법 제8조)에 맞는지 확인하고 입고 원료를 시험.',
            'VCO imported as a cosmetic ingredient rather than food is outside the food import declaration (which covers food for sale or business use). Keep lots separated from those declared as food. The cosmetics manufacturer checks the banned-ingredient list and use standards (Cosmetics Act Art. 8) and tests incoming raw materials.',
          ),
          agency: '식약처 (MFDS)',
          url: AGENCY_LINKS.mfds,
          mandatory: false,
        },
      ],
    }),
    requirementMeta: REQ_META_KR,
    market: {
      seriesLabel: b('한국의 필리핀산 HS 1513.19 수입액', 'Korea imports from PH — HS 1513.19'),
      hsBasis: '1513.19',
      series: [
        { year: 2023, value: 28_711_239 },
        { year: 2024, value: 40_754_568 },
        { year: 2025, value: 59_692_272 },
      ],
      insightYear: 2025,
      marketSize: { year: 2025, value: 112_175_314, label: b('한국 HS 1513.19 총수입 (2025)', 'Korea total HS 1513.19 imports (2025)') },
      competitors: [
        { country: b('필리핀', 'Philippines'), flag: '🇵🇭', share: 53.2, highlight: true },
        { country: b('인도네시아', 'Indonesia'), flag: '🇮🇩', share: 44.8 },
        { country: b('베트남', 'Vietnam'), flag: '🇻🇳', share: 1.1 },
        { country: b('스리랑카', 'Sri Lanka'), flag: '🇱🇰', share: 0.3 },
        { country: b('말레이시아', 'Malaysia'), flag: '🇲🇾', share: 0.3 },
      ],
      insight: b(
        '필리핀산 코코넛유 수입이 2023 $28.7M → 2025 $59.7M로 2.1배(+46.5% YoY). 필리핀·인도네시아 양강 구도(합계 98%)로 공급선 집중 리스크가 커 듀얼 소싱이 필수.',
        'Imports from PH grew 2.1× from $28.7M (2023) to $59.7M (2025; +46.5% YoY). PH and Indonesia hold 98% combined, so dual sourcing is essential.',
      ),
      meta: comtradeMeta(b('한국 신고 수입액(CIF)', 'Korea-reported imports (CIF)')),
    },
    logistics: [
      { from: 'Manila', to: 'Busan', mode: 'FCL 20ft', cost: [350, 700], transitDays: [4, 6], frequency: b('주 5항차 이상 직항', '5+ direct sailings/week'), note: b('플렉시탱크(20~22톤) 또는 드럼 적재', 'Flexitank (20–22 t) or drums') },
      { from: 'Manila', to: 'Incheon', mode: 'FCL 20ft', cost: [450, 800], transitDays: [5, 7], frequency: b('주 3항차', '3 sailings/week') },
      { from: 'Cebu', to: 'Busan', mode: 'FCL 20ft', cost: [550, 950], transitDays: [7, 12], frequency: b('주 2~3항차', '2–3 sailings/week') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'franklin-baker',
        name: 'Franklin Baker Company of the Philippines',
        country: 'PH',
        city: 'Makati (HQ) · San Pablo, Laguna (plant)',
        region: 'Metro Manila',
        role: 'seller',
        type: 'manufacturer',
        products: b('건조 코코넛, VCO, 코코넛밀크·크림, 코코넛워터', 'Desiccated coconut, VCO, coconut milk & cream, coconut water'),
        website: 'https://www.franklinbaker.com',
        linkType: 'official',
        score: 92,
        comment: b(
          '글로벌 식음료 제조사 납품 경력의 대형 코코넛 가공사(홈페이지 기준). 식품용 VCO 대량 안정 공급 및 품질서류(COA·HACCP 계열) 대응력이 높을 것으로 기대.',
          'Large coconut processor supplying global F&B manufacturers (per website). Expected to handle bulk food-grade VCO and quality documents (COA, HACCP-type) well.',
        ),
        strengths: [b('대규모 생산능력', 'Large capacity'), b('글로벌 B2B 납품', 'Global B2B supply'), b('다양한 코코넛 제품군', 'Broad coconut portfolio')],
        appeal: [
          b('한국 식품제조사향 연간 VCO 공급 계약', 'Annual VCO contract for Korean food makers'),
          b('Form AK 0% 적용 CIF 부산 견적 요청', 'Request CIF Busan quote with Form AK 0%'),
          b('코코넛밀크 동시 소싱으로 물량 확대', 'Add coconut milk to scale volume'),
        ],
        caution: b('최소 주문 단위가 클 수 있음 (플렉시탱크 단위)', 'MOQ may be large (flexitank lots)'),
      },
      {
        id: 'peter-paul',
        name: 'Peter Paul Philippine Corporation',
        country: 'PH',
        city: 'Candelaria, Quezon',
        region: 'Luzon (Quezon)',
        role: 'seller',
        type: 'manufacturer',
        products: b('유기농 VCO, 건조 코코넛, 코코넛밀크·워터, 코코넛유', 'Organic VCO, desiccated coconut, coconut milk & water, coconut oil'),
        website: 'https://www.peterpaul.com.ph',
        linkType: 'official',
        score: 89,
        comment: b(
          '1946년 설립된 퀘존주 코코넛 가공사. 유기농 VCO(Fresh-dry 공법) 보유 → 한국 프리미엄·유기농 채널에 적합. 한국 유기가공식품 인증 동등성 확인 필요.',
          'Quezon coconut processor founded in 1946 with organic VCO (fresh-dry method) — fits Korean premium/organic channels. Check Korean organic-equivalence rules.',
        ),
        strengths: [b('유기농 VCO', 'Organic VCO'), b('70년+ 업력', '70+ years in business'), b('코코넛 원료 직가공', 'Integrated processing')],
        appeal: [
          b('유기농 VCO 소용량(500ml) 한국 PB 제안', 'Organic VCO 500 ml Korean private label'),
          b('화장품 원료 그레이드 별도 견적', 'Separate quote for cosmetic grade'),
          b('듀얼 소싱 파트너 계약', 'Dual-sourcing agreement'),
        ],
        caution: b('유기 표시는 한국 유기인증 동등성 요건 충족 필요', 'Organic claims need Korean organic-equivalence compliance'),
      },
      {
        id: 'cj-freshway',
        name: 'CJ Freshway (CJ프레시웨이)',
        nameLocal: 'CJ프레시웨이',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'foodservice',
        products: b('식자재 유통·단체급식 — 업소용 대용량 유지', 'Food-service distribution — bulk cooking oils'),
        website: 'https://www.cjfreshway.com',
        linkType: 'official',
        score: 85,
        comment: b('업소용·베이커리 원료 채널. 18L·드럼 단위 정기 공급이 가능하며 가격·품질 일관성이 핵심.', 'Food-service and bakery channel; regular 18 L / drum supply where price and consistency matter most.'),
        strengths: [b('B2B 대량 유통', 'High-volume B2B'), b('전국 물류망', 'Nationwide logistics'), b('정기 발주', 'Recurring orders')],
        appeal: [b('FTA 0% 기반 업소용 단가', 'FTA 0%-based food-service pricing'), b('연간 공급 안정성', 'Annual supply security'), b('COA·잔류용매 성적서 제공', 'COA & residual-solvent reports')],
        caution: b('국제 코프라 시세 연동 단가 조항 협의', 'Negotiate copra-index pricing clause'),
      },
      {
        id: 'kolmar-kr',
        name: 'Kolmar Korea (한국콜마)',
        nameLocal: '한국콜마',
        country: 'KR',
        city: 'Seoul (HQ) · Sejong (plant)',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'oem',
        products: b('화장품 ODM — 천연 오일 원료 수요', 'Cosmetics ODM — natural oil ingredients'),
        website: 'https://www.kolmar.co.kr',
        linkType: 'official',
        score: 79,
        comment: b('VCO는 보습·클렌징 오일 원료로 활용 가능. 화장품 원료 규격(INCI·COA) 대응 시 고부가 채널.', 'VCO can be used in moisturising / cleansing oils — high-value channel if INCI / COA specs are met.'),
        strengths: [b('대형 ODM', 'Major ODM'), b('천연원료 수요', 'Natural-ingredient demand'), b('글로벌 브랜드 고객', 'Global brand clients')],
        appeal: [b('화장품 그레이드 VCO 샘플 제공', 'Cosmetic-grade VCO samples'), b('지속가능 원료 스토리', 'Sustainable-sourcing story'), b('원료 규격서 사전 제출', 'Pre-submit specifications')],
        caution: b('식품용과 화장품용 로트·서류 분리 필수', 'Keep food and cosmetic lots/documents separate'),
      },
      {
        id: 'kurly-kr-vco',
        name: 'Kurly (컬리)',
        nameLocal: '컬리',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'buyer',
        type: 'ecommerce',
        products: b('프리미엄 이커머스 — 소용량 VCO', 'Premium e-commerce — small-size VCO'),
        website: 'https://www.kurly.com',
        linkType: 'official',
        score: 77,
        comment: b('유기농·저온압착 콘셉트의 소용량 VCO 수요. 브랜드 스토리와 리뷰 관리가 핵심.', 'Demand for small organic / cold-pressed VCO; brand story and reviews are key.'),
        strengths: [b('프리미엄 고객', 'Premium buyers'), b('건강식품 트렌드', 'Health trend'), b('빠른 런칭', 'Fast launch')],
        appeal: [b('유기농 인증 강조', 'Highlight organic certificate'), b('요리·뷰티 겸용 콘텐츠', 'Cooking + beauty content'), b('단독 용량 기획', 'Exclusive size')],
        caution: b('소용량은 국내 소분·라벨링 비용 고려', 'Factor in local repacking / labeling costs'),
      },
    ],
    pricing: {
      item: b('식품용 버진코코넛오일 (190kg 드럼)', 'Food-grade virgin coconut oil (190 kg drum)'),
      unit: 'kg',
      unitKg: 1,
      unitPrice: 4.3,
      moq: 3800,
      moqUnit: 'kg (20 drums)',
      defaultIncoterm: 'FOB Manila',
      incoterms: ['FOB Manila', 'FOB Cebu', 'CFR Busan', 'CIF Busan', 'CIF Incheon', 'DDP Seoul'],
      leadTimeDays: 20,
    },
    keyRisks: [
      b('국제 코프라·CNO 시세 변동 (단가 연동조항 필요)', 'Copra / CNO price volatility (index clause needed)'),
      b('필리핀·인니 2개국 공급 집중', 'Supply concentrated in two countries'),
      b('식품용·화장품용 용도 혼동 시 통관 지연', 'Clearance delays if food vs cosmetic use is mixed'),
    ],
  },

  // =========================================================================
  // 4. Seasoned laver — KR -> PH
  // =========================================================================
  {
    id: 'seasoned-laver',
    emoji: '🍙',
    direction: 'KR_TO_PH',
    name: b('한국 조미김 · 김스낵', 'Korean seasoned laver & seaweed snacks'),
    category: b('수산가공식품', 'Processed seafood'),
    aliases: ['조미김', '김', '김스낵', '해조류', '김 스낵', '도시락김', '마른김', '김밥김', 'laver', 'seaweed', 'seasoned laver', 'seaweed snack', 'gim', 'nori', '2008.99.5010', '1212.21', '1212'],
    tagline: b('필리핀 HS 2008.99 수입시장 1위는 한국(55.8%) — 점유율 방어와 캄보디아·중국산 가격 대응이 관건입니다.', 'Korea leads PH HS 2008.99 imports (55.8%) — defend share against Cambodian / Chinese price competition.'),
    hs: [
      {
        code: '2008.99.5010',
        ahtn: '2008.99.90',
        desc: b('조미김 (기름·소금 등으로 조미한 김)', 'Seasoned laver (seasoned with oil / salt)'),
        fit: 91,
        rationale: b(
          '참기름·소금 등으로 조미·구운 김은 단순 건조 해조류(1212.21)를 넘는 조제품 → 제2008호. 필리핀 측 AHTN 2008.99.90으로 매핑.',
          'Laver roasted and seasoned with sesame oil / salt goes beyond dried seaweed (1212.21) → heading 2008. Maps to PH AHTN 2008.99.90.',
        ),
      },
      {
        code: '1212.21.1000',
        ahtn: '1212.21.90',
        desc: b('김 (건조한 것 — 마른김·김밥김)', 'Laver, dried (plain / gimbap sheets)'),
        fit: 64,
        rationale: b(
          '조미하지 않은 마른김·김밥김은 제1212.21호(식용 해조류). 이 경우 필리핀 농업부 SPS 수입허가(BPI가 BFAR 서류를 받아 발급) 대상.',
          'Unseasoned dried laver / gimbap sheets stay in 1212.21 (edible seaweed) — then the PH DA SPS import clearance applies (issued by BPI on BFAR documents).',
        ),
      },
      {
        code: '1905.90.9090',
        ahtn: '1905.90.90',
        desc: b('곡물 베이스 김스낵 (쌀칩·부각형)', 'Grain-based seaweed snack (rice-chip / bugak type)'),
        fit: 42,
        rationale: b(
          '김보다 쌀·찹쌀 반죽이 주재료인 부각·칩 형태라면 베이커리·스낵 제1905호 검토 (주된 특성 기준).',
          'If rice / glutinous-rice batter dominates (bugak, chips), consider heading 1905 based on essential character.',
        ),
      },
    ],
    tariffs: [
      { scheme: 'MFN', rate: 10, roo: '-', certificate: CERT.none, note: b('필리핀 MFN — WITS 2023 공식값과 일치', 'PH MFN — matches WITS 2023 official value') },
      { scheme: 'AKFTA', rate: 0, roo: 'RVC 40% (laver of 1212.21 wholly obtained in a Party)', certificate: CERT.ak, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값 — 0%. 단, 상호주의(R) 품목이라 한국 측 민감품목이면 10% 적용 가능', "PH Tariff Commission Tariff Finder, 2026 rate — 0%; reciprocity item (R): 10% may apply if sensitive on Korea's side") },
      { scheme: 'RCEP', rate: 0, roo: 'CC', certificate: CERT.rcep, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'KRPH', rate: 10, roo: 'RVC 40% or CC', certificate: CERT.krph, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값 — 2026년 감축 없음(10%)', 'PH Tariff Commission Tariff Finder, 2026 rate — no reduction in 2026 (10%)') },
    ],
    tariffMeta: TARIFF_META_PH,
    bestFta: {
      scheme: 'RCEP',
      reason: b(
        'RCEP 0% 권장 — 필리핀 관세위원회 Tariff Finder 2026년 고시값. 원산지기준이 류 변경(CC)이라 수입 원초(1212.21)를 써도 충족. AKFTA도 0%지만 상호주의(R) 품목이라 한국 측 민감품목이면 10%가 적용될 수 있고, 한-필 FTA는 2026년에 감축이 없어 10%(MFN과 동일)입니다.',
        'RCEP 0% recommended — 2026 rate in the PH Tariff Commission Tariff Finder. The rule is a change of chapter (CC), met even with imported raw laver (1212.21). AKFTA is also 0% but is a reciprocity item (R), so 10% can apply if the line is sensitive on Korea\'s side; the KR-PH FTA has no reduction in 2026 (10%, same as MFN).',
      ),
    },
    requirements: phFoodRequirements([
      {
        id: 'ph-bfar',
        side: 'PH',
        category: 'quarantine',
        title: b('해조류 SPS 수입허가 대상 여부 (DA · BPI/BFAR)', 'SPS import clearance for seaweed (DA · BPI/BFAR)'),
        detail: b(
          '해조류는 농업부(DA) SPS 수입허가(SPSIC) 대상 — 식물산업국(BPI)이 BFAR 사전 서류를 받아 발급. 가공·포장 식품도 동식물 위생은 DA, 인체 건강은 FDA 소관. 완제품 조미김에 SPSIC가 필요한지, BPI 식물검역증명으로 되는지는 선적 전 바이어·관세사를 통해 확인.',
          'Seaweeds fall under the DA SPS Import Clearance (SPSIC) — issued by the Bureau of Plant Industry on BFAR prerequisite documents. For processed, prepackaged food the DA covers plant and animal health and FDA covers human health. Confirm through the buyer or a broker before shipment whether finished seasoned laver needs an SPSIC or a BPI plant-quarantine clearance.',
        ),
        agency: 'DA (BPI · BFAR)',
        url: AGENCY_LINKS.phDa,
        mandatory: false,
        leadDays: 14,
      },
    ]),
    requirementMeta: REQ_META_PH,
    market: {
      seriesLabel: b('한국의 대필리핀 HS 2008.99 수출액', 'Korea exports to PH — HS 2008.99'),
      hsBasis: '2008.99',
      series: [
        { year: 2023, value: 14_532_917 },
        { year: 2024, value: 22_445_858 },
        { year: 2025, value: 25_485_620 },
      ],
      marketSize: { year: 2025, value: 14_620_629, label: b('필리핀 HS 2008.99 총수입 (2025, 필리핀 신고)', 'PH total HS 2008.99 imports (2025, PH-reported)') },
      competitors: [
        { country: b('대한민국', 'Korea'), flag: '🇰🇷', share: 55.8, highlight: true },
        { country: b('캄보디아', 'Cambodia'), flag: '🇰🇭', share: 15.5 },
        { country: b('중국', 'China'), flag: '🇨🇳', share: 14.0 },
        { country: b('태국', 'Thailand'), flag: '🇹🇭', share: 3.2 },
        { country: b('미국', 'USA'), flag: '🇺🇸', share: 3.1 },
      ],
      insightYear: 2025,
      insight: b(
        '한국의 대필리핀 2008.99 수출은 2023 $14.5M → 2025 $25.5M(+75%). 필리핀 신고 수입 기준 한국 점유율은 2024년 39.0% → 2025년 55.8%로 급등해 캄보디아(15.5%)·중국(14.0%)을 크게 앞섬 — RCEP 0%(Tariff Finder 2026년 고시값)로 가격 우위를 굳힐 시점. (한국 수출통계와 필리핀 수입통계 간 미러 차이 존재)',
        'Korean 2008.99 exports to PH grew from $14.5M (2023) to $25.5M (2025, +75%). Korea’s share of PH-reported imports jumped from 39.0% (2024) to 55.8% (2025), well ahead of Cambodia (15.5%) and China (14.0%) — lock in the lead with RCEP 0% (Tariff Finder 2026 rate). (Mirror-data gap between KR exports and PH imports.)',
      ),
      meta: comtradeMeta(b('3개년 추이: 한국 신고 수출(FOB) / 점유율: 필리핀 신고 수입(2025)', 'Trend: Korea-reported exports (FOB) / shares: PH-reported imports (2025)')),
    },
    logistics: [
      { from: 'Busan', to: 'Manila', mode: 'FCL 20ft', cost: [400, 750], transitDays: [4, 6], frequency: b('주 7항차 이상 직항', '7+ direct sailings/week'), note: b('경량·부피화물 — 40ft HC 효율 검토', 'Light, bulky cargo — consider 40ft HC') },
      { from: 'Busan', to: 'Cebu', mode: 'FCL 20ft', cost: [650, 1100], transitDays: [6, 10], frequency: b('주 2~3항차', '2–3 sailings/week') },
      { from: 'Busan', to: 'Manila', mode: 'LCL', cost: [30, 60], transitDays: [6, 9], frequency: b('주 2회 혼재 (CBM당)', 'Twice-weekly consolidation (per CBM)') },
      { from: 'Incheon', to: 'Manila', mode: 'FCL 20ft', cost: [500, 850], transitDays: [5, 7], frequency: b('주 3항차', '3 sailings/week') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'sm-markets',
        name: 'SM Markets (SM Supermarket · Hypermarket · Savemore)',
        country: 'PH',
        city: 'Pasay, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('필리핀 최대 슈퍼마켓 그룹 — 수입식품·K-푸드 코너', 'Largest PH supermarket group — imported & K-food aisles'),
        website: 'https://smmarkets.ph',
        linkType: 'official',
        score: 93,
        comment: b(
          'SM 슈퍼마켓·하이퍼마켓·세이브모어 전국 점포망. K-푸드 수요가 높은 마닐라 중산층 상권에 강함. 직거래보다는 FDA LTO 보유 수입 벤더 경유가 일반적.',
          'Nationwide SM Supermarket / Hypermarket / Savemore network, strong in Metro Manila middle-class areas with high K-food demand. Usually supplied via an LTO-holding import vendor.',
        ),
        strengths: [b('전국 최대 점포망', 'Largest store network'), b('K-푸드 코너 운영', 'K-food sections'), b('프로모션 역량', 'Promotion power')],
        appeal: [
          b('RCEP 0% 반영 진열가 경쟁력 (캄보디아산 대비)', 'RCEP 0% shelf-price edge vs Cambodian products'),
          b('도시락김 멀티팩 + 김스낵 번들 기획', 'Multi-pack laver + snack bundles'),
          b('K-드라마 연계 인스토어 프로모션', 'K-drama tie-in in-store promotions'),
        ],
        caution: b('벤더 등록·리스팅 피(listing fee) 조건 확인', 'Check vendor registration & listing fees'),
      },
      {
        id: 'pk-oriental',
        name: 'PK Oriental Trading Inc.',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'importer',
        products: b('한국식품 전문 수입·유통 (한성기업 등 독점 유통 — 회사 소개 기준)', 'Korean-food importer & distributor (exclusive for Hansung etc., per company site)'),
        website: 'https://pkorientaltrading.odoo.com',
        linkType: 'official',
        score: 90,
        comment: b(
          '한국식품 전문 수입사로 기존 K-푸드 유통 파이프라인 보유. 수입자 LTO·CPR 등록 경험이 있을 가능성이 높아 진입 기간 단축에 유리(확인 필요).',
          'Korean-food specialist importer with an existing K-food pipeline. Likely experienced with LTO / CPR filings, which can shorten time-to-market (verify).',
        ),
        strengths: [b('K-푸드 전문성', 'K-food expertise'), b('기존 리테일 거래선', 'Existing retail accounts'), b('수입 인허가 경험', 'Import licensing know-how')],
        appeal: [
          b('필리핀 독점 수입권(지역·기간 한정) 제안', 'Exclusive PH import rights (region / term-limited)'),
          b('CPR 등록 비용 분담 조건', 'Shared CPR registration costs'),
          b('수산 가공품 라인 확장 (해산물 스낵)', 'Expand into seafood snacks'),
        ],
        caution: b('기존 취급 한국 김 브랜드와의 충돌 여부', 'Check conflicts with laver brands already handled'),
      },
      {
        id: 'metro-retail',
        name: 'Metro Retail Stores Group',
        country: 'PH',
        city: 'Cebu',
        region: 'Cebu',
        role: 'buyer',
        type: 'retail',
        products: b('세부·비사야 중심 슈퍼마켓·백화점 체인', 'Supermarket & department-store chain centred on Cebu / Visayas'),
        website: 'https://www.metroretail.com.ph',
        linkType: 'official',
        score: 86,
        comment: b(
          '세부·비사야 지역 핵심 리테일러. 한국 관광객·유학생이 많은 세부 상권에서 K-푸드 테스트 마켓으로 적합. 부산→세부 직기항 활용 가능.',
          'Key retailer in Cebu / Visayas. Cebu, with many Korean tourists and students, is a good K-food test market; ship Busan → Cebu directly.',
        ),
        strengths: [b('비사야 지역 장악력', 'Visayas coverage'), b('세부 관광 상권', 'Cebu tourist areas'), b('마닐라 경쟁 회피', 'Less Manila competition')],
        appeal: [b('세부 한정 런칭 이벤트', 'Cebu-only launch event'), b('관광객용 기념품 패키지', 'Tourist gift packs'), b('부산→세부 직송 리드타임 단축', 'Busan → Cebu direct shipping')],
        caution: b('비사야 물류(도서 지역) 배송비 고려', 'Inter-island distribution costs'),
      },
      {
        id: 'puregold',
        name: 'Puregold Price Club',
        country: 'PH',
        city: 'Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('대중가 대형마트 + 사리사리 스토어 도매', 'Value hypermarket + sari-sari store wholesale'),
        website: 'https://www.puregold.com.ph',
        linkType: 'official',
        score: 84,
        comment: b(
          '가격 민감 대중 시장과 동네 소매점(사리사리) 도매 채널을 동시에 보유. 소포장·저단가 SKU(낱개 4g)로 대량 회전 가능.',
          'Covers price-sensitive mass shoppers and sari-sari store wholesale. Single 4 g packs at low price points can drive volume.',
        ),
        strengths: [b('대중 시장 커버리지', 'Mass-market reach'), b('도매 채널', 'Wholesale channel'), b('높은 회전율', 'High turnover')],
        appeal: [b('낱개 4g 저가 SKU 제안', 'Low-price single 4 g packs'), b('FTA 0%로 가격대 하향', 'FTA 0% to hit lower price points'), b('사리사리 스토어 진열 키트', 'Sari-sari display kits')],
        caution: b('마진 구조가 박함 — 원가 구조 사전 검토', 'Thin margins — check cost structure'),
      },
      {
        id: 'sg-food',
        name: 'Sung Kyung Food (성경식품 · 지도표 성경김)',
        nameLocal: '성경식품',
        country: 'KR',
        city: 'Korea',
        region: 'Korea',
        role: 'seller',
        type: 'manufacturer',
        products: b('조미김·김스낵 제조 (지도표 성경김)', 'Seasoned laver & seaweed snacks (Jidopyo Sung Kyung Gim)'),
        website: 'https://www.sgfood.co.kr',
        linkType: 'official',
        score: 88,
        comment: b(
          '국내 대표 조미김 제조사로 수출용 OEM·PB 공급 상담 대상. 무역상사형 수출 시 공급원(셀러)으로 매칭.',
          'Leading Korean seasoned-laver maker — a supply-side (seller) partner for OEM / private-label export deals.',
        ),
        strengths: [b('브랜드 인지도', 'Brand recognition'), b('대량 생산', 'Mass production'), b('수출 경험', 'Export experience')],
        appeal: [b('필리핀 바이어 PB OEM 공동 제안', 'Joint PB OEM pitch to PH buyers'), b('영문 라벨·할랄 라인 협의', 'English label & halal line'), b('FTA 원산지 서류 지원', 'FTA origin documents support')],
        caution: b('브랜드사 자체 현지 유통망과 채널 충돌 여부', 'Possible conflict with the brand’s own PH distribution'),
      },
    ],
    pricing: {
      item: b('조미김 도시락김 4g × 16봉 번들', 'Seasoned laver 4 g × 16 packs bundle'),
      unit: 'bundle',
      unitKg: 0.064,
      unitPrice: 2.1,
      moq: 2000,
      moqUnit: 'bundles',
      defaultIncoterm: 'FOB Busan',
      incoterms: ['FOB Busan', 'CFR Manila', 'CIF Manila', 'CIF Cebu', 'DAP Manila'],
      leadTimeDays: 20,
    },
    keyRisks: [
      b('고온다습 환경 산패·눅눅함 — 질소충전·방습제 필수', 'Rancidity / moisture in hot climate — nitrogen flush & desiccant required'),
      b('캄보디아·중국산 저가 경쟁', 'Low-price competition from Cambodia / China'),
      b('CPR 등록 지연 시 선적 보류', 'Shipments held if CPR is delayed'),
    ],
  },

  // =========================================================================
  // 5. K-beauty skincare — KR -> PH
  // =========================================================================
  {
    id: 'k-beauty',
    emoji: '💄',
    direction: 'KR_TO_PH',
    name: b('K-뷰티 기초화장품 (스킨케어)', 'K-beauty skincare'),
    category: b('화장품', 'Cosmetics'),
    aliases: ['k-뷰티', 'k뷰티', '케이뷰티', '화장품', '스킨케어', '기초화장품', '토너', '세럼', '에센스', '크림', '선크림', 'cosmetics', 'skincare', 'k-beauty', 'kbeauty', 'beauty', 'toner', 'serum', '3304', '3304.99'],
    // other HS headings (3303 perfume, 3305 hair, 3306 oral care) or not cosmetics at all
    excludeTerms: ['아이스크림', 'ice cream', '생크림', '휘핑크림', '크림치즈', 'cream cheese', '샴푸', 'shampoo', '린스', '헤어', 'hair', '향수', 'perfume', 'fragrance', '치약', 'toothpaste', '에센스 오일', 'essential oil'],
    tagline: b('필리핀 3304.99 수입시장 2위(16.9%) — 1위 태국(23.7%) 추격이 목표입니다.', '#2 in PH 3304.99 imports (16.9%) — chasing Thailand (23.7%).'),
    hs: [
      {
        code: '3304.99.1000',
        ahtn: '3304.99.30',
        desc: b('기초화장용 제품류 (토너·에센스·세럼·크림)', 'Skin-care preparations (toner, essence, serum, cream)'),
        fit: 93,
        rationale: b(
          '피부 보습·컨디셔닝 목적의 기초화장품은 제3304.99호 중 기초화장용. 자외선차단 기능 복합 시에도 주된 용도가 보습이면 동일 분류.',
          'Moisturising / conditioning skincare falls in 3304.99 (skin care). Multi-function SPF products stay here if moisturising is the principal use.',
        ),
      },
      {
        code: '3304.99.9000',
        ahtn: '3304.99.90',
        desc: b('기타 미용·메이크업 제품 (선크림·톤업 베이스 등)', 'Other beauty / make-up preparations (sunscreen, tone-up base)'),
        fit: 61,
        rationale: b('메이크업 베이스·톤업 크림 등 색조 기능이 주된 제품일 때.', 'When colour / make-up function is principal (tone-up base, etc.).'),
      },
      {
        code: '3401.30.0000',
        ahtn: '3401.30.00',
        desc: b('피부 세정용 유기계면활성제 제품 (클렌징폼)', 'Organic surface-active skin-washing products (cleansing foam)'),
        fit: 48,
        rationale: b('클렌징폼·젤 등 세정 목적의 계면활성제 제품은 제3401.30호.', 'Cleansing foams / gels based on surfactants go to 3401.30.'),
      },
    ],
    tariffs: [
      { scheme: 'MFN', rate: 7, roo: '-', certificate: CERT.none, note: b('필리핀 MFN — WITS 2023 공식값과 일치', 'PH MFN — matches WITS 2023 official value') },
      { scheme: 'AKFTA', rate: 0, roo: 'RVC 40% or CTH', certificate: CERT.ak, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'RCEP', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.rcep, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'KRPH', rate: 0, roo: 'RVC 40% or CTH', certificate: CERT.krph, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
    ],
    tariffMeta: TARIFF_META_PH,
    bestFta: {
      scheme: 'AKFTA',
      reason: b(
        'AKFTA·RCEP·한-필 FTA 모두 0% (필리핀 관세위원회 Tariff Finder 2026년 고시값) — 필리핀 세관·바이어에게 가장 익숙한 Form AK 우선 권장. AKFTA 원산지기준은 역내부가가치 40% 또는 세번 변경(CTH).',
        'AKFTA, RCEP and the KR-PH FTA are all 0% (2026 rates in the PH Tariff Commission Tariff Finder) — prefer Form AK, the most familiar to PH customs and buyers. The AKFTA rule is RVC 40% or a change of heading (CTH).',
      ),
    },
    requirements: [
      {
        id: 'ph-fda-lto-cos',
        side: 'PH',
        category: 'registration',
        title: b('FDA LTO (화장품 수입·유통사)', 'FDA License to Operate (cosmetics importer/distributor)'),
        detail: b('필리핀 유통사는 FDA CCHUHSRR 화장품 수입·유통 LTO 보유 필수.', 'The PH distributor must hold a cosmetics importer/distributor LTO from FDA (CCHUHSRR).'),
        agency: 'FDA Philippines',
        url: AGENCY_LINKS.phFda,
        mandatory: true,
        leadDays: 45,
      },
      {
        id: 'ph-cpn',
        side: 'PH',
        category: 'registration',
        title: b('화장품 제품 신고 (CPN — ASEAN 화장품 지침)', 'Cosmetic Product Notification (CPN — ASEAN Cosmetic Directive)'),
        detail: b(
          '화장품은 CPR이 아닌 CPN(제품 신고) 대상 — 시장에 내놓기 전에 제품별(변형 품목 포함)로 FDA에 신고. CPN 발급 전 판매 불가이며, CPN은 신고 확인일 뿐 FDA 승인이 아님.',
          'Cosmetics need a CPN (product notification), not a CPR — notify FDA per product (variants listed) before placing it on the market. No sales before the CPN is issued; a CPN acknowledges the notification and is not an FDA approval.',
        ),
        agency: 'FDA Philippines',
        url: AGENCY_LINKS.phFda,
        mandatory: true,
        leadDays: 20,
      },
      {
        id: 'ph-acd-ingredients',
        side: 'PH',
        category: 'certification',
        title: b('ASEAN 금지·제한 성분 검토', 'ASEAN banned / restricted ingredient check'),
        detail: b(
          'ACD 부속서 기준 금지·제한 성분 확인 — 예: 하이드로퀴논은 부속서 II 금지 성분(필리핀에서는 의약품으로 분류). 자외선차단제·보존료는 허용 목록 안에서 함량 한도까지만 사용. 한국 기능성 표시는 ASEAN 화장품 표시·광고 지침에 맞춰야 함.',
          'Check the ACD annexes — e.g. hydroquinone is banned (Annex II; treated as a drug in the Philippines). UV filters and preservatives only from the permitted lists and within their limits. Korean functional claims must follow the ASEAN cosmetic claims guideline.',
        ),
        agency: 'ASEAN Cosmetic Directive',
        url: AGENCY_LINKS.phFda,
        mandatory: true,
      },
      {
        id: 'ph-pif',
        side: 'PH',
        category: 'certification',
        title: b('제품정보파일 (PIF) 비치', 'Product Information File (PIF)'),
        detail: b('배합(성분·함량)·원료와 완제품 규격·GMP 제조 방법·안전성 평가를 PIF로 구성해, 필리핀 시장 출시 책임자가 FDA 요청 시 바로 낼 수 있게 비치 — FDA 사후점검 대비.', 'Composition, raw-material and finished-product specifications, GMP manufacturing method and safety assessment compiled as a PIF that the company placing the product on the PH market keeps readily accessible to FDA for post-market checks.'),
        agency: 'FDA Philippines',
        url: AGENCY_LINKS.phFda,
        mandatory: true,
      },
      {
        id: 'ph-label-cos',
        side: 'PH',
        category: 'labeling',
        title: b('영문 라벨 (ACD 표시사항)', 'English label (ACD requirements)'),
        detail: b('제품명·기능·사용법·전성분·용량·배치번호·제조일 또는 사용기한(최소 보존기간 30개월 미만이면 사용기한 필수)·제조국·필리핀 시장 출시 책임자 이름과 주소·주의사항 — 영어 또는 필리핀어 등 소비자가 이해하는 언어로.', 'Product name, function, directions, full ingredients, content, batch no., manufacturing or expiry date (expiry mandatory if shelf life is under 30 months), country of manufacture, name and address of the company placing it on the PH market, and precautions — in English and/or Filipino or another language consumers understand.'),
        agency: 'FDA Philippines',
        url: AGENCY_LINKS.phFda,
        mandatory: true,
      },
      {
        id: 'ph-halal-cos',
        side: 'PH',
        category: 'halal',
        title: b('할랄 화장품 인증 (선택)', 'Halal cosmetics certification (optional)'),
        detail: b('선택 사항 — 민다나오·무슬림 소비자와 인도네시아·말레이시아 확장을 고려하면 할랄 라인 구성. DTI 필리핀인정기구(PAB) 또는 NCMF가 인정한 인증기관에서 인증.', "Optional — build a halal line for Mindanao / Muslim consumers and future Indonesia / Malaysia expansion; certify via a body accredited by DTI's Philippine Accreditation Bureau (PAB) or NCMF."),
        agency: 'DTI-PAB / NCMF',
        url: AGENCY_LINKS.phNcmf,
        mandatory: false,
        leadDays: 60,
      },
      ...phCommonExportRequirements(),
    ],
    requirementMeta: REQ_META_PH,
    market: {
      seriesLabel: b('한국의 대필리핀 HS 3304.99 수출액', 'Korea exports to PH — HS 3304.99'),
      hsBasis: '3304.99',
      series: [
        { year: 2023, value: 53_777_595 },
        { year: 2024, value: 70_081_822 },
        { year: 2025, value: 88_720_265 },
      ],
      marketSize: { year: 2025, value: 188_530_921, label: b('필리핀 HS 3304.99 총수입 (2025, 필리핀 신고)', 'PH total HS 3304.99 imports (2025, PH-reported)') },
      competitors: [
        { country: b('태국', 'Thailand'), flag: '🇹🇭', share: 23.7 },
        { country: b('대한민국', 'Korea'), flag: '🇰🇷', share: 16.9, highlight: true },
        { country: b('중국', 'China'), flag: '🇨🇳', share: 14.4 },
        { country: b('인도', 'India'), flag: '🇮🇳', share: 6.5 },
        { country: b('인도네시아', 'Indonesia'), flag: '🇮🇩', share: 5.9 },
      ],
      insightYear: 2025,
      insight: b(
        '한국 기초화장품 대필리핀 수출 2023 $53.8M → 2025 $88.7M (+65%, 2025 YoY +26.6%). 태국(현지 생산 글로벌 브랜드 포함)이 1위 — 한국은 성분·효능 스토리와 이커머스 채널로 차별화.',
        'Korean skincare exports to PH rose from $53.8M (2023) to $88.7M (2025; +65%, +26.6% YoY). Thailand (incl. global brands made there) leads — Korea differentiates via ingredient stories and e-commerce.',
      ),
      meta: comtradeMeta(b('3개년 추이: 한국 신고 수출(FOB) / 점유율: 필리핀 신고 수입(2025)', 'Trend: Korea-reported exports (FOB) / shares: PH-reported imports (2025)')),
    },
    logistics: [
      { from: 'Incheon', to: 'Manila', mode: 'FCL 20ft', cost: [500, 850], transitDays: [5, 7], frequency: b('주 3항차', '3 sailings/week') },
      { from: 'Busan', to: 'Manila', mode: 'LCL', cost: [30, 60], transitDays: [6, 9], frequency: b('주 2회 혼재 (CBM당)', 'Twice-weekly consolidation (per CBM)'), note: b('초기 다품종 소량 — LCL 권장', 'Many SKUs in small lots — LCL first') },
      { from: 'Busan', to: 'Manila', mode: 'FCL 20ft', cost: [400, 750], transitDays: [4, 6], frequency: b('주 7항차 이상', '7+ sailings/week'), note: b('35°C 이상 고온 — 리퍼·단열 고려', '35 °C+ heat — consider reefer / insulation') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'beautymnl',
        name: 'BeautyMNL',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'ecommerce',
        products: b('필리핀 대표 뷰티 이커머스 — K-뷰티 카테고리', 'Leading PH beauty e-commerce — K-beauty category'),
        website: 'https://beautymnl.com',
        linkType: 'official',
        score: 94,
        comment: b(
          '온라인 뷰티 전문몰로 신규 K-뷰티 브랜드 테스트에 최적. 리뷰·인플루언서 연계 마케팅이 빠르며 초기 소량(LCL) 진입에 적합.',
          'Specialist online beauty store — ideal for testing new K-beauty brands, with fast review / influencer marketing and small-lot (LCL) entry.',
        ),
        strengths: [b('뷰티 전문 고객층', 'Beauty-focused shoppers'), b('빠른 신규 브랜드 런칭', 'Fast new-brand launches'), b('리뷰·콘텐츠', 'Reviews & content')],
        appeal: [
          b('고온다습 기후 맞춤 경량 수분 라인 제안', 'Lightweight hydration line for hot, humid climate'),
          b('필리핀 인플루언서 시딩 공동 진행', 'Co-run local influencer seeding'),
          b('CPN 신고 대행·서류 패키지 제공', 'Provide CPN filing document pack'),
        ],
        caution: b('플랫폼 수수료·광고비 구조 확인', 'Check commission & ad-spend structure'),
      },
      {
        id: 'watsons-ph',
        name: 'Watsons Philippines',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('헬스&뷰티 드럭스토어 전국 체인', 'Nationwide health & beauty drugstore chain'),
        website: 'https://www.watsons.com.ph',
        linkType: 'official',
        score: 90,
        comment: b(
          '오프라인 전국망 H&B 채널. 입점 시 브랜드 신뢰도·볼륨이 크게 상승하나 판촉·반품 조건 협상이 필요. 이커머스 성과(BeautyMNL 등) 확보 후 제안이 효과적.',
          'Nationwide offline H&B chain — boosts trust and volume, but promo / return terms need negotiation. Pitch after proving traction online.',
        ),
        strengths: [b('전국 오프라인 점포', 'Nationwide stores'), b('H&B 카테고리 리더', 'H&B category leader'), b('멤버십 데이터', 'Membership data')],
        appeal: [b('온라인 판매 실적 기반 입점 제안', 'Listing pitch backed by online sales data'), b('미니 사이즈(트래블킷) 기획', 'Mini / travel-size kits'), b('한-필 FTA 원가 절감분 판촉 투자', 'Reinvest FTA savings into promotions')],
        caution: b('입점비·판촉 분담·반품 조건 확인', 'Listing fees, promo sharing, returns'),
      },
      {
        id: 'robinsons-retail',
        name: 'Robinsons Retail Holdings',
        country: 'PH',
        city: 'Quezon City, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('슈퍼마켓·백화점·드럭스토어 포트폴리오', 'Supermarkets, department stores and drugstores'),
        website: 'https://www.robinsonsretail.com.ph',
        linkType: 'official',
        score: 82,
        comment: b('다업태 리테일 그룹으로 백화점 뷰티존·드럭스토어 동시 진입 가능. 그룹 바이어 1곳 상담으로 다채널 확장.', 'Multi-format retail group — department-store beauty zones and drugstores from one buying team.'),
        strengths: [b('다업태 채널', 'Multi-format'), b('수도권 상권', 'Metro Manila reach'), b('그룹 바잉', 'Group buying')],
        appeal: [b('채널별 SKU 차별화 제안', 'Channel-specific SKUs'), b('백화점용 프리미엄 세트', 'Premium sets for department stores'), b('공동 마케팅 캘린더', 'Joint marketing calendar')],
        caution: b('업태별 바이어·조건 상이', 'Different buyers/terms per format'),
      },
      {
        id: 'cosmax',
        name: 'COSMAX (코스맥스)',
        nameLocal: '코스맥스',
        country: 'KR',
        city: 'Seongnam, Gyeonggi',
        region: 'Seoul·Gyeonggi',
        role: 'seller',
        type: 'oem',
        products: b('화장품 ODM/OEM — 기초·색조', 'Cosmetics ODM/OEM — skincare & make-up'),
        website: 'https://www.cosmax.com',
        linkType: 'official',
        score: 88,
        comment: b('필리핀 바이어 PB·신규 브랜드용 ODM 공급원. 동남아 기후 처방·ASEAN 성분 규정 대응 상담에 적합.', 'ODM source for PH buyer private labels / new brands; can advise on SE-Asian formulations and ASEAN ingredient rules.'),
        strengths: [b('대형 ODM', 'Major ODM'), b('처방 개발력', 'Formulation R&D'), b('글로벌 규제 대응', 'Global regulatory support')],
        appeal: [b('필리핀 PB 공동 개발', 'Co-develop a PH private label'), b('ASEAN 성분 적합 처방', 'ACD-compliant formulas'), b('소량 다품종 MOQ 협의', 'Negotiate small-lot MOQ')],
        caution: b('ODM MOQ·개발 기간(3~6개월) 고려', 'ODM MOQ and 3–6 month development time'),
      },
      {
        id: 'kolmar-kr-beauty',
        name: 'Kolmar Korea (한국콜마)',
        nameLocal: '한국콜마',
        country: 'KR',
        city: 'Seoul (HQ) · Sejong (plant)',
        region: 'Seoul·Gyeonggi',
        role: 'seller',
        type: 'oem',
        products: b('화장품 ODM — 선케어·기초', 'Cosmetics ODM — sun care & skincare'),
        website: 'https://www.kolmar.co.kr',
        linkType: 'official',
        score: 85,
        comment: b('선케어 ODM 강점 — 필리핀 고자외선 환경에 맞는 선크림 라인 소싱처.', 'Strong in sun-care ODM — a source for sunscreen lines suited to the high-UV PH market.'),
        strengths: [b('선케어 전문성', 'Sun-care expertise'), b('대량 생산', 'Mass production'), b('품질 시스템', 'Quality systems')],
        appeal: [b('SPF 라인 필리핀 PB', 'SPF line for a PH private label'), b('ACD 자외선차단 성분 한도 대응', 'UV filters within ACD limits'), b('트래블 사이즈 개발', 'Travel-size development')],
        caution: b('자외선차단 표시·성분 한도 국가별 상이', 'SPF claims and UV-filter limits differ by country'),
      },
    ],
    pricing: {
      item: b('하이드레이팅 토너 150ml', 'Hydrating toner 150 ml'),
      unit: 'pcs',
      unitKg: 0.17,
      unitPrice: 4.2,
      moq: 3000,
      moqUnit: 'pcs',
      defaultIncoterm: 'FOB Incheon',
      incoterms: ['FOB Incheon', 'FOB Busan', 'CIF Manila', 'DAP Manila'],
      leadTimeDays: 30,
    },
    keyRisks: [
      b('CPN 미승인 상태 선적 시 압류·반송', 'Seizure / return if shipped before CPN approval'),
      b('위조·병행수입품 유통 — 정품 인증 라벨 고려', 'Counterfeit / grey-market goods — consider authenticity labels'),
      b('고온 운송 중 제형 변질', 'Formula instability during hot transit'),
    ],
  },

  // =========================================================================
  // 6. Instant ramen — KR -> PH
  // =========================================================================
  {
    id: 'instant-ramen',
    emoji: '🍜',
    direction: 'KR_TO_PH',
    name: b('한국 즉석 라면 (봉지·컵)', 'Korean instant ramen (bag & cup)'),
    category: b('가공식품 · 면류', 'Processed food · Noodles'),
    aliases: ['라면', '즉석라면', '컵라면', '봉지라면', '불닭', '신라면', '즉석면', 'ramen', 'ramyun', 'instant noodles', 'noodles', 'cup noodles', '1902', '1902.30'],
    excludeTerms: ['쌀국수', 'rice noodle', 'rice noodles', '파스타', 'pasta', '냉면', '소면', '당면', 'glass noodles'],
    tagline: b('필리핀 즉석면(1902.30) 수입 1위는 한국(31.5%) — 대형마트 벤더 확보가 확장의 열쇠입니다.', 'Korea is #1 in PH instant-noodle imports (31.5%) — supermarket vendors unlock scale.'),
    hs: [
      {
        code: '1902.30.1010',
        ahtn: '1902.30.20',
        desc: b('라면 (유탕 즉석면, 스프 동봉)', 'Ramen (fried instant noodles with seasoning)'),
        fit: 94,
        rationale: b(
          '증숙·유탕 처리 후 스프를 동봉한 즉석면은 제1902.30호(기타 파스타 — 조리한 것). EU 이행규칙 767/2014와 영국 사전품목분류(600011810 등)는 면이 본질적 특성이라며 1902.30으로 분류하지만, 미국 CBP는 2020년부터 국물 라면을 수프(2104.10)로 분류(HQ H304896) — 국가마다 다르므로 필리핀 BOC 사전심사로 확정 권장.',
          'Steamed, fried noodles with seasoning sachets fall under 1902.30 (other pasta, cooked). EU Implementing Regulation 767/2014 and UK advance rulings (600011810 and others) keep them in 1902.30 because the noodles give the essential character, but US CBP has classified soup-type ramen as soup (2104.10) since 2020 (HQ H304896) — practice differs, so confirm with a Philippine BOC advance ruling.',
        ),
      },
      {
        code: '1902.30.1090',
        ahtn: '1902.30.40',
        desc: b('기타 즉석면 (비유탕 건면·컵면)', 'Other instant noodles (non-fried / cup)'),
        fit: 66,
        rationale: b('열풍 건조한 비유탕면 또는 쌀국수 컵면 등.', 'Air-dried non-fried noodles or rice-noodle cups.'),
      },
      {
        code: '1902.19.9000',
        ahtn: '1902.19.90',
        desc: b('조리하지 않은 파스타 (사리면, 계란 무첨가)', 'Uncooked pasta, no egg (plain noodle blocks)'),
        fit: 34,
        rationale: b('스프 없이 조리되지 않은 면 사리만 수출할 때.', 'Only for uncooked noodle blocks without seasoning.'),
      },
    ],
    tariffs: [
      { scheme: 'MFN', rate: 15, roo: '-', certificate: CERT.none, note: b('필리핀 MFN — WITS 2023 공식값과 일치', 'PH MFN — matches WITS 2023 official value') },
      { scheme: 'AKFTA', rate: 0, roo: 'CTH (wheat flour 1101 → 1902 qualifies) or RVC 40%', certificate: CERT.ak, note: b('WITS 공식 특혜세율(필리핀→한국산)과 일치', 'Matches the WITS official PH preferential rate for Korean goods') },
      { scheme: 'RCEP', rate: 0, roo: 'CC', certificate: CERT.rcep, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'KRPH', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.krph, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
    ],
    tariffMeta: TARIFF_META_PH,
    bestFta: {
      scheme: 'AKFTA',
      reason: b(
        'AKFTA·RCEP·한-필 FTA 모두 0% (필리핀 관세위원회 Tariff Finder 2026년 고시값, AHTN 1902.30.40) — MFN 15% 대비 15%p 절감. 수입 밀가루(1101)를 써도 세번 변경(CTH)으로 원산지 충족. 가장 익숙한 Form AK 우선.',
        'AKFTA, RCEP and the KR-PH FTA are all 0% (2026 rates in the PH Tariff Commission Tariff Finder, AHTN 1902.30.40) — 15 pp below MFN. Imported wheat flour (1101) still meets the change-of-heading rule. Prefer the familiar Form AK.',
      ),
    },
    requirements: phFoodRequirements([
      {
        id: 'ph-meat-extract',
        side: 'PH',
        category: 'quarantine',
        title: b('육류 추출물 함유 스프 — DA 수입허가 확인', 'Meat-extract seasoning — check DA import permits'),
        detail: b(
          '소고기·닭고기 추출물 함유 스프는 필리핀 농업부(DA) 관련 기관의 SPS 수입허가 대상 여부 확인. 비건·해물 스프 SKU 우선 진입도 대안.',
          'Seasonings with beef / chicken extract may require SPS import clearance from DA agencies; launching vegan / seafood SKUs first is an alternative.',
        ),
        agency: 'Department of Agriculture (DA)',
        url: AGENCY_LINKS.phDa,
        mandatory: false,
        leadDays: 21,
      },
    ]),
    requirementMeta: REQ_META_PH,
    market: {
      seriesLabel: b('한국의 대필리핀 HS 1902.30 수출액', 'Korea exports to PH — HS 1902.30'),
      hsBasis: '1902.30',
      series: [
        { year: 2023, value: 37_956_861 },
        { year: 2024, value: 54_602_891 },
        { year: 2025, value: 63_156_629 },
      ],
      marketSize: { year: 2025, value: 43_853_487, label: b('필리핀 HS 1902.30 총수입 (2025, 필리핀 신고)', 'PH total HS 1902.30 imports (2025, PH-reported)') },
      competitors: [
        { country: b('대한민국', 'Korea'), flag: '🇰🇷', share: 31.5, highlight: true },
        { country: b('중국', 'China'), flag: '🇨🇳', share: 24.4 },
        { country: b('인도네시아', 'Indonesia'), flag: '🇮🇩', share: 15.0 },
        { country: b('베트남', 'Vietnam'), flag: '🇻🇳', share: 14.8 },
        { country: b('일본', 'Japan'), flag: '🇯🇵', share: 3.1 },
      ],
      insightYear: 2025,
      insight: b(
        '한국 라면 대필리핀 수출 2023 $38.0M → 2025 $63.2M (+66%). 필리핀 신고 수입 기준 한국 31.5%로 1위이나, 현지 생산(Lucky Me! 등)과 인니·중국산이 대중가 시장을 장악 — 매운맛·프리미엄 포지션 유지가 핵심.',
        'Korean ramen exports to PH grew from $38.0M (2023) to $63.2M (2025; +66%). Korea leads PH-reported imports (31.5%), but local brands and Indonesian / Chinese noodles own the mass price tier — keep the spicy / premium position.',
      ),
      meta: comtradeMeta(b('3개년 추이: 한국 신고 수출(FOB) / 점유율: 필리핀 신고 수입(2025)', 'Trend: Korea-reported exports (FOB) / shares: PH-reported imports (2025)')),
    },
    logistics: [
      { from: 'Busan', to: 'Manila', mode: 'FCL 40ft', cost: [650, 1200], transitDays: [4, 6], frequency: b('주 7항차 이상 직항', '7+ direct sailings/week'), note: b('40ft 약 1,800~2,000 카톤', '≈1,800–2,000 cartons per 40ft') },
      { from: 'Busan', to: 'Manila', mode: 'FCL 20ft', cost: [400, 750], transitDays: [4, 6], frequency: b('주 7항차 이상', '7+ sailings/week') },
      { from: 'Busan', to: 'Cebu', mode: 'FCL 40ft', cost: [900, 1500], transitDays: [6, 10], frequency: b('주 2~3항차', '2–3 sailings/week') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'puregold-ramen',
        name: 'Puregold Price Club',
        country: 'PH',
        city: 'Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('대중가 대형마트 + 사리사리 스토어 도매', 'Value hypermarket + sari-sari wholesale'),
        website: 'https://www.puregold.com.ph',
        linkType: 'official',
        score: 93,
        comment: b('라면은 회전율이 높은 대중 품목 — 대형마트+도매 이중 채널로 컨테이너 단위 정기 발주에 가장 적합.', 'Ramen is a high-turnover mass item — hypermarket + wholesale channels fit container-level repeat orders best.'),
        strengths: [b('대량 회전', 'High volume'), b('도매 채널', 'Wholesale arm'), b('전국 점포', 'Nationwide stores')],
        appeal: [b('5입 멀티팩 가격 경쟁력', 'Price-competitive 5-pack'), b('한-필 FTA 0% 반영 진열가', 'Shelf price with KR-PH FTA 0%'), b('매운맛 챌린지 인스토어 이벤트', 'Spicy-challenge in-store events')],
        caution: b('저마진 구조 — 프로모션 분담 조건 확인', 'Thin margins — check promo cost sharing'),
      },
      {
        id: 'sm-markets-ramen',
        name: 'SM Markets (SM Supermarket · Hypermarket · Savemore)',
        country: 'PH',
        city: 'Pasay, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('필리핀 최대 슈퍼마켓 그룹 — K-푸드 코너', 'Largest PH supermarket group — K-food aisles'),
        website: 'https://smmarkets.ph',
        linkType: 'official',
        score: 91,
        comment: b('K-푸드 코너가 활성화된 핵심 채널. 신제품(한정판 맛) 런칭과 진열 확보에 유리.', 'Core channel with active K-food sections; good for limited-edition flavour launches and shelf space.'),
        strengths: [b('최대 점포망', 'Largest footprint'), b('K-푸드 진열', 'K-food displays'), b('중산층 고객', 'Middle-class shoppers')],
        appeal: [b('한정판 맛 SM 단독 런칭', 'SM-exclusive limited flavour'), b('K-콘텐츠 연계 엔드캡', 'K-content end-caps'), b('컵라면 편의 채널 확장', 'Cup-noodle convenience expansion')],
        caution: b('벤더(수입사) 경유 리스팅 구조', 'Listing via importer-vendor'),
      },
      {
        id: 'robinsons-ramen',
        name: 'Robinsons Retail Holdings (Robinsons Supermarket)',
        country: 'PH',
        city: 'Quezon City, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('슈퍼마켓·편의점 등 다업태 리테일', 'Multi-format retail incl. supermarkets'),
        website: 'https://www.robinsonsretail.com.ph',
        linkType: 'official',
        score: 87,
        comment: b('슈퍼마켓·편의 업태를 함께 보유해 봉지면·컵면 동시 공급 가능.', 'Supermarket and convenience formats allow bag and cup SKUs together.'),
        strengths: [b('다업태', 'Multi-format'), b('수도권 상권', 'Metro Manila'), b('그룹 바잉', 'Group buying')],
        appeal: [b('업태별 SKU 구성', 'SKU mix by format'), b('컵라면 편의점 집중', 'Cup noodles for convenience'), b('공동 판촉', 'Joint promotions')],
        caution: b('업태별 조건 상이', 'Terms vary by format'),
      },
      {
        id: 'snr',
        name: 'S&R Membership Shopping',
        country: 'PH',
        city: 'Taguig, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('창고형 멤버십 할인점 — 박스 단위 수입식품', 'Membership warehouse club — boxed imported food'),
        website: 'https://www.snrshopping.com',
        linkType: 'official',
        score: 84,
        comment: b('박스·대용량 단위 판매 → 카톤 단위 공급 효율이 높음. 중상류층 회원 기반으로 프리미엄 라면 적합.', 'Sells by the box — efficient carton-level supply; upper-middle-class members suit premium ramen.'),
        strengths: [b('카톤 단위 판매', 'Carton-level sales'), b('프리미엄 고객', 'Premium members'), b('수입품 강세', 'Import-strong assortment')],
        appeal: [b('20~40입 박스 패키지', '20–40 pack boxes'), b('프리미엄 라인 단독', 'Exclusive premium line'), b('시식 데모', 'In-store demos')],
        caution: b('회원 대상 독점 SKU 요구 가능', 'May require member-exclusive SKUs'),
      },
      {
        id: 'landers',
        name: 'Landers Superstore',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('창고형 멤버십 슈퍼스토어', 'Membership superstore'),
        website: 'https://www.landers.ph',
        linkType: 'official',
        score: 80,
        comment: b('빠르게 점포를 늘리는 창고형 채널 — S&R과 병행 시 멤버십 시장 커버리지 확대.', 'Fast-growing warehouse format — pair with S&R to cover the membership segment.'),
        strengths: [b('성장 채널', 'Growing channel'), b('대용량 판매', 'Bulk sales'), b('수입식품 수요', 'Import demand')],
        appeal: [b('멀티팩 번들', 'Multi-pack bundles'), b('시즌 프로모션', 'Seasonal promotions'), b('정기 컨테이너 공급', 'Regular container supply')],
        caution: b('바이어 컨택 경로 확인 필요', 'Identify the buyer contact path'),
      },
      {
        id: 'fdi',
        name: 'Federated Distributors, Inc. (FDI)',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'distributor',
        products: b('수입 식품 전문 유통사 (대형마트 납품 벤더)', 'Imported-food distributor (supermarket vendor)'),
        website: 'https://fdi.com.ph',
        linkType: 'official',
        score: 83,
        comment: b('리테일 직거래가 어려운 초기에는 수입 유통 벤더를 통해 LTO·CPR·리스팅을 일괄 처리하는 방식이 현실적.', 'Early on, an import distributor that handles LTO, CPR and listings is the realistic route into retail.'),
        strengths: [b('리테일 벤더 지위', 'Retail vendor status'), b('수입 인허가 처리', 'Import licensing'), b('물류·영업 대행', 'Logistics & sales')],
        appeal: [b('필리핀 총판(지역 한정) 제안', 'Regional master distributorship'), b('CPR 등록 공동 진행', 'Joint CPR filing'), b('마케팅 비용 분담 구조', 'Shared marketing budget')],
        caution: b('독점 범위·최소 구매 물량 조항 협의', 'Negotiate exclusivity scope & minimum purchase'),
      },
    ],
    pricing: {
      item: b('봉지라면 120g × 40입 카톤', 'Instant ramen 120 g × 40 packs carton'),
      unit: 'carton',
      unitKg: 4.8,
      unitPrice: 17.5,
      moq: 1200,
      moqUnit: 'cartons',
      defaultIncoterm: 'FOB Busan',
      incoterms: ['FOB Busan', 'CFR Manila', 'CIF Manila', 'CIF Cebu'],
      leadTimeDays: 21,
    },
    keyRisks: [
      b('육류 추출물 스프 SPS 허가 지연', 'SPS permit delays for meat-extract seasonings'),
      b('유통기한(6~12개월) 대비 선적·통관 리드타임 관리', 'Manage lead time against 6–12 month shelf life'),
      b('현지 생산 브랜드의 가격 공세', 'Price pressure from local brands'),
    ],
  },

  // =========================================================================
  // 7. Smart building materials — KR -> PH
  // =========================================================================
  {
    id: 'smart-building',
    emoji: '🏗️',
    direction: 'KR_TO_PH',
    name: b('스마트 건자재 (디지털 도어락 · 인테리어 바닥재)', 'Smart building materials (digital door locks · interior flooring)'),
    category: b('건자재 · 스마트홈', 'Building materials · Smart home'),
    aliases: ['건자재', '스마트 건자재', '인테리어', '인테리어 자재', '도어락', '디지털도어락', '스마트도어락', '바닥재', '마루', 'pvc', 'spc', 'door lock', 'smart lock', 'digital lock', 'building materials', 'flooring', 'interior', '8301', '8301.40', '3918'],
    tagline: b('필리핀 자물쇠(8301.40) 수입의 67%가 중국산, 관세는 1%뿐 — 승부처는 관세가 아니라 인증과 B2B 프로젝트입니다.', '67% of PH lock imports (8301.40) are Chinese and duty is only 1% — win on certification and B2B projects, not tariffs.'),
    hs: [
      {
        code: '8301.40.1000',
        ahtn: '8301.40.20',
        desc: b('전자식 자물쇠 (디지털·스마트 도어락)', 'Electronic locks (digital / smart door locks)'),
        fit: 89,
        rationale: b(
          '지문·비밀번호·Wi-Fi/BLE 기능이 있어도 주된 기능은 "자물쇠" → 제8301.40호. 무선 모듈은 부분품으로 일괄 분류(통칙 3(b)).',
          'Even with fingerprint / PIN / Wi-Fi / BLE, the essential function is a lock → 8301.40; the radio module is classified with the whole (GRI 3(b)).',
        ),
      },
      {
        code: '3918.10.1000',
        ahtn: '3918.10.11',
        desc: b('염화비닐 중합체 바닥깔개 (PVC·SPC 바닥재)', 'Floor coverings of PVC (vinyl / SPC flooring)'),
        fit: 58,
        rationale: b('도어락과 함께 패키지로 수출하는 PVC·SPC 바닥재는 제3918.10호로 별도 신고.', 'PVC / SPC flooring shipped in the same package is declared separately under 3918.10.'),
      },
      {
        code: '8543.70.9090',
        ahtn: '8543.70.90',
        desc: b('기타 전기기기 (스마트홈 허브·게이트웨이)', 'Other electrical apparatus (smart-home hub / gateway)'),
        fit: 33,
        rationale: b('도어락과 별도로 판매하는 스마트홈 허브만 수출할 때.', 'Only for stand-alone smart-home hubs sold separately.'),
      },
    ],
    tariffs: [
      { scheme: 'MFN', rate: 1, roo: '-', certificate: CERT.none, note: b('도어락(8301.40) — 바닥재는 HS 3918.10 탭', 'Door locks (8301.40) — flooring has its own HS 3918.10 tab') },
      { scheme: 'AKFTA', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.ak, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'RCEP', rate: 0, roo: 'CTSH or RVC 40%', certificate: CERT.rcep, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
      { scheme: 'KRPH', rate: 0, roo: 'CTH or RVC 40%', certificate: CERT.krph, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
    ],
    tariffMeta: TARIFF_META_PH,
    bestFta: {
      scheme: 'AKFTA',
      reason: b(
        '도어락(AHTN 8301.40.20)은 필리핀 MFN이 1%로 FTA 절감 효과가 미미 — 원산지 서류 비용 대비 실익을 따져볼 것. AKFTA·RCEP·한-필 FTA 모두 0% (Tariff Finder 2026년 고시값). 중국산 부품 비중이 높으면 BOM 기준 RVC 40% 판정 필수. 함께 수출하는 바닥재(3918.10)는 세율 구조가 전혀 달라 별도 탭에서 계산.',
        'Door locks (AHTN 8301.40.20) carry only 1% PH MFN, so FTA savings are marginal — weigh them against CO paperwork. AKFTA, RCEP and the KR-PH FTA are all 0% (Tariff Finder 2026 rates); with many Chinese parts a BOM-based RVC 40% check is essential. Flooring (3918.10) shipped alongside has a completely different duty profile — see its own tab.',
      ),
    },
    tariffsByHs: {
      '3918.10.1000': {
        label: b('PVC·SPC 바닥재 (HS 3918.10)', 'PVC / SPC flooring (HS 3918.10)'),
        tariffs: [
          { scheme: 'MFN', rate: 15, roo: '-', certificate: CERT.none, note: b('필리핀 MFN — WITS 2023 공식값과 일치', 'PH MFN — matches WITS 2023 official value') },
          { scheme: 'AKFTA', rate: 12, roo: 'CTH or RVC 40%', certificate: CERT.ak, note: b('필리핀 민감품목 — WITS 공식 특혜세율과 일치', 'PH sensitive item — matches the WITS official preferential rate') },
          { scheme: 'RCEP', rate: 5, roo: 'CTH or RVC 40%', certificate: CERT.rcep, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
          { scheme: 'KRPH', rate: 10, roo: 'CTH or RVC 40%', certificate: CERT.krph, note: b('필리핀 관세위원회 Tariff Finder 2026년 고시값', 'PH Tariff Commission Tariff Finder, 2026 rate') },
        ],
        bestFta: {
          scheme: 'RCEP',
          reason: b(
            'RCEP 5% 권장 — 필리핀 관세위원회 Tariff Finder 2026년 고시값(AHTN 3918.10.11/.19). MFN 15% 대비 10%p 절감으로 이 품목에서 절세 효과가 가장 큼. 한-필 FTA는 10%, AKFTA는 민감품목이라 12%. 세율이 해마다 내려가므로 선적 연도 세율을 다시 확인하세요.',
            'RCEP 5% recommended — 2026 rate in the PH Tariff Commission Tariff Finder (AHTN 3918.10.11/.19), 10 pp below MFN 15% and the largest saving here. The KR-PH FTA is 10% and AKFTA 12% (sensitive item). Rates step down yearly, so re-check the rate for the shipment year.',
          ),
        },
      },
    },
    requirements: [
      {
        id: 'ph-ntc',
        side: 'PH',
        category: 'certification',
        title: b('NTC 무선기기 형식승인 (Type Approval)', 'NTC type approval for radio equipment'),
        detail: b(
          'Wi-Fi·BLE·Zigbee 등 무선 기능 도어락은 NTC 형식인정(Type Acceptance) 대상이며, 수입 시 NTC 판매업자 허가와 선적별 수입허가(90일 유효)가 필요. 안전·EMC·전파 시험성적서와 제품 사양서 준비.',
          'Wireless (Wi-Fi / BLE / Zigbee) door locks need NTC type acceptance; importing also needs an NTC dealer permit and a per-shipment import permit (valid 90 days). Prepare safety, EMC and radio test reports and specifications.',
        ),
        agency: 'NTC Philippines',
        url: AGENCY_LINKS.phNtc,
        mandatory: true,
        leadDays: 30,
      },
      {
        id: 'ph-bps',
        side: 'PH',
        category: 'certification',
        title: b('DTI-BPS PS/ICC 의무인증 품목 여부', 'DTI-BPS PS / ICC mandatory certification check'),
        detail: b(
          '플러그·콘센트·멀티탭·세라믹 타일·합판 등 DTI-BPS 의무인증 품목은 PS 마크 또는 수입품 ICC 표시 없이 유통 불가. 도어락·어댑터·비닐 바닥재가 목록에 있는지 선적 전 DTI-BPS 품목 리스트로 확인(목록은 수시로 바뀜).',
          'Products under DTI-BPS mandatory certification — e.g. plugs, socket-outlets, extension cords, ceramic tiles, plywood — cannot be sold without a PS mark or ICC sticker. Check door locks, adapters and vinyl flooring against the current DTI-BPS list before shipping (it changes).',
        ),
        agency: 'DTI Bureau of Philippine Standards',
        url: AGENCY_LINKS.phBps,
        mandatory: true,
        leadDays: 45,
      },
      {
        id: 'ph-label-consumer',
        side: 'PH',
        category: 'labeling',
        title: b('소비자법 라벨링 (영문)', 'Consumer Act labeling (English)'),
        detail: b('소비자법(RA 7394) 제77조: 상표·브랜드명, 등록 상표, 상호, 필리핀 내 제조·수입·재포장업자 주소, 주요 재질·성분, 미터법 순 수량, 수입품은 제조국 — 일반 소비자가 읽고 이해할 수 있게 표기. DTI는 사용법·경고문·와트·전압·전류 표기를 추가로 요구할 수 있음.', 'Consumer Act (RA 7394) Art. 77: brand name, registered trademark, business name, address of the manufacturer, importer or repacker in the Philippines, general make or active ingredients, metric net quantity and, for imports, the country of manufacture — readable and understandable by an ordinary consumer. DTI may also require directions, warnings and wattage, voltage or amperes.'),
        agency: 'DTI',
        url: AGENCY_LINKS.phBps,
        mandatory: true,
      },
      {
        id: 'ph-fire-code',
        side: 'PH',
        category: 'certification',
        title: b('방화문용 도어락 — 소방 기준 확인 (선택)', 'Fire-rated door hardware — fire code check (optional)'),
        detail: b('선택 사항 — 방화문용 도어락은 사람이 있는 동안 비상구가 잠기지 않고, 방화문이 자동으로 닫히는 것을 막지 않아야 함(소방법 RA 9514). 디벨로퍼 프로젝트라면 사양서에 명시.', 'Optional — on fire-rated doors, a lock must not keep fire exits locked while people are inside or stop the fire door from closing automatically (Fire Code, RA 9514). State this in the spec sheet for developer projects.'),
        agency: 'Bureau of Fire Protection',
        url: AGENCY_LINKS.phBfp,
        mandatory: false,
      },
      ...phCommonExportRequirements(),
    ],
    requirementMeta: REQ_META_PH,
    market: {
      seriesLabel: b('한국의 대필리핀 HS 8301.40 수출액', 'Korea exports to PH — HS 8301.40'),
      hsBasis: '8301.40',
      series: [
        { year: 2023, value: 742_749 },
        { year: 2024, value: 517_755 },
        { year: 2025, value: 232_021 },
      ],
      marketSize: { year: 2025, value: 26_585_993, label: b('필리핀 HS 8301.40 총수입 (2025, 필리핀 신고)', 'PH total HS 8301.40 imports (2025, PH-reported)') },
      competitors: [
        { country: b('중국', 'China'), flag: '🇨🇳', share: 67.4 },
        { country: b('일본', 'Japan'), flag: '🇯🇵', share: 5.8 },
        { country: b('대만', 'Taiwan'), flag: '🇹🇼', share: 5.6 },
        { country: b('멕시코', 'Mexico'), flag: '🇲🇽', share: 4.4 },
        { country: b('미국', 'USA'), flag: '🇺🇸', share: 2.6 },
        { country: b('대한민국', 'Korea'), flag: '🇰🇷', share: 0.9, highlight: true },
      ],
      insightYear: 2025,
      insight: b(
        '한국의 대필리핀 도어락 수출은 2023 $0.74M → 2025 $0.23M로 감소, 필리핀 신고 기준 한국 점유율 0.9%·중국 67.4%. 관세(MFN 1%)는 장벽이 아니므로 NTC 형식승인·현지 A/S와 콘도 디벨로퍼 B2B 일괄 납품(도어락+바닥재 패키지)이 승부처. 바닥재(3918.10)는 2024년 기준 한국 6.1%·중국 67.2%.',
        'Korean door-lock exports to PH fell from $0.74M (2023) to $0.23M (2025); PH-reported shares are Korea 0.9% vs China 67.4%. With MFN at 1%, tariffs are not the barrier — NTC type approval, local after-sales and condo-developer B2B packages (lock + flooring) decide. Flooring (3918.10, 2024): Korea 6.1%, China 67.2%.',
      ),
      meta: comtradeMeta(b('3개년 추이: 한국 신고 수출(FOB) / 점유율: 필리핀 신고 수입(2025)', 'Trend: Korea-reported exports (FOB) / shares: PH-reported imports (2025)')),
    },
    logistics: [
      { from: 'Busan', to: 'Manila', mode: 'FCL 20ft', cost: [400, 750], transitDays: [4, 6], frequency: b('주 7항차 이상', '7+ sailings/week'), note: b('바닥재 중량화물 — 20ft 중량 한도 확인', 'Heavy flooring — check 20ft weight limits') },
      { from: 'Incheon', to: 'Manila', mode: 'LCL', cost: [35, 65], transitDays: [6, 9], frequency: b('주 2회 혼재 (CBM당)', 'Twice-weekly consolidation (per CBM)'), note: b('도어락 단독 소량 — LCL', 'Door locks only — LCL') },
      { from: 'Busan', to: 'Cebu', mode: 'FCL 40ft', cost: [900, 1500], transitDays: [6, 10], frequency: b('주 2~3항차', '2–3 sailings/week') },
    ],
    logisticsMeta: LOGISTICS_META,
    partners: [
      {
        id: 'wilcon',
        name: 'Wilcon Depot',
        country: 'PH',
        city: 'Quezon City, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('필리핀 최대 홈임프루브먼트·건자재 리테일', 'Leading PH home-improvement & building-materials retailer'),
        website: 'https://www.wilcon.com.ph',
        linkType: 'official',
        score: 92,
        comment: b('건자재·인테리어 전문 대형 체인. 프리미엄 스마트 도어락 진열과 시공 파트너 연계가 가능해 리테일+B2B 동시 공략에 최적.', 'Large building-materials chain — premium smart-lock displays plus installer networks for retail and B2B.'),
        strengths: [b('건자재 전문', 'Category specialist'), b('전국 점포', 'Nationwide stores'), b('시공 네트워크', 'Installer network')],
        appeal: [b('체험형 도어락 디스플레이', 'Hands-on lock displays'), b('설치 교육·A/S 패키지', 'Installation training & after-sales'), b('바닥재 패키지 번들', 'Flooring bundles')],
        caution: b('A/S·부품 재고 현지화 요구 예상', 'Expect local after-sales & spare-parts demands'),
      },
      {
        id: 'smdc',
        name: 'SMDC (SM Development Corporation)',
        country: 'PH',
        city: 'Pasay, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'developer',
        products: b('대규모 콘도미니엄 개발 — 세대 단위 자재 조달', 'Large-scale condominium developer — unit-level procurement'),
        website: 'https://smdc.com',
        linkType: 'official',
        score: 88,
        comment: b('대단지 콘도 프로젝트 단위 일괄 납품 → 한 프로젝트로 수천 세트 물량. 스펙인(Spec-in) 영업과 현지 A/S 체계가 수주 조건.', 'Project-level supply for large condo towers — thousands of sets per project; spec-in selling and local after-sales are prerequisites.'),
        strengths: [b('대규모 프로젝트', 'Large projects'), b('세대 단위 물량', 'Unit-level volume'), b('수도권 입지', 'Metro Manila sites')],
        appeal: [b('스마트홈 패키지(도어락+바닥재) 스펙인', 'Spec-in smart-home package (lock + flooring)'), b('보안·편의 분양 마케팅 포인트', 'Security / convenience as sales points'), b('현지 설치·A/S 파트너 제시', 'Local installation & after-sales partner')],
        caution: b('입찰·장기 결제 조건(프로젝트 단계별) 고려', 'Tender process and milestone-based payment'),
      },
      {
        id: 'ayala-land',
        name: 'Ayala Land',
        country: 'PH',
        city: 'Makati, Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'developer',
        products: b('프리미엄 주거·오피스·복합개발', 'Premium residential, office and mixed-use developer'),
        website: 'https://ayalaland.com',
        linkType: 'official',
        score: 86,
        comment: b('프리미엄 주거 브랜드 보유 → 디자인·보안 등급이 높은 한국 스마트 도어락의 가치 제안이 통하는 고객.', 'Premium residential brands where design-led, high-security Korean smart locks can command value.'),
        strengths: [b('프리미엄 포지션', 'Premium positioning'), b('복합개발', 'Mixed-use'), b('브랜드 신뢰', 'Brand trust')],
        appeal: [b('프리미엄 디자인 라인 제안', 'Premium design line'), b('빌딩 출입통제 연동', 'Access-control integration'), b('장기 유지보수 계약', 'Long-term maintenance')],
        caution: b('사양 승인 절차가 길 수 있음', 'Spec approval can take long'),
      },
      {
        id: 'ace-hardware',
        name: 'Ace Hardware Philippines',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('하드웨어·생활건자재 체인 (SM 계열 몰 입점)', 'Hardware chain (in SM malls)'),
        website: 'https://www.acehardware.ph',
        linkType: 'official',
        score: 81,
        comment: b('몰 입점 하드웨어 체인 — DIY 설치형 보급형 스마트 도어락에 적합.', 'Mall-based hardware chain — suits DIY-install, entry-level smart locks.'),
        strengths: [b('몰 상권', 'Mall traffic'), b('DIY 고객', 'DIY shoppers'), b('전국 점포', 'Nationwide stores')],
        appeal: [b('DIY 설치 키트', 'DIY install kit'), b('보급형 모델', 'Entry-level model'), b('QR 설치 영상', 'QR install videos')],
        caution: b('보급형 가격대는 중국산과 직접 경쟁', 'Entry price tier competes head-on with China'),
      },
      {
        id: 'cw-home-depot',
        name: 'CW Home Depot',
        country: 'PH',
        city: 'Metro Manila',
        region: 'Metro Manila',
        role: 'buyer',
        type: 'retail',
        products: b('홈데포형 건자재·인테리어 리테일', 'Home-depot-style building & interior retail'),
        website: 'https://www.cwhomedepot.com',
        linkType: 'official',
        score: 77,
        comment: b('인테리어 자재 중심 리테일 — 바닥재 라인 진입 채널로 활용.', 'Interior-materials retailer — an entry channel for the flooring line.'),
        strengths: [b('인테리어 자재', 'Interior materials'), b('수도권 점포', 'Metro Manila stores'), b('B2C+B2B', 'B2C + B2B')],
        appeal: [b('바닥재 샘플북 비치', 'Flooring sample books'), b('시공사 대상 교육', 'Contractor training'), b('패키지 할인', 'Package discounts')],
        caution: b('바닥재 중량 물류비 반영', 'Account for heavy flooring freight'),
      },
      {
        id: 'lx-hausys',
        name: 'LX Hausys (LX하우시스)',
        nameLocal: 'LX하우시스',
        country: 'KR',
        city: 'Seoul',
        region: 'Seoul·Gyeonggi',
        role: 'seller',
        type: 'manufacturer',
        products: b('바닥재·창호·인테리어 자재', 'Flooring, windows and interior materials'),
        website: 'https://www.lxhausys.com',
        linkType: 'official',
        score: 84,
        comment: b('바닥재 공급원(셀러) — 도어락 제조사와 패키지 구성 시 디벨로퍼 대상 "K-스마트홈 패키지" 제안 가능.', 'Flooring supplier — pair with a lock maker to pitch a “K-smart-home package” to developers.'),
        strengths: [b('바닥재 기술력', 'Flooring technology'), b('대형 프로젝트 경험', 'Large-project experience'), b('브랜드 신뢰', 'Brand trust')],
        appeal: [b('디벨로퍼 공동 스펙인', 'Joint developer spec-in'), b('고온다습 대응 제품', 'Humidity-resistant products'), b('현지 시공 가이드', 'Local installation guides')],
        caution: b('현지 대리점 체계와 채널 충돌 여부 확인', 'Check conflicts with existing local dealers'),
      },
    ],
    pricing: {
      item: b('스마트 디지털 도어락 (지문·Wi-Fi/BLE)', 'Smart digital door lock (fingerprint, Wi-Fi/BLE)'),
      unit: 'set',
      unitKg: 3.5,
      unitPrice: 86,
      moq: 300,
      moqUnit: 'sets',
      defaultIncoterm: 'FOB Incheon',
      incoterms: ['FOB Incheon', 'FOB Busan', 'CIF Manila', 'DDP Manila'],
      leadTimeDays: 35,
    },
    keyRisks: [
      b('NTC 형식승인 전 무선기기 통관 보류', 'Radio devices held until NTC type approval'),
      b('중국산 저가 제품과의 가격 경쟁', 'Price competition from low-cost Chinese locks'),
      b('현지 A/S·부품 공급 체계 미비 시 수주 실패', 'Lost tenders without local after-sales & parts'),
    ],
  },
];

/** Seed values merged with the official snapshot and human-verified overrides (see ./official). */
export const PRODUCTS: TradeProduct[] = SEED_PRODUCTS.map(applyOfficialLayer);

export const PRODUCT_INDEX: Record<string, TradeProduct> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

let layerBuiltOn = todayIso();

/**
 * Re-applies the official layer when the calendar day changes, so `validUntil` expiry also takes effect in
 * long-running servers (browsers rebuild on every page load). Arrays are updated in place for importers.
 */
export function refreshOfficialLayer(force = false): void {
  const day = todayIso();
  if (day === layerBuiltOn && !force) return;
  layerBuiltOn = day;
  const fresh = SEED_PRODUCTS.map(applyOfficialLayer);
  PRODUCTS.splice(0, PRODUCTS.length, ...fresh);
  for (const k of Object.keys(PRODUCT_INDEX)) delete PRODUCT_INDEX[k];
  for (const p of fresh) PRODUCT_INDEX[p.id] = p;
}

let runtimeKey = '';
/**
 * Applies verified values saved on the admin page (already validated server-side) and rebuilds the products in
 * place when they changed. Used by the server on each request and by the browser after loading /api/verifications.
 */
export function applyRuntimeOverrides(entries: OverrideEntry[]): boolean {
  const key = JSON.stringify(entries);
  if (key === runtimeKey) return false;
  runtimeKey = key;
  setRuntimeOverrides(entries);
  refreshOfficialLayer(true);
  return true;
}

export function getProduct(id: string): TradeProduct | undefined {
  refreshOfficialLayer();
  // own keys only: ids such as `constructor` or `__proto__` must not resolve to Object.prototype members
  return Object.hasOwn(PRODUCT_INDEX, id) ? PRODUCT_INDEX[id] : undefined;
}

export const DEMO_SCENARIOS = [
  {
    id: 'demo-banana',
    short: b('바나나칩 수입', 'Banana chips import'),
    productId: 'banana-chips',
    direction: 'PH_TO_KR' as const,
    label: b('🍌 필리핀 바나나칩 → 한국 수입·통관·공급사 분석', '🍌 PH banana chips → Korea import, customs & suppliers'),
    query: b(
      '필리핀 세부에서 생산한 바나나칩을 한국에 수입할 때 관세와 절차는? 5만 달러 규모, 공급사도 추천해줘',
      'What are the duties and procedures to import banana chips made in Cebu, Philippines into Korea? About $50,000 — recommend suppliers too.',
    ),
  },
  {
    id: 'demo-laver',
    short: b('조미김 수출', 'Seasoned laver export'),
    productId: 'seasoned-laver',
    direction: 'KR_TO_PH' as const,
    label: b('🍙 한국 조미김 → 필리핀 수출·FDA·바이어 발굴', '🍙 Korean seasoned laver → PH export, FDA & buyers'),
    query: b(
      '한국 조미김을 필리핀에 수출하려면 FDA 등록과 관세는? 마닐라 바이어도 찾아줘',
      'How do I register with FDA and what duties apply to export Korean seasoned laver to the Philippines? Find Manila buyers.',
    ),
  },
  {
    id: 'demo-beauty',
    short: b('K-뷰티 수출', 'K-beauty export'),
    productId: 'k-beauty',
    direction: 'KR_TO_PH' as const,
    label: b('💄 K-뷰티 스킨케어 → 필리핀 마닐라 유통사 매칭', '💄 K-beauty skincare → Manila distributor matching'),
    query: b(
      'K-뷰티 기초화장품(토너·세럼)을 필리핀 마닐라 유통사에 공급하고 싶어. CPN 절차와 유통사 매칭',
      'I want to supply K-beauty skincare (toner, serum) to Manila distributors. CPN process and distributor matching.',
    ),
  },
  {
    id: 'demo-ramen',
    short: b('즉석라면 수출', 'Instant ramen export'),
    productId: 'instant-ramen',
    direction: 'KR_TO_PH' as const,
    label: b('🍜 한국 즉석라면 → 필리핀 대형마트 벤더 탐색', '🍜 Korean instant ramen → PH supermarket vendors'),
    query: b(
      '한국 즉석라면을 필리핀 대형마트에 납품하려면? 40ft 컨테이너 물류비와 벤더 탐색',
      'How can I supply Korean instant ramen to Philippine supermarkets? 40ft container freight and vendor search.',
    ),
  },
];
