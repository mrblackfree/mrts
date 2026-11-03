/**
 * KR <-> PH precision simulation engine.
 * Deterministic, dependency-free and isomorphic: it powers the zero-key fallback on the server
 * and the offline fallback in the browser, so the dashboard never shows an error state.
 */
import { getProduct } from '@/data/kr-ph-trade-db';
import { formatNumber, formatPct, formatUsd, pick, todayIso, yoy } from '@/lib/format';
import type {
  AnalysisReport,
  Briefing,
  Direction,
  DraftOptions,
  DraftResult,
  EmailDraft,
  FtaScheme,
  IntentFocus,
  Lang,
  Partner,
  ProformaInvoice,
  QueryIntent,
  TariffRate,
  TradeProduct,
} from '@/lib/types';
import { parseIntent, retrieveProduct, type RetrievalResult } from './search';

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const SCHEME_LABEL: Record<FtaScheme, { ko: string; en: string; short: string }> = {
  MFN: { ko: '기본세율 (MFN)', en: 'Basic rate (MFN)', short: 'MFN' },
  AKFTA: { ko: '한-아세안 FTA', en: 'ASEAN-Korea FTA', short: 'AKFTA' },
  RCEP: { ko: 'RCEP', en: 'RCEP', short: 'RCEP' },
  KRPH: { ko: '한-필리핀 FTA', en: 'Korea-Philippines FTA', short: 'KR-PH FTA' },
};

const FOCUS_LABEL: Record<IntentFocus, { ko: string; en: string }> = {
  tariff: { ko: '관세·FTA', en: 'tariffs & FTA' },
  regulation: { ko: '통관·인증', en: 'customs & certification' },
  partners: { ko: '바이어·공급사', en: 'buyers & suppliers' },
  logistics: { ko: '물류', en: 'logistics' },
  market: { ko: '시장', en: 'market' },
};

export const DIRECTION_LABEL: Record<Direction, { ko: string; en: string }> = {
  PH_TO_KR: { ko: '필리핀 → 대한민국 (수입·소싱)', en: 'Philippines → Korea (import / sourcing)' },
  KR_TO_PH: { ko: '대한민국 → 필리핀 (수출·진출)', en: 'Korea → Philippines (export / entry)' },
};

/** Import VAT of the importing country. */
export const importVat = (direction: Direction) => (direction === 'PH_TO_KR' ? 10 : 12);

// ---------------------------------------------------------------------------
// Tariff simulator
// ---------------------------------------------------------------------------

export interface DutyLine {
  scheme: FtaScheme;
  rate: number;
  duty: number;
  vat: number;
  total: number;
  savingVsMfn: number;
}

export function computeDuties(product: TradeProduct, customsValueUsd: number): DutyLine[] {
  const vatRate = importVat(product.direction) / 100;
  const mfn = product.tariffs.find((t) => t.scheme === 'MFN');
  const mfnDuty = ((mfn?.rate ?? 0) / 100) * customsValueUsd;
  return product.tariffs.map((t) => {
    const duty = (t.rate / 100) * customsValueUsd;
    const vat = (customsValueUsd + duty) * vatRate;
    return { scheme: t.scheme, rate: t.rate, duty, vat, total: duty + vat, savingVsMfn: mfnDuty - duty };
  });
}

export function bestTariff(product: TradeProduct): TariffRate {
  return product.tariffs.find((t) => t.scheme === product.bestFta.scheme) ?? product.tariffs[0];
}

export function mfnTariff(product: TradeProduct): TariffRate {
  return product.tariffs.find((t) => t.scheme === 'MFN') ?? product.tariffs[0];
}

// ---------------------------------------------------------------------------
// Partner ranking
// ---------------------------------------------------------------------------

