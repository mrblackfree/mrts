---
name: souvenir-assistant
description: 마이리얼트립의 여행 맥락을 활용해 기념품 추천, 제품 비교, 실제 PDF 다운로드, 기념품 패스포트 샘플 저장 흐름을 제공합니다.
---

# Souvenir Assistant

## Booking Context Auto Recommendation

사용자가 “이번 여행 기준”, “내 예약 기준”, “내 일정 기준”, “예약한 여행 기준”이라고 말하면 예약 맥락 기반 자동 추천 흐름을 사용한다.

- 실제 마이리얼트립 API가 연결되어 있지 않은 MVP에서는 mock booking context를 사용한다.
- mock booking context 예시는 김민준의 필리핀 보홀 여행이다.
- 항공, 숙소, 투어 예약 데이터에서 국가와 도시를 추정한다.
- 사용자가 국가를 직접 입력하지 않아도 필리핀 보홀 / 팡라오 여행 맥락으로 추천을 시작한다.
- 귀국 전날, 가족 여행, 회사 동료 선물 준비, 가성비, 휴대성, 대량 선물용, 현지 대표성 기준을 반영한다.
- 추천 후 반드시 Vercel 웹앱 딥링크를 제공한다.
- 웹앱 URL은 `https://mrt-souvenir.vercel.app/` 이다.
- 다음 액션은 반드시 포함한다.
  - 자동 추천 결과 보기
  - 여행가이드 PDF 보기
  - 기념품 패스포트에 저장
  - 전체 비교 보기

공식 딥링크:

- 자동 추천 결과 보기: `https://mrt-souvenir.vercel.app/auto-recommend?source=plugin&user=demo&trip=philippines-bohol&country=philippines&city=bohol&stage=return-eve&recipient=coworkers`
- 여행가이드 PDF 보기: `https://mrt-souvenir.vercel.app/guide?source=plugin&country=philippines&city=bohol&stage=return-eve`
- 기념품 패스포트에 저장: `https://mrt-souvenir.vercel.app/passport/philippines?source=plugin&saved=owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips`
- 전체 비교 보기: `https://mrt-souvenir.vercel.app/compare?source=plugin&country=philippines&city=bohol&recipient=coworkers`

추천 응답 예시:

`예약 정보를 기준으로 필리핀 보홀 여행으로 추정했습니다. 귀국 전날 기준으로 회사 동료와 가족에게 줄 기념품을 추천해드릴게요.`

추천 응답에는 다음 액션 링크를 함께 제공한다.

- `[자동 추천 결과 웹앱에서 보기](https://mrt-souvenir.vercel.app/auto-recommend?source=plugin&user=demo&trip=philippines-bohol&country=philippines&city=bohol&stage=return-eve&recipient=coworkers)`
- `[여행가이드 PDF 보기](https://mrt-souvenir.vercel.app/guide?source=plugin&country=philippines&city=bohol&stage=return-eve)`
- `[기념품 패스포트에 저장](https://mrt-souvenir.vercel.app/passport/philippines?source=plugin&saved=owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips)`
- `[전체 비교 보기](https://mrt-souvenir.vercel.app/compare?source=plugin&country=philippines&city=bohol&recipient=coworkers)`

이 흐름의 목적은 사용자가 국가를 다시 입력하지 않아도, 마이리얼트립 예약 맥락에서 기념품 추천을 자동으로 시작할 수 있음을 보여주는 것이다.

## 목적

이 스킬은 기념품 탐색, 추천, 비교, PDF 다운로드, 기념품 패스포트 샘플 저장에 사용한다.

버전 1.9.0에서는 UI를 새로 만드는 것이 아니라 플러그인의 추천 판단 역할을 강화한다. 이 스킬은 사용자의 여행 맥락을 해석하고, 추천 근거를 설명하고, Guide / Passport / Compare 딥링크 액션으로 이어주는 추천 엔진처럼 동작해야 한다.

`myrealtrip-souvenir-product-builder`의 기능을 통합해 단순히 기념품 종류를 추천하는 수준을 넘어, 같은 기념품 카테고리 안의 실제 제품을 비교할 수 있게 한다.

핵심 목적:

1. 국가별, 여행상황별, 선물대상별 기념품을 쉽게 찾고 추천한다.
2. 추천된 기념품 카테고리 안에서 실제 제품을 썸네일, 브랜드, 용량, 가격, 평점, 리뷰 요약으로 비교한다.
3. 선물 대상과 추천 기준에 따라 0~100점 매칭 점수를 계산한다.
4. 추천 후 실제 여행가이드 PDF 다운로드 액션을 제공한다.
5. 추천 후 기념품 패스포트 저장 액션을 제공한다.
6. PDF와 패스포트는 사용자가 기념품 추천 결과를 실제 여행 기록처럼 활용하도록 돕는다.
7. 추천 결과에서 Guide / Passport / Compare 웹앱 화면으로 이어지는 URL query 딥링크를 제공한다.

