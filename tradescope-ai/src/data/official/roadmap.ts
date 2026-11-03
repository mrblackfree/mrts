/**
 * "100% 정보" roadmap — what is already automated, what needs a key, and what needs a person.
 * Shown in the Data Trust Center. "100%" here means every value is (1) traceable to an official source,
 * (2) dated and within its validity window, and (3) — for legally binding items (HS, duty) — confirmed by an
 * advance ruling or a licensed customs broker.
 */
import type { Bilingual, VerificationCategory } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export type RoadmapStatus = 'live' | 'key' | 'manual';

export interface RoadmapItem {
  id: string;
  status: RoadmapStatus;
  categories: VerificationCategory[];
  title: Bilingual;
  now: Bilingual;
  steps: Bilingual[];
  links: Array<{ label: string; url: string }>;
  env?: string;
}

export const ROADMAP: RoadmapItem[] = [
  {
    id: 'comtrade',
    status: 'live',
    categories: ['stats', 'market'],
    title: b('교역 통계·시장 점유율 자동 동기화', 'Automatic trade statistics & market shares'),
    now: b('UN Comtrade 공개 API → 스냅샷(주 1회 GitHub Actions)', 'UN Comtrade public API → snapshot (weekly GitHub Actions)'),
    steps: [
      b('npm run data:sync 로 즉시 갱신 (키 불필요)', 'Run npm run data:sync any time (no key needed)'),
      b('COMTRADE_API_KEY 등록 시 정식 API로 전환 — 호출 한도 상향', 'Add COMTRADE_API_KEY to switch to the full API with higher limits'),
    ],
    links: [{ label: 'UN Comtrade Developer Portal', url: 'https://comtradedeveloper.un.org' }],
    env: 'COMTRADE_API_KEY (optional)',
  },
  {
    id: 'wits',
    status: 'live',
    categories: ['mfn'],
    title: b('기본세율(MFN) 공식 교차검증·자동 보정', 'Official MFN cross-check & auto-correction'),
    now: b(
      'World Bank WITS TRAINS(각국 정부 통보 세율)로 HS6 단위 검증 — 단일세율이면 자동 보정, 범위면 범위 내 여부 판정',
      'World Bank WITS TRAINS (government-notified tariffs) checks each HS6 — single-rate HS6 auto-corrects, ranges are range-checked',
    ),
    steps: [
      b('한계: HS6 단위·통보 연도 지연(현재 2023) — 10단위 확정은 아래 "10단위 세율" 항목으로', 'Limits: HS6 level and reporting lag (currently 2023) — confirm 10-digit rates below'),
    ],
    links: [{ label: 'WITS API', url: 'https://wits.worldbank.org/witsapiintro.aspx' }],
  },
  {
    id: 'kcs-trade',
    status: 'key',
    categories: ['stats'],
    title: b('관세청 월별 수출입실적 (올해 누적)', 'Korea Customs monthly trade (year-to-date)'),
    now: b('커넥터 구현 완료 — 공공데이터포털 서비스키만 넣으면 자동 수집', 'Connector built — add a data.go.kr service key to activate'),
    steps: [
      b('공공데이터포털 회원가입 → 「관세청_품목별 국가별 수출입실적(GW)」 활용신청 (자동승인·무료)', 'Sign up at data.go.kr → apply for “관세청_품목별 국가별 수출입실적(GW)” (auto-approved, free)'),
      b('GitHub 저장소 Secrets 또는 .env.local 에 DATA_GO_KR_SERVICE_KEY 등록', 'Store DATA_GO_KR_SERVICE_KEY in GitHub Secrets or .env.local'),
      b('npm run data:sync → 시장 모듈에 "관세청 월별 누적" KPI 자동 표시', 'npm run data:sync → the market module shows the KCS YTD KPI'),
    ],
    links: [{ label: 'data.go.kr 15100475', url: 'https://www.data.go.kr/data/15100475/openapi.do' }],
    env: 'DATA_GO_KR_SERVICE_KEY',
  },
  {
    id: 'kcs-fx',
    status: 'key',
    categories: ['mfn'],
    title: b('관세청 과세환율 (원화 관세 계산)', 'Korea Customs duty exchange rate (KRW duty)'),
    now: b('커넥터 구현 완료 — 같은 서비스키로 「관세청_관세환율정보(GW)」 활용신청 시 원화 관세 표시', 'Connector built — apply for “관세청_관세환율정보(GW)” with the same key to show KRW duty'),
    steps: [b('한국 수입 관세는 관세청 고시 주간 과세환율로 원화 환산해 부과됨', 'Korean import duty is assessed in KRW at the KCS weekly customs rate')],
    links: [{ label: 'data.go.kr 15101230', url: 'https://www.data.go.kr/data/15101230/openapi.do' }],
    env: 'DATA_GO_KR_SERVICE_KEY',
  },
  {
    id: 'tariff-10',
    status: 'manual',
    categories: ['fta', 'roo', 'mfn'],
    title: b('10단위 기본·FTA 협정세율 확정', 'Confirm 10-digit MFN & FTA rates'),
    now: b('공개 API 없음(필리핀) / 신청형 API(한국) → 검증값 입력 체계(verified-overrides.json)로 연결', 'No public API (PH) / application-based API (KR) → wired through verified-overrides.json'),
    steps: [
      b('한국: UNI-PASS 「관세율(협정·탄력)」 또는 관세청 FTA 포털에서 HSK 10단위·협정·연도별 세율 조회', 'Korea: look up HSK 10-digit rates by agreement & year in UNI-PASS or the KCS FTA portal'),
      b('필리핀: Tariff Commission Tariff Finder에서 AHTN 8단위 MFN·AKFTA·RCEP·PH-KR FTA 조회', 'Philippines: look up AHTN 8-digit MFN / AKFTA / RCEP / PH-KR rates in the Tariff Finder'),
      b('조회 결과를 verified-overrides.json에 출처·조회일·검수자와 함께 입력 → 해당 세율이 "전문가 검증"으로 승격', 'Enter results in verified-overrides.json with source, date and reviewer → the rate becomes “verified”'),
      b('UNI-PASS Open API(관세율 기본조회)는 회원가입·신청 후 명세 확인 시 커넥터 추가', 'Add a UNI-PASS Open API (tariff lookup) connector once the spec is obtained after registration'),
    ],
    links: [
      { label: 'UNI-PASS 관세율(협정·탄력)', url: 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000337' },
      { label: '관세청 FTA 포털', url: 'https://www.customs.go.kr/ftaportalkor' },
      { label: 'PH Tariff Finder (PH-KR FTA)', url: 'https://finder.tariffcommission.gov.ph/phkrfta' },
    ],
  },
  {
    id: 'hs-ruling',
    status: 'manual',
    categories: ['hs'],
    title: b('HS 품목분류 법적 확정 (사전심사)', 'Legally binding HS classification (advance ruling)'),
    now: b('AI 후보·근거 제시까지 자동 — 법적 확정은 세관 결정만 가능', 'AI candidates & rationale are automatic — only customs can make it binding'),
    steps: [
      b('한국: 관세청 품목분류 사전심사 신청(관세법 제86조) → 결정 번호를 overrides(hs)에 입력', 'Korea: apply for a KCS advance classification ruling (Customs Act art. 86) → enter the ruling number'),
      b('필리핀: BOC 사전 품목분류 판정(Advance Ruling) 신청 → 결과 입력', 'Philippines: request a BOC advance ruling → record the result'),
    ],
    links: [{ label: 'UNI-PASS 품목분류', url: 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000148' }],
  },
  {
    id: 'partners',
    status: 'manual',
    categories: ['partners'],
    title: b('기업 실재·인허가 확인', 'Company existence & licences'),
    now: b('공개 웹페이지 응답을 자동 점검(교차검증) — 인허가는 공식 포털에서 확인 후 입력', 'Public web pages are auto-checked (cross-check) — licences are confirmed on official portals'),
    steps: [
      b('필리핀: FDA verification 포털에서 수입·유통 LTO 조회, SEC·DTI BNRS로 법인 확인', 'Philippines: check importer/distributor LTO on the FDA verification portal; confirm the entity with SEC / DTI BNRS'),
      b('한국: 국세청 사업자등록 상태조회(공공데이터포털 API) 또는 DART 공시 확인', 'Korea: NTS business-status API (data.go.kr) or DART filings'),
      b('확인 결과를 overrides(partner)에 라이선스 번호·유효기간과 함께 입력', 'Enter licence number and validity in overrides (partner)'),
    ],
    links: [
      { label: 'FDA PH verification', url: 'https://verification.fda.gov.ph' },
      { label: 'PH SEC', url: 'https://www.sec.gov.ph' },
      { label: 'DART', url: 'https://dart.fss.or.kr' },
    ],
  },
  {
    id: 'freight',
    status: 'manual',
    categories: ['logistics', 'pricing'],
    title: b('실시간 운임·단가', 'Live freight & pricing'),
    now: b('운임은 매주 변동 — 견적서(유효기간 포함)를 입력하면 만료일까지 "검증"으로 표시', 'Freight changes weekly — quotations with a validity date stay “verified” until they expire'),
    steps: [
      b('포워더 견적을 overrides(logistics)에 validUntil과 함께 입력 → 만료 시 자동으로 시드로 복귀', 'Enter forwarder quotes in overrides (logistics) with validUntil → they revert to seed when expired'),
      b('지수 참고: 한국해양진흥공사 KCCI(주간), 상용 API(Freightos·SeaRates) 연동은 유료 계약 후 커넥터 추가', 'Index reference: KOBC KCCI (weekly); commercial APIs (Freightos, SeaRates) need a paid contract'),
    ],
    links: [{ label: 'KOBC (한국해양진흥공사)', url: 'https://www.kobc.or.kr' }],
  },
  {
    id: 'regulation',
    status: 'manual',
    categories: ['requirements'],
    title: b('통관·인증 규정 원문 검수', 'Regulation source review'),
    now: b('공식 기관 링크는 자동 점검 — 요약 내용은 전문가가 원문 대조 후 검수 표시', 'Official links are auto-checked — summaries are marked reviewed after an expert compares them with the source'),
    steps: [
      b('식약처 고시·필리핀 FDA Circular 원문과 대조 → overrides(requirement)에 검수자·일자 기록', 'Compare with MFDS notices / PH FDA circulars → record reviewer & date in overrides (requirement)'),
      b('validUntil을 분기 단위로 설정해 정기 재검수 강제', 'Set a quarterly validUntil to force periodic re-review'),
    ],
    links: [
      { label: '식약처 수입식품정보마루', url: 'https://impfood.mfds.go.kr' },
      { label: 'FDA Philippines', url: 'https://www.fda.gov.ph' },
    ],
  },
];