export function rankPartners(product: TradeProduct, intent?: QueryIntent): Array<Partner & { regionMatch: boolean; rankScore: number }> {
  return product.partners
    .map((p) => {
      const regionMatch = !!intent?.region && (p.region === intent.region || p.city.includes(intent.region));
      return { ...p, regionMatch, rankScore: p.score + (regionMatch ? 4 : 0) };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const clamp = (n: number) => Math.max(35, Math.min(99, Math.round(n)));

export interface FitFactor {
  key: 'channel' | 'logistics' | 'compliance' | 'scale';
  value: number;
}

/** Explainable breakdown of the simulated fit score. */
export function partnerFactors(partner: Partner): FitFactor[] {
  const h = hash(partner.id);
  const compliance =
    partner.type === 'importer' || partner.type === 'distributor' ? 8 : partner.type === 'manufacturer' || partner.type === 'oem' ? 2 : -6;
  const scale = partner.type === 'retail' || partner.type === 'developer' || partner.type === 'foodservice' ? 6 : partner.type === 'ecommerce' ? 0 : -4;
  const logistics = /Cebu|Manila|Busan|Incheon|Seoul|Gyeonggi/i.test(partner.city + partner.region) ? 5 : -3;
  return [
    { key: 'channel', value: clamp(partner.score + 3 - (h % 5)) },
    { key: 'logistics', value: clamp(partner.score + logistics - ((h >> 3) % 6)) },
    { key: 'compliance', value: clamp(partner.score + compliance - ((h >> 5) % 7)) },
    { key: 'scale', value: clamp(partner.score + scale - ((h >> 7) % 6)) },
  ];
}

// ---------------------------------------------------------------------------
// Briefing (report summary)
// ---------------------------------------------------------------------------

function latestTrend(product: TradeProduct) {
  const s = product.market.series;
  const last = s[s.length - 1];
  const prev = s[s.length - 2];
  return { last, prev, growth: prev ? yoy(last.value, prev.value) : 0 };
}

export function buildBriefing(product: TradeProduct, intent: QueryIntent, retrieval: Pick<RetrievalResult, 'confidence' | 'directionAdjusted'>, query: string, lang: Lang): Briefing {
  const best = bestTariff(product);
  const mfn = mfnTariff(product);
  const amount = intent.amountUsd ?? 50_000;
  const saving = ((mfn.rate - best.rate) / 100) * amount;
  const hs0 = product.hs[0];
  const hs1 = product.hs[1];
  const partners = rankPartners(product, intent);
  const top = partners[0];
  const mandatory = product.requirements.filter((r) => r.mandatory);
  const maxLead = Math.max(...product.requirements.map((r) => r.leadDays ?? 0));
  const { last, growth } = latestTrend(product);
  const share = product.market.competitors.find((c) => c.highlight);
  const lane = product.logistics[0];
  const bestLabel = SCHEME_LABEL[best.scheme][lang];
  const name = pick(product.name, lang);
  const focus = intent.focus.map((f) => FOCUS_LABEL[f][lang]).join(', ');
  const topRole = top.role === 'seller' ? (lang === 'ko' ? '공급사' : 'supplier') : lang === 'ko' ? '바이어' : 'buyer';
  const shortQuery = query.length > 60 ? `${query.slice(0, 60)}…` : query;

  if (lang === 'ko') {
    const caveats: string[] = [];
    if (retrieval.confidence === 'low') caveats.push(`정확히 일치하는 시드 품목이 없어 가장 가까운 '${name}' 시나리오로 시뮬레이션했습니다.`);
    if (retrieval.directionAdjusted) caveats.push(`선택한 방향 대신 시드 데이터 방향(${DIRECTION_LABEL[product.direction].ko})으로 분석했습니다.`);
    return {
      headline: `${product.emoji} ${name} — ${bestLabel} 적용 시 관세 ${best.rate}% (기본 ${mfn.rate}% 대비 ${formatNumber(mfn.rate - best.rate, (mfn.rate - best.rate) % 1 ? 1 : 0)}%p 절감)`,
      summary: [
        ...caveats,
        `"${shortQuery}" 질의를 [${focus}] 관점으로 분석했습니다.`,
        `1순위 HS ${hs0.code}(적합도 ${hs0.fit}%)로 분류하고 ${bestLabel}를 적용하면 과세가격 ${formatUsd(amount)} 기준 관세 ${formatUsd(saving)}를 절감합니다.`,
        `${pick(product.market.seriesLabel, 'ko')}은 ${last.year}년 ${formatUsd(last.value, { compact: true })}(전년 대비 ${formatPct(growth, 1, true)})이며, 최적 ${topRole}는 ${top.name}(${top.score}% Match)입니다.`,
      ].join(' '),
      keyPoints: [
        `품목분류: HS ${hs0.code} ${pick(hs0.desc, 'ko')} — 대안 ${hs1.code}(${hs1.fit}%)는 가공 상태에 따라 검토`,
        `최적 협정: ${bestLabel} ${best.rate}% · 원산지기준 ${best.roo} · ${pick(best.certificate, 'ko')}`,
        `필수 요건 ${mandatory.length}건: ${mandatory.slice(0, 3).map((r) => pick(r.title, 'ko')).join(' / ')} — 최장 리드타임 ${maxLead}일`,
        `시장: ${pick(product.market.seriesLabel, 'ko')} ${formatUsd(last.value, { compact: true })} (${formatPct(growth, 1, true)} YoY)${share ? `, ${pick(share.country, 'ko')} 점유율 ${share.share}%` : ''}`,
        `물류: ${lane.from}→${lane.to} ${lane.mode} $${formatNumber(lane.cost[0])}~${formatNumber(lane.cost[1])}, ${lane.transitDays[0]}~${lane.transitDays[1]}일`,
      ],
      nextActions: [
        `HS ${hs0.code} 품목분류 확정 — 필요 시 UNI-PASS 품목분류 사전심사 신청`,
        ...mandatory
          .filter((r) => r.leadDays)
          .sort((a, b) => (b.leadDays ?? 0) - (a.leadDays ?? 0))
          .slice(0, 1)
          .map((r) => `${pick(r.title, 'ko')} 즉시 착수 (약 ${r.leadDays}일 소요)`),
        `${top.name}에 ${top.role === 'seller' ? '샘플·견적 요청' : '거래 제안 메일·견적서(PI)'} 발송 — ${product.pricing.defaultIncoterm} ${formatUsd(product.pricing.unitPrice, { decimals: 2 })}/${product.pricing.unit}`,
        `${bestLabel} 원산지증명서 발급 준비 (${pick(best.certificate, 'ko')})`,
      ],
    };
  }

  const caveats: string[] = [];
  if (retrieval.confidence === 'low') caveats.push(`No exact seed product matched, so the closest scenario ('${name}') was simulated.`);
  if (retrieval.directionAdjusted) caveats.push(`Analysed in the seed data's direction (${DIRECTION_LABEL[product.direction].en}) instead of the selected one.`);
  return {
    headline: `${product.emoji} ${name} — ${best.rate}% duty under the ${bestLabel} (${formatNumber(mfn.rate - best.rate, (mfn.rate - best.rate) % 1 ? 1 : 0)} pp below MFN ${mfn.rate}%)`,
    summary: [
      ...caveats,
      `Your question ("${shortQuery}") was analysed for ${focus}.`,
      `Classifying under HS ${hs0.code} (fit ${hs0.fit}%) and claiming the ${bestLabel} saves ${formatUsd(saving)} in duty on a ${formatUsd(amount)} customs value.`,
      `${pick(product.market.seriesLabel, 'en')} reached ${formatUsd(last.value, { compact: true })} in ${last.year} (${formatPct(growth, 1, true)} YoY); the best-fit ${topRole} is ${top.name} (${top.score}% match).`,
    ].join(' '),
    keyPoints: [
      `Classification: HS ${hs0.code} ${pick(hs0.desc, 'en')} — consider ${hs1.code} (${hs1.fit}%) depending on processing`,
      `Best agreement: ${bestLabel} ${best.rate}% · rule of origin ${best.roo} · ${pick(best.certificate, 'en')}`,
      `${mandatory.length} mandatory requirements: ${mandatory.slice(0, 3).map((r) => pick(r.title, 'en')).join(' / ')} — longest lead time ${maxLead} days`,
      `Market: ${formatUsd(last.value, { compact: true })} (${formatPct(growth, 1, true)} YoY)${share ? `, ${pick(share.country, 'en')} share ${share.share}%` : ''}`,
      `Logistics: ${lane.from}→${lane.to} ${lane.mode} $${formatNumber(lane.cost[0])}–${formatNumber(lane.cost[1])}, ${lane.transitDays[0]}–${lane.transitDays[1]} days`,
    ],
    nextActions: [
      `Lock HS ${hs0.code} — file a UNI-PASS advance classification ruling if needed`,
      ...mandatory
        .filter((r) => r.leadDays)
        .sort((a, b) => (b.leadDays ?? 0) - (a.leadDays ?? 0))
        .slice(0, 1)
        .map((r) => `Start "${pick(r.title, 'en')}" now (≈${r.leadDays} days)`),
      `Send ${top.role === 'seller' ? 'a sample & quotation request' : 'a proposal email and proforma invoice'} to ${top.name} — ${product.pricing.defaultIncoterm} ${formatUsd(product.pricing.unitPrice, { decimals: 2 })}/${product.pricing.unit}`,
      `Prepare the ${bestLabel} certificate of origin (${pick(best.certificate, 'en')})`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Full local analysis
// ---------------------------------------------------------------------------

export function analyzeLocal(query: string, direction: Direction): { report: AnalysisReport; product: TradeProduct } {
  const started = Date.now();
  const retrieval = retrieveProduct(query, direction);
  const intent = { ...parseIntent(query), matchedTerms: retrieval.matchedTerms };
  const product = retrieval.product;
  const report: AnalysisReport = {
    id: `rpt_${Date.now().toString(36)}`,
    query,
    direction: product.direction,
    productId: product.id,
    match: { score: retrieval.score, confidence: retrieval.confidence, directionAdjusted: retrieval.directionAdjusted },
    intent,
    briefing: {
      ko: buildBriefing(product, intent, retrieval, query, 'ko'),
      en: buildBriefing(product, intent, retrieval, query, 'en'),
    },
    engine: { mode: 'simulation', latencyMs: Date.now() - started },
    generatedAt: new Date().toISOString(),
  };
  return { report, product };
}

// ---------------------------------------------------------------------------
// Drafts: cold email + proforma invoice
// ---------------------------------------------------------------------------

const INCOTERM_UPLIFT: Record<string, number> = { EXW: 0.97, FCA: 1, FOB: 1, CFR: 1.06, CPT: 1.06, CIF: 1.07, CIP: 1.07, DAP: 1.1, DPU: 1.1, DDP: 1.1 };

/** Indicative unit price for an incoterm, starting from the seed FOB price. */
export function priceForIncoterm(product: TradeProduct, incoterm: string): number {
  const base = product.pricing.unitPrice / (INCOTERM_UPLIFT[product.pricing.defaultIncoterm.split(' ')[0]] ?? 1);
  const term = incoterm.split(' ')[0].toUpperCase();
  let price = base * (INCOTERM_UPLIFT[term] ?? 1);
  if (term === 'DDP') {
    price *= 1 + bestTariff(product).rate / 100;
    price *= 1 + importVat(product.direction) / 100;
  }
  return Math.round(price * 100) / 100;
}

export function defaultDraftOptions(product: TradeProduct, intent?: QueryIntent): DraftOptions {
  const fromQuery = intent?.incoterm && product.pricing.incoterms.find((i) => i.toLowerCase().startsWith(intent.incoterm!.toLowerCase()));
  const incoterm = fromQuery || product.pricing.defaultIncoterm;
  return {
    incoterm,
    moq: product.pricing.moq,
    unitPrice: priceForIncoterm(product, incoterm),
    quantity: product.pricing.moq,
    sample: 'free',
    sampleCourierByBuyer: false,
    payment: 'TT_30_70',
    includeFtaNote: true,
    includeCertNote: true,
    senderCompany: '',
    senderName: '',
  };
}

const PAYMENT_TEXT: Record<DraftOptions['payment'], { ko: string; en: string }> = {
  TT_30_70: { ko: 'T/T 30% 선금, 잔금 70% B/L 사본 수령 시', en: 'T/T 30% deposit with order, 70% balance against copy of B/L' },
  TT_100: { ko: 'T/T 100% 선불', en: 'T/T 100% in advance' },
  LC_SIGHT: { ko: '일람불 취소불능 신용장 (L/C at sight)', en: 'Irrevocable L/C at sight' },
};

function sampleText(o: DraftOptions, lang: Lang): string {
  if (o.sample === 'none') return lang === 'ko' ? '샘플 없이 본 계약 진행 가능' : 'We can proceed without samples';
  const courier = o.sampleCourierByBuyer
    ? lang === 'ko' ? '국제 특송비는 귀사 부담(DHL/FedEx 계정 활용)' : 'international courier cost borne by your side (DHL/FedEx account)'
    : lang === 'ko' ? '국제 특송비 당사 부담' : 'courier cost covered by us';
  if (o.sample === 'free') return lang === 'ko' ? `무상 샘플 제공, ${courier}` : `Free samples, ${courier}`;
  return lang === 'ko' ? `유상 샘플(본 오더 시 샘플비 전액 차감), ${courier}` : `Paid samples (fully credited against the first order), ${courier}`;
}

function portsFor(product: TradeProduct, partner: Partner, incoterm: string) {
  const inc = incoterm.toLowerCase();
  if (product.direction === 'KR_TO_PH') {
    const pol = inc.includes('incheon') ? 'Incheon, Korea' : 'Busan, Korea';
    const pod = inc.includes('cebu') || partner.region === 'Cebu' ? 'Cebu, Philippines' : 'Manila, Philippines';
    return { pol, pod };
  }
  const pol = inc.includes('davao') || partner.region === 'Mindanao'
    ? 'Davao, Philippines'
    : inc.includes('manila') || /Manila|Luzon/.test(partner.region)
      ? 'Manila, Philippines'
      : 'Cebu, Philippines';
  const pod = inc.includes('incheon') ? 'Incheon, Korea' : 'Busan, Korea';
  return { pol, pod };
}

export function buildEmail(product: TradeProduct, partner: Partner, o: DraftOptions, lang: Lang): EmailDraft {
  const best = bestTariff(product);
  const mfn = mfnTariff(product);
  const item = pick(product.pricing.item, lang);
  const sender = o.senderName || (lang === 'ko' ? '[담당자명]' : '[Your Name]');
  const company = o.senderCompany || (lang === 'ko' ? '[회사명]' : '[Your Company]');
  const appeal = partner.appeal.map((a) => pick(a, lang));
  const ftaLabel = SCHEME_LABEL[best.scheme][lang];
  const price = formatUsd(o.unitPrice, { decimals: 2 });
  const isSourcing = partner.role === 'seller';
  const hs = product.hs[0].code;
  const reqTop = product.requirements.filter((r) => r.mandatory && r.side === (product.direction === 'KR_TO_PH' ? 'PH' : 'KR')).slice(0, 2);

  if (lang === 'en') {
    const subject = isSourcing
      ? `Sourcing inquiry: ${item} for the Korean market — ${o.incoterm}, ${ftaLabel} ${best.rate}% duty`
      : `Proposal: ${pick(product.name, 'en')} supply for ${partner.name} — ${ftaLabel} ${best.rate}% duty`;
    const lines: string[] = [
      `Dear ${isSourcing ? 'Sales' : 'Purchasing'} Team at ${partner.name},`,
      '',
      isSourcing
        ? `I hope this message finds you well. My name is ${sender} from ${company}, a Korean importer developing a dedicated supply line for ${pick(product.name, 'en')} in the Korean market.`
        : `I hope this message finds you well. My name is ${sender} from ${company}, a Korea-based exporter of ${pick(product.name, 'en')}.`,
      '',
      isSourcing
        ? `Your range (${pick(partner.products, 'en')}) fits our plans well, and we would like to explore a long-term supply partnership for Korea.`
        : `We believe our products are a strong fit for your business (${pick(partner.products, 'en')}) and would like to propose a partnership.`,
      '',
      isSourcing ? 'What we would like to build together:' : 'Why partner with us:',
      ...appeal.map((a) => `  • ${a}`),
      '',
      isSourcing ? 'Requested commercial terms (indicative):' : 'Indicative commercial terms:',
      `  • Product: ${item} (HS ${hs})`,
      `  • ${isSourcing ? 'Target price' : 'Price'}: ${price} per ${product.pricing.unit}, ${o.incoterm}`,
      `  • ${isSourcing ? 'Initial order' : 'MOQ'}: ${formatNumber(o.moq)} ${product.pricing.moqUnit}`,
      `  • Payment: ${PAYMENT_TEXT[o.payment].en}`,
      `  • Lead time: about ${product.pricing.leadTimeDays} days after order confirmation`,
      `  • Samples: ${sampleText(o, 'en')}`,
    ];
    if (o.includeFtaNote) {
      lines.push(
        isSourcing
          ? `  • Origin: please issue the ${pick(best.certificate, 'en')} so we can apply ${best.rate}% duty instead of the ${mfn.rate}% MFN rate`
          : `  • Duty: eligible for ${best.rate}% under the ${ftaLabel} (vs ${mfn.rate}% MFN) — we provide the ${pick(best.certificate, 'en')}`,
      );
    }
    if (o.includeCertNote && reqTop.length) {
      lines.push(
        isSourcing
          ? `  • Compliance: we will need your support for ${reqTop.map((r) => r.title.en).join(' and ')}`
          : `  • Compliance: we will support your ${reqTop.map((r) => r.title.en).join(' and ')} with a full document pack`,
      );
    }
    lines.push(
      '',
      isSourcing
        ? 'Could you share your latest price list, specifications and factory certifications? We would also welcome a short video call next week.'
        : 'Would you be open to a 20-minute call next week? I would be happy to send our catalogue, price list and samples in advance.',
      '',
      'Best regards,',
      sender,
      company,
      '[Phone] · [Email] · [Website]',
    );
    return { subject, body: lines.join('\n') };
  }

  const subject = isSourcing
    ? `[소싱 문의] ${item} 한국 수입 공급 협력 제안 — ${o.incoterm}, ${ftaLabel} ${best.rate}%`
    : `[거래 제안] ${partner.name} 대상 ${pick(product.name, 'ko')} 공급 제안 — ${ftaLabel} 관세 ${best.rate}%`;
  const lines: string[] = [
    `${partner.name} ${isSourcing ? '영업' : '구매'} 담당자님께,`,
    '',
    `안녕하십니까. ${isSourcing ? '한국 수입·유통' : '한국 수출'} 전문기업 ${company}의 ${sender}입니다.`,
    '',
    isSourcing
      ? `귀사의 ${pick(partner.products, 'ko')} 제품에 깊은 관심을 갖고, 한국 시장 장기 공급 파트너십을 제안드리고자 연락드립니다.`
      : `귀사의 ${pick(partner.products, 'ko')} 채널에 당사 제품이 높은 시너지를 낼 것으로 판단하여 거래를 제안드립니다.`,
    '',
    '■ 제안 핵심',
    ...appeal.map((a, i) => `  ${i + 1}. ${a}`),
    '',
    '■ 거래 조건 (안)',
    `  · 품목: ${item} (HS ${hs})`,
    `  · 단가: ${price} / ${product.pricing.unit} (${o.incoterm})`,
    `  · ${isSourcing ? '초도 주문' : '최소 주문량(MOQ)'}: ${formatNumber(o.moq)} ${product.pricing.moqUnit}`,
    `  · 결제: ${PAYMENT_TEXT[o.payment].ko}`,
    `  · 납기: 주문 확정 후 약 ${product.pricing.leadTimeDays}일`,
    `  · 샘플: ${sampleText(o, 'ko')}`,
  ];
  if (o.includeFtaNote) {
    lines.push(
      isSourcing
        ? `  · 원산지: ${pick(best.certificate, 'ko')} 발급 요청 — 한국 수입 시 기본 ${mfn.rate}% 대신 ${best.rate}% 적용`
        : `  · 관세: ${ftaLabel} 적용 시 ${best.rate}% (기본 ${mfn.rate}%) — 원산지증명서 당사 발급`,
    );
  }
  if (o.includeCertNote && reqTop.length) {
    lines.push(
      isSourcing
        ? `  · 인허가: ${reqTop.map((r) => r.title.ko).join(', ')}에 필요한 자료 협조 요청`
        : `  · 인허가: ${reqTop.map((r) => r.title.ko).join(', ')} 서류 일체 지원`,
    );
  }
  lines.push(
    '',
    isSourcing ? '최신 가격표·제품 규격서·공장 인증 현황을 회신해 주시면 감사하겠습니다.' : '다음 주 중 20분 화상 미팅이 가능하실지요? 카탈로그·가격표·샘플을 사전에 송부드리겠습니다.',
    '',
    '감사합니다.',
    `${company} ${sender} 드림`,
    '[전화] · [이메일] · [웹사이트]',
  );
  return { subject, body: lines.join('\n') };
}

export function buildProforma(product: TradeProduct, partner: Partner, o: DraftOptions): ProformaInvoice {
  const { pol, pod } = portsFor(product, partner, o.incoterm);
  const company = o.senderCompany || '[Your Company]';
  const isSourcing = partner.role === 'seller';
  const best = bestTariff(product);
  const date = todayIso();
  const lines = [
    {
      description: pick(product.pricing.item, 'en'),
      hsCode: product.hs[0].code,
      quantity: o.quantity,
      unit: product.pricing.unit,
      unitPrice: o.unitPrice,
      amount: Math.round(o.quantity * o.unitPrice * 100) / 100,
    },
  ];
  if (o.sample === 'paid-credit') {
    lines.push({ description: 'Pre-shipment samples (credited against this order)', hsCode: product.hs[0].code, quantity: 1, unit: 'lot', unitPrice: 150, amount: 150 });
    lines.push({ description: 'Sample credit', hsCode: '-', quantity: 1, unit: 'lot', unitPrice: -150, amount: -150 });
  }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    number: `TS-PI-${date.replace(/-/g, '')}-${product.id.slice(0, 3).toUpperCase()}${partner.id.slice(0, 2).toUpperCase()}`,
    date,
    validUntil: todayIso(30),
    seller: isSourcing ? partner.name : company,
    buyer: isSourcing ? company : partner.name,
    incoterm: `${o.incoterm} (Incoterms® 2020)`,
    portOfLoading: pol,
    portOfDischarge: pod,
    payment: PAYMENT_TEXT[o.payment].en,
    leadTime: `${product.pricing.leadTimeDays} days after deposit / L/C receipt`,
    lines,
    total: Math.round(total * 100) / 100,
    remarks: [
      `Certificate of origin: ${best.certificate.en} — preferential duty ${best.rate}% (${SCHEME_LABEL[best.scheme].en})`,
      'Shipping documents: Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin',
      `Samples: ${sampleText(o, 'en')}`,
      'Bank details: [Beneficiary bank / SWIFT / account to be provided]',
      'Indicative draft generated by TradeScope AI — subject to final confirmation by both parties.',
    ],
  };
}

export function proformaToText(pi: ProformaInvoice): string {
  const rows = pi.lines
    .map((l) => `${l.description} | HS ${l.hsCode} | ${formatNumber(l.quantity)} ${l.unit} × ${formatUsd(l.unitPrice, { decimals: 2 })} = ${formatUsd(l.amount, { decimals: 2 })}`)
    .join('\n');
  return [
    'PROFORMA INVOICE',
    `No. ${pi.number}    Date: ${pi.date}    Valid until: ${pi.validUntil}`,
    `Seller: ${pi.seller}`,
    `Buyer: ${pi.buyer}`,
    `Terms: ${pi.incoterm}    Port of loading: ${pi.portOfLoading}    Port of discharge: ${pi.portOfDischarge}`,
    `Payment: ${pi.payment}    Lead time: ${pi.leadTime}`,
    '',
    rows,
    '',
    `TOTAL: ${formatUsd(pi.total, { decimals: 2 })} (USD)`,
    '',
    ...pi.remarks.map((r) => `- ${r}`),
  ].join('\n');
}

export function buildDraftLocal(productId: string, partnerId: string, options: DraftOptions): DraftResult | null {
  const started = Date.now();
  const product = getProduct(productId);
  const partner = product?.partners.find((p) => p.id === partnerId);
  if (!product || !partner) return null;
  return {
    email: { ko: buildEmail(product, partner, options, 'ko'), en: buildEmail(product, partner, options, 'en') },
    pi: buildProforma(product, partner, options),
    engine: { mode: 'simulation', latencyMs: Date.now() - started },
  };
}