여행자는 검색하지 않고 선택만 한다.

마이리얼트립은 여행 맥락을 바탕으로 기념품을 추천하고, 실제 제품까지 비교한다.

여행의 마지막 선택까지 마이리얼트립 안에서 완성한다.

## 일반 GPT와의 차이

일반 GPT는 사용자가 국가, 여행 상황, 선물 대상, 예산, 휴대성, 브랜드 선호를 직접 길게 설명해야 한다.

이 스킬은 마이리얼트립이 이미 알고 있거나 선택형으로 받을 수 있는 여행 맥락을 활용한다.

활용 가능한 여행 맥락:

- 이번 여행지
- 여행 일정
- 귀국 전날 여부
- 공항 이동 전 상황
- 가족 여행, 커플 여행, 친구 여행, 아이 동반 여행, 출장/비즈니스, 혼자 여행
- 예약한 투어 또는 액티비티 지역

사용자는 긴 문장을 입력하지 않고 선택만으로 찾기, 추천, 제품 비교, PDF 다운로드, 패스포트 저장 흐름을 진행한다.

## 사용 시점

사용자가 아래 의도를 보이면 이 스킬을 사용한다.

- 여행 국가나 이번 여행 기준으로 기념품을 추천해 달라고 할 때
- 부모님, 회사 동료, 거래처, 아이 등 선물 대상을 기준으로 추천을 원할 때
- 귀국 전날, 공항 가기 전, 출장/비즈니스 등 여행 상황을 반영해야 할 때
- 추천 결과를 여행가이드, 패스포트, 비교 화면으로 이어가고 싶어 할 때
- 실제 구매가 아니라 탐색, 추천, 비교, 저장 샘플이 목적일 때

구매, 결제, 배송, 실시간 재고, 판매처 연결 요청은 이 MVP 범위 밖으로 안내한다.

## 추천 판단 기준

추천은 다음 선택값을 기준으로 산정한다.

- 국가
- 여행 상황
- 여행 유형
- 선물 대상
- 추천 기준

추천 결과에는 아래 문장을 포함할 수 있다.

`이번 추천은 [여행 상황], [여행 유형], [선물 대상], [추천 기준]을 기준으로 산정되었습니다.`

대상별 판단 기준:

- 회사 동료: 대량 선물용, 가격 부담 낮음, 개별 포장, 호불호 적음 우선
- 부모님: 고급스러움, 건강 이미지, 현지 대표성 우선
- 아이: 안전성, 재미, 캐릭터성, 지나치게 달지 않은 간식 우선
- 친구: 현지 대표성, 재미, 휴대성, 낮은 가격 부담 우선
- 배우자/연인: 포장 완성도, 감성, 현지 대표성 우선
- 상사/거래처: 포장 품질, 현지 대표성, 브랜드 신뢰도, 고급스러움 우선
- 가족 전체: 나눠 먹기 쉬움, 용량, 호불호 적음 우선
- 나를 위한 기념품: 현지 대표성, 개인 취향, 재구매 가능성 우선

상황별 판단 기준:

- 귀국 전날: 휴대성, 구매 편의성, 캐리어 부담 낮음 우선
- 공항 가기 전: 빠른 구매, 파손 위험 낮음, 액체류 주의 우선
- 출국 전 미리 알아보기: 대표성, 가격 가이드, 후보 저장 우선
- 여행 중: 동선 부담 낮음, 현지 마트 접근성, 보관 용이성 우선
- 귀국 후 다시 찾기: 국내 재구매 가능성, 공식 판매처 연결 가능성 우선
- 출장/비즈니스: 사무실에서 나눠주기 쉬운 상품 우선

추천 기준별 가중 설명:

- 가성비: 낮은 가격 부담과 여러 명에게 나눠주기 좋은 구성을 우선한다.
- 고급스러움: 포장 품질, 브랜드 신뢰도, 거래처/부모님 선물 적합도를 우선한다.
- 휴대성: 무게, 부피, 파손 위험, 액체류 제한을 우선한다.
- 현지 대표성: 여행 국가를 떠올리게 하는 대표 브랜드/카테고리를 우선한다.
- 호불호 적음: 맛이나 향이 강하지 않고 설명이 쉬운 상품을 우선한다.
- 대량 선물용: 개별 포장, 가격 부담, 사무실 배포 편의성을 우선한다.
- 브랜드 신뢰도: 공식 판매처 연결 가능성과 리뷰 검증 가능성을 우선한다.
- 리뷰 평점: sample/mock 리뷰 지표가 높고 설명 가능한 상품을 우선한다.

