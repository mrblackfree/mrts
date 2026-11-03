# TradeScope AI — 글로벌 올인원 AI 무역 인텔리전스 (Prototype MVP)

> 모두의 AI 실험실 선정 과제 **AI-2026-000083**
> 전 세계 무역을 질문 하나로 다루는 것을 목표로 하며, 초기 프로토타입은 **첫 번째 노선인 대한민국 ↔ 필리핀**에 집중합니다(다음 노선: 아세안·RCEP 국가 확장 예정).
> 로그인 없이 루트 URL(`/`)에 접속하는 즉시 검색창과 대시보드가 나타나는 **Zero-Login MVP**입니다.

질문 한 줄(예: *"필리핀 세부에서 생산한 바나나칩을 한국에 수입할 때 관세와 절차는?"*)로 실제 무역 순서를 따르는 **7단계 거래 진행 가이드**를 만들고, 직접 하기 어려운 서류는 **현지 전문가에게 맡기고**, 선적 후에는 **컨테이너·통관 추적**으로 인도까지 확인합니다.

### 7단계 거래 진행 가이드

한 번에 한 단계만 보여 주고, 단계마다 「이번 단계에서 할 일」 체크리스트와 담당(나·관세사·포워더·현지 전문가)을 표시합니다. 진행 상황은 이 브라우저에 품목별로 저장되어 다시 열면 마지막 단계에서 이어집니다(PDF 리포트에는 7단계가 모두 들어갑니다).

| 단계 | 하는 일 | 화면 |
|---|---|---|
| 1 품목 확인 | HS 코드 후보·요약 브리핑, 필요하면 시장 데이터 | 브리핑 · 시장(접기) |
| 2 관세·FTA | 협정별 세율 비교, 과세가격(CIF)으로 관세·부가세 계산 | 관세 시뮬레이터 |
| 3 인허가·서류 | 양국 필수 등록·인증, 오래 걸리는 것부터 | 체크리스트 + 「맡기기」 + 현지 전문가 서비스 |
| 4 거래처 찾기 | 적합도 순 바이어·셀러 | 파트너 카드 |
| 5 계약·PI | 조건 입력 → 국/영 제안 메일·Proforma Invoice | AI 무역 비서 |
| 6 선적·추적 | 운임·리드타임, 부킹 후 컨테이너 추적 | 물류 레인 + 컨테이너 추적 |
| 7 통관·인도 | 도착지 통관과 반출·인도 확인 | 관세사 연결 + 통관/반출 추적 |

### 현지 전문가 서비스 (전문가에게 맡기기)

한국 수출자는 필리핀 FDA·BAI·BOC에 **직접 신청할 수 없습니다** — 영업허가(LTO)와 제품 등록(CPR/CFPR), 수입자 등록은 필리핀 등록 법인 명의로만 받습니다. TradeScope는 요청을 받아 현지 파트너(면허 관세사, FDA/BAI 인허가 컨설턴트, 허가를 가진 수입·유통사)를 연결합니다.

