/**
 * Requests for quotation / confirmation that close the partner-only trust gaps: a forwarder's freight quote, a
 * supplier's or buyer's price quote, a partner's licence. Each request asks for exactly the fields a verified entry
 * needs (amount, validity date, reference number), so the reply can be entered as-is on the admin page.
 * Pure: no network, no personal data — the user picks the recipient in their own mail client.
 */
import type { Partner, TradeProduct } from './types';

export type RfqKind = 'freight' | 'price' | 'licence';
export type RfqLang = 'en' | 'ko';

export interface Rfq {
  subject: string;
  body: string;
}

const PH = 'Philippines';

function header(lang: RfqLang, kind: RfqKind): string {
  if (lang === 'ko')
    return kind === 'freight' ? '안녕하세요. 아래 조건으로 해상운임 견적을 요청드립니다.' : kind === 'price' ? '안녕하세요. 아래 품목의 단가·최소주문량 견적을 요청드립니다.' : '안녕하세요. 거래 개시 전 인허가 확인을 위해 아래 자료를 요청드립니다.';
  return kind === 'freight' ? 'Dear team,\n\nPlease quote ocean freight for the shipment below.' : kind === 'price' ? 'Dear team,\n\nPlease quote price and minimum order quantity for the product below.' : 'Dear team,\n\nBefore we start trading, please send the licence details below.';
}

const footer = (lang: RfqLang) =>
  lang === 'ko'
    ? '\n견적서에는 반드시 견적 번호와 유효기간(만료일)을 적어 주세요. 감사합니다.'
    : '\nPlease include a quotation reference number and its validity (expiry date).\n\nThank you,';

/** Freight request for one lane of the product. */
export function freightRfq(p: TradeProduct, laneIndex: number, lang: RfqLang = 'en'): Rfq {
  const l = p.logistics[laneIndex] ?? p.logistics[0];
  const hs = p.hs[0];
  const lines =
    lang === 'ko'
      ? [
          header(lang, 'freight'),
          '',
          `- 구간: ${l.from} → ${l.to} (${l.mode})`,
          `- 화물: ${p.name.ko} · HS ${hs.code} (${hs.desc.ko})`,
          `- 물량: ${l.mode === 'LCL' ? 'CBM 단위 혼재' : `${l.mode} 1대`} — 정기 물량 가능 여부 함께 문의`,
          '',
          '회신 요청 항목:',
          `1. 해상운임 (USD/${l.mode === 'LCL' ? 'CBM' : '컨테이너'})`,
          '2. 부대비용 (BAF·CAF·THC·서류비 등) 내역',
          '3. 선사·서비스명, 직항/환적 여부, 항구 간 운송 기간(일)과 출항 주기',
          '4. 프리타임(디머리지·디텐션)',
          '5. 견적 유효기간',
          footer(lang),
        ]
      : [
          header(lang, 'freight'),
          '',
          `- Route: ${l.from} → ${l.to} (${l.mode})`,
          `- Cargo: ${p.name.en} · HS ${hs.code} (${hs.desc.en})`,
          `- Volume: ${l.mode === 'LCL' ? 'LCL, per CBM' : `1 × ${l.mode}`} — please also say whether regular monthly volume is possible`,
          '',
          'Please state:',
          `1. Ocean freight (USD per ${l.mode === 'LCL' ? 'CBM' : 'container'})`,
          '2. Surcharges (BAF, CAF, THC, documentation) itemised',
          '3. Carrier and service, direct or transhipment, port-to-port transit days and sailing frequency',
          '4. Free time (demurrage / detention)',
          '5. Validity of the quotation',
          footer(lang),
        ];
  return {
    subject: lang === 'ko' ? `[운임 견적 요청] ${l.from} → ${l.to} ${l.mode} — ${p.name.ko}` : `RFQ ocean freight: ${l.from} → ${l.to} ${l.mode} — ${p.name.en}`,
    body: lines.join('\n'),
  };
}

