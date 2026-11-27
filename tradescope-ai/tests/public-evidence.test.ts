/* Public evidence for partners and lanes: registry pages are official hosts, an answered registry page cross-checks a
   partner (and only that), published transit sits inside the lane range it cross-checks. */
import { done, ok } from './assert';

const { PRODUCTS } = await import('@/data/kr-ph-trade-db');
const { applyOfficialLayer } = await import('@/data/official');
const { LANE_SCHEDULES, laneSchedule } = await import('@/data/official/public-checks');

const OFFICIAL_REGISTRY_HOSTS = ['edge.pse.com.ph', 'dart.fss.or.kr'];
const officialHost = (u: string) => {
  const h = new URL(u).hostname;
  return OFFICIAL_REGISTRY_HOSTS.includes(h) || h.endsWith('.gov.ph') || h.endsWith('.go.kr');
};

const partners = PRODUCTS.flatMap((p) => p.partners);
const withRegistry = partners.filter((x) => x.registry);
ok('some partners carry a registry page', withRegistry.length >= 20, withRegistry.length);
ok('registry pages are https on an official host (stock exchange, DART, government)', withRegistry.every((x) => x.registry!.url.startsWith('https://') && officialHost(x.registry!.url)), withRegistry.map((x) => x.registry!.url).filter((u) => !officialHost(u)));
ok('registry labels name the source', withRegistry.every((x) => /^(PSE EDGE|DART|Bureau of Plant Industry \(DA\)) · /.test(x.registry!.label)));
ok('Korean partners point to DART, Philippine partners to a Philippine source', withRegistry.every((x) => (x.country === 'KR') === x.registry!.url.includes('dart.fss.or.kr')));

// an answered registry page makes a partner a cross-check even when the company site gives no answer
const answeredRegistry = withRegistry.find((x) => x.registryCheck && (x.registryCheck.state === 'ok' || x.registryCheck.state === 'protected'));
ok('at least one registry page answered in the snapshot', !!answeredRegistry);
if (answeredRegistry) {
  const base = PRODUCTS.find((p) => p.partners.some((x) => x.id === answeredRegistry.id))!;
  const probe = structuredClone(base);
  const pt = probe.partners.find((x) => x.id === answeredRegistry.id)!;
  pt.website = 'https://no-answer.invalid/';
  delete pt.license;
  const item = applyOfficialLayer(probe).verification!.items.find((i) => i.key === `partner:${pt.id}`)!;
  ok('registry answered, site silent → cross-check', item.level === 'crosscheck', item);
  ok('…sourced to the registry page', item.source === pt.registry!.label);
  ok('…and says licences are still unverified', /not yet verified/.test(item.detail!.en) && /did not respond/.test(item.detail!.en));

  pt.registry = { label: 'PSE EDGE · never checked', url: 'https://edge.pse.com.ph/companyInformation/form.do?cmpy_id=0' };
  const seed = applyOfficialLayer(probe).verification!.items.find((i) => i.key === `partner:${pt.id}`)!;
  ok('registry never answered and site silent → stays seed', seed.level === 'seed', seed);
}

// published transit: every schedule matches a lane we show, and sits inside its range
const fcl = PRODUCTS.flatMap((p) => p.logistics.filter((l) => l.mode !== 'LCL'));
for (const [key, sc] of Object.entries(LANE_SCHEDULES)) {
  const [from, to] = key.split('→');
  const lanes = fcl.filter((l) => l.from === from && l.to === to);
  ok(`${key}: a product shows this FCL lane`, lanes.length > 0);
  ok(`${key}: published ${sc.transitDays} days inside every matching lane range`, lanes.every((l) => sc.transitDays >= l.transitDays[0] && sc.transitDays <= l.transitDays[1]), lanes.map((l) => l.transitDays));
  ok(`${key}: https source, dated check`, sc.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(sc.checkedAt));
}
ok('LCL lanes never borrow a published FCL transit', laneSchedule('Incheon', 'Manila', 'LCL') === undefined);
ok('Davao→Busan is cross-checked by a published schedule', PRODUCTS.some((p) => p.verification!.items.some((i) => i.category === 'logistics' && i.label.en.startsWith('Davao→Busan') && i.level === 'crosscheck')));

done('public evidence');
