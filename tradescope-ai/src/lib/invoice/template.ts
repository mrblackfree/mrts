/**
 * Proforma invoice as a finished A4 document: one self-contained HTML page (inline CSS, no scripts, no external
 * requests) used for the on-screen preview, printing / saving as PDF and the downloadable .html file.
 * Every value is HTML-escaped — company details and partner names are user or data input.
 */
import type { ProformaInvoice } from '@/lib/types';

/** The user's own company and bank details, kept in this browser only. */
export interface InvoiceProfile {
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  signatoryTitle: string;
  counterpartyAddress: string;
  consignee: string;
  notifyParty: string;
  bankBeneficiary: string;
  bankName: string;
  bankSwift: string;
  bankAccount: string;
  bankAddress: string;
}

export const EMPTY_PROFILE: InvoiceProfile = {
  address: '',
  phone: '',
  email: '',
  website: '',
  taxId: '',
  signatoryTitle: '',
  counterpartyAddress: '',
  consignee: '',
  notifyParty: '',
  bankBeneficiary: '',
  bankName: '',
  bankSwift: '',
  bankAccount: '',
  bankAddress: '',
};

/** Field length limits (the form and the stored profile use the same ones). */
export const PROFILE_MAX: Record<keyof InvoiceProfile, number> = {
  address: 200,
  phone: 40,
  email: 120,
  website: 120,
  taxId: 40,
  signatoryTitle: 60,
  counterpartyAddress: 200,
  consignee: 200,
  notifyParty: 200,
  bankBeneficiary: 120,
  bankName: 120,
  bankSwift: 11,
  bankAccount: 40,
  bankAddress: 200,
};

/** A profile read back from storage: only known string fields, trimmed to their limits. */
export function cleanProfile(raw: unknown): InvoiceProfile {
  const out: InvoiceProfile = { ...EMPTY_PROFILE };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof InvoiceProfile)[]) {
    if (!Object.hasOwn(raw, key)) continue;
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string') out[key] = v.slice(0, PROFILE_MAX[key]);
  }
  return out;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });

// ---- amount in words (US dollars and cents) -------------------------------------------------------------------
const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION'];