- 서비스 카탈로그: [`src/data/experts.ts`](src/data/experts.ts) — 필리핀 현지 수입자(Importer of Record), FDA 식품(LTO·CPR), FDA 화장품(CPN), **BAI 펫푸드·사료(LTO·CFPR·SPSIC)**, BFAR/DA SPS, DTI/NTC 인증, 할랄, 필리핀·한국 관세사, 한국 수입식품 등록
- 서비스마다 대행 범위와 고객이 준비할 서류를 표시하고, 처리 기간과 근거가 확인된 서비스(현재 FDA 식품, BAI 펫푸드)에는 기관 민원 안내(Citizen's Charter) 기준 처리 기간과 근거 링크를 함께 표시합니다(보완 요청 기간 제외, 기관 공지로 바뀔 수 있음). 필리핀 통관(BOC 수입자 등록)은 CAO 01-2026의 법무법인 게시본을 근거로 표시하며 공식 출처는 확인 중입니다. 나머지는 확인되는 대로 추가합니다
- 체크리스트 항목의 「맡기기」, 인허가 단계의 서비스 카드, 데이터에 없는 품목(예: 펫푸드 → BAI)의 안내에서 요청 양식이 열립니다
- 요청은 `TRADESCOPE_DATA_DIR/consult-requests.jsonl`(0600)에 저장되고 `/admin → 전문가 서비스`에서 상태(new → contacted → in-progress → done, 또는 closed)를 관리합니다. `CONSULT_WEBHOOK_URL`을 넣으면 Slack 등으로 즉시 알림
- 남용 방지: 시간당 전체 60건, 봇 차단용 숨은 필드, 요청 본문 32KB 제한. 클라이언트당 5건 한도는 클라이언트를 식별할 수 있을 때(`TRUST_PROXY` 또는 Vercel)만 적용되고, 한도는 서버 인스턴스(프로세스)마다 따로 셉니다 — 여러 인스턴스로 운영하면 인스턴스 수만큼 늘어납니다

### 컨테이너·통관 추적

| 순서 | 소스 | 비용 | 범위 | 설정 키 |
|---|---|---|---|---|
| 1 | Hapag-Lloyd DCSA Track & Trace | 무료(개발자 키) | 자사 컨테이너·B/L·부킹 | `TRACK_HLAG_CLIENT_ID` + `TRACK_HLAG_CLIENT_SECRET` |
| 1 | CMA CGM DCSA Track & Trace | 무료(개발자 키) | CMA CGM·APL·ANL | `TRACK_CMACGM_KEY` |
| 2 | ShipsGo Ocean API v2 | 유료(새 화물 1크레딧) | 대부분의 선사, 컨테이너·부킹/M B/L | `TRACK_SHIPSGO_TOKEN`, `TRACK_SHIPSGO_DAILY_NEW` |
| 통관 | 관세청 UNI-PASS 화물통관진행정보(API001) | 무료 | 한국으로 들어오는 화물: 입항·하선·반입·수입신고·수리·반출 | `UNIPASS_CARGO_KEY` |

- 선사 API는 번호 앞 4자리(또는 사용자가 고른 선사)가 그 선사일 때만 호출하고, 그 외에는 ShipsGo로 넘어갑니다. 결과는 하나의 타임라인(부킹 → 공컨테이너 반출 → 반입 → 선적 → 출항 → 환적 → 입항 → 양하 → 통관 → 반출 → 공컨테이너 반납)으로 정규화되고, 예정 이벤트는 「예정」으로 표시됩니다
- 필리핀 BOC는 공개 화물 조회 API가 없어, 필리핀 도착 화물의 통관 단계에서는 컨테이너를 반출까지 추적하고 통관 진행은 파트너 관세사가 알려 준다고 안내합니다
- 키가 하나도 없으면 「예시 데이터」 배지를 단 예시 타임라인을 보여 주고, 키가 있는데 해당 선사를 다루는 소스가 없으면 예시 대신 안내 문구를 보여 줍니다
- 비용 보호: 시간당 전체 300회(클라이언트를 식별할 수 있으면 클라이언트당 30회), 같은 번호는 10분 캐시. ShipsGo는 먼저 계정에 등록된 화물을 번호로 무료 검색하고, 검색으로 찾지 못하면(검색 자체가 실패한 경우 포함) 등록을 시도합니다. 이미 등록된 화물이면 ShipsGo가 409로 기존 화물을 돌려주므로 크레딧은 계정에 없는 새 화물에만 쓰이며, 새 등록 시도는 하루 상한(기본 30)을 넘지 않습니다. 이 한도들은 서버 인스턴스(프로세스)마다 메모리에서 따로 세므로, Vercel·다중 인스턴스에서는 인스턴스 수만큼 늘어날 수 있습니다
- 조회한 번호는 이 브라우저에 거래별로 저장되어 「다시 조회」로 이어서 확인합니다
- 어댑터는 공개 명세(DCSA 2.2, ShipsGo OpenAPI, UNI-PASS API001)에 맞춘 고정 응답과 가짜 `fetch`로 검증했습니다. **실제 키로 호출한 검증은 아직 없습니다** — 키를 넣은 뒤 `/admin → 컨테이너 추적 → 연결 테스트`(크레딧을 쓰지 않는 조회)로 먼저 확인하세요

### 가설 검증 측정 (`/admin → 가설 검증`)

[비즈니스 모델 캔버스](docs/business-model-canvas.html)의 가설 중 사이트 안에서 잴 수 있는 것을 익명 집계로 세고, 캔버스에 적힌 기준(통과·보류·중단, 최소 표본)으로 판정합니다. 비율 옆에는 95% 윌슨 신뢰구간을 함께 보여 줍니다.

| 가설 | 분자 / 분모 | 판정 기준 |
|---|---|---|
| H3 「맡기기」 요청 전환 | 인허가 단계(체크리스트·서비스 카드)에서 보낸 요청 / 인허가 단계를 처음 연 브라우저 | 200건 이상에서 5% 이상 통과 · 1% 미만 중단, 그리고 처리한 요청 10건 이상 중 70% 이상이 연락에 응답(진행 중·완료) |
| H7 선적 후 재방문 | 저장한 번호를 1시간 이상 간격으로 두 번 이상 다시 조회한 브라우저 / 선적 단계를 처음 연 브라우저 | 20건 이상에서 50% 이상 통과 · 20% 미만 중단 |
| H8 추적 커버리지 | 결과(또는 등록 대기)를 받은 조회 / 실제 소스로 한 조회(못 찾음·미지원·오류 포함, 예시 제외) | 20건 이상에서 90% 이상 통과 · 75% 미만 중단 |
| H9 채널 | 채널별 방문 → 인허가 진입 → 맡기기 열기 → 요청 | 링크에 `?utm_source=kotra`처럼 채널 이름을 붙여 비교 |

- 저장하는 것은 **날짜별 합계뿐**입니다: 쿠키·IP·기기 ID·입력 내용·조회 번호를 남기지 않습니다. 「처음 연 단계」와 재조회 횟수는 브라우저 저장소에서만 중복을 막으므로 같은 사람이 다른 기기를 쓰면 따로 셉니다. Do Not Track 또는 Global Privacy Control을 켠 브라우저는 아무것도 보내지 않습니다
- 합계는 `TRADESCOPE_DATA_DIR/metrics.json`(0600)에 5초 단위로 모아 쓰고 400일까지 보관합니다. 저장소에 쓸 수 없는 환경(Vercel·읽기 전용)에서는 메모리에만 있어 재시작하면 사라지므로, 검증 기간에는 Docker·자체 서버로 운영하세요. 서버 인스턴스마다 따로 세는 점도 같습니다
- 브라우저 이벤트는 로그인 없이 받는 익명 카운터라 일부러 부풀릴 수 있습니다(시간당 전체 30,000건, 프록시 설정 시 클라이언트당 300건 상한). H3의 요청 수는 실제 접수 건에서 세므로 요청 목록과 대조할 수 있고, 판정이 갑자기 바뀌면 일별 합계부터 확인하세요
- 요청 레코드에는 시작 위치(`source`: 체크리스트·서비스 카드·통관·미지원 품목)와 유입 채널(`channel`)이 함께 저장되어 관리자 요청 목록에 표시됩니다
- 인터뷰·사전 판매·시범 운영으로 검증하는 나머지 가설(H1·H2·H4·H5·H6·H10, H9의 비용)은 캔버스의 「판정 계산기」에 결과를 넣어 같은 규칙으로 판정합니다

### 분석 모듈

아래 5개 모듈이 위 단계 안에 배치됩니다.

| # | 모듈 | 내용 |
|---|------|------|
| 1 | **AI 무역 요약 브리핑 & HS Code 추천** | 의도 분석(관점·거래규모·지역·인코텀즈), HS 10자리 후보 Top 3 + 적합도(%)·분류 근거·신뢰도 배지 |
| 2 | **관세·FTA 최적 절세 시뮬레이터 + 통관/인증 체크리스트** | MFN vs 한-아세안 FTA vs RCEP vs 한-필 FTA 세율 바 차트, 과세가격 입력 시 관세·부가세·절감액 실시간 계산, 원산지 결정기준, 양국 필수 서류·인증(세부 가이드 + 공식 기관 링크) |
| 3 | **한-필 시장 규모 & 물류 인텔리전스** | 최근 3개년 교역 추이(순수 SVG 차트), 경쟁국 점유율, 부산·인천 ↔ 마닐라·세부·다바오 컨테이너 운임·리드타임 |
| 4 | **AI 바이어·셀러 발굴 & 적합도 랭킹** | 적합도(% Match) 정렬 카드, 역할·업종·지역(세부/마닐라/민다나오/수도권) 필터, `[AI 기업 상세분석]` `[거래 제안 메일 생성]` |
| 5 | **AI 무역 비서 (슬라이드 패널)** | 기업 강점·어필 포인트 3개·적합도 분해, 인코텀즈/MOQ/샘플/결제 조건 체크 → 영문·국문 콜드메일 + Proforma Invoice 즉시 생성(복사·메일앱 열기·AI 다듬기) |
| + | **PDF 리포트 다운로드** | `window.print()` 최적화 스타일(A4, 라이트 팔레트 강제, 체크리스트 세부 가이드 자동 펼침) |

원클릭 시연 칩 4개(🍌 바나나칩 수입 · 🍙 조미김 수출 · 💄 K-뷰티 유통사 매칭 · 🍜 라면 대형마트 벤더)로 약 1초 만에 전체 리포트가 렌더링됩니다. 다크/라이트 테마, 한/영(KO/EN) 토글, 모바일 반응형, 딥링크(`/?q=...&dir=KR_TO_PH`)를 지원합니다.

---

## 1. 빠른 시작 (로컬)

```bash
cd tradescope-ai
npm ci                 # 의존성 설치
npm run dev            # http://localhost:3000 (개발 모드)

# 프로덕션
npm run build
npm start              # 또는: npm run start:standalone (아래 참고)
```

요구사항: Node.js 20.9 이상 (22 LTS 권장). 외부 DB·API 키 없이 바로 동작합니다.

---

## 2. AI API 어댑터 & 폴백(Fallback)

`.env.local`(또는 [관리자 페이지 `/admin`](#2-1-관리자-페이지-admin))에 아래 값을 넣으면 OpenAI 호환 `POST {AI_BASE_URL}/chat/completions` 엔드포인트와 통신합니다.

```bash
cp .env.example .env.local
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AI_API_KEY` | (없음) | 없으면 **내장 한-필 시뮬레이션 엔진**으로 100% 동작 |
| `AI_BASE_URL` | `https://api.openai.com/v1` | 모두의 AI 실험실 공유 엔드포인트, OpenAI, Anthropic(`https://api.anthropic.com/v1`), Ollama/vLLM 등 |
| `AI_MODEL` | `gpt-4o-mini` | 사용할 모델명 |
| `AI_TIMEOUT_MS` | `15000` | 이 시간 내 응답이 없으면 시뮬레이션 결과로 즉시 폴백 |
| `AI_TEMPERATURE` / `AI_MAX_TOKENS` / `AI_JSON_MODE` | (미설정) | 공급자 호환성을 위해 기본은 전송하지 않음 |
| `AI_DISABLED` | `false` | `true`면 키가 있어도 시뮬레이션 엔진 강제 |

**폴백 보장 방식** — 사용자는 어떤 경우에도 에러 화면을 보지 않습니다.

```
브라우저 ──POST /api/analyze──▶ ① 로컬 RAG 검색 (kr-ph-trade-db.ts: 품목 별칭·HS 코드·방향·의도 파싱)
                               ② 시뮬레이션 엔진이 리포트·브리핑(국/영) 생성  ← 항상 먼저 완성
                               ③ AI_API_KEY 있으면 ②의 컨텍스트로 LLM 브리핑 생성 (숫자는 컨텍스트만 사용)
                                  └ 키 없음 / 401·403 / 타임아웃 / JSON 파싱 실패 / 근거 없는 수치 / 미지원 품목
                                    → ② 그대로 반환 (engine.fallbackReason 기록)
   └ /api 자체가 응답하지 않으면(정적 호스팅·오프라인) → 동일 엔진이 브라우저에서 실행
```

- 헤더의 `AI Engine Ready` 배지에 현재 엔진(LLM 모델명 또는 Simulation Engine)이 표시됩니다.
- 키는 서버에서만 읽으며 `/api/health` 등 어떤 응답에도 노출되지 않습니다.
- `AI_*` 값은 요청 시점에 읽으므로 **키 교체 시 재빌드는 불필요**합니다. 단 Docker는 `env_file`을 컨테이너 생성 시에만 읽으므로 `docker compose up -d`로 재생성해야 합니다(`restart`만으로는 반영되지 않음).
- **LLM 비용 보호:** LLM 호출은 POST 요청에서만 일어나며(GET `/api/analyze`는 항상 시뮬레이션), 클라이언트별 시간당 `AI_MAX_CALLS_PER_IP_PER_HOUR`(기본 30회), 인스턴스별 하루 `AI_DAILY_BUDGET`(기본 500회)로 제한됩니다. 한도를 넘으면 시뮬레이션 결과로 응답합니다. 제한은 서버 인스턴스 단위이므로, 엄격한 전역 한도가 필요하면 Upstash·Vercel KV 같은 공유 저장소를 붙이세요.
- LLM이 다듬은 메일은 단가·인코텀즈·HS·MOQ가 원본 초안과 그대로 일치할 때만 채택합니다(PI와 불일치 방지).

**정확도 장치**

- **수치 근거 검사(grounding):** LLM 브리핑의 %·달러 금액·HS 코드는 컨텍스트 값이거나 그 값으로 계산되는 값(세율 차이, 연도 간 증감률, 질의 금액 기준 관세)이어야 합니다. 관세·세율·FTA·MFN 문맥의 %는 실제 세율과 세율 차이만, 달러 금액은 가격·비용·시장 규모 같은 금액 값만 근거로 인정합니다. 하나라도 근거가 없으면 LLM 답변을 버리고 시뮬레이션 리포트를 씁니다(`fallbackReason: ungrounded:…`). 메일 다듬기에도 같은 검사를 적용해 초안에 없는 할인율·금액·HS가 추가되면 채택하지 않습니다.
  - 검사하는 표기: `12%`·`-3.4%`·`1,000%`·`5%p`·`12 percent`·`12퍼센트` / `$1,234`·`$1.2M`·`US$50k`·`USD 1.2 million`·`1.2 million dollars`·`50,000 USD`·`5만 달러`·`1억 2천만 달러`·`3천불` / `2008.99`·`2008.99.9000`(어디서나), `HS 200899`처럼 점 없는 코드(「HS」·「HSK」 바로 뒤)
  - 검사하지 않는 것: 연도, 일수, 수량, % 기호 없는 점수, 달러가 아닌 통화 금액. 모든 숫자가 자동 검증되는 것은 아니므로 중요한 수치는 원문으로 확인하세요.
- **미지원 품목:** 데이터베이스에 없는 품목(예: 커피, 참치캔, 소주)이나 같은 이름의 다른 형태(생바나나·코코넛워터·아이스크림 등)는 다른 품목의 데이터로 대신 답하지 않습니다. 화면에 「아직 데이터에 없는 품목」 안내와 지원 품목 목록을 보여 주고, 예시 리포트는 사용자가 펼칠 때만 「예시 데이터」 표시와 함께 보입니다. 이때 LLM은 호출하지 않습니다(`fallbackReason: unsupported-product`). HS 4단위 호만 대체 후보와 겹치는 경우(예: `1905`)도 미지원으로 봅니다.
- **과세가격 기준:** 한국(관세법 제30조)과 필리핀(CMTA 제701조) 모두 CIF 가격에 관세를 매깁니다. 질의 금액에 다른 인코텀즈가 붙어 있으면 CIF로 환산해 관세를 계산합니다 — FOB·EXW·FCA는 운임·보험료 추정분을 더하고, CFR·CPT는 보험료를 더하고, DAP·DPU는 도착지 운송분을, DDP는 관세·부가세·도착지 운송분을 뺍니다(모두 인코텀즈별 추정치). 화면에 환산 방법과 원래 금액을 표시합니다. CIF 금액은 그대로 쓰고, CIP(운송비·보험료 지급 인도) 금액은 CIF와 같은 기준으로 보고 그대로 쓰며 그렇게 표시합니다. 인코텀즈 없이 금액만 적으면 그 금액을 CIF로 **가정**하고 그렇게 표시합니다. 실제 운임 견적이 있으면 계산기의 과세가격을 바꿔 넣으세요.

### 2-1. 관리자 페이지 (`/admin`)

API 키와 운영 설정을 브라우저에서 넣고 바로 적용하는 설정 화면입니다.

**켜는 방법**

1. 서버 환경변수에 `ADMIN_PASSWORD`(10~1024자)를 설정합니다. 설정하지 않으면 페이지가 비활성화됩니다.
2. 선택으로 `ADMIN_SECRET`(32자 이상, `openssl rand -base64 32`)을 함께 둡니다. 이렇게 하면 비밀번호를 바꿔도 저장된 키가 유지됩니다. 32자보다 짧은 값은 거부되어 관리자 페이지가 꺼집니다.
3. 서버를 재시작한 뒤 `https://<도메인>/admin`에서 로그인합니다.

```bash
# .env.local
ADMIN_PASSWORD=<10자 이상>
ADMIN_SECRET=<openssl rand -base64 32 결과>
```

**설정 메뉴**

| 메뉴 | 항목 | 적용 시점 |
|------|------|-----------|
| 개요 | AI 엔진·공식 데이터·검증값·저장소 상태, 남은 설정 체크리스트 | — |
| AI 엔진 | `AI_API_KEY`·`AI_BASE_URL`·`AI_MODEL`·타임아웃·Temperature·최대 토큰·JSON 모드·일시 중지<br>빠른 설정(OpenAI·Anthropic·모두의 AI 실험실·Ollama), **연결 테스트** | 저장 즉시(다음 요청부터) |
| 공식 데이터 키 | `DATA_GO_KR_SERVICE_KEY`·`COMTRADE_API_KEY`, **키 테스트** | 다음 `npm run data:sync`부터 |
| 전문가 서비스 | 들어온 요청 목록·상태 변경, `CONSULT_WEBHOOK_URL`(새 요청 알림)·`CONSULT_CONTACT_EMAIL`(대체 연락처) | 저장 즉시 |
| 컨테이너 추적 | `TRACK_SHIPSGO_TOKEN`·`TRACK_SHIPSGO_DAILY_NEW`·`UNIPASS_CARGO_KEY`·`TRACK_HLAG_CLIENT_ID/SECRET`·`TRACK_CMACGM_KEY`, 소스별 **연결 테스트** | 저장 즉시 |
| 신뢰도 센터 링크 | `DATA_FEEDBACK_URL`(데이터 오류 제보)·`OVERRIDES_EDIT_URL`(검증값 편집) | 저장 즉시(재빌드 불필요) |
| 호출 한도·보안 | `AI_MAX_CALLS_PER_IP_PER_HOUR`·`AI_DAILY_BUDGET`·`TRUST_PROXY` | 저장 즉시 |
| 배포·환경 | 감지된 실행 환경, 저장 파일 위치, 항목별 출처, 환경변수 예시 | — |

**우선순위와 저장 방식**

- 값은 **환경변수 → 관리자 저장값 → 기본값** 순으로 적용됩니다.
- 환경변수로 설정된 항목은 관리자 화면에서 "환경변수 (잠김)"으로 표시되며 바꿀 수 없습니다.
- 관리자 저장값은 `.data/settings.json`(Docker는 `/app/.data` 볼륨)에 파일 권한 0600으로 저장됩니다. 키는 `ADMIN_SECRET`(없으면 `ADMIN_PASSWORD`)에서 파생한 키로 **AES-256-GCM 암호화**됩니다.
- 브라우저에는 마스킹된 값(`••••abcd`)만 전달되고, 키 원문은 어떤 응답에도 포함되지 않습니다.
- 설정 파일이 손상되었거나 읽을 수 없으면 덮어쓰지 않고 저장을 막습니다(기존 값과 암호화 salt 보호). 화면에 원인이 표시됩니다.
- Vercel·Netlify 서버리스는 파일이 유지되지 않으므로 화면이 **읽기 전용**으로 열립니다. 이 경우 같은 이름의 환경변수를 플랫폼 설정에 넣으세요.

**보안**

- 세션은 HttpOnly·SameSite=Strict 쿠키(HTTPS에서는 Secure)로 8시간 유지되며, 비밀번호나 `ADMIN_SECRET`을 바꾸면 모든 세션이 만료됩니다.
- 로그아웃은 이 브라우저의 쿠키를 지웁니다. 세션 토큰은 서버에 저장하지 않으므로, 모든 세션을 즉시 끊으려면 `ADMIN_PASSWORD`나 `ADMIN_SECRET`을 바꾸고 재시작하세요.
- 로그인 실패는 전체 15분 100회로 제한하고, 클라이언트를 식별할 수 있으면(`TRUST_PROXY` 설정 또는 Vercel) 클라이언트별 15분 8회로도 제한합니다. 식별할 수 없을 때 클라이언트별 제한을 걸면 한 사람의 오입력으로 모든 관리자가 잠기기 때문입니다. 차단된 요청은 본문을 읽기 전에 거절하고, 로그인 요청 본문 크기도 제한합니다.
- 저장·테스트 요청은 같은 출처(Origin)에서 온 것만 받습니다.
- `/admin`과 `/api/admin/*`에는 `no-store`·`noindex`·`X-Frame-Options: DENY` 헤더를 붙입니다.

---

## 3. 데이터 (`src/data/kr-ph-trade-db.ts`)

7개 대표 품목, 38개 기업, 양국 요건 60여 건을 내장한 RAG 시드 DB입니다.

| 방향 | 품목 | 1순위 HS (10단위) |
|------|------|------------------|
| 🇵🇭→🇰🇷 수입 | 🍌 바나나칩 (세부·민다나오) | 2008.99.9000 (대안 0803.90.0000, 2006.00.9000) |
| 🇵🇭→🇰🇷 수입 | 🥭 건조 망고 (세부) | 2008.99.9000 (대안 0804.50.2000) |
| 🇵🇭→🇰🇷 수입 | 🥥 코코넛 오일 (VCO·정제유) | 1513.19.0000 (대안 1513.11.0000) |
| 🇰🇷→🇵🇭 수출 | 🍙 조미김·김스낵 | 2008.99.5010 (대안 1212.21.1000) |
| 🇰🇷→🇵🇭 수출 | 💄 K-뷰티 기초화장품 | 3304.99.1000 (대안 3401.30.0000) |
| 🇰🇷→🇵🇭 수출 | 🍜 즉석 라면 | 1902.30.1010 |
| 🇰🇷→🇵🇭 수출 | 🏗️ 스마트 건자재 (도어락·바닥재) | 8301.40.1000 (대안 3918.10.1000) |

각 품목: HS 후보 3개(적합도·근거) · MFN/AKFTA/RCEP/한-필 FTA 세율과 원산지기준·증명서 · 최적 FTA 추천 근거 · 양국 수입요건(식약처 해외제조업소 등록, 한글표시, 식물방역법 가공품 기준, FDA PH LTO/CPR/CPN, 영문 영양성분표, 할랄 IDCP/HDIP, NTC 형식승인 등) · 3개년 통계·시장규모·경쟁국 · 물류 레인 · 바이어/공급사 4~6곳 · 단가/MOQ/인코텀즈.

### 출처·기준일 정책 (화면의 모든 수치 옆에 `[출처: … | 기준일]` + 검증 등급 표기)

| 구분 | 검증 등급 | 내용 |
|------|-----------|------|
| 무역통계 (3개년 추이·시장규모·경쟁국·양국 총교역) | **공식 API** | UN Comtrade API 스냅샷 (`npm run data:sync`, 주 1회 자동) |
| 기본세율 (MFN) | **공식 API / 교차검증** | World Bank WITS TRAINS로 HS6 검증 — 단일세율이면 자동 보정, 범위면 범위 내 여부 판정 |
| FTA 협정세율·원산지기준·HS 확정·규정 요약·운임·단가 | **시드 → 전문가 검증** | `src/data/verified-overrides.json`에 공식 문서 기반 검증값 입력 시 승격 |
| 기업 DB | **교차검증 → 전문가 검증** | 공개 웹페이지 응답 자동 점검 + 인허가(LTO 등) 확인 시 승격. 적합도 점수는 시뮬레이션 결과 |

---

## 3-1. 데이터 신뢰도 100% 로드맵 (신뢰도 센터)

헤더의 **`데이터 신뢰도`** 버튼을 누르면 품목별 신뢰도 점수, 데이터 원천 동기화 상태, 공식 데이터와의 불일치·보정 이력, 남은 간극과 해결 방법을 볼 수 있습니다.

**"100% 정보"의 정의**
1. 모든 값이 공식 출처로 추적 가능하다.
2. 기준일이 명시되어 있고 유효기간 안에 있다.
3. HS 분류·세율처럼 법적 효력이 필요한 항목은 사전심사 또는 관세사 검수로 확정되어 있다.

**점수** = 카테고리 10개(통계·시장·MFN·FTA·원산지·HS·요건·기업·운임·단가)별 평균 × 100. 카테고리 안에서는 공식 API·전문가 검증 = 1.0, 교차검증 = 0.5, 시드 = 0으로 계산합니다.

| 원천 | 상태 | 방법 |
|------|------|------|
| UN Comtrade | ✅ 자동 (키 불필요) | `npm run data:sync` · 주 1회 GitHub Actions가 변경 시 PR 생성 |
| World Bank WITS TRAINS (MFN) | ✅ 자동 (키 불필요) | MFN HS6 교차검증·자동 보정. 시드 오류 4건 보정(코코넛오일 8→3%, 조미김 15→10%, K-뷰티 10→7%, 도어락 10→1%) |
| World Bank WITS TRAINS (PREF) | ✅ 자동 (키 불필요) | 필리핀이 한국산에 실제 적용한 특혜세율(2021, 당시 유일 협정 AKFTA)로 AKFTA 검증 — 조미김·라면 5→0% 보정, 수출 4품목 AKFTA "공식 API" 등급 |
| 공식 통관 단가 | ✅ 자동 (키 불필요) | Comtrade 금액/순중량(USD/kg)으로 시드 단가 교차검증 (0.5~2배 범위면 교차검증 등급) |
| HS6 코드 유효성 | ✅ 자동 | 공식 HS6 세번 존재 확인 → 교차검증(분류 판단 확정은 사전심사) |
| 링크 점검 | ✅ 자동 | 61개 URL을 ok / protected(봇 차단) / unreachable / broken으로 분류 |
| 관세청 월별 수출입실적 | 🔑 키만 넣으면 자동 | data.go.kr 「관세청_품목별 국가별 수출입실적(GW)」 → `DATA_GO_KR_SERVICE_KEY` |
| 관세청 과세환율 | 🔑 키만 넣으면 자동 | data.go.kr 「관세청_관세환율정보(GW)」 → 원화 관세 표시 |
| 10단위 FTA 협정세율 | ✍️ 검증 입력 | UNI-PASS 「관세율(협정·탄력)」/ 관세청 FTA 포털 / 필리핀 Tariff Finder 조회 → overrides |
| HS 법적 확정 | ✍️ 검증 입력 | 관세청 품목분류 사전심사(관세법 제86조), 필리핀 BOC Advance Ruling → overrides(hs) |
| 기업 인허가 | ✍️ 검증 입력 | FDA PH verification 포털·SEC·DTI BNRS / 국세청 사업자 상태조회·DART → overrides(partner) |
| 운임·단가 | ✍️ 검증 입력 | 포워더 견적서(유효기간 포함) → overrides(logistics, validUntil 지나면 자동으로 시드 복귀) |

```bash
npm run data:sync        # 전체 동기화 (Comtrade · WITS · 링크 · 키가 있으면 관세청)
npm run data:links       # 링크만 다시 점검
npm run data:validate    # verified-overrides.json 검증: 필수 필드·날짜(YYYY-MM-DD)·target 유형별 필드·수치 범위·ID 존재·placeholder 차단 (CI에서 실행)
```

**검증값 입력 예시** (`src/data/verified-overrides.json`의 `examples` 참고):

```json
{
  "productId": "banana-chips",
  "target": { "type": "tariff", "scheme": "KRPH", "rate": 0, "roo": "CC or RVC 40%" },
  "source": "UNI-PASS 세율정보 (관세율 협정·탄력)",
  "reference": "HSK 2008.99.9000 · 한-필리핀 FTA · 2026년 적용세율 조회 화면",
  "verifiedBy": "관세사 OOO",
  "verifiedAt": "2026-11-10",
  "validUntil": "2026-12-31"
}
```

`target.type`은 `tariff`, `hs`, `partner`, `requirement`, `logistics`, `pricing` 중 하나입니다. 공식 데이터가 시드와 다를 때의 보정 이력은 `src/data/official/changelog.json`에 남깁니다.

자동화하지 않은 것과 그 이유:
- **필리핀 Tariff Finder·FDA 인증 포털:** 공개 API가 없습니다. 내부 엔드포인트 스크래핑은 하지 않고, 공식 화면 조회 → 검증 입력 경로로 처리합니다.
- **UNI-PASS 관세율 Open API:** 회원가입·신청 후 받는 명세로만 확인할 수 있어, 명세 확인 전까지 커넥터를 추측해 구현하지 않았습니다.

---

## 4. API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/analyze` | `{ "query": string, "direction": "PH_TO_KR" \| "KR_TO_PH", "lang": "ko" \| "en" }` → `{ ok, report }` |
| `GET` | `/api/analyze?q=...&dir=KR_TO_PH&lang=en` | 위와 동일 (테스트·공유용) |
| `POST` | `/api/draft` | `{ productId, partnerId, lang, options?, polish? }` → 국/영 이메일 + Proforma Invoice (`polish: true`면 LLM 문장 다듬기) |
| `GET` | `/api/health` | 상태·AI 엔진 연결 여부(키 미노출)·데이터 기준일·신뢰도 센터 링크 — Docker HEALTHCHECK에 사용 |
| `GET` `POST` `DELETE` | `/api/admin/session` | 관리자 로그인 상태 / 로그인(`{ password }`) / 로그아웃 |
| `GET` `PUT` | `/api/admin/settings` | 설정 조회(비밀값은 마스킹) / 저장(`{ values: { KEY: "값" \| null } }`) — 로그인 필요 |
| `POST` | `/api/admin/test` | `{ target: "ai" \| "dataGoKr" \| "comtrade" \| "shipsgo" \| "unipass" \| "hapag" \| "cmacgm" }` 저장된 키로 연결 테스트(추적 키는 크레딧을 쓰지 않는 조회) — 로그인 필요 |
| `GET` `POST` | `/api/consult` | 접수 가능 여부·대체 연락처 / 전문가 요청 접수(`{ name, email, serviceIds[], topic, message?, consent: true, … }`) → `{ ok, id }` (`id`는 고객이 문의 때 쓰는 접수번호, 예: `TS-7F3K9QW2` — 형식에 의존하지 마세요) |
| `GET` `PATCH` | `/api/admin/consult` | 요청 목록 / 상태 변경(`{ id, status }`) — 로그인 필요 |
| `POST` | `/api/metrics` | `{ events: [{ e: "visit" \| "report" \| "step_first" \| "expert_open" \| "track_recheck2", … }] (최대 10개), ch? }` → 204 — 익명 집계 카운터(알 수 없는 이벤트는 버림) |
| `GET` | `/api/admin/metrics?days=7\|28\|90\|400` | 기간 합계와 H3·H7·H8 판정, 채널별 깔때기 — 로그인 필요 |
| `POST` | `/api/track` | `{ reference, kind: "container" \| "bl" \| "booking", carrier?, productId?, mode: "shipping" \| "customs" }` → `{ ok, result, tried }` (`not-found` 404 · `not-covered` 422 · `failed` 502) |

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"query":"필리핀 세부 바나나칩 한국 수입 관세와 절차, 5만 달러","direction":"PH_TO_KR","lang":"ko"}'
```

---

## 5. 배포 · 호스팅 이전 가이드

`next.config.mjs`에 `output: 'standalone'`이 설정되어 있어 빌드 결과물(`.next/standalone`)만으로 어떤 서버에서도 실행됩니다.

### A. Vercel (가장 빠름, 약 1분)
1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**에서 이 저장소 선택
2. **Root Directory → `tradescope-ai`** 로 지정 (Framework는 Next.js 자동 감지, 빌드 설정은 기본값 그대로)
3. **Deploy** → `https://<project>.vercel.app` 발급. 이후 PR마다 Preview URL이 자동 생성됨
4. (선택) Settings → Environment Variables에 `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` 추가 → Redeploy
5. Settings → Domains에서 도메인 추가 → 안내되는 DNS 레코드(A `76.76.21.21` 또는 CNAME `cname.vercel-dns.com`)를 도메인 업체에 등록

`tradescope-ai/vercel.json`이 서버 함수를 서울 리전(`icn1`)으로 고정합니다. 공식 데이터는 빌드에 포함된 스냅샷(`src/data/official/snapshot.json`)을 쓰므로, Vercel에는 데이터용 키가 필요 없습니다. 갱신은 주간 GitHub Actions PR → 머지 → 자동 재배포 순서로 이루어집니다.

CLI로 배포하려면: `npx vercel@latest --cwd tradescope-ai --prod` (Vercel 로그인 또는 `VERCEL_TOKEN` 필요)

### B. Netlify
1. New site from Git → Base directory `tradescope-ai`, Build command `npm run build` (Next.js 런타임 자동 감지)
2. 환경변수·도메인은 Site settings에서 동일하게 설정
3. LLM 키를 쓰면 `TRUST_PROXY=1`도 추가 — Netlify 엣지가 `X-Forwarded-For`에 접속 주소를 붙이므로 호출 제한이 방문자별로 동작합니다(Vercel은 자동 인식).

> **LLM 호출 제한 범위:** 신뢰할 프록시가 없는 구성(`TRUST_PROXY` 미설정·0)에서는 전달 헤더를 위조할 수 있으므로 쓰지 않고, **모든 방문자가 하나의 시간당 한도(`AI_MAX_CALLS_PER_IP_PER_HOUR`, 기본 30회)를 공유**합니다. 한도를 넘으면 해당 시간 동안 시뮬레이션 엔진으로 응답합니다. 방문자별 한도가 필요하면 Caddy/Nginx 같은 리버스 프록시 뒤에서 `TRUST_PROXY=1`로 운영하세요.

### C. Docker (클라우드 VM, vCPU 2 / RAM 4GB 기준) — 권장
```bash
git clone <repo> && cd <repo>/tradescope-ai
cp .env.example .env.local          # (선택) AI 키 입력
# 프록시 없이 직접 공개 → 전달 헤더 불신 (LLM 호출 한도는 전체 방문자 공유). 여러 번 실행해도 한 줄만 남습니다.
grep -q '^TRUST_PROXY=' .env.local && sed -i 's/^TRUST_PROXY=.*/TRUST_PROXY=0/' .env.local || echo "TRUST_PROXY=0" >> .env.local
APP_BIND=0.0.0.0 docker compose up -d --build     # http://SERVER_IP:3000 (프록시 없이 HTTP로 공개)
docker compose logs -f tradescope   # 로그
```
**도메인 + 자동 HTTPS (Caddy)**
1. 도메인 DNS에 `A 레코드 → 서버 공인 IP` 등록 (예: `trade.example.com`)
2. 방화벽/보안그룹에서 80, 443 포트 개방
3. 실행:
```bash
sed -i '/^TRUST_PROXY=0$/d' .env.local 2>/dev/null   # 앱 단독 공개 때 넣은 TRUST_PROXY=0이 있다면 제거 (프록시 기본값 1 사용)
DOMAIN=trade.example.com docker compose --profile https up -d --build
```
Caddy가 Let's Encrypt 인증서를 자동 발급·갱신합니다 (`deploy/Caddyfile`). 앱 포트 3000은 기본값 `APP_BIND=127.0.0.1`로 서버 내부에만 열리므로 HTTPS를 우회할 수 없습니다 — `--profile https`와 `APP_BIND=0.0.0.0`을 함께 쓰지 마세요. 프록시 뒤에서는 `TRUST_PROXY=1`(compose 기본값, `deploy/compose.env`)로 LLM 호출 제한이 클라이언트별로 동작하며, `.env.local`에 적은 값이 이 기본값보다 우선합니다.
신뢰도 센터 링크는 `/admin` → 링크 메뉴나 런타임 환경변수(`DATA_FEEDBACK_URL`, `OVERRIDES_EDIT_URL`)로 재빌드 없이 바꿀 수 있습니다. 빌드 때 넣는 `NEXT_PUBLIC_*` 값은 그 기본값으로 남으며(`.env*`는 Docker 빌드 컨텍스트에서 제외되므로 `NEXT_PUBLIC_DATA_FEEDBACK_URL=... docker compose build`처럼 셸 환경변수로 넘김), 이 경우 `/admin`에서 값을 지우면 빌드 기본값으로 돌아갑니다. 이미 Nginx를 쓰는 서버라면 `deploy/nginx.conf.example` + `certbot --nginx`를 사용하세요.

Docker 없이 이미지만 옮길 때:
```bash
docker save tradescope-ai:latest | gzip > tradescope-ai.tar.gz     # 기존 서버
docker load < tradescope-ai.tar.gz && docker run -d -p 3000:3000 --env-file .env.local -v tradescope_data:/app/.data --restart unless-stopped tradescope-ai:latest   # 새 서버
```
`-v tradescope_data:/app/.data`(이름 있는 볼륨)를 빼면 `/admin`에서 저장한 값이 컨테이너를 교체할 때 사라집니다 — 이미지가 선언한 익명 볼륨은 새 컨테이너에 다시 연결되지 않습니다.

### D. 자체 Linux 서버 (Docker 없이, Node 22)
```bash
npm ci && npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
sudo mkdir -p /opt/tradescope-ai && sudo cp -r .next/standalone/. /opt/tradescope-ai/
[ -f .env.local ] && sudo install -m 600 -o root -g root .env.local /opt/tradescope-ai/.env.local   # (선택) AI 키 — 소유자만 읽기
sudo cp deploy/tradescope.service.example /etc/systemd/system/tradescope.service
sudo systemctl daemon-reload && sudo systemctl enable --now tradescope   # 127.0.0.1:3000
```
`/admin` 저장 폴더 `/opt/tradescope-ai/.data`는 서비스가 시작할 때 `ExecStartPre`로 만들어집니다(실행 사용자 `www-data`, 권한 700). 다른 사용자로 실행하면 유닛 파일의 `User=`와 `ExecStartPre`의 `-o/-g`를 함께 바꾸세요. 이후 Nginx/Caddy로 도메인을 연결합니다.

### E. Windows 서버
```powershell
npm ci; npm run build
Copy-Item -Recurse public .next\standalone\ ; Copy-Item -Recurse .next\static .next\standalone\.next\
cd .next\standalone; $env:PORT=3000; node server.js
```
상시 구동은 NSSM(`nssm install TradeScope "C:\Program Files\nodejs\node.exe" server.js`) 또는 pm2를 사용하고, IIS ARR/URL Rewrite로 도메인을 리버스 프록시합니다.

### 1분 이전 체크리스트
- [ ] 새 서버에 Docker(또는 Node 22) 설치
- [ ] 코드 clone 또는 이미지 `docker load`
- [ ] `.env.local` 복사 (AI 키는 선택)
- [ ] `docker compose up -d --build` → `curl http://localhost:3000/api/health` 가 `{"status":"ok"}` 인지 확인
- [ ] DNS A 레코드를 새 서버 IP로 변경 (TTL을 미리 300초로 낮춰두면 전환이 빠름)

---

## 6. 디렉터리 구조

```
tradescope-ai/
├─ Dockerfile · docker-compose.yml · .env.example · next.config.mjs (output: 'standalone')
├─ deploy/                    Caddyfile · nginx.conf.example · tradescope.service.example
├─ scripts/sync-official-data.mjs  공식 데이터 동기화 (Comtrade · WITS · 관세청 · 링크 점검 · overrides 검증)
├─ public/
└─ src/
   ├─ app/
   │  ├─ page.tsx             Zero-Login 워크스페이스 (/)
   │  ├─ layout.tsx · globals.css (디자인 토큰 · 다크/라이트 · 인쇄 스타일)
   │  ├─ fonts/pretendard/    Pretendard 가변 폰트 dynamic subset (SIL OFL 1.1, 자체 호스팅)
   │  ├─ admin/page.tsx       관리자 설정 페이지 (/admin)
   │  └─ api/ analyze · draft · health · consult · track · admin/(session · settings · test · consult)
   ├─ components/             Header · HeroSearch · Overview · AssistantPanel · charts · ui(Button·Card·Segmented·Chip 등)
   │  ├─ modules/             Briefing · Tariff(+Checklist) · Market · Partners
   │  ├─ journey/TradeJourney.tsx  7단계 거래 진행 가이드 (단계별 할 일 · 진행 저장)
   │  ├─ expert/              전문가에게 맡기기 요청 양식
   │  └─ tracking/            컨테이너·통관 추적 패널
   ├─ data/kr-ph-trade-db.ts  한-필 RAG 시드 데이터베이스 (공식 레이어 병합 후 export)
   ├─ data/official/          snapshot.json(공식 API 스냅샷) · index.ts(병합·검증 등급) · roadmap.ts · changelog.json
   ├─ data/verified-overrides.json  전문가 검증값 입력 파일
   ├─ data/experts.ts         현지 전문가 서비스 카탈로그 (대행 범위 · 준비 서류 · 처리 기간 · 근거)
   └─ lib/
      ├─ ai-adapter.ts        OpenAI 호환 어댑터 (타임아웃·에러 → 폴백)
      ├─ engine/search.ts     로컬 검색·의도 파싱 (서버/브라우저 공용)
      ├─ engine/simulate.ts   관세 계산·브리핑·이메일·PI 시뮬레이션 엔진
      ├─ engine/llm.ts        RAG 프롬프트 (숫자는 컨텍스트만 사용하도록 제약)
      ├─ settings/            설정 스키마·암호화 저장소 (환경변수 → 관리자 저장값 → 기본값)
      ├─ admin/               관리자 인증(세션 쿠키·로그인 제한·Origin 검사)
      ├─ consult/store.ts     전문가 요청 저장소 (JSONL, 0600)
      ├─ tracking/            추적 소스 (DCSA · ShipsGo · UNI-PASS) → 하나의 타임라인으로 정규화
      ├─ http.ts · rate-limit.ts  크기 제한 본문 읽기 · 시간 창 호출 제한
      ├─ i18n.ts · format.ts · types.ts
```

### 디자인 시스템
- **토큰 (`globals.css` `@theme`)**
  - 브랜드 색 `brand-50…950`: 딥 블루-틸 "Harbor" 계열
  - 잉크 색 `ink-900`: 주 버튼·텍스트용
  - 그림자: `shadow-hairline` · `soft` · `elevated` · `float` · `brand` · `ink`
- **버튼 (`components/ui.tsx`)**
  - 액션 버튼(실행·열기·복사 등)은 `Button` 또는 `buttonClass()`(링크용)를 씁니다. 상태를 켜고 끄는 토글(`Segmented`, `Chip`, HS 탭, 방향 토글 등)은 `aria-pressed`를 쓰는 별도 토글 스타일이며, 새 버튼도 이 구분을 따릅니다.
  - variant 6종: `primary`(잉크) · `brand` · `ai` · `secondary` · `ghost` · `subtle`
  - size 4종: `xs` · `sm` · `md` · `lg`. `icon`은 정사각 버튼, `loading`은 스피너를 표시합니다.
  - 기본 스타일에 `display: inline-flex`가 들어 있으므로, 반응형으로 숨길 때는 래퍼 요소에 `hidden md:inline-flex`를 지정합니다.
- **선택 UI**
  - `Segmented`와 `Chip`은 `aria-pressed`로 상태를 알립니다.
  - `Chip`은 선택 시 체크 표시를 함께 보여 줘 색에만 의존하지 않습니다.
  - 키보드 포커스는 `:focus-visible` 외곽선으로 통일했습니다.
- **폰트**
  - Pretendard는 외부 CDN 없이 번들됩니다(dynamic subset이라 필요한 글리프 구간만 내려받음).
  - 라이선스는 `src/app/fonts/pretendard/OFL.txt`에 있습니다.

---

## 7. 검증

```bash
npm run typecheck      # tsc --noEmit — 0 errors
npm run build          # Next.js production build — 0 errors
npm run data:validate  # verified-overrides.json 형식 검증
npm test               # tests/*.test.ts — 품목 검색·수치 근거 검사·전문가 카탈로그·요청 저장소·추적 어댑터·가설 측정
```

`npm test`는 네트워크 없이 돕니다. 추적 어댑터는 공개 명세에 맞춘 고정 응답과 가짜 `fetch`로, 요청 저장소는 테스트마다 새로 만든 임시 데이터 폴더로 확인합니다.

GitHub Actions(저장소 루트): [`../.github/workflows/tradescope-ci.yml`](../.github/workflows/tradescope-ci.yml)은 PR마다 검증·타입체크·테스트·빌드를 실행하고, [`../.github/workflows/tradescope-data-sync.yml`](../.github/workflows/tradescope-data-sync.yml)은 매주 월요일 공식 데이터를 동기화해 데이터가 바뀌면 PR을 생성합니다. 원천 동기화가 실패하면 PR을 만들지 않으며, 실패한 원천은 이전 값을 유지합니다.

Docker Compose는 v2.24 이상이 필요합니다(선택형 `env_file`).

검증 범위 — 저장소의 `npm test`: 품목 검색 46개 질의(지원·미지원·다른 형태·HS 코드), 7개 품목 시뮬레이션 브리핑의 수치 근거 자기검사와 지어낸 수치 검출, 전문가 카탈로그(품목별 서비스·질의 힌트·약어 단어 단위 일치), 요청 저장소(끊긴 줄 뒤 기록·상태 변경 시 손상 줄 보존·접수번호), 추적 어댑터(DCSA·ShipsGo·UNI-PASS 매핑, 선사 판별, ShipsGo 무료 검색·하루 상한·타임아웃 시 슬롯 유지·402, UNI-PASS M/B/L→H/B/L·다건, 206 부분 응답, 키 없을 때만 예시), 가설 측정(이벤트 검증·채널 이름 규칙, 윌슨 구간·경계값 판정·두 번째 조건, 400일 보관·하루 키 상한·손상 파일 보존, 1시간 간격 재조회 규칙, 수집·요청 라우트 집계). 개발 중 브라우저 검사(Playwright, 저장소 미포함): 7단계 가이드(단계 전환·진행 저장·이어 보기·인쇄), 전문가 요청(접수·관리자 상태 변경), 추적 화면, 시뮬레이션 모드와 OpenAI 호환 목(mock) 서버 기반 LLM 모드, 401/403/타임아웃 시 폴백, 4개 원클릭 데모, 모바일(390px)·태블릿(640~1023px) 가로 스크롤 없음, 콘솔 에러 0건, `docker build` 및 컨테이너 헬스체크.

## 8. 한계와 다음 단계

- 추적 어댑터(ShipsGo·UNI-PASS·Hapag-Lloyd·CMA CGM)는 명세 기반 고정 응답으로만 검증했습니다 → 실제 키로 연결 테스트 후 운영. 다른 선사(HMM·ONE·Evergreen·Maersk 등)는 ShipsGo로 조회되며, 선사별 공식 API는 순차 추가
- 전문가 서비스의 처리 기간은 기관 민원 안내 기준이며 보완 요청 기간은 포함하지 않습니다. BAI 공장 인정(DA AO 3 s.2003)의 현재 적용 여부와 수산물 원료 펫푸드의 BFAR 관여 여부는 확인 중입니다

- FTA 협정세율·원산지기준은 아직 시드 참고값입니다 → 3-1의 검증 입력 경로로 전문가 검증, UNI-PASS Open API 명세 확보 시 커넥터 추가
- WITS MFN은 HS6·통보 연도(현재 2023) 기준입니다 → 10단위·당해연도 세율은 UNI-PASS 조회로 확정
- 기업 DB는 공개 정보 기반 소규모 표본입니다 → KOTRA buyKOREA·TriBIG, 선적(B/L) 데이터 연동
- 한국 HSK 10단위는 후보 제시용입니다 → 최종 분류는 관세사 검토 또는 UNI-PASS 품목분류 사전심사로 확정
