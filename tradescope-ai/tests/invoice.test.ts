/* Proforma invoice document: amount in words, escaping of every value, stored profile hygiene. */
import { done, ok } from './assert';

const { amountInWords, cleanProfile, EMPTY_PROFILE, esc, renderProformaHtml } = await import('@/lib/invoice/template');
const { buildDraftLocal, defaultDraftOptions, proformaToText } = await import('@/lib/engine/simulate');
const { PRODUCTS } = await import('@/data/kr-ph-trade-db');

// ---- amount in words ---------------------------------------------------------------------------------------------
ok('zero', amountInWords(0) === 'US DOLLARS ZERO AND 00/100 ONLY');
ok('cents', amountInWords(115.5) === 'US DOLLARS ONE HUNDRED FIFTEEN AND 50/100 ONLY', amountInWords(115.5));
ok('teens and tens', amountInWords(4219.07) === 'US DOLLARS FOUR THOUSAND TWO HUNDRED NINETEEN AND 07/100 ONLY', amountInWords(4219.07));
ok('millions with gaps', amountInWords(1_000_050) === 'US DOLLARS ONE MILLION FIFTY AND 00/100 ONLY', amountInWords(1_000_050));
ok('hyphenated', amountInWords(1_234_567.05) === 'US DOLLARS ONE MILLION TWO HUNDRED THIRTY-FOUR THOUSAND FIVE HUNDRED SIXTY-SEVEN AND 05/100 ONLY', amountInWords(1_234_567.05));
ok('rounding to cents', amountInWords(99.999) === 'US DOLLARS ONE HUNDRED AND 00/100 ONLY', amountInWords(99.999));
ok('negative', amountInWords(-150).startsWith('MINUS US DOLLARS ONE HUNDRED FIFTY'));

// ---- the document escapes every value ----------------------------------------------------------------------------
const product = PRODUCTS.find((p) => p.direction === 'KR_TO_PH')!;
const partner = product.partners.find((x) => x.role !== 'seller')!;
const evil = '<img src=x onerror=alert(1)>"\'&';
const o = { ...defaultDraftOptions(product, undefined as never, partner), senderCompany: evil, senderName: evil };
const pi = buildDraftLocal(product.id, partner.id, o)!.pi;
const profile = { ...EMPTY_PROFILE, address: evil, email: evil, bankName: evil, consignee: `${evil}\nline 2`, bankSwift: 'abcdkrse' };
const html = renderProformaHtml({ pi, profile, mineIsSeller: true, signatoryName: evil });
ok('no raw markup from inputs', !html.includes('<img') && !html.includes('onerror=alert(1)>'));
ok('escaped form present', html.includes(esc(evil)));
ok('multi-line fields become line breaks', html.includes(`${esc(evil)}<br>line 2`));
ok('no scripts in the document', !/<script/i.test(html));
ok('SWIFT upper-cased', html.includes('ABCDKRSE'));
ok('amount in words on the page', html.includes(amountInWords(pi.total)));
ok('origin and currency', html.includes('Republic of Korea') && pi.currency === 'USD');
ok('empty fields show placeholders', renderProformaHtml({ pi, profile: EMPTY_PROFILE, mineIsSeller: true, signatoryName: '' }).includes('[Bank name]'));
const asBuyer = renderProformaHtml({ pi, profile: EMPTY_PROFILE, mineIsSeller: false, signatoryName: 'Kim' });
ok('as the buyer, the seller fills in the bank', asBuyer.includes('To be completed by the seller.'));

// ---- the user's own bank only when they are the seller -------------------------------------------------------------
const withBank = { ...EMPTY_PROFILE, bankBeneficiary: 'MY OWN CO', bankName: 'MY BANK', bankSwift: 'MYBKKRSE', bankAccount: '999-888', bankAddress: 'MY BANK ADDRESS' };
const sellerHtml = renderProformaHtml({ pi, profile: withBank, mineIsSeller: true, signatoryName: '' });
const buyerHtml = renderProformaHtml({ pi, profile: withBank, mineIsSeller: false, signatoryName: '' });
ok('as the seller, my bank is printed', ['MY OWN CO', 'MY BANK', 'MYBKKRSE', '999-888', 'MY BANK ADDRESS'].every((x) => sellerHtml.includes(x)));
ok('as the buyer, my bank is never printed as the seller’s', ['MY OWN CO', 'MY BANK', 'MYBKKRSE', '999-888', 'MY BANK ADDRESS'].every((x) => !buyerHtml.includes(x)) && buyerHtml.includes('[Bank name]'));

// ---- text version carries the bank only when given ---------------------------------------------------------------
ok('text: bank placeholder', proformaToText(pi).includes('[Beneficiary / bank / SWIFT / account to be provided]'));
ok('text: bank details', proformaToText(pi, { beneficiary: 'ACME', bankName: 'Bank', swift: 'ABCDKRSE', account: '123' }).includes('ACME / Bank / SWIFT ABCDKRSE / A/C 123'));
ok('text: bank address too', proformaToText(pi, { beneficiary: 'ACME', address: '1 Bank St' }).includes('ACME / 1 Bank St'));

// ---- browser storage: company-wide details, transaction parties per partner --------------------------------------
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;
const store = await import('@/lib/invoice/profile-store');
store.saveIdentity({ companyName: 'Hanbit Foods', signatoryName: 'Jiwon Kim' });
store.saveInvoiceProfile('p:buyer-a', { ...EMPTY_PROFILE, address: 'Seoul HQ', bankName: 'My Bank', counterpartyAddress: 'Buyer A, Manila', consignee: 'Warehouse A' });
const forB = store.loadInvoiceProfile('p:buyer-b');
ok('another partner gets my company details', forB.address === 'Seoul HQ' && forB.bankName === 'My Bank');
ok('…but never the previous partner’s address or consignee', forB.counterpartyAddress === '' && forB.consignee === '');
ok('the first partner keeps its own parties', store.loadInvoiceProfile('p:buyer-a').counterpartyAddress === 'Buyer A, Manila');
ok('saving invoice details keeps the company name and signatory', store.loadIdentity().companyName === 'Hanbit Foods' && store.loadIdentity().signatoryName === 'Jiwon Kim');
store.saveIdentity({ companyName: 'Hanbit Foods Co., Ltd.', signatoryName: 'Jiwon Kim' });
ok('saving the identity keeps the company details', store.loadInvoiceProfile('p:buyer-b').address === 'Seoul HQ' && store.loadIdentity().companyName === 'Hanbit Foods Co., Ltd.');
mem.set('ts-invoice-company:v1', '{"companyName":7,"address":"x"}');
ok('odd stored values are ignored', store.loadIdentity().companyName === '' && store.loadInvoiceProfile('p:buyer-b').address === 'x');

// ---- stored profile ----------------------------------------------------------------------------------------------
const cleaned = cleanProfile({ address: 'x'.repeat(500), phone: 42, unknown: 'y', __proto__: { email: 'polluted' } });
ok('only known string fields, within limits', cleaned.address.length === 200 && cleaned.phone === '' && !('unknown' in cleaned) && cleaned.email === '');
ok('garbage → empty profile', JSON.stringify(cleanProfile('nope')) === JSON.stringify(EMPTY_PROFILE) && JSON.stringify(cleanProfile(null)) === JSON.stringify(EMPTY_PROFILE));

done('invoice');