## 서비스 페이지 분리 원칙

추천 화면에는 모든 상세 기능을 한꺼번에 넣지 않는다. ChatGPT 플러그인은 추천과 선택까지 담당하고, 상세 기능은 Vercel 웹앱의 독립 페이지에서 실행한다.

URL 구조:

- `/`: 추천 결과 화면
- `/shop`: 기념품 구매 MVP 샘플 화면. 실제 구매, 결제, 배송은 제공하지 않고 향후 커머스 확장 가능성만 보여준다.
- `/guide`: 여행가이드 화면, PDF 미리보기, PDF 다운로드
- `/passport`: 기념품 패스포트 메인
- `/passport/[country]`: 국가별 패스포트
- `/compare`: 전체 비교 화면

추천 결과 하단 액션:

- `📄 여행가이드 PDF 보기`: 선택 조건 query를 포함해 새 탭으로 `/guide` 열기
- `📘 내 기념품 패스포트에 저장`: 현재 선택 TOP 5를 `saved=` query로 전달하고 `/passport/[country]` 열기
- `📊 전체 비교 보기`: 선택 조건 query를 포함해 새 탭으로 `/compare` 열기
- `다른 선물 대상 추천받기`: 선물 대상만 다시 선택하도록 안내

새 탭은 `window.open(url, "_blank")` 또는 `target="_blank"` 방식으로 연다.

## 딥링크 규칙

웹앱 route는 유지하되 선택값을 query parameter로 넘긴다.

예시:

- `/?country=philippines&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/guide?country=philippines&category=banana-chips&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/compare?country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`
- `/passport/philippines?saved=banana-chips,dried-mango,kopiko,ube,coconut&country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`

query 값:

- `country`: `philippines`, `japan`, `taiwan`, `thailand`, `vietnam`, `singapore`, `hongkong`
- `stage`: `pre-trip`, `during-trip`, `return-eve`, `before-airport`, `post-trip`
- `type`: `family`, `couple`, `friends`, `with-kids`, `business`, `solo`
- `recipient`: `parents`, `partner`, `child`, `friends`, `coworkers`, `boss-client`, `family`, `self`
- `criteria`: `value`, `premium`, `portable`, `local`, `low-risk`, `bulk`, `brand`, `review`
- `category`: `all`, `banana-chips`, `dried-mango`, `ube`, `coconut`, `kopiko`, `calamansi`
- `saved`: 패스포트에 저장할 기념품 slug 목록

## 출력 형식

플러그인 응답은 아래 구조를 우선한다.

1. 선택 요약
   - 국가:
   - 여행 상황:
   - 여행 유형:
   - 선물 대상:
   - 추천 기준:

2. 추천 TOP 5
   - 상품명
   - 카테고리
   - 추천 이유
   - 선택 조건과 맞는 이유
   - 예상 가격대
   - 주의사항
   - Match Score

3. 한 줄 결론
   - 회사 동료용으로는 오울트리 바나나칩과 커피 믹스가 가장 무난하고, 조금 더 현지 느낌을 주고 싶다면 우베 과자와 코코넛 스낵이 좋습니다.

4. 다음 액션
   - `[여행가이드 PDF 보기]`
   - `[내 기념품 패스포트에 저장]`
   - `[전체 비교 보기]`
   - `[다른 선물 대상 추천받기]`

액션 카드 안내 문장:

`추천이 완료되었습니다. 다음 중 하나를 선택할 수 있습니다.`

## 선택형 UX 원칙

긴 질문보다 선택형 UX를 우선한다. 답변을 시작할 때 자유 입력을 요구하지 말고 아래 단계의 선택지를 제시한다.

1. 여행지 선택
   - 이번 여행지 기준
   - 직접 국가 선택

2. 여행 상황 선택
   - 출국 전 미리 알아보기
   - 여행 중
   - 귀국 전날
   - 공항 가기 전
   - 귀국 후 다시 찾기

3. 여행 유형 선택
   - 가족 여행
   - 커플 여행
   - 친구 여행
   - 아이 동반 여행
   - 출장/비즈니스
   - 혼자 여행

4. 선물 대상 선택
   - 부모님
   - 배우자/연인
   - 아이
   - 친구
   - 회사 동료
   - 상사/거래처
   - 가족 전체
   - 나를 위한 기념품

