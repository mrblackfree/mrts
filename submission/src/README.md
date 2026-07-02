# MyRealTrip Souvenir Assistant Demo

마이리얼트립 기념품 도우미의 공개 데모용 Next.js 앱입니다. 사용자는 국가, 여행 상황, 여행 유형, 기념품 카테고리, 선물 대상, 추천 기준을 선택하고 제품 비교표와 카드형 UI로 결과를 확인할 수 있습니다.

## Demo

## Booking Context Auto Recommendation Demo

`/auto-recommend` 페이지는 실제 API 연동 없이 mock booking data를 사용해 예약 기반 자동 추천 흐름을 시연합니다.

- 가상 사용자 김민준의 항공, 숙소, 투어 예약에서 국가와 도시를 추정합니다.
- 사용자가 국가를 직접 입력하지 않아도 필리핀 보홀 / 팡라오 여행 맥락을 기준으로 기념품을 추천합니다.
- 귀국 전날, 가족 여행, 회사 동료 선물 준비라는 상황을 반영해 가볍고 나눠주기 쉬운 상품을 우선 정렬합니다.
- 추천 결과는 Guide, Passport, Compare 페이지로 이어지는 딥링크 액션을 제공합니다.
- 예시 URL: `/auto-recommend?user=demo&trip=philippines-bohol`
- 차후 마이리얼트립 투어티켓, 숙소, 항공 예약 데이터 API와 연결하면 실제 예약 기반 추천으로 확장할 수 있습니다.
- 현재는 MVP 데모이며 실제 예약 정보나 실제 구매, 결제, 배송 기능은 사용하지 않습니다.

Demo: https://mrt-souvenir.vercel.app

Data: sample / mock / estimated / needsVerification

## Plugin and Web App Integration

이 프로젝트는 Codex 플러그인과 Vercel 웹앱이 함께 작동하는 구조입니다.

- 플러그인은 사용자의 여행 예약 맥락을 분석하고 추천 결과를 생성합니다.
- 웹앱은 플러그인이 생성한 추천 결과를 확인, 비교, 저장, PDF 다운로드하는 화면을 제공합니다.
- 실제 마이리얼트립 API는 MVP 단계에서 연동하지 않았습니다.
- 대신 mock booking data와 query parameter 기반 딥링크를 사용해 플러그인과 웹앱의 연결 흐름을 구현했습니다.
- 배포된 웹앱 URL은 `https://mrt-souvenir.vercel.app/` 입니다.

예시 플로우:

1. 사용자가 플러그인에 “이번 여행 기준으로 기념품 추천해줘”라고 요청
2. 플러그인이 mock 예약 데이터를 기준으로 필리핀 보홀 여행을 추정
3. 플러그인이 TOP 5 기념품과 다음 액션 링크를 제공
4. 사용자가 “자동 추천 결과 웹앱에서 보기”를 클릭
5. 웹앱 `/auto-recommend` 페이지가 query parameter를 읽고 추천 결과를 자동 표시

플러그인이 제공하는 주요 딥링크:

- 자동 추천 결과 보기: `https://mrt-souvenir.vercel.app/auto-recommend?source=plugin&user=demo&trip=philippines-bohol&country=philippines&city=bohol&stage=return-eve&recipient=coworkers`
- 여행가이드 PDF 보기: `https://mrt-souvenir.vercel.app/guide?source=plugin&country=philippines&city=bohol&stage=return-eve`
- 기념품 패스포트에 저장: `https://mrt-souvenir.vercel.app/passport/philippines?source=plugin&saved=owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips`
- 전체 비교 보기: `https://mrt-souvenir.vercel.app/compare?source=plugin&country=philippines&city=bohol&recipient=coworkers`

## 플러그인 역할 강화

이번 업데이트는 UI를 새로 만드는 것이 아니라 플러그인이 사용자의 여행 맥락을 해석하고 추천 판단을 내린 뒤 Guide / Passport / Compare 화면으로 이어주는 역할을 강화합니다.

