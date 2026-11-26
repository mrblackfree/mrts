/* Trust projections: same formula as the live score, levels only go up, every lever together reaches 100. */
import { done, ok } from './assert';

const { PRODUCTS } = await import('@/data/kr-ph-trade-db');
const { scoreOf } = await import('@/data/official');
const { LEVERS, applyLevers, projectTrust } = await import('@/lib/trust/levers');

const pr = projectTrust(PRODUCTS);
ok('today matches the live scores', pr.products.every((r) => r.now === PRODUCTS.find((p) => p.id === r.id)!.verification!.score));
ok('every lever together reaches 100 for every product', pr.full === 100 && pr.products.every((r) => r.full === 100), pr.products);
ok('gains are never negative', pr.levers.every((l) => l.gain >= 0));
ok('cumulative never goes down', pr.levers.every((l, i) => i === 0 || l.cumulative >= pr.levers[i - 1].cumulative));
ok('listed by gain, largest first', pr.levers.every((l, i) => i === 0 || l.gain <= pr.levers[i - 1].gain));
ok('the last cumulative is the full projection', pr.levers[pr.levers.length - 1].cumulative === pr.full);
ok('a lever without raises gains nothing', pr.levers.find((l) => l.lever.id === 'kcs')!.gain === 0);

// levels only go up: a cross-check lever never lowers an official item
const items = [
  { category: 'partners' as const, level: 'verified' as const },
  { category: 'hs' as const, level: 'official' as const },
  { category: 'mfn' as const, level: 'seed' as const },
];
const after = applyLevers(items, LEVERS.filter((l) => l.id === 'links' || l.id === 'wits'));
ok('verified partner stays verified under a cross-check lever', after[0].level === 'verified');
ok('official HS stays official under a cross-check lever', after[1].level === 'official');
ok('seed MFN rises to official', after[2].level === 'official');
ok('score formula: categories weigh the same', scoreOf([{ category: 'stats', level: 'official' }, { category: 'mfn', level: 'seed' }, { category: 'mfn', level: 'official' }]) === 75);
ok('empty item list scores 0', scoreOf([]) === 0);

done('trust levers');