/** Price & MOQ request to a supplier (exports) or a buyer's counter-quote. */
export function priceRfq(p: TradeProduct, lang: RfqLang = 'en'): Rfq {
  const pr = p.pricing;
  const hs = p.hs[0];
  const lines =
    lang === 'ko'
      ? [
          header(lang, 'price'),
          '',
          `- 품목: ${p.name.ko} · ${pr.item.ko} · HS ${hs.code}`,
          `- 거래 조건: ${pr.defaultIncoterm} (가능하면 ${pr.incoterms.filter((i) => i !== pr.defaultIncoterm).join(' · ') || '다른 조건'}도 함께)`,
          `- 예상 수량: 최소주문량 기준 (${pr.moq.toLocaleString('en-US')} ${pr.moqUnit} 내외)`,
          '',
          '회신 요청 항목:',
          `1. 단가 (USD/${pr.unit})`,
          '2. 최소주문량(MOQ)과 수량별 단가 구간',
          '3. 생산·출고 리드타임',
          '4. 결제 조건',
          '5. 보유 인증·허가 (FDA LTO·HACCP·할랄 등)와 제품 소비기한',
          '6. 견적 유효기간',
          footer(lang),
        ]
      : [
          header(lang, 'price'),
          '',
          `- Product: ${p.name.en} · ${pr.item.en} · HS ${hs.code}`,
          `- Terms: ${pr.defaultIncoterm} (and ${pr.incoterms.filter((i) => i !== pr.defaultIncoterm).join(' / ') || 'other terms'} if possible)`,
          `- Indicative quantity: around ${pr.moq.toLocaleString('en-US')} ${pr.moqUnit}`,
          '',
          'Please state:',
          `1. Unit price (USD per ${pr.unit})`,
          '2. Minimum order quantity and price breaks by volume',
          '3. Production and dispatch lead time',
          '4. Payment terms',
          '5. Certifications and licences held (FDA LTO, HACCP, halal…) and product shelf life',
          '6. Validity of the quotation',
          footer(lang),
        ];
  return {
    subject: lang === 'ko' ? `[단가·MOQ 견적 요청] ${p.name.ko}` : `RFQ price & MOQ: ${p.name.en}`,
    body: lines.join('\n'),
  };
}

/** Licence confirmation request to a partner (what to send depends on the country and the product). */
export function licenceRfq(p: TradeProduct, partner: Partner, lang: RfqLang = 'en'): Rfq {
  const cosmetic = p.hs[0].code.startsWith('33');
  const food = !cosmetic && /^(0|1|2)/.test(p.hs[0].code);
  const ph = partner.country === 'PH';
  const ask =
    lang === 'ko'
      ? ph
        ? [
            `1. 필리핀 FDA 영업허가(LTO) 번호·종류(${cosmetic ? '화장품' : food ? '식품' : '해당 품목'} 수입·유통/제조)·유효기간 — 허가증 사본`,
            '2. 회사 등기(SEC 또는 DTI) 번호',
            food || cosmetic ? `3. 해당 제품의 ${cosmetic ? 'CPN(화장품 신고)' : 'CPR(제품 등록)'} 보유 여부` : '3. 해당 제품에 필요한 인증(PS/ICC·NTC 등) 보유 여부',
          ]
        : ['1. 사업자등록번호', `2. ${food ? '수입식품등 수입·판매업 영업등록증' : cosmetic ? '화장품책임판매업 등록증' : '관련 영업 허가·등록증'} 사본(등록번호·등록일)`]
      : ph
        ? [
            `1. Philippine FDA License to Operate (LTO): number, type (${cosmetic ? 'cosmetics' : food ? 'food' : 'relevant'} importer/distributor or manufacturer) and validity — a copy of the licence`,
            '2. SEC or DTI business registration number',
            food || cosmetic ? `3. Whether the product already has a ${cosmetic ? 'CPN (cosmetic notification)' : 'CPR (product registration)'}` : '3. Certifications the product needs (PS/ICC, NTC…)',
          ]
        : ['1. Business registration number', `2. A copy of your ${food ? 'imported-food business registration' : cosmetic ? 'cosmetics responsible-seller registration' : 'relevant business licence'} (number and date)`];
  const body = [
    header(lang, 'licence'),
    '',
    lang === 'ko' ? `- 귀사: ${partner.name}` : `- Company: ${partner.name}`,
    lang === 'ko' ? `- 품목: ${p.name.ko} (HS ${p.hs[0].code})` : `- Product: ${p.name.en} (HS ${p.hs[0].code})`,
    '',
    lang === 'ko' ? '요청 자료:' : 'Please send:',
    ...ask,
    lang === 'ko' ? '\n감사합니다.' : '\nThank you,',
  ].join('\n');
  return {
    subject: lang === 'ko' ? `[인허가 확인 요청] ${partner.name} — ${p.name.ko}` : `Licence confirmation: ${partner.name} — ${p.name.en}${partner.country === 'PH' ? ` (${PH})` : ''}`,
    body,
  };
}

/** mailto: link with the request filled in (recipient left for the user). */
export function mailto(r: Rfq): string {
  return `mailto:?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`;
}