- 국가, 여행 상황, 여행 유형, 선물 대상, 추천 기준을 선택형으로 받음
- 회사 동료, 부모님, 아이, 거래처 등 대상별 추천 기준을 설명
- 귀국 전날, 출장/비즈니스 등 여행 상황 기준을 반영
- 추천 TOP 5에 추천 이유, 조건과 맞는 이유, 예상 가격대, 주의사항, Match Score를 표시
- 액션 버튼은 query parameter가 포함된 딥링크로 상세 화면을 엶

추천 결과에는 다음 문장을 포함합니다.

`이번 추천은 [여행 상황], [여행 유형], [선물 대상], [추천 기준]을 기준으로 산정되었습니다.`

## 딥링크 구조

웹앱은 선택값을 URL query로 받을 수 있습니다.

- `/`: `/?country=philippines&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/guide`: `/guide?country=philippines&category=banana-chips&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/compare`: `/compare?country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/passport/[country]`: `/passport/philippines?saved=banana-chips,dried-mango,kopiko,ube,coconut&country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`

실제 구매, 결제, 배송, 재고, 회원 DB 연동은 구현하지 않습니다.

## UI 업데이트

- 모든 페이지의 로고를 공식 Myrealtrip SVG 로고 URL로 통일
- 추천, 기념품 구매, 여행가이드, 패스포트, 비교 페이지가 동일한 좌측 선택 메뉴를 유지
- 상단 메뉴에 `기념품 구매`를 추가하고 `/shop` 샘플 커머스 화면으로 연결
- 본문 최대 폭을 넓혀 데스크톱 심사 환경에서 표와 카드가 더 시원하게 보이도록 조정
- 좌측 메뉴를 카테고리, 여행 상황, 여행 유형, 선물 대상, 추천 기준 중심의 큰 선택형 카드 UI로 개선
- 추천 페이지 상단 히어로를 필리핀 해변 배경과 카테고리 카드 스트립이 보이는 구조로 개선
- 카테고리별 추천 기념품 섹션을 큰 제품 비주얼 카드형 섹션으로 개선
- `/guide`, `/passport`, `/passport/[country]`, `/compare`를 각각 독립 서비스 화면처럼 탐색 가능
- 국기 표시는 이미지 생성 없이 CSS/HTML 기반 배지로 구현

## 프로젝트 개요

이 데모는 `myrealtrip-souvenir-assistant` 플러그인의 화면형 MVP입니다.

- 국가/카테고리/여행 상황/여행 유형/선물 대상/추천 기준 선택
- 추천 제품 TOP 5 비교표
- 제품 카드형 추천 결과
- 기념품 구매 MVP 샘플 화면
- 새 탭으로 열리는 여행가이드 화면
- 새 탭으로 열리는 기념품 패스포트 화면
- 새 탭으로 열리는 전체 비교 화면
- 실제 여행가이드 PDF 미리보기 및 다운로드
- 기념품 패스포트 샘플 저장 화면
- `/api/souvenirs` 추천 API 예시
- `/api/product-thumbnails/[productId]` 썸네일 프록시 및 placeholder fallback

## 독립 페이지 구조

추천 화면은 추천과 선택에 집중하고, 상세 기능은 Vercel 웹앱의 독립 페이지에서 실행됩니다.

URL 구조:

- `/`: 추천 결과 화면
- `/shop`: 기념품 구매 MVP 샘플 화면
- `/guide`: 여행가이드 화면과 실제 PDF 미리보기/다운로드
- `/passport`: 기념품 패스포트 메인
- `/passport/[country]`: 국가별 패스포트, 예: `/passport/philippines`
- `/compare`: 전체 비교 화면

추천 결과 하단 버튼:

- `📄 여행가이드 보기`: 새 탭으로 `/guide` 열기
- `📘 내 기념품 패스포트 보기`: 현재 선택을 저장하고 새 탭으로 `/passport` 열기
- `📊 전체 비교 보기`: 새 탭으로 `/compare` 열기

현재 선택한 국가, 카테고리, 여행 상황, 여행 유형, 선물 대상, 추천 기준은 `localStorage`에 저장되어 새 탭 상세 페이지에서 같은 맥락으로 이어집니다.

## 실제 동작 기능

### 여행가이드 PDF 다운로드

