/**
 * "100% 정보" roadmap — what is already automated, what needs a key, and what needs a person.
 * Shown in the Data Trust Center. "100%" here means every value is (1) traceable to an official source,
 * (2) dated and within its validity window, and (3) — for legally binding items (HS, duty) — confirmed by an
 * advance ruling or a licensed customs broker.
 */
import type { Bilingual, VerificationCategory } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

/** live: automated · key: automatic once a key is set · checked: checked against official texts (refreshed periodically) · manual: needs a partner's input */
export type RoadmapStatus = 'live' | 'key' | 'checked' | 'manual';

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
    title: b('MFN·AKFTA 공식 교차검증·자동 보정', 'Official MFN & AKFTA cross-check & auto-correction'),
    now: b(
      'World Bank WITS TRAINS(각국 정부 통보 세율)로 HS6 단위 검증 — MFN(2023년 통보분)과, 필리핀이 한국산에 2021년 실제 적용한 특혜세율(RCEP·한-필 FTA 발효 전이라 AKFTA)을 자동 보정. 현재 연도 협정세율은 아님. 통관 단가(Comtrade)로 시드 단가도 교차검증',
      'World Bank WITS TRAINS (government-notified tariffs) checks each HS6 — auto-corrects MFN (2023 notification) and the preferential rate the Philippines applied to Korean goods in 2021 (AKFTA, before RCEP and the KR-PH FTA took effect). These are not current-year agreement rates. Seed prices are cross-checked with Comtrade unit values',
    ),
    steps: [
      b('한계: HS6 단위·통보 연도 지연(MFN 2023, 특혜 2021) — 10단위·당해연도 확정은 아래 "10단위 세율" 항목으로', 'Limits: HS6 level and reporting lag (MFN 2023, preferential 2021) — confirm 10-digit current-year rates below'),
      b('한국 측 특혜세율(PH→KR)은 WITS에 없음 — FTA 관세특례법 시행령 별표로 대조(아래 「10단위 세율」)', 'Korea-side preferential rates (PH→KR) are not in WITS — checked against the FTA decree annexes (see “10-digit rates”)'),
    ],
    links: [{ label: 'WITS API', url: 'https://wits.worldbank.org/witsapiintro.aspx' }],
  },
  {
    id: 'kcs-trade',
    status: 'key',
    categories: ['stats'],
    title: b('관세청 월별 수출입실적 (올해 누적)', 'Korea Customs monthly trade (year-to-date)'),
    now: b('커넥터 구현 완료 — 공공데이터포털 서비스키만 넣으면 자동 수집 (UN Comtrade 월별 2026년분은 아직 미공개라 키 경로가 유일)', 'Connector built — add a data.go.kr service key (UN Comtrade has not published 2026 monthly data yet, so this is the only path)'),
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
    status: 'checked',
    categories: ['fta', 'roo', 'mfn'],
    title: b('10단위 기본·FTA 협정세율 확정', 'Confirm 10-digit MFN & FTA rates'),
    now: b(
      '공식 원문 대조 반영 — 한국: FTA 관세특례법 시행령 별표(한-필 17의8·RCEP 17의6·한-아세안 4·5)와 관세법 별표, 기획재정부 상호대응세율 고시 / 필리핀: Tariff Commission Tariff Finder. 7개 품목의 기본·FTA 세율과 최적 협정 원산지기준이 모두 「공식 출처」이며, 2027년 세율도 같은 양허표의 다음 연차로 미리 입력해 1월 1일 자동 전환',
      'Checked against official texts — Korea: the FTA Customs Act decree annexes (KR-PH 17-8, RCEP 17-6, AKFTA 4–5), the Customs Act tariff schedule and the MOEF reciprocal-rate notice / Philippines: the Tariff Commission Tariff Finder. Every MFN and FTA rate and the best agreement’s rule of origin for all 7 products is “official”, and 2027 rates are pre-loaded from the next column of the same schedules so they switch on 1 January',
    ),
    steps: [
      b('매년 12월: 다음 해 연차 세율을 같은 원문에서 읽어 validFrom(1월 1일)과 함께 verified-overrides.json에 추가 — 없으면 해가 바뀔 때 공식 표시가 자동으로 꺼짐', 'Each December: read next year’s column from the same texts and add it with validFrom (1 January) — without it the official label lapses at the turn of the year'),
      b('한국 세율 변경 고시(시행령 별표 개정·상호대응세율 고시)는 국가법령정보센터·기획재정부 고시 게시판에서 확인', 'Watch for decree-annex amendments and reciprocal-rate notices on law.go.kr and the ministry notice board'),
      b('UNI-PASS 관세율 Open API는 회원가입·신청 후 명세를 받으면 커넥터로 자동화', 'Automate with the UNI-PASS tariff Open API once registered and its spec is issued'),
    ],
    links: [
      { label: '국가법령정보센터 FTA 관세특례법 시행령', url: 'https://www.law.go.kr/법령/자유무역협정의이행을위한관세법의특례에관한법률시행령' },
      { label: 'UNI-PASS 관세율(협정·탄력)', url: 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000337' },
      { label: 'PH Tariff Finder (PH-KR FTA)', url: 'https://finder.tariffcommission.gov.ph/phkrfta' },
    ],
  },
  {
    id: 'hs-ruling',
    status: 'checked',
    categories: ['hs'],
    title: b('HS 품목분류 확정', 'HS classification'),
    now: b(
      '세관 공식 품목분류 결정(미국 CBP·영국 HMRC·EU EBTI)과 대조 — 6개 품목 「공식 품목분류 사례」. 라면은 EU(1902.30)와 미국(2104.10) 결정이 엇갈려 교차검증으로 유지. 이 대조로 버진코코넛오일이 조유(1513.11)임을 확인',
      'Checked against customs authorities’ published rulings (US CBP, UK HMRC, EU EBTI) — 6 products shown as “official classification ruling”. Ramen stays a cross-check because the EU (1902.30) and the US (2104.10) disagree. The same check showed virgin coconut oil is crude oil (1513.11)',
    ),
    steps: [
      b('법적 구속력이 필요하면: 한국 관세청 품목분류 사전심사(관세법 제86조) 또는 필리핀 BOC 사전판정(Advance Ruling) → 결정번호를 overrides(hs)에 입력하면 「품목분류 확정」', 'For a binding decision: a Korea Customs advance ruling (Customs Act art. 86) or a BOC advance ruling → enter its number in overrides (hs)'),
      b('우선순위: 라면(국가별 분류 상이)과 버진코코넛오일(한국 결정례 없음)', 'Priorities: ramen (classified differently by country) and virgin coconut oil (no Korean ruling found)'),
    ],
    links: [
      { label: 'US CBP CROSS', url: 'https://rulings.cbp.gov' },
      { label: 'EU EBTI', url: 'https://ec.europa.eu/taxation_customs/dds2/ebti/ebti_consultation.jsp' },
      { label: 'UNI-PASS 품목분류', url: 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000148' },
    ],
  },
  {
    id: 'regulation',
    status: 'checked',
    categories: ['requirements'],
    title: b('통관·인증 요건 근거 법령', 'Legal basis of permits & customs requirements'),
    now: b(
      '요건마다 근거 법령·조항을 공식 원문(국가법령정보센터·식약처, 필리핀 FDA·농업부·DTI·재무부, 아세안 사무국 등)에서 인용해 「교차검증」 — 법령이 없는 한국 할랄 마케팅만 시드. 원문과 다르던 문구(해외제조업소 등록 기한, CPR 단위, BOC 수입자 인증 등)도 정정',
      'Each requirement quotes its law from an official text (law.go.kr, MFDS, PH FDA, DA, DTI, DOF, ASEAN…) and shows as a cross-check — only Korean halal marketing, which has no law, stays seed. Claims that differed from the texts were corrected',
    ),
    steps: [
      b('「전문가 검증」은 법무법인·관세사가 특정 거래에 어떻게 적용되는지 검토한 뒤 overrides(requirement)에 기록', 'Expert-verified needs a law firm or broker to review how each rule applies to the shipment, recorded in overrides (requirement)'),
      b('validUntil을 분기 단위로 두어 정기 재검수 — 법령 개정은 근거 링크 점검(주간)으로 감시', 'Set a quarterly validUntil for re-review; law changes are watched through the weekly link check'),
    ],
    links: [
      { label: '국가법령정보센터', url: 'https://www.law.go.kr' },
      { label: 'FDA Philippines', url: 'https://www.fda.gov.ph' },
    ],
  },
  {
    id: 'partners',
    status: 'manual',
    categories: ['partners'],
    title: b('거래처 실재·인허가 확인', 'Partner existence & licences'),
    now: b(
      '공개 웹페이지 응답은 주간 자동 점검(교차검증). 인허가(LTO 등)는 필리핀 FDA 조회 포털이 자동 접속을 차단하고(403), FDA 공개 자료·한국 식약처 조회에는 번호·유효기간이 없어 자동 확인 불가 — 사람이 공식 포털에서 조회해 입력',
      'Public web pages are checked weekly (cross-check). Licences (LTO etc.) cannot be checked automatically: the PH FDA verification portal blocks automated clients (403) and other official pages give no number or validity — look them up on the official portals and enter them',
    ),
    steps: [
      b('필리핀: FDA verification 포털에서 수입·유통 LTO 번호·유효기간 조회 → overrides(partner)에 basis "official"로 입력하면 「공식 명단 확인」', 'Philippines: look up the importer/distributor LTO number and validity on the FDA portal → enter it in overrides (partner) with basis "official"'),
      b('한국: 수입식품정보마루 수입업소 조회(영업등록), 국세청 사업자 상태조회(data.go.kr API), DART 공시', 'Korea: imported-food business lookup (impfood), NTS business-status API (data.go.kr), DART filings'),
    ],
    links: [
      { label: 'FDA PH verification', url: 'https://verification.fda.gov.ph' },
      { label: '수입식품정보마루', url: 'https://impfood.mfds.go.kr' },
      { label: 'DART', url: 'https://dart.fss.or.kr' },
    ],
  },
  {
    id: 'freight',
    status: 'manual',
    categories: ['logistics'],
    title: b('운임·운송 기간', 'Freight & transit'),
    now: b(
      '운송 기간은 선사 공개 스케줄과 대조(ONE JPH: 부산→마닐라 4일·마닐라→부산 3일 — 교차검증), 인천항만공사 정기서비스 목록으로 직항 여부 확인. 운임 수준은 한국해양진흥공사 KCCI 동남아 지수를 주간 자동 수집(참고 지수). 실제 운임은 포워더 견적이 필요',
      'Transit is checked against carriers’ published schedules (ONE JPH: Busan→Manila 4 days, Manila→Busan 3 days — cross-check) and the Incheon Port Authority service list. The KOBC KCCI Southeast Asia index is collected weekly as a reference level. Actual freight needs a forwarder’s quote',
    ),
    steps: [
      b('포워더 견적을 overrides(logistics)에 validUntil과 함께 입력 → 만료일까지 「전문가 검증」, 만료 시 자동 복귀', 'Enter forwarder quotes in overrides (logistics) with validUntil → verified until they expire'),
      b('세부·다바오 노선은 공개 스케줄을 찾지 못함 — 견적으로 운송 기간까지 확인', 'No published schedule was found for Cebu and Davao — confirm transit with the quote'),
    ],
    links: [
      { label: 'KOBC KCCI', url: 'https://www.kobc.or.kr/ebz/shippinginfo/kcci/gridList.do?mId=0304000000' },
      { label: 'ONE service maps', url: 'https://www.one-line.com/en/service-maps' },
    ],
  },
  {
    id: 'pricing',
    status: 'manual',
    categories: ['pricing'],
    title: b('기준 단가·MOQ', 'Reference price & MOQ'),
    now: b(
      '같은 품목의 공식 수출 단가와 비교(필리핀 통계청 PSA FOB — 건조 망고·바나나칩 품목군·버진코코넛오일, 그 밖은 UN Comtrade 통관 단가) — 교차검증. 실제 단가·MOQ는 견적이 필요',
      'Compared with the official export unit value of the same line (PSA FOB for dried mango, the banana-chip line and virgin coconut oil; UN Comtrade unit values otherwise) — cross-check. Actual price and MOQ need a quotation',
    ),
    steps: [
      b('바이어·공급사 견적서를 overrides(pricing)에 입력 → 「전문가 검증」', 'Enter buyer / supplier quotations in overrides (pricing) → verified'),
      b('PSA 단가는 연 1회(전년 확정치 공개 후) 갱신', 'Refresh the PSA unit values once a year, after the final figures are published'),
    ],
    links: [{ label: 'PSA OpenSTAT', url: 'https://openstat.psa.gov.ph' }],
  },
];
