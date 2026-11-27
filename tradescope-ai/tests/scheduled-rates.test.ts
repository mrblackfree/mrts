/* Year-scoped official values: next year's scheduled rate (validFrom) waits until its date, then replaces this
   year's — so the site never falls back to stale seed rates on 1 January. */
import { done, ok } from './assert';

const db = await import('@/data/kr-ph-trade-db');
const { OFFICIAL } = await import('@/data/official');
const { validateEntry } = await import('@/data/official/validate-entry');

const rate = (id: string, scheme: string, hs?: string) => {
  const p = db.getProduct(id)!;
  return (hs ? p.tariffsByHs![hs].tariffs : p.tariffs).find((t) => t.scheme === scheme)!;
};
const at = (iso: string, fn: () => void) => {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    db.applyRuntimeOverrides([{ productId: 'banana-chips', target: { type: 'tariff', scheme: 'MFN', rate: 45 }, source: 'clock', reference: iso, verifiedBy: 'test', verifiedAt: '2026-01-01' }]);
    fn();
  } finally {
    Date.now = real;
    db.applyRuntimeOverrides([]);
  }
};

// today (2026): the 2026 column applies, the 2027 entries wait
at('2026-11-27T03:00:00Z', () => {
  ok('2026: KR-PH FTA banana chips 32.4%', rate('banana-chips', 'KRPH').rate === 32.4);
  ok('2026: RCEP banana chips 36% (Philippine goods, year 4)', rate('banana-chips', 'RCEP').rate === 36);
  ok('2026: KR-PH flooring 10%', rate('smart-building', 'KRPH', '3918.10.1000').rate === 10);
  ok('2026: scheduled 2027 entries are counted separately, not as active', OFFICIAL.scheduledCount > 0);
});

// 2027: the next column takes over without any manual step
at('2027-01-02T03:00:00Z', () => {
  ok('2027: KR-PH FTA banana chips 31.2% (year 4)', rate('banana-chips', 'KRPH').rate === 31.2 && rate('banana-chips', 'KRPH').level === 'official');
  ok('2027: RCEP banana chips 33.8% (Philippine goods, year 5)', rate('banana-chips', 'RCEP').rate === 33.8);
  ok('2027: coconut oil RCEP 1.5% and KR-PH 1.8%', rate('coconut-oil', 'RCEP').rate === 1.5 && rate('coconut-oil', 'KRPH').rate === 1.8);
  ok('2027: plain dried banana KR-PH 6%', rate('banana-chips', 'KRPH', '0803.90.0000').rate === 6);
  ok('2027: KR-PH flooring 9% (Tariff Finder 2027)', rate('smart-building', 'KRPH', '3918.10.1000').rate === 9);
  ok('2027: unchanged lines stay official (AKFTA 36%)', rate('banana-chips', 'AKFTA').rate === 36 && rate('banana-chips', 'AKFTA').level === 'official');
  ok('2027: nothing is scheduled any more for 2027', OFFICIAL.scheduledCount === 0);
  ok('2027: the recommended agreement is still the lowest (KR-PH 31.2% < RCEP 33.8%)', db.getProduct('banana-chips')!.bestFta.scheme === 'KRPH');
});

// 2028 without new entries: the values lapse instead of silently staying (they must be re-read from the schedule)
at('2028-01-02T03:00:00Z', () => {
  ok('2028: an expired year is not shown as official', rate('banana-chips', 'KRPH').level !== 'official');
});

// validation
const base = { productId: 'banana-chips', target: { type: 'tariff', scheme: 'KRPH', rate: 31.2 }, source: 'Schedule', reference: 'Annex', verifiedBy: 'Data team', verifiedAt: '2026-11-27' };
ok('validFrom in the future is accepted (a scheduled rate)', validateEntry({ ...base, validFrom: '2027-01-01', validUntil: '2027-12-31' }, db.PRODUCTS).ok);
ok('validUntil before validFrom is rejected', !validateEntry({ ...base, validFrom: '2027-06-01', validUntil: '2027-01-01' }, db.PRODUCTS).ok);
ok('a malformed validFrom is rejected', !validateEntry({ ...base, validFrom: '2027/01/01' }, db.PRODUCTS).ok);

done('scheduled rates');