추천 화면에서 `📄 여행가이드 보기` 버튼을 누르면 새 탭으로 `/guide`가 열립니다. `/guide`에서는 실제 PDF 미리보기와 `PDF 다운로드` 버튼을 제공합니다.

PDF 파일명 예시:

- `philippines-souvenir-guide.pdf`
- `japan-souvenir-guide.pdf`
- `taiwan-souvenir-guide.pdf`

PDF에는 다음 내용이 포함됩니다.

- `[국가] 기념품 여행가이드`
- 여행 상황
- 여행 유형
- 선물 대상
- 추천 기준
- 추천 기념품 TOP 5
- 각 기념품별 추천 이유
- 예상 가격대
- 구매 팁
- 주의사항
- 비교표
- 바가지 방지 가격 가이드
- 기내/캐리어 참고사항
- `마이리얼트립 기념품 도우미 MVP 데모` 문구

### PDF 깨짐 수정 방식

PDF는 화면 UI를 그대로 캡처하지 않습니다. `src/app/SouvenirGuidePdf.tsx`에서 `@react-pdf/renderer` 기반 PDF 전용 레이아웃을 만들고, `src/app/create-souvenir-guide-pdf.ts`는 다운로드 유틸을 재노출합니다. A4 문서 안에 큰 제목, 여행 맥락 카드, 추천 제품 카드, 비교표, 가격 가이드, 기내/캐리어 참고사항, 푸터가 별도 레이아웃으로 구성됩니다.

한글 깨짐을 막기 위해 프로젝트 내부 `public/fonts/NotoSansKR-Regular.ttf`를 `@react-pdf/renderer`의 `Font.register`로 등록합니다. 폰트는 Vercel에서도 접근 가능한 정적 자산(`/fonts/NotoSansKR-Regular.ttf`)으로 로드되며, DOM 캡처나 외부 폰트 네트워크에 의존하지 않아 한글 제목, 본문, 추천 목록, 비교표 텍스트가 안정적으로 렌더링됩니다.

`/guide`의 화면 미리보기는 iframe 기반 브라우저 PDF 뷰어를 제거하고, 같은 데이터를 사용하는 HTML 전용 프리뷰로 교체했습니다. 그래서 썸네일 패널과 외곽 페이지가 2중으로 겹쳐 보이지 않고, 텍스트와 표가 선명하게 보입니다.

필리핀, 일본, 대만 PDF는 선택 카테고리의 상품 후보 수와 별개로 PDF 전용 모델에서 국가별 대표 기념품 TOP 5를 구성합니다.

### 기념품 패스포트 저장

추천 화면에서 `📘 내 기념품 패스포트 보기` 버튼을 누르면 현재 선택 국가의 TOP 5가 localStorage/state 샘플로 저장되고, 새 탭으로 `/passport`가 열립니다.

- 브라우저 `localStorage`와 React state 기반 MVP 샘플입니다.
- 실제 회원 계정, DB, 서버 저장은 구현하지 않습니다.
- 필리핀, 일본, 대만 샘플 패스포트 탭을 제공합니다.
- 저장된 국가에는 기념품 5개 체크, 완성률 `5/5`, 획득 배지, 저장 날짜가 표시됩니다.
- 여권 커버와 펼침 페이지 레이아웃을 CSS로 구현했습니다.
- 각 기념품은 CSS/SVG 기반 STAMP로 표시되며 이미지 파일을 만들지 않습니다.
- 스탬프 모양은 원형, 사각형, 타원형, 팔각형, 기울어진 라벨형으로 다르게 표시됩니다.
- 필리핀은 트로피컬 블루/옐로우, 일본은 레드/네이비, 대만은 그린/오렌지 톤을 사용합니다.
- 각 스탬프에는 국가명, 기념품 이름, `SAVED` 또는 `COLLECTED`, 저장 날짜가 들어갑니다.

패스포트 예시 완성률:

- 필리핀: `5/5`
- 일본: `3/5`
- 대만: `2/5`

## MVP 범위

현재 데모는 기념품 탐색, 추천, 비교, PDF 다운로드, 기념품 패스포트 샘플 저장을 보여주는 MVP입니다.