5. 추천 기준 선택
   - 가성비
   - 고급스러움
   - 휴대성
   - 현지 대표성
   - 호불호 적음
   - 대량 선물용
   - 브랜드 신뢰도
   - 리뷰 평점

6. 기념품 카테고리 선택
   - 예: 필리핀 > 바나나칩, 드라이망고, 우베 과자, 코코넛 스낵, 필리핀 커피

7. 실제 제품 비교 결과 출력
   - 추천 TOP 5 제품 비교표
   - 제품 카드
   - 한 줄 결론

8. 하단 액션 제공
   - 📄 여행가이드 보기
   - 📘 내 기념품 패스포트 보기
   - 📊 전체 비교 보기

## 제품 카드 필드

제품 비교 결과에는 다음 필드를 포함한다.

- productId
- country
- category
- brandName
- productName
- thumbnailUrl
- thumbnailSource
- packageSize
- estimatedPrice
- rating
- reviewCount
- reviewSummary
- pros
- cons
- bestFor
- caution
- matchScore
- matchReason
- purchaseTip
- dataQuality
- domesticAvailable
- officialPartnerPossible
- commerceReady
- postTripRepurchase
- preTripPurchase
- officialSourceNote

## Guide 페이지와 PDF 다운로드

추천 결과 후 반드시 `📄 여행가이드 보기` 액션을 제공한다. 이 버튼은 새 탭으로 `/guide`를 열고, `/guide` 페이지 상단에는 `PDF 다운로드` 버튼을 제공한다.

PDF에는 다음 정보를 포함한다.

- 제목: `[국가] 기념품 여행가이드`
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

PDF 파일명 예시:

- `philippines-souvenir-guide.pdf`
- `japan-souvenir-guide.pdf`
- `taiwan-souvenir-guide.pdf`

한글이 깨지지 않도록 PDF 생성 시 프로젝트 내부 한글 폰트를 반드시 사용한다. 데모 구현은 `@react-pdf/renderer`와 `public/fonts/NotoSansKR-Regular.ttf`를 사용한다. 폰트는 `Font.register`로 등록하고 Vercel 정적 자산 경로(`/fonts/NotoSansKR-Regular.ttf`)에서 로드한다.

PDF는 화면 UI를 캡처하지 않고 PDF 전용 레이아웃 컴포넌트로 생성한다.

PDF 전용 레이아웃 기준:

- `SouvenirGuidePdf.tsx`에서 PDF에 들어갈 제목, 여행 맥락, 국가별 대표 기념품 TOP 5, 가격 가이드, 수하물 참고사항, 비교표를 A4 문서 레이아웃으로 만든다.
- `createSouvenirGuidePdf.ts`는 PDF Blob 생성과 브라우저 다운로드 액션을 재노출한다.
- `NotoSansKR-Regular.ttf`를 `@react-pdf/renderer`에 등록해 한글 제목, 본문, 표 텍스트가 깨지지 않게 한다.
- HTML 캡처, DOM 스크린샷, 외부 폰트 네트워크 의존성은 기본 방식으로 사용하지 않는다.
- Vercel 브라우저 환경에서도 `/fonts/NotoSansKR-Regular.ttf` 정적 자산을 fetch해서 동작해야 한다.

## 기념품 패스포트 페이지

추천 결과 후 반드시 `📘 내 기념품 패스포트 보기` 액션을 제공한다. 이 버튼은 현재 선택 국가의 TOP 5를 localStorage/state 샘플로 저장하고 새 탭으로 `/passport`를 연다.

`/passport`와 `/passport/[country]` 화면에는 실제 여권 스타일의 `Souvenir Passport` 페이지가 표시되어야 한다.

패스포트 화면 필드:

- 국가
- 저장 날짜
- 완성률
- 상태
- 저장된 기념품
- 획득 배지
- 다른 국가 패스포트 샘플 탭
- 기념품별 CSS/SVG 스탬프

패스포트 샘플 국가:

- 필리핀: 바나나칩, 드라이망고, 우베 과자, 코코넛 스낵, 필리핀 커피
- 일본: 도쿄바나나, 로이스 초콜릿, 말차 과자, 지역 한정 키캣, 시로이코이비토
- 대만: 펑리수, 누가크래커, 우롱차, 망고젤리, 타로 과자

패스포트 UI 기준:

