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
// "real" figures are read from the product data, so the weekly data sync cannot break them; the invented ones are
// checked below to still be absent from the data before they are used
const rate = (scheme: string) => p.tariffs.find((t) => t.scheme === scheme)!.rate;
const mfn = rate('MFN');
const akfta = rate('AKFTA');
const rcep = rate('RCEP');
const series = p.market.series.map((x) => x.value);
const [prev, last] = series.slice(-2);
const growth = (last / prev - 1) * 100;
const size = p.market.marketSize.value;
const top = p.market.competitors[0];
const ph = p.market.competitors.find((c) => c.highlight)!;
const hs = p.hs[0].code; // e.g. 2008.99.9000
const hs6 = hs.slice(0, 7);
const fmt1 = (n: number) => n.toFixed(1);
const eok = (v: number) => `${Math.floor(v / 1e8)}억 ${Math.round((v % 1e8) / 1e7)}천만`;
const [lo, hi] = [Math.min(akfta, rcep), Math.max(akfta, rcep)];
const fcl = p.logistics[0].cost[1];
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

const cases: Array<[string, string, boolean]> = [
  ['real MFN rate', `기본세율은 ${mfn}%입니다`, false],
  ['invented rate 17.5%', '한-아세안 FTA 세율은 17.5%입니다', true],
  ['invented HS line', `HS ${hs6}.1234로 분류하세요`, true],
  ['shortened real HS', `HS ${hs6}로 분류하세요`, false],
  ['invented market size', '시장 규모는 $987.6M입니다', true],
  ['question amount', '5만 달러 규모 기준', false],
  ['invented saving', '관세 $12,345를 절감합니다', true],
  ['real share gap', `점유율 격차 ${fmt1(top.share - ph.share)}%p`, false],
  ['invented duty 12%', '관세율은 12%입니다', true],
  ['invented duty 22% (EN)', 'The AKFTA duty is 22%', true],
  ['duty gap real', `MFN 대비 ${mfn - akfta}%p 절감`, false],
  ['growth not a tariff', `시장은 전년 대비 ${fmt1(Math.abs(growth))}% ${growth < 0 ? '감소' : '증가'}`, false],
  ['real rate range', `세율 범위 ${lo}~${mfn}% 중 최고 ${mfn}%`, false],
  ['RCEP real', `RCEP 세율 ${rcep}%`, false],
  ['invented $14', '샘플 비용은 $14입니다', true],
  ['amount from HS suffix', `총 ${usd(Number(hs.slice(-4)))}입니다`, true],
  ['undotted invented HS', 'HS 999999로 신고', true],
  ['undotted real HS', `HS ${hs6.replace('.', '')}로 신고`, false],
  ['tariff rate 100%', 'Tariff is 100%', true],
  ['100% duty-free saving', '관세 100% 면제', false],
  ['12% tariff (after)', 'a 12% tariff applies', true],
  ['1,000% tariff', 'Tariff 1,000%', true],
  ['-15% tariff', '관세 -15%', true],
  ['invented 1.2 million dollars', 'a market of 1.2 million dollars', true],
  ['invented 3억 7천만 달러', '시장 규모 3억 7천만 달러', true],
  ['real market size in 억', `시장 규모 약 ${eok(size)} 달러`, false],
  ['real imports in 만 달러', `${p.market.series.at(-1)!.year}년 수입액 약 ${Math.round(last / 1e4)}만 달러`, false],
  ['relative saving', `관세 ${Math.round(((mfn - akfta) / mfn) * 100)}% 절감`, false],
  ['real lane cost', `FCL 운임 약 ${usd(fcl)}`, false],
  ['invented 7.9 million USD', 'about 7.9 million USD', true],
  ['real change in million USD', `imports changed by about ${fmt1(Math.abs(last - prev) / 1e6)} million USD`, false],
  ['real $M market', `market of $${fmt1(size / 1e6)}M`, false],
  ['grouped real HS spaced', `HSK ${hs.replace(/\./g, ' ')}`, false],
  ['range of real rates', `AKFTA·RCEP 세율 ${lo}%-${hi}%`, false],
  ['range spaced', `세율은 ${lo}% - ${hi}% 범위`, false],
  ['range (no first %)', `세율 ${lo}-${hi}%`, false],
  ['real signed growth', `전년 대비 ${growth < 0 ? '-' : '+'}${fmt1(Math.abs(growth))}%`, false],
];
// invented rates must stay invented whatever the sync brings in
const known = new Set([...p.tariffs.map((t) => t.rate), ...p.market.competitors.map((c) => c.share)]);
for (const v of [17.5, 12, 22]) if (known.has(v)) throw new Error(`fixture: ${v}% is now a real figure for ${p.id}; pick another invented value`);
for (const [name, text, expectBad] of cases) {
  const bad = ungroundedFigures(p, report.intent, q, 'ko', { ...base, summary: text });
  const ok = (bad.length > 0) === expectBad;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(22)} flagged=[${bad.join(', ')}]`);
}
console.log(fails ? `${fails} failures` : 'all grounding tests pass');
if (fails) process.exitCode = 1;
