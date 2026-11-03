/* Grounding check for LLM briefings: real figures pass, invented rates / HS codes / amounts are flagged. */
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import { analyzeLocal } from '@/lib/engine/simulate';
import { ungroundedFigures } from '@/lib/engine/llm';
import type { Briefing } from '@/lib/types';
let fails = 0;
const queries: Record<string, string> = {
  // CIP and CIF amounts are used as stated

  'banana-chips': '필리핀 바나나칩 한국 수입 FOB 5만 달러', 'dried-mango': '건망고 수입 $120,000', 'coconut-oil': 'coconut oil import CIP Busan $80k',
  'seasoned-laver': '조미김 필리핀 수출 EXW $30,000', 'k-beauty': '화장품 필리핀 수출', 'instant-ramen': '라면 필리핀 수출 DDP Manila $200,000', 'smart-building': '도어락 필리핀 수출',
};
for (const p of PRODUCTS) {
  const q = queries[p.id];
  const { report } = analyzeLocal(q, p.direction);
  for (const lang of ['ko', 'en'] as const) {
    const bad = ungroundedFigures(p, report.intent, q, lang, report.briefing[lang]);
    if (bad.length) { fails++; console.log(`SELF-CHECK FAIL ${p.id}/${lang}: ${bad.join(' | ')}`); }
  }
  console.log(`${p.id}: amount=${report.intent.amountUsd} incoterm=${report.intent.incoterm} cif=${report.intent.customsValueUsd}`);
}
console.log(`self-check (simulation briefings are grounded): ${fails === 0 ? 'PASS' : `${fails} FAIL`}`);
// fabricated answers must be caught
const p = PRODUCTS.find((x) => x.id === 'banana-chips')!;
const q = '필리핀 바나나칩 한국 수입 5만 달러';
const { report } = analyzeLocal(q, p.direction);
const base: Briefing = { headline: 'h', summary: 's', keyPoints: ['k'], nextActions: ['a'] };
const mfn = p.tariffs.find((t) => t.scheme === 'MFN')!.rate;
const cases: Array<[string, string, boolean]> = [
  ['real MFN rate', `기본세율은 ${mfn}%입니다`, false],
  ['invented rate 17.5%', '한-아세안 FTA 세율은 17.5%입니다', true],
  ['invented HS line', 'HS 2008.99.1234로 분류하세요', true],
  ['shortened real HS', 'HS 2008.99로 분류하세요', false],
  ['invented market size', '시장 규모는 $987.6M입니다', true],
  ['question amount', '5만 달러 규모 기준', false],
  ['invented saving', '관세 $12,345를 절감합니다', true],
  ['real share gap 31.7pp', '점유율 격차 31.7%p', false],
  ['invented duty 12%', '관세율은 12%입니다', true],
  ['invented duty 22% (EN)', 'The AKFTA duty is 22%', true],
  ['duty gap real', `MFN 대비 ${mfn}%p 절감`, false],
  ['growth not a tariff', '시장은 전년 대비 34.8% 감소', false],
  ['official MFN range', '공식 MFN 범위 8~45% 중 최고 45%', false],
  ['RCEP real', 'RCEP 세율 30%', false],
  ['invented $14', '샘플 비용은 $14입니다', true],
  ['$9,000 from HS suffix', '총 $9,000입니다', true],
  ['undotted invented HS', 'HS 999999로 신고', true],
  ['undotted real HS', 'HS 200899로 신고', false],
  ['tariff rate 100%', 'Tariff is 100%', true],
  ['100% duty-free saving', '관세 100% 면제', false],
  ['12% tariff (after)', 'a 12% tariff applies', true],
  ['1,000% tariff', 'Tariff 1,000%', true],
  ['-15% tariff', '관세 -15%', true],
  ['invented 1.2 million dollars', 'a market of 1.2 million dollars', true],
  ['invented 3억 7천만 달러', '시장 규모 3억 7천만 달러', true],
  ['real 1억 2천만 달러 (market size)', '시장 규모 약 1억 2천만 달러', false],
  ['real market in 만 달러', '2025년 수입액 약 444만 달러', false],
  ['relative saving 89%', '관세 89% 절감', false],
  ['real cost $950 (lane)', 'FCL 운임 약 $950', false],
  ['invented 7.9 million USD', 'about 7.9 million USD', true],
  ['real decline 2.4 million USD', 'imports fell by about 2.4 million USD', false],
  ['real $124.0M market', 'market of $124.0M', false],
  ['grouped real HS spaced', 'HSK 2008 99 9000', false],
  ['range 5%-30% (real rates)', 'AKFTA·RCEP 세율 5%-30%', false],
  ['range 5% - 30% spaced', '세율은 5% - 30% 범위', false],
  ['range 5-30% (no first %)', '세율 5-30%', false],
  ['real negative growth', '전년 대비 -34.8%', false],
];
for (const [name, text, expectBad] of cases) {
  const bad = ungroundedFigures(p, report.intent, q, 'ko', { ...base, summary: text });
  const ok = (bad.length > 0) === expectBad;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(22)} flagged=[${bad.join(', ')}]`);
}
console.log(fails ? `${fails} failures` : 'all grounding tests pass');
if (fails) process.exitCode = 1;
