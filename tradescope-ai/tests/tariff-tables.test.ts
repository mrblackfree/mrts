/* Shipped tariff tables: the recommended FTA is never beaten by another agreement in the same table, preferential
   rates never exceed MFN, and values read from an official schedule show as official. */
import { done, ok } from './assert';

const { PRODUCTS, getProduct } = await import('@/data/kr-ph-trade-db');

for (const p of PRODUCTS) {
  const tables = [{ name: 'main', tariffs: p.tariffs, best: p.bestFta.scheme }, ...Object.entries(p.tariffsByHs ?? {}).map(([hs, t]) => ({ name: hs, tariffs: t.tariffs, best: t.bestFta.scheme }))];
  for (const t of tables) {
    const mfn = t.tariffs.find((x) => x.scheme === 'MFN');
    const ftas = t.tariffs.filter((x) => x.scheme !== 'MFN');
    const best = ftas.find((x) => x.scheme === t.best);
    ok(`${p.id} ${t.name}: the recommended FTA is in the table`, !!best);
    if (!best) continue;
    const lowest = Math.min(...ftas.map((x) => x.rate));
    ok(`${p.id} ${t.name}: the recommended ${t.best} (${best.rate}%) is the lowest rate (${lowest}%)`, best.rate === lowest);
    ok(`${p.id} ${t.name}: no preferential rate above MFN`, !mfn || ftas.every((x) => x.rate <= mfn.rate));
  }
}

const rate = (id: string, scheme: string, hs?: string) => {
  const p = getProduct(id)!;
  return (hs ? p.tariffsByHs![hs].tariffs : p.tariffs).find((x) => x.scheme === scheme)!;
};
ok("banana chips: Korea's AKFTA rate is the official 36%", rate('banana-chips', 'AKFTA').rate === 36 && rate('banana-chips', 'AKFTA').level === 'official');
ok('banana chips: the KR-PH FTA (32.4%, decree annex) is recommended and its rule of origin is official', getProduct('banana-chips')!.bestFta.scheme === 'KRPH' && rate('banana-chips', 'KRPH').rate === 32.4 && getProduct('banana-chips')!.verification!.items.find((i) => i.key === 'roo')!.level === 'official');
ok('banana chips: RCEP for Philippine goods is year 4 in 2026 (36%)', rate('banana-chips', 'RCEP').rate === 36 && rate('banana-chips', 'RCEP').level === 'official');
ok('banana chips: MFN 45% is official (Customs Act schedule)', rate('banana-chips', 'MFN').rate === 45 && rate('banana-chips', 'MFN').level === 'official');
ok('dried mango: unsweetened 0804.50 is AKFTA 24% (official)', rate('dried-mango', 'AKFTA', '0804.50.2000').rate === 24 && rate('dried-mango', 'AKFTA', '0804.50.2000').level === 'official');
ok('coconut oil: crude 1513.11 is 0% under all three agreements (official)', ['AKFTA', 'RCEP', 'KRPH'].every((s) => rate('coconut-oil', s, '1513.11.0000').rate === 0 && rate('coconut-oil', s, '1513.11.0000').level === 'official'));
ok('coconut oil: the AKFTA reciprocal rate for Philippine 1513.19 is the official 0% and AKFTA is recommended', rate('coconut-oil', 'AKFTA').rate === 0 && rate('coconut-oil', 'AKFTA').level === 'official' && getProduct('coconut-oil')!.bestFta.scheme === 'AKFTA');
ok('coconut oil: the primary line is refined oil (1513.19.1000) and its RCEP 1.8% is official', getProduct('coconut-oil')!.hs[0].code === '1513.19.1000' && rate('coconut-oil', 'RCEP').rate === 1.8 && rate('coconut-oil', 'RCEP').level === 'official');
ok('HS rulings read from customs authorities show as official', ['banana-chips', 'dried-mango', 'coconut-oil', 'seasoned-laver', 'k-beauty', 'smart-building'].every((id) => getProduct(id)!.verification!.items.find((i) => i.key === 'hs')!.level === 'official'));
ok('instant ramen HS is official: both countries’ schedules name it in 1902.30 (KR 1902.30-1010, PH AHTN 1902.30.40)', getProduct('instant-ramen')!.verification!.items.find((i) => i.key === 'hs')!.level === 'official');
ok('instant ramen main line maps to AHTN 1902.30.40 (instant noodles), not .20 (rice vermicelli)', getProduct('instant-ramen')!.hs[0].ahtn === '1902.30.40');

done('tariff tables');
