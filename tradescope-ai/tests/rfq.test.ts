/* Requests for quotation: they carry the product's own lane, HS, terms and partner, and always ask for what a
   verified entry needs (amount, validity, reference). */
import { done, ok } from './assert';

const { PRODUCTS, getProduct } = await import('@/data/kr-ph-trade-db');
const { freightRfq, licenceRfq, mailto, mailtoLink, MAILTO_MAX, priceRfq } = await import('@/lib/rfq');

const banana = getProduct('banana-chips')!;
const f = freightRfq(banana, 0);
ok('freight: lane and mode in the subject', f.subject.includes(`${banana.logistics[0].from} → ${banana.logistics[0].to}`) && f.subject.includes(banana.logistics[0].mode));
ok('freight: cargo HS code in the body', f.body.includes(`HS ${banana.hs[0].code}`));
ok('freight: asks for transit, surcharges and validity', /transit/i.test(f.body) && /Surcharges/.test(f.body) && /validity/i.test(f.body));
const lcl = banana.logistics.findIndex((l) => l.mode === 'LCL');
if (lcl >= 0) ok('freight: LCL asks per CBM', freightRfq(banana, lcl).body.includes('per CBM'));
ok('freight: an out-of-range lane falls back to the first', freightRfq(banana, 99).subject === f.subject);
const fko = freightRfq(banana, 0, 'ko');
ok('freight (ko): Korean text with the validity request', fko.subject.startsWith('[운임 견적 요청]') && fko.body.includes('유효기간'));

const pr = priceRfq(banana);
ok('price: unit, MOQ and incoterm from the seed', pr.body.includes(`USD per ${banana.pricing.unit}`) && pr.body.includes(banana.pricing.defaultIncoterm) && pr.body.includes(banana.pricing.moqUnit));
ok('price: asks for lead time, payment terms and validity', /lead time/i.test(pr.body) && /Payment terms/.test(pr.body) && /validity/i.test(pr.body));

const beauty = getProduct('k-beauty')!;
const phPartner = beauty.partners.find((x) => x.country === 'PH')!;
const lic = licenceRfq(beauty, phPartner);
ok('licence (PH cosmetics): asks for the FDA LTO and a CPN', lic.body.includes('License to Operate') && lic.body.includes('CPN'));
const krPartner = banana.partners.find((x) => x.country === 'KR')!;
const licKr = licenceRfq(banana, krPartner, 'ko');
ok('licence (KR food buyer): asks for the imported-food business registration', licKr.body.includes('수입식품등 수입·판매업 영업등록증'));

const m = mailto(f);
ok('mailto: no recipient, subject and body encoded', m.startsWith('mailto:?subject=') && m.includes('&body=') && !m.includes(' ') && decodeURIComponent(m.split('&body=')[1]) === f.body);
ok('every product and lane builds a request', PRODUCTS.every((p) => p.logistics.every((_, i) => freightRfq(p, i).body.length > 50) && priceRfq(p).body.length > 50));

const long = { subject: 'S', body: '가'.repeat(1000) };
const cut = mailtoLink(long, 'paste');
ok('long request: subject plus paste note, under the limit', cut.tooLong && cut.href.length <= MAILTO_MAX && decodeURIComponent(cut.href.split('&body=')[1]) === 'paste');
const short = mailtoLink(f, 'paste');
ok('short request: full body in the link', mailto(f).length <= MAILTO_MAX ? !short.tooLong && short.href === mailto(f) : short.tooLong);
ok('every built-in request link stays under the limit', PRODUCTS.every((p) => [priceRfq(p), priceRfq(p, 'ko'), ...p.logistics.flatMap((_, i) => [freightRfq(p, i), freightRfq(p, i, 'ko')]), ...p.partners.flatMap((x) => [licenceRfq(p, x), licenceRfq(p, x, 'ko')])].every((r) => mailtoLink(r, '(paste)').href.length <= MAILTO_MAX)));

done('rfq');
