# Sample Usage

## 플러그인 응답에서 웹앱 이동 예시

사용자:

`이번 여행 기준으로 기념품 추천해줘.`

플러그인:

예약 정보를 기준으로 필리핀 보홀 여행으로 추정했습니다.

귀국 전날 기준으로 회사 동료와 가족에게 적합한 기념품을 추천합니다.

TOP 5 추천:

1. OwlTree Banana Chips Original 60g
2. Cebu / 7D Dried Mango
3. Kopiko Brown Coffee Mix
4. Ube Polvoron
5. Coconut Chips Premium

다음 단계:

- [자동 추천 결과 웹앱에서 보기](https://mrt-souvenir.vercel.app/auto-recommend?source=plugin&user=demo&trip=philippines-bohol&country=philippines&city=bohol&stage=return-eve&recipient=coworkers)
- [여행가이드 PDF 보기](https://mrt-souvenir.vercel.app/guide?source=plugin&country=philippines&city=bohol&stage=return-eve)
- [기념품 패스포트에 저장](https://mrt-souvenir.vercel.app/passport/philippines?source=plugin&saved=owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips)
- [전체 비교 보기](https://mrt-souvenir.vercel.app/compare?source=plugin&country=philippines&city=bohol&recipient=coworkers)

## 예약 기반 자동 추천 시나리오

사용자:

`이번 여행 기준으로 기념품 추천해줘.`

플러그인:

`예약 정보를 기준으로 필리핀 보홀 여행으로 추정했습니다. 귀국 전날 기준으로 회사 동료와 가족에게 줄 기념품을 추천해드릴게요.`

출력:

- 예약 정보 요약: 인천 ↔ 보홀 왕복 항공, Panglao Island Resort, Bohol Island Hopping Tour
- 추정 국가/도시: 필리핀 / 보홀, 팡라오
- 추천 TOP 5: OwlTree Banana Chips Original 60g, Cebu / 7D Dried Mango, Kopiko Brown Coffee Mix, Ube Polvoron, Coconut Chips Premium
- 선물 대상별 추천 세트: 회사 동료용 세트, 부모님용 세트, 아이용 세트
- 귀국 전날 체크리스트: 가벼운 상품 우선, 현지 마트 가격 확인, 유통기한 확인
- 다음 액션:
  - 여행가이드 PDF 보기: `/guide?country=philippines&city=bohol&source=booking-context`
  - 기념품 패스포트에 저장: `/passport/philippines?saved=owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips`
  - 전체 비교 보기: `/compare?country=philippines&city=bohol&recipient=coworkers`

웹앱 데모:

`/auto-recommend?user=demo&trip=philippines-bohol`

## 여행 맥락 기반 추천 판단 시나리오

사용자:

“이번 여행 기준으로 회사 동료에게 줄 기념품 추천해줘.”

플러그인:

“이번 여행지 기준으로 추천할까요, 직접 국가를 선택할까요?”

사용자 선택:

- 여행지: 필리핀
- 여행 상황: 귀국 전날
- 여행 유형: 출장/비즈니스
- 선물 대상: 회사 동료
- 추천 기준: 가성비, 대량 선물용, 휴대성

플러그인 판단:

이번 추천은 귀국 전날, 출장/비즈니스, 회사 동료, 가성비·대량 선물용·휴대성을 기준으로 산정되었습니다.

- 회사 동료: 가격 부담이 낮고 여러 명에게 나눠주기 쉬운 상품 우선
- 귀국 전날: 캐리어 부담이 적고 현지 마트나 공항에서 빠르게 찾기 쉬운 상품 우선
- 출장/비즈니스: 사무실에서 설명 없이 나눠주기 쉬운 간식/소포장 상품 우선

## 플러그인 출력

### 1. 선택 요약

- 국가: 필리핀
- 여행 상황: 귀국 전날
- 여행 유형: 출장/비즈니스
- 선물 대상: 회사 동료
- 추천 기준: 가성비, 대량 선물용, 휴대성

### 2. 추천 TOP 5

1. 오울트리 바나나칩 60g
- 카테고리: 바나나칩
- 추천 이유: 소포장으로 여러 명에게 나눠주기 쉽고 가격 부담이 낮음
- 선택 조건과 맞는 이유: 귀국 전날에도 구매하기 쉽고 캐리어 부담이 적음
- 예상 가격대: 120~180 PHP
- 주의사항: 당 함량과 기름짐을 확인하고 봉지가 눌리지 않게 포장 필요
- Match Score: 100

2. 조비스 바나나칩
- 카테고리: 바나나칩
- 추천 이유: 대용량이라 팀 단위 선물로 나누기 좋음
- 선택 조건과 맞는 이유: 대량 선물용 기준에 잘 맞고 브랜드 인지도가 있음
- 예상 가격대: 150~240 PHP
- 주의사항: 부피가 커질 수 있어 캐리어 공간 확인 필요
- Match Score: 100

3. Kopiko 브라운 커피 믹스
- 카테고리: 필리핀 커피
- 추천 이유: 사무실에서 바로 소비하기 좋고 설명이 쉬움
- 선택 조건과 맞는 이유: 출장/비즈니스 맥락에서 회사 동료용으로 무난함
- 예상 가격대: 100~160 PHP
- 주의사항: 카페인 민감 대상에게는 소량 패키지 권장
- Match Score: 94

4. 우베 과자
- 카테고리: 우베 과자
- 추천 이유: 필리핀 현지 느낌이 강하고 포장 비주얼이 좋음
- 선택 조건과 맞는 이유: 가벼운 간식형 선물로 휴대성이 좋음
- 예상 가격대: 120~200 PHP
- 주의사항: 보라색 비주얼과 단맛에 호불호가 있을 수 있음
- Match Score: 92

5. 코코넛 스낵
- 카테고리: 코코넛 스낵
- 추천 이유: 바삭한 간식류라 동료에게 나눠주기 쉬움
- 선택 조건과 맞는 이유: 휴대성과 대량 선물 기준에 잘 맞음
- 예상 가격대: 90~150 PHP
- 주의사항: 부서지기 쉬우므로 캐리어 안쪽에 넣는 것이 좋음
- Match Score: 90

### 3. 비교 요약

| 기념품 | 가격 부담 | 휴대성 | 회사 동료 적합도 | 현지 대표성 | 추천도 |
| --- | --- | ---: | ---: | ---: | ---: |
| 오울트리 바나나칩 60g | 낮음 | 5/5 | 5/5 | 5/5 | 5/5 |
| 조비스 바나나칩 | 낮음~중간 | 3/5 | 5/5 | 4/5 | 5/5 |
| Kopiko 브라운 커피 믹스 | 중간 | 5/5 | 4/5 | 4/5 | 5/5 |
| 우베 과자 | 중간 | 4/5 | 4/5 | 5/5 | 4/5 |
| 코코넛 스낵 | 낮음 | 5/5 | 4/5 | 4/5 | 4/5 |

### 4. 한 줄 결론

회사 동료용으로는 오울트리 바나나칩과 커피 믹스가 가장 무난하고, 조금 더 현지 느낌을 주고 싶다면 우베 과자와 코코넛 스낵이 좋습니다.

### 5. 다음 액션

추천이 완료되었습니다. 다음 중 하나를 선택할 수 있습니다.

- [여행가이드 PDF 보기]
  - `/guide?country=philippines&category=banana-chips&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`

- [내 기념품 패스포트에 저장]
  - `/passport/philippines?saved=banana-chips,dried-mango,kopiko,ube,coconut&country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`

- [전체 비교 보기]
  - `/compare?country=philippines&category=all&stage=return-eve&type=business&recipient=coworkers&criteria=value,bulk,portable`

- [다른 선물 대상 추천받기]
  - 선물 대상만 다시 선택한다.

## 웹앱 연결 결과

여행가이드 PDF 보기:

- 선택 조건이 query로 전달된 `/guide` 페이지가 새 탭으로 열린다.
- PDF 미리보기와 PDF 다운로드 버튼이 표시된다.
- PDF에는 선택 요약, 추천 TOP 5, 비교표, 가격 가이드, 캐리어/기내 참고사항이 포함된다.

내 기념품 패스포트에 저장:

- `/passport/philippines` 페이지가 새 탭으로 열린다.
- `saved=` query에 전달된 TOP 5가 필리핀 패스포트 샘플 저장 상태로 반영된다.
- 완성률 5/5, 스탬프 5개, 획득 배지가 표시된다.

전체 비교 보기:

- `/compare` 페이지가 새 탭으로 열린다.
- 같은 선택 조건을 기준으로 가격, 휴대성, 선물 적합도, 현지 대표성, 추천도를 비교한다.

## 예외 상황 안내

지원 국가가 아닌 경우:

“현재 MVP에서는 필리핀을 우선 지원합니다. 다른 국가는 향후 확장 대상이며, 지금은 샘플 추천으로 안내할 수 있습니다.”

가격 정보가 부족한 경우:

“가격은 sample / estimated 데이터이며 실제 구매 전 현지 가격 확인이 필요합니다.”

사용자 조건이 부족한 경우:

“먼저 여행지와 선물 대상을 선택해 주세요.”

구매 요청을 하는 경우:

“현재 MVP에서는 실제 구매 기능은 제공하지 않습니다. 향후 현지 구매, 공항/호텔 수령, 국내 재구매 기능으로 확장할 수 있습니다.”

## 검증 메모

- 데이터는 sample / mock / estimated / needsVerification 기준이다.
- 실제 구매, 결제, 배송, 실시간 재고, 실제 회원 DB 저장은 구현하지 않는다.
- 플러그인은 추천 판단과 액션 연결을 담당하고, 상세 화면은 Vercel 웹앱의 독립 페이지에서 실행된다.
