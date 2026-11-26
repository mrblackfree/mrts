/* Legal bases: every entry names a real requirement, cites an official text, and counts as a cross-check — never as
   a lawyer's review. */
import { done, ok } from './assert';

const { PRODUCTS, applyRuntimeOverrides, getProduct } = await import('@/data/kr-ph-trade-db');
const { LEGAL_BASES, isOfficialLawUrl, legalBasisFor, legalBasisProblems } = await import('@/data/official/legal-bases');
const { todayIso } = await import('@/lib/format');

const today = todayIso();
const reqIds = new Set(PRODUCTS.flatMap((p) => p.requirements.map((r) => r.id)));

ok('there are legal bases to check', Object.keys(LEGAL_BASES).length > 0);
for (const [id, e] of Object.entries(LEGAL_BASES)) {
  ok(`${id}: names a requirement of some product`, reqIds.has(id));
  const problems = legalBasisProblems(e, today);
  ok(`${id}: entry is complete and cites an official text`, problems.length === 0, problems);
  for (const pid of e.products ?? []) ok(`${id}: product ${pid} has this requirement`, !!getProduct(pid)?.requirements.some((r) => r.id === id));
}

ok('law.go.kr deep link is official', isOfficialLawUrl('https://www.law.go.kr/법령/수입식품안전관리특별법/제5조'));
ok('KLRI English text is official', isOfficialLawUrl('https://elaw.klri.re.kr/eng_service/lawView.do?hseq=1'));
ok('a .gov.ph page is official', isOfficialLawUrl('https://www.fda.gov.ph/some-circular/'));
ok('a private reference site is not official', !isOfficialLawUrl('https://lawphil.net/statutes/repacts/ra2009/ra_9711_2009.html'));
ok('a look-alike host is not official', !isOfficialLawUrl('https://evilgov.ph/law') && !isOfficialLawUrl('https://law.go.kr.example.com/x'));
ok('plain http is not accepted', !isOfficialLawUrl('http://www.law.go.kr/법령/관세법'));
ok('garbage is not a URL', !isOfficialLawUrl('not a url'));

// scoring: a matched legal basis is a cross-check; a lawyer's review still makes it verified
const withBasis = PRODUCTS.flatMap((p) => p.requirements.filter((r) => r.legalBasis).map((r) => ({ p, r })));
ok('legal bases reach the products', withBasis.length > 0);
ok(
  'a requirement with a legal basis scores as a cross-check',
  withBasis.every(({ p, r }) => p.verification!.items.find((i) => i.key === `req:${r.id}`)!.level === (r.reviewed ? 'verified' : 'crosscheck')),
);
ok(
  'a requirement without one stays at the seed level',
  PRODUCTS.every((p) => p.requirements.filter((r) => !r.legalBasis && !r.reviewed).every((r) => p.verification!.items.find((i) => i.key === `req:${r.id}`)!.level === 'seed')),
);
const { p: p0, r: r0 } = withBasis[0];
applyRuntimeOverrides([{ productId: p0.id, target: { type: 'requirement', id: r0.id }, source: 'Law firm memo', reference: 'Memo 1', verifiedBy: 'Counsel', verifiedAt: today }]);
ok("a lawyer's review raises it to verified", getProduct(p0.id)!.verification!.items.find((i) => i.key === `req:${r0.id}`)!.level === 'verified');
applyRuntimeOverrides([]);
ok('back to a cross-check once the review is gone', getProduct(p0.id)!.verification!.items.find((i) => i.key === `req:${r0.id}`)!.level === 'crosscheck');

// a product-limited entry only reaches those products
const limited = Object.entries(LEGAL_BASES).find(([, e]) => e.products?.length);
if (limited) {
  const [id, e] = limited;
  const other = PRODUCTS.find((p) => !e.products!.includes(p.id) && p.requirements.some((r) => r.id === id));
  if (other) ok(`${id}: not attached outside its products`, legalBasisFor(id, other.id) === undefined);
}

done('legal bases');