실제 구매, 결제, 배송, 호텔 수령, 공항 수령, 실시간 재고, 업체 연결, 실제 회원 계정 연동은 포함하지 않습니다.

가격, 리뷰, 평점, 국내 구매 가능성, 공식 제휴 가능성은 MVP 검증을 위한 sample/mock/estimated 데이터이며, 실제 서비스 연결 전 MD 또는 제휴 검증이 필요합니다.

## 기술 스택

- Framework: Next.js App Router
- UI: React
- Styling: Tailwind CSS
- PDF: @react-pdf/renderer, Noto Sans KR
- Runtime: Node.js 20.9 이상
- Deployment target: Vercel

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
npm run preview
```

Vercel 배포 시 기본 빌드 명령어는 `npm run build`이고 출력 디렉터리는 `.next`입니다.

## Vercel 배포 설정

이 앱은 `demo` 디렉터리를 프로젝트 루트로 사용합니다.

```bash
npm install -g vercel
vercel login
cd demo
vercel
vercel --prod
```

현재 production alias:

```text
https://mrt-souvenir.vercel.app
```

## 환경변수

현재 필수 환경변수는 없습니다. `.env.example`은 배포자가 향후 Demo URL 또는 데이터 소스 연동 값을 기록할 수 있도록 제공됩니다.

## 주요 파일

- `src/app/page.tsx`
- `src/app/souvenir-product-demo.tsx`
- `src/app/guide/page.tsx`
- `src/app/passport/page.tsx`
- `src/app/passport/[country]/page.tsx`
- `src/app/compare/page.tsx`
- `src/app/service-ui.tsx`
- `src/app/souvenir-session.ts`
- `src/app/SouvenirGuidePdf.tsx`
- `src/app/create-souvenir-guide-pdf.ts`
- `src/app/souvenir-passport.tsx`
- `src/app/passport-stamp.tsx`
- `src/app/api/souvenirs/route.ts`
- `src/app/api/product-thumbnails/[productId]/route.ts`
- `src/product-builder/data/sample-products.json`
- `src/product-builder/data/thumbnail-sources.json`
- `src/product-builder/lib/recommendSouvenirs.ts`
- `src/product-builder/lib/matchScore.ts`
- `public/fonts/NotoSansKR-Regular.ttf`
- `vercel.json`

## 검증 결과

- `npm install` 완료
- `npm run lint` 통과
- `npm run build` 통과
- `/`, `/guide`, `/passport`, `/passport/philippines`, `/passport/japan`, `/passport/taiwan`, `/compare` route 200 확인
- 추천 화면의 `📄 여행가이드 보기`, `📘 내 기념품 패스포트 보기`, `📊 전체 비교 보기` 버튼 새 탭 이동 확인
- 필리핀, 일본, 대만 추천 결과에서 PDF 다운로드 확인: `philippines-souvenir-guide.pdf`, `japan-souvenir-guide.pdf`, `taiwan-souvenir-guide.pdf`
- PDF 확인: 각 3페이지, Noto Sans KR 기반 한글 렌더링, A4 페이지 PNG 렌더링 확인
- 한글 제목, 본문, 추천 목록, 비교표, 바가지 방지 가격 가이드, 기내/캐리어 참고사항 렌더링 확인
- 패스포트 저장 후 실제 여권 스타일 페이지, 필리핀 완성률 `5/5`, 스탬프 5개, localStorage 저장 확인
- 패스포트 탭 샘플 확인: 필리핀 `5/5`, 일본 `3/5`, 대만 `2/5`
- 모바일 폭 390px에서 Guide, Passport, Compare 페이지 반응형 표시 확인

## 제출용 문구

데모는 로컬 환경이 아닌 Vercel에 배포하여 심사자가 직접 접속해 확인할 수 있도록 구성했습니다. 현재 데이터는 MVP 검증을 위한 sample/mock/estimated 데이터이며, 실제 구매·결제 기능은 포함하지 않습니다. 추천 화면은 선택과 추천에 집중하고, Guide/Passport/Compare는 각각 독립 페이지로 열려 실제 서비스처럼 탐색할 수 있습니다.
