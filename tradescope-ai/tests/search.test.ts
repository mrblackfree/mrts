/* Product retrieval: supported products, products outside the data, other forms of a product, HS codes. */
import { done, ok } from './assert';
import { retrieveProduct, inferDirection } from '@/lib/engine/search';
const cases: Array<[string, string | null]> = [
  ['필리핀 바나나칩 한국 수입', 'banana-chips'],
  ['필리핀 생바나나 수입하고 싶어요', null],
  ['세부산 건망고 소싱', 'dried-mango'],
  ['코코넛 오일 수입 관세', 'coconut-oil'],
  ['버진 코코넛오일 한국에 들여오기', 'coconut-oil'],
  ['조미김 필리핀 수출', 'seasoned-laver'],
  ['김 수출하려고 합니다', 'seasoned-laver'],
  ['김치 필리핀 수출', null],
  ['한국 화장품 필리핀 진출', 'k-beauty'],
  ['선크림 필리핀 판매', 'k-beauty'],
  ['라면 필리핀 수출 FTA', 'instant-ramen'],
  ['컵라면 마닐라 수출', 'instant-ramen'],
  ['스마트 건자재 필리핀', 'smart-building'],
  ['바닥재 필리핀 수출', 'smart-building'],
  ['필리핀 참치캔 수입', null],
  ['커피 원두 필리핀에서 수입', null],
  ['자동차 부품 필리핀 수출', null],
  ['소주 필리핀 수출', null],
  ['HS 2008.99 필리핀 수입', 'banana-chips'],
  ['HS 1905 필리핀 수출', null],
  ['export Korean cosmetics to the Philippines', 'k-beauty'],
  ['import dried mango from Cebu', 'dried-mango'],
  ['import coconut oil', 'coconut-oil'],
  ['Korean instant noodles export', 'instant-ramen'],
  ['seaweed snacks export Manila', 'seasoned-laver'],
  ['pineapple import from Philippines', null],
  ['필리핀 파인애플 수입', null],
  ['필리핀 망고 생과 수입', null],
  ['세부에서 커피 수입', null],
  ['다바오 바나나칩 수입', 'banana-chips'],
  ['아이스크림 필리핀 수출', null],
  ['헤어 에센스 필리핀 수출', null],
  ['면 마스크 필리핀 수출', null],
  ['쌀국수 필리핀 수출', null],
  ['신라면 건면 필리핀 수출', 'instant-ramen'],
  ['코코넛 워터 수입', null],
  ['banana ketchup import Korea', null],
  ['HS 3304 화장품 수출', 'k-beauty'],
  ['HS 3304 수출', 'k-beauty'],
  ['HS 1902.30 필리핀 수출', 'instant-ramen'],
  ['HS 0804.50 망고 수입', 'dried-mango'],
  ['필리핀 세부에서 생산한 바나나칩을 한국에 수입할 때 관세와 절차는? 5만 달러 규모, 공급사도 추천해줘', 'banana-chips'],
  ['7D 망고 수입', 'dried-mango'],
  ['생바나나 0803.90 수입', null],
  ['coconut oil extracted from copra', 'coconut-oil'],
  ['코프라 수입', null],
];
// why an unsupported query is unsupported: a different form of a known product, an HS heading only, or no match
const REASON: Record<string, 'other-form' | 'heading-only'> = {
  '필리핀 생바나나 수입하고 싶어요': 'other-form',
  'HS 1905 필리핀 수출': 'heading-only',
  '필리핀 망고 생과 수입': 'other-form',
  '아이스크림 필리핀 수출': 'other-form',
  '헤어 에센스 필리핀 수출': 'other-form',
  '쌀국수 필리핀 수출': 'other-form',
  '코코넛 워터 수입': 'other-form',
  'banana ketchup import Korea': 'other-form',
  '생바나나 0803.90 수입': 'other-form',
};
for (const [q, want] of cases) {
  const r = retrieveProduct(q, inferDirection(q) ?? 'KR_TO_PH');
  const got = r.supported ? r.product.id : null;
  ok(`${q} → ${want ?? 'unsupported'}`, got === want, { got, reason: r.unsupportedReason, terms: r.matchedTerms });
  if (want === null) {
    const reason = REASON[q] ?? 'no-match';
    ok(`${q} → reason ${reason}`, r.unsupportedReason === reason, r.unsupportedReason);
  }
}
done(`product search (${cases.length} queries)`);