function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} HUNDRED`);
  if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''));
  return parts.join(' ');
}

/** "US DOLLARS FIFTY THOUSAND AND 25/100 ONLY" — the wording banks expect on trade documents. */
export function amountInWords(amount: number): string {
  const negative = amount < 0;
  const cents = Math.round(Math.abs(amount) * 100);
  let dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  if (dollars >= 1e15) return `US DOLLARS ${money(amount)} ONLY`;
  const groups: string[] = [];
  for (let i = 0; dollars > 0; i++, dollars = Math.floor(dollars / 1000)) {
    const g = dollars % 1000;
    if (g) groups.unshift(`${under1000(g)}${SCALES[i] ? ` ${SCALES[i]}` : ''}`);
  }
  const words = groups.join(' ') || 'ZERO';
  return `${negative ? 'MINUS ' : ''}US DOLLARS ${words} AND ${String(rest).padStart(2, '0')}/100 ONLY`;
}

// ---- document -------------------------------------------------------------------------------------------------
export interface InvoiceInput {
  pi: ProformaInvoice;
  profile: InvoiceProfile;
  /** true when the user's company is the seller (export); false when it is the buyer (sourcing) */
  mineIsSeller: boolean;
  signatoryName: string;
}

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(esc)
    .join('<br>');

const placeholder = (label: string) => `<span class="ph">${esc(label)}</span>`;
const orPh = (v: string, label: string) => (v.trim() ? lines(v) : placeholder(label));

function party(title: string, name: string, address: string, extra: string[]) {
  return `<section class="party">
    <h3>${esc(title)}</h3>
    <p class="pname">${esc(name)}</p>
    <p class="paddr">${address}</p>
    ${extra.filter(Boolean).map((x) => `<p class="pmeta">${x}</p>`).join('')}
  </section>`;
}

export function renderProformaHtml({ pi, profile, mineIsSeller, signatoryName }: InvoiceInput): string {
  const mine = {
    address: orPh(profile.address, '[Company address]'),
    // contact details on one line, the registration number on its own
    extra: [
      [profile.phone.trim() ? `Tel. ${esc(profile.phone)}` : '', profile.email.trim() ? esc(profile.email) : '', profile.website.trim() ? esc(profile.website) : ''].filter(Boolean).join(' · '),
      profile.taxId.trim() ? `Tax / Business Reg. No. ${esc(profile.taxId)}` : '',
    ],
  };
  const theirs = { address: orPh(profile.counterpartyAddress, '[Counterparty address]'), extra: [] as string[] };
  const seller = mineIsSeller ? mine : theirs;
  const buyer = mineIsSeller ? theirs : mine;
  const consignee = profile.consignee.trim() ? lines(profile.consignee) : 'Same as buyer';
  const notify = profile.notifyParty.trim() ? lines(profile.notifyParty) : 'Same as consignee';
  const totalQty = pi.lines.filter((l) => l.amount > 0 && l.unit !== 'lot').reduce((s, l) => s + l.quantity, 0);
  const qtyUnit = pi.lines.find((l) => l.unit !== 'lot')?.unit ?? '';
  const bank = [
    ['Beneficiary', profile.bankBeneficiary.trim() ? esc(profile.bankBeneficiary) : placeholder(`[${mineIsSeller ? pi.seller : 'Seller'} — account holder]`)],
    ['Bank', profile.bankName.trim() ? esc(profile.bankName) : placeholder('[Bank name]')],
    ['SWIFT / BIC', profile.bankSwift.trim() ? esc(profile.bankSwift.toUpperCase()) : placeholder('[SWIFT code]')],
    ['Account No.', profile.bankAccount.trim() ? esc(profile.bankAccount) : placeholder('[Account number]')],
    ['Bank address', profile.bankAddress.trim() ? esc(profile.bankAddress) : placeholder('[Bank address]')],
  ];
  // the user's own bank applies when they are the seller; as a buyer the seller's bank is not theirs to fill
  const bankNote = mineIsSeller ? '' : '<p class="note">To be completed by the seller.</p>';
  const terms: [string, string][] = [
    ['Incoterms®', pi.incoterm],
    ['Port of loading', pi.portOfLoading],
    ['Port of discharge', pi.portOfDischarge],
    ['Country of origin', pi.origin],
    ['Payment terms', pi.payment],
    ['Shipment', pi.leadTime],
    ['Currency', pi.currency],
    ['Validity', `Until ${pi.validUntil}`],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proforma Invoice ${esc(pi.number)}</title>
<style>
  @page { size: A4; margin: 0; }
  :root { --ink: #0b1220; --ink2: #3c4859; --ink3: #6b7686; --rule: #d9e0e7; --navy: #0f1b2d; --gold: #a8854e; --tint: #f6f8fa; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  body { color: var(--ink); font-family: 'Pretendard Variable', Pretendard, 'Helvetica Neue', Helvetica, Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; font-size: 9.6pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0 0 12mm; position: relative; }
  .band { height: 6mm; background: var(--navy); position: relative; }
  .band::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1.2mm; height: 0.6mm; background: var(--gold); }
  .inner { padding: 9mm 15mm 0; }
  /* more line items: a slightly denser page so it still fits one sheet */
  .inner.dense { zoom: 0.92; }
  .top { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 10mm; }
  .issuer .name { font-size: 15pt; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
  .issuer p { margin: 1.2mm 0 0; color: var(--ink2); font-size: 8.6pt; }
  .title { text-align: right; }
  .title h1 { white-space: nowrap; margin: 0; font-family: Georgia, 'Times New Roman', 'Nanum Myeongjo', serif; font-weight: 400; font-size: 21pt; letter-spacing: 0.16em; color: var(--navy); }
  .title .sub { margin: 1mm 0 0; font-size: 7.6pt; letter-spacing: 0.22em; color: var(--gold); font-weight: 600; text-transform: uppercase; }
  .meta { margin: 4mm 0 0 auto; border-collapse: collapse; font-size: 8.6pt; }
  .meta th { text-align: left; font-weight: 500; color: var(--ink3); padding: 0.6mm 4mm 0.6mm 0; white-space: nowrap; }
  .meta td { text-align: right; font-weight: 600; padding: 0.6mm 0; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .issuer .lbl { margin: 0 0 1.4mm; font-size: 6.9pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
  .parties { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 0; margin-top: 8mm; border-top: 0.3mm solid var(--navy); border-bottom: 0.2mm solid var(--rule); }
  .party { padding: 3.5mm 4mm 4mm 0; }
  .party + .party { padding-left: 4mm; border-left: 0.2mm solid var(--rule); }
  .party h3, .block h3 { margin: 0 0 1.6mm; font-size: 6.9pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
  .pname { margin: 0; font-weight: 700; font-size: 9.6pt; }
  .paddr, .pmeta { margin: 0.8mm 0 0; color: var(--ink2); font-size: 8.4pt; }
  .terms { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 5mm; background: var(--tint); border-radius: 1.5mm; }
  .terms div { padding: 2.4mm 3.5mm; min-width: 0; }
  .terms dt { font-size: 6.9pt; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink3); font-weight: 600; }
  .terms dd { margin: 0.8mm 0 0; font-weight: 600; font-size: 8.6pt; overflow-wrap: anywhere; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 8.8pt; }
  .items thead th { background: var(--navy); color: #fff; font-size: 6.9pt; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; padding: 2.4mm 2.5mm; text-align: left; }
  .items thead th.num, .items td.num { text-align: right; }
  .items td { padding: 2.4mm 2.5mm; border-bottom: 0.2mm solid var(--rule); vertical-align: top; font-variant-numeric: tabular-nums; }
  .items td.no { color: var(--ink3); width: 7mm; }
  .items td.desc b { display: block; font-weight: 600; }
  .items td.hs { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 8pt; color: var(--ink2); white-space: nowrap; }
  .items td.amt { font-weight: 600; }
  .sum { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-top: 4mm; }
  .words { font-size: 8pt; color: var(--ink2); max-width: 95mm; }
  .words b { display: block; font-size: 6.9pt; letter-spacing: 0.14em; color: var(--ink3); text-transform: uppercase; margin-bottom: 1mm; font-weight: 600; }
  .totals { border-collapse: collapse; min-width: 70mm; font-size: 8.8pt; }
  .totals th { text-align: left; font-weight: 500; color: var(--ink3); padding: 1.2mm 6mm 1.2mm 0; }
  .totals td { text-align: right; padding: 1.2mm 0; font-variant-numeric: tabular-nums; font-weight: 600; }
  .totals tr.grand th, .totals tr.grand td { border-top: 0.4mm solid var(--navy); padding-top: 2.4mm; color: var(--navy); }
  .totals tr.grand td { font-size: 13pt; font-weight: 700; }
  .two { display: grid; grid-template-columns: 1.15fr 1fr; gap: 8mm; margin-top: 6mm; break-inside: avoid; }
  .block { border-top: 0.2mm solid var(--rule); padding-top: 3mm; }
  .block ol { margin: 0; padding-left: 4.5mm; color: var(--ink2); font-size: 8.2pt; }
  .block ol li + li { margin-top: 1mm; }
  .bank { border-collapse: collapse; font-size: 8.4pt; width: 100%; }
  .bank th { text-align: left; color: var(--ink3); font-weight: 500; padding: 0.8mm 3mm 0.8mm 0; white-space: nowrap; vertical-align: top; width: 26mm; }
  .bank td { padding: 0.8mm 0; font-weight: 600; overflow-wrap: anywhere; }
  .note { margin: 1.5mm 0 0; font-size: 7.6pt; color: var(--ink3); }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 8mm; break-inside: avoid; }
  .sign .line { height: 10mm; border-bottom: 0.3mm solid var(--ink); }
  .sign p { margin: 1.5mm 0 0; font-size: 8pt; color: var(--ink2); }
  .sign p b { color: var(--ink); }
  .ph { color: #9aa5b4; font-weight: 500; }
  footer { position: absolute; left: 15mm; right: 15mm; bottom: 7mm; display: flex; justify-content: space-between; gap: 6mm; font-size: 6.9pt; color: var(--ink3); border-top: 0.2mm solid var(--rule); padding-top: 2mm; }
  @media screen { body { padding: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="band"></div>
  <div class="inner${pi.lines.length > 1 ? ' dense' : ''}">
    <div class="top">
      <div class="issuer">
        <p class="lbl">Seller / Exporter</p>
        <p class="name">${esc(pi.seller)}</p>
        <p>${seller.address}</p>
        ${seller.extra.filter(Boolean).map((x) => `<p>${x}</p>`).join('')}
      </div>
      <div class="title">
        <h1>PROFORMA INVOICE</h1>
        <p class="sub">Quotation · Not a demand for payment</p>
        <table class="meta">
          <tr><th>Invoice No.</th><td>${esc(pi.number)}</td></tr>
          <tr><th>Date of issue</th><td>${esc(pi.date)}</td></tr>
          <tr><th>Valid until</th><td>${esc(pi.validUntil)}</td></tr>
        </table>
      </div>
    </div>

    <div class="parties">
      ${party('Buyer / Importer', pi.buyer, buyer.address, buyer.extra)}
      <section class="party"><h3>Consignee</h3><p class="paddr">${consignee}</p></section>
      <section class="party"><h3>Notify party</h3><p class="paddr">${notify}</p></section>
    </div>

    <dl class="terms">
      ${terms.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>

    <table class="items">
      <thead><tr><th>No.</th><th>Description of goods</th><th>HS code</th><th class="num">Quantity</th><th class="num">Unit price (${esc(pi.currency)})</th><th class="num">Amount (${esc(pi.currency)})</th></tr></thead>
      <tbody>
        ${pi.lines
          .map(
            (l, i) => `<tr><td class="no">${i + 1}</td><td class="desc"><b>${esc(l.description)}</b></td><td class="hs">${esc(l.hsCode)}</td><td class="num">${qty(l.quantity)} ${esc(l.unit)}</td><td class="num">${money(l.unitPrice)}</td><td class="num amt">${money(l.amount)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>

    <div class="sum">
      <p class="words"><b>Amount in words</b>${esc(amountInWords(pi.total))}</p>
      <table class="totals">
        ${totalQty ? `<tr><th>Total quantity</th><td>${qty(totalQty)} ${esc(qtyUnit)}</td></tr>` : ''}
        <tr><th>Subtotal</th><td>${money(pi.total)}</td></tr>
        <tr class="grand"><th>Total ${esc(pi.incoterm.split(' ')[0])} (${esc(pi.currency)})</th><td>${money(pi.total)}</td></tr>
      </table>
    </div>

    <div class="two">
      <section class="block">
        <h3>Terms &amp; remarks</h3>
        <ol>${pi.remarks.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      </section>
      <section class="block">
        <h3>Bank details for remittance</h3>
        <table class="bank">${bank.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
        ${bankNote}
      </section>
    </div>

    <div class="sign">
      <div>
        <div class="line"></div>
        <p>For and on behalf of <b>${esc(pi.seller)}</b></p>
        <p>${mineIsSeller && signatoryName.trim() ? esc(signatoryName) + (profile.signatoryTitle.trim() ? `, ${esc(profile.signatoryTitle)}` : '') : placeholder('Authorised signature · name · title')}</p>
      </div>
      <div>
        <div class="line"></div>
        <p>Accepted by <b>${esc(pi.buyer)}</b></p>
        <p>${!mineIsSeller && signatoryName.trim() ? esc(signatoryName) + (profile.signatoryTitle.trim() ? `, ${esc(profile.signatoryTitle)}` : '') : placeholder('Signature · name · title · date')}</p>
      </div>
    </div>
  </div>
  <footer><span>Proforma invoice ${esc(pi.number)} — indicative terms, subject to final confirmation by both parties.</span><span>Prepared with TradeScope AI</span></footer>
</div>
</body>
</html>`;
}
