/* Expert-service catalog: services per product, free-text hints, whole-word acronym matching. */
import { servicesForProduct, servicesForQuery, EXPERT_SERVICES } from '@/data/experts';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
let f = 0;
const ok = (n: string, c: unknown, x?: unknown) => { if (!c) { f++; console.log('FAIL', n, x ?? ''); } };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
ok('pet food → BAI + importer', ids(servicesForQuery('강아지 펫푸드 필리핀 수출')).join() === 'ph-bai-petfood,ph-importer-partner', ids(servicesForQuery('강아지 펫푸드 필리핀 수출')));
ok('dog food en', ids(servicesForQuery('dog food export to the Philippines')).includes('ph-bai-petfood'));
ok('cosmetics → importer', ids(servicesForQuery('화장품 필리핀')).includes('ph-importer-partner'));
ok('nothing for random', servicesForQuery('자동차 부품').length === 0, ids(servicesForQuery('자동차 부품')));
for (const p of PRODUCTS) {
  const s = ids(servicesForProduct(p));
  if (p.direction === 'KR_TO_PH') ok(`${p.id} importer first`, s[0] === 'ph-importer-partner', s);
  else ok(`${p.id} no PH importer`, !s.includes('ph-importer-partner'), s);
  ok(`${p.id} has services`, s.length > 0, s);
}
ok('unique ids', new Set(EXPERT_SERVICES.map((s) => s.id)).size === EXPERT_SERVICES.length);
console.log(f ? `${f} failed` : 'experts: all passed');
if (f) process.exit(1);
const q2 = (s: string) => servicesForQuery(s).map((x) => x.id);
ok('crisps not sps', !q2('potato crisps export').includes('ph-bfar-da'), q2('potato crisps export'));
ok('Dubai not bai', !q2('ship to Dubai').includes('ph-bai-petfood'), q2('ship to Dubai'));
ok('BAI whole word', q2('BAI registration help').includes('ph-bai-petfood'));
ok('sps whole word', q2('need SPS clearance').includes('ph-bfar-da'));
ok('korean particle', q2('펫푸드를 필리핀에').includes('ph-bai-petfood'));
ok('pet food phrase', q2('premium pet food line').includes('ph-bai-petfood'));
console.log(f ? `${f} failed (after keyword checks)` : 'keyword checks passed');
if (f) process.exit(1);