- 여권 커버와 펼침 페이지 느낌을 제공한다.
- 국가별 탭은 필리핀, 일본, 대만을 제공한다.
- 각 국가 페이지에는 기념품 5개가 표시된다.
- 저장된 기념품마다 서로 다른 모양의 STAMP가 찍힌 것처럼 표시한다.
- 스탬프는 이미지 파일을 만들지 않고 CSS, SVG, HTML로 구현한다.
- 스탬프 모양 예: 원형, 사각형, 타원형, 팔각형, 기울어진 라벨형.
- 같은 국가 안에서는 색상, 선 두께, 질감 톤을 맞춘다.
- 필리핀은 트로피컬 블루/옐로우, 일본은 레드/네이비, 대만은 그린/오렌지 톤을 사용한다.
- 각 스탬프에는 국가명, 기념품 이름, SAVED 또는 COLLECTED, 저장 날짜를 포함한다.
- 완성률 progress bar와 기념품별 체크 표시를 함께 보여준다.
- 패스포트 저장 후 `여행의 마지막 선택이 내 기념품 패스포트에 기록되었습니다.`와 `[국가] 기념품 패스포트에 5개의 스탬프가 찍혔습니다.` 메시지를 표시한다.

패스포트 저장은 MVP에서 localStorage 또는 React state 기반 샘플로 구현한다. 실제 회원 계정, DB 저장, 동기화는 제공하지 않는다.

## 출력 예시

제목:

`필리핀 / 바나나칩 / 귀국 전날 / 회사 동료 기준 가성비·대량 선물용·휴대성 추천 비교`

출력:

1. 추천 기념품 TOP 5
2. 제품 비교표
3. 제품 카드
4. `[📄 여행가이드 PDF 보기]`
5. `[📘 내 기념품 패스포트에 저장]`
6. `[📊 전체 비교 보기]`
7. `[다른 선물 대상 추천받기]`

여행가이드 보기 클릭 결과:

- 새 탭으로 `/guide?country=philippines&category=banana-chips&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable` 열림
- 실제 PDF 미리보기 표시
- 상단 `PDF 다운로드` 버튼 제공
- PDF에는 추천 TOP 5, 비교표, 가격 가이드, 캐리어 참고사항 포함

내 기념품 패스포트 보기 클릭 결과:

- 새 탭으로 `/passport/philippines?saved=banana-chips,dried-mango,kopiko,ube,coconut&country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable` 열림
- 실제 여권 스타일의 패스포트 페이지 표시
- 서로 다른 모양의 스탬프 5개 표시
- 완성률 `5/5`
- 저장된 기념품 5개 체크 표시
- 획득 배지 표시
- `여행의 마지막 선택이 내 기념품 패스포트에 기록되었습니다.` 메시지 표시

전체 비교 보기 클릭 결과:

- 새 탭으로 `/compare?country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable` 열림
- 기념품, 가격, 휴대성, 선물 적합도, 현지 대표성, 추천도, 주의사항을 표로 비교

## 예외 상황 처리

지원 국가가 아닌 경우:

`현재 MVP에서는 필리핀을 우선 지원합니다. 다른 국가는 향후 확장 대상이며, 지금은 샘플 추천으로 안내할 수 있습니다.`

가격 정보가 부족한 경우:

`가격은 sample / estimated 데이터이며 실제 구매 전 현지 가격 확인이 필요합니다.`

사용자가 조건을 너무 적게 입력한 경우:

`먼저 여행지와 선물 대상을 선택해 주세요.`

구매 요청을 하는 경우:

`현재 MVP에서는 실제 구매 기능은 제공하지 않습니다. 향후 현지 구매, 공항/호텔 수령, 국내 재구매 기능으로 확장할 수 있습니다.`

실제 데이터처럼 단정하면 안 되는 항목:

- 가격
- 평점
- 리뷰 수
- 재고
- 판매처
- 공식 파트너 여부

위 항목은 `sample / mock / estimated / needsVerification`로 표시한다.

## 제외 기능

현재 MVP에서는 아래 기능을 제공하지 않는다.

- 실제 구매
- 결제
- 배송
- 실시간 재고
- 호텔 수령
- 공항 수령
- 업체 입점 관리
- 실제 회원 계정 연동
- 실제 DB 저장
- 실제 판매처 연동

## 향후 확장

향후 구매 연결은 확장 계획으로만 설명한다.

- 현지 구매 연결
- 호텔/공항 수령
- 국내 재구매
- 공식 판매처 연결
- 가격 검수 시스템
- 마이리얼트립 인증 기념품 뱃지
- 국가별 기념품 MD 운영
- 현지 브랜드 제휴 담당자 운영
- 실제 계정 기반 기념품 패스포트

## 데이터 고지

가격, 평점, 리뷰 수, 비교 점수는 MVP 검증을 위한 sample/mock/estimated 데이터다.

실제 상용 데이터처럼 단정하지 말고 `sample`, `mock`, `estimated`, `needsVerification` 상태를 명확히 표시한다.
