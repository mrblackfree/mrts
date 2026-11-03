'use client';

import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  FileDown,
  FileSignature,
  FileStack,
  Handshake,
  PackageCheck,
  PackageSearch,
  Ship,
  Square,
  UserRoundCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { servicesForProduct, type ExpertService } from '@/data/experts';
import { formatNumber } from '@/lib/format';
import { bestTariff, mfnTariff, rankPartners, SCHEME_LABEL } from '@/lib/engine/simulate';
import type { AnalysisReport, Bilingual, Requirement, TradeProduct } from '@/lib/types';
import type { ExpertContext } from '../expert/ExpertRequestDialog';
import { Flag } from '../Flag';
import { useI18n } from '../I18nProvider';
import BriefingModule from '../modules/BriefingModule';
import ChecklistPanel from '../modules/ChecklistPanel';
import MarketModule, { LogisticsLanes } from '../modules/MarketModule';
import PartnersModule from '../modules/PartnersModule';
import TariffModule from '../modules/TariffModule';
import TrackingPanel from '../tracking/TrackingPanel';
import { Badge, Button, Card, cx, InStepContext } from '../ui';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export type StepId = 'product' | 'tariff' | 'permits' | 'partners' | 'contract' | 'shipping' | 'customs';

interface StepDef {
  id: StepId;
  icon: React.ReactNode;
  title: Bilingual;
  goal: Bilingual;
  owner: Bilingual;
}

const STEPS: StepDef[] = [
  { id: 'product', icon: <PackageSearch className="size-4" />, title: b('품목 확인', 'Product'), goal: b('HS 코드를 확정하고 시장성을 확인합니다.', 'Pin down the HS code and check the market.'), owner: b('나 · 관세사 확인', 'You · broker check') },
  { id: 'tariff', icon: <BadgePercent className="size-4" />, title: b('관세·FTA', 'Duty & FTA'), goal: b('적용할 협정과 원산지 기준을 정하고 예상 관세를 계산합니다.', 'Choose the agreement, check the rule of origin and estimate the duty.'), owner: b('나', 'You') },
  { id: 'permits', icon: <FileStack className="size-4" />, title: b('인허가·서류', 'Permits'), goal: b('양국에서 필요한 등록·인증을 오래 걸리는 것부터 준비합니다.', 'Prepare the registrations both countries require, longest first.'), owner: b('나 · 현지 전문가', 'You · local expert') },
  { id: 'partners', icon: <Handshake className="size-4" />, title: b('거래처 찾기', 'Partner'), goal: b('바이어·공급사 후보를 고르고 첫 제안을 보냅니다.', 'Shortlist buyers or suppliers and send the first proposal.'), owner: b('나', 'You') },
  { id: 'contract', icon: <FileSignature className="size-4" />, title: b('계약·PI', 'Contract'), goal: b('인코텀즈·결제·MOQ를 합의하고 PI로 확정합니다.', 'Agree incoterm, payment and MOQ, then confirm them on a PI.'), owner: b('나 · 거래처', 'You · partner') },
  { id: 'shipping', icon: <Ship className="size-4" />, title: b('선적·추적', 'Ship & track'), goal: b('운송을 예약하고 컨테이너를 도착까지 추적합니다.', 'Book the freight and track the container to arrival.'), owner: b('나 · 포워더', 'You · forwarder') },
  { id: 'customs', icon: <PackageCheck className="size-4" />, title: b('통관·인도', 'Clearance'), goal: b('도착지 통관을 마치고 인도까지 확인합니다.', 'Clear customs at destination and confirm delivery.'), owner: b('관세사 · 나', 'Broker · you') },
];

interface Todo {
  id: string;
  text: string;
}

function todosFor(step: StepId, product: TradeProduct, report: AnalysisReport, lang: 'ko' | 'en'): Todo[] {
  const ko = lang === 'ko';
  const pick = (x: Bilingual) => x[lang];
  const best = bestTariff(product);
  const mfn = mfnTariff(product);
  const hs0 = product.hs[0];
  const hs1 = product.hs[1];
  const lane = product.logistics[0];
  const pr = product.pricing;
  const top = rankPartners(product, report.intent).slice(0, 3);
  const toKr = product.direction === 'PH_TO_KR';
  const t = (id: string, k: string, e: string) => ({ id: `${step}:${id}`, text: ko ? k : e });
  switch (step) {
    case 'product':
      return [
        t('hs', `1순위 HS ${hs0.code} (${pick(hs0.desc)}, 적합도 ${hs0.fit}%) 확인`, `Check HS ${hs0.code} (${pick(hs0.desc)}, fit ${hs0.fit}%)`),
        ...(hs1 ? [t('alt', `가공 상태·원재료가 다르면 대안 HS ${hs1.code} 검토`, `If processing or ingredients differ, review alternative HS ${hs1.code}`)] : []),
        t('ruling', '분류 확정은 관세사 검토 또는 품목분류 사전심사로', 'Confirm the classification with a customs broker or an advance ruling'),
        t('market', '시장 규모와 경쟁국 점유율 확인', 'Check market size and competitor shares'),
      ];
    case 'tariff':
      return [
        t('fta', `${SCHEME_LABEL[best.scheme][lang]} ${best.rate}% 적용 (기본세율 ${mfn.rate}%)`, `Claim the ${SCHEME_LABEL[best.scheme][lang]} at ${best.rate}% (MFN ${mfn.rate}%)`),
        t('roo', `원산지 기준 충족 확인: ${best.roo}`, `Confirm the rule of origin: ${best.roo}`),
        t('coo', `원산지증명서 준비: ${pick(best.certificate)}`, `Prepare the certificate of origin: ${pick(best.certificate)}`),
        t('calc', '과세가격(CIF)으로 관세·부가세 계산', 'Estimate duty and VAT on the CIF value'),
      ];
    case 'partners':
      return [
        t('short', `후보 검토: ${top.map((x) => x.name).join(', ')}`, `Review: ${top.map((x) => x.name).join(', ')}`),
        t('verify', '웹사이트·등록증으로 회사 실재와 인허가 보유 확인', 'Verify the company and its licences (website, registration)'),
        t('mail', '거래 제안 메일 보내기', 'Send the proposal email'),
      ];
    case 'contract':
      return [
        t('inco', `인코텀즈 정하기 (권장 ${pr.defaultIncoterm})`, `Agree the incoterm (suggested ${pr.defaultIncoterm})`),
        t('pay', '결제 조건 합의 (예: T/T 선금 30% · 선적 후 70%)', 'Agree payment terms (e.g. T/T 30% deposit · 70% after shipment)'),
        t('moq', `MOQ·샘플 확인 (MOQ ${formatNumber(pr.moq)} ${pr.moqUnit})`, `Confirm MOQ and samples (MOQ ${formatNumber(pr.moq)} ${pr.moqUnit})`),
        t('pi', 'PI 발행·서명: 단가·인코텀즈·HS·결제조건 명시', 'Issue and sign the PI with price, incoterm, HS and payment terms'),
        t('docs', '원산지증명서·검역증 등 서류 발급 책임 명시', 'State who issues the certificate of origin, health certificates and other documents'),
      ];
    case 'shipping':
      return [
        t('book', `포워더 견적·부킹 (${lane.from}→${lane.to} ${lane.mode} $${formatNumber(lane.cost[0])}–${formatNumber(lane.cost[1])})`, `Get forwarder quotes and book (${lane.from}→${lane.to} ${lane.mode} $${formatNumber(lane.cost[0])}–${formatNumber(lane.cost[1])})`),
        t('docs', '선적 서류: 상업송장·포장명세서·B/L·원산지증명서', 'Shipping documents: commercial invoice, packing list, B/L, certificate of origin'),
        t('ins', '적하보험 확인 (CIF·CIP는 수출자가 부보)', 'Arrange cargo insurance (the seller insures under CIF / CIP)'),
        t('track', '컨테이너·B/L 번호로 추적 등록', 'Register the container or B/L number for tracking'),
      ];
    case 'customs':
      return toKr
        ? [
            t('decl', '수입신고 (UNI-PASS, 관세사)', 'Import declaration (UNI-PASS, customs broker)'),
            t('food', '식품 등은 수입식품 신고·검사 (최초 수입은 정밀검사)', 'Imported-food declaration and inspection (full lab test on the first import)'),
            t('duty', '협정관세 적용신청과 관세·부가세 납부', 'Claim the FTA rate and pay duty and VAT'),
            t('release', '반출 후 인도·수량 확인', 'Release, delivery and quantity check'),
          ]
        : [
            t('decl', '필리핀 BOC 수입신고 (현지 면허 관세사)', 'Philippine BOC import entry (licensed local broker)'),
            t('fta', '원산지증명서로 협정세율 적용, 관세·VAT 납부', 'Claim the FTA rate with the certificate of origin; pay duty and VAT'),
            t('permits', 'FDA 등 인허가 서류 확인 후 반출', 'Release after permit documents (FDA etc.) are checked'),
            t('deliver', '바이어 인도 확인·잔금 회수', 'Confirm delivery to the buyer and collect the balance'),
          ];
    default:
      return [];
  }
}

interface Progress {
  step: number;
  done: StepId[];
  checks: string[];
}

const storeKey = (productId: string) => `ts-journey:v1:${productId}`;
function loadProgress(productId: string): Progress {
  try {
    const raw = localStorage.getItem(storeKey(productId));
    if (raw) {
      const v = JSON.parse(raw) as Progress;
      if (Array.isArray(v.done) && Array.isArray(v.checks) && typeof v.step === 'number') return { step: Math.min(Math.max(0, v.step), STEPS.length - 1), done: v.done, checks: v.checks };
    }
  } catch {
    /* storage unavailable or damaged */
  }
  return { step: 0, done: [], checks: [] };
}

export default function TradeJourney({
  report,
  product,
  onOpenTrust,
  onOpenAssistant,
  onExpert,
  tariffProps,
}: {
  report: AnalysisReport;
  product: TradeProduct;
  onOpenTrust: () => void;
  onOpenAssistant: (partnerId: string, tab: 'analysis' | 'email') => void;
  onExpert: (ctx: ExpertContext) => void;
  tariffProps: Pick<React.ComponentProps<typeof TariffModule>, 'initialAmount' | 'convertedFrom' | 'assumedCif'>;
}) {
  const { p, lang } = useI18n();
  const [progress, setProgress] = useState<Progress>({ step: 0, done: [], checks: [] });
  const [showMarket, setShowMarket] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // per-product progress survives reloads in this browser
  useEffect(() => {
    setProgress(loadProgress(product.id));
    setShowMarket(false);
  }, [product.id]);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey(product.id), JSON.stringify(progress));
    } catch {
      /* storage unavailable */
    }
  }, [product.id, progress]);

  const services = useMemo(() => servicesForProduct(product), [product]);
  const current = STEPS[progress.step];
  const doneCount = progress.done.length;
  const top = rankPartners(product, report.intent)[0];

  const go = (i: number) => {
    setProgress((pr) => ({ ...pr, step: Math.min(Math.max(0, i), STEPS.length - 1) }));
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const completeAndNext = () => {
    setProgress((pr) => ({ ...pr, done: pr.done.includes(current.id) ? pr.done : [...pr.done, current.id] }));
    if (progress.step < STEPS.length - 1) go(progress.step + 1);
  };
  const toggleCheck = (id: string) =>
    setProgress((pr) => ({ ...pr, checks: pr.checks.includes(id) ? pr.checks.filter((x) => x !== id) : [...pr.checks, id] }));

  const expertFor = (r: Requirement) => {
    const svc = servicesForProduct(product).find((s) => s.covers(r, product));
    onExpert({ product, topic: p(r.title), serviceIds: svc ? [svc.id] : [] });
  };
  const expertForService = (svc: ExpertService) => onExpert({ product, topic: p(svc.title), serviceIds: [svc.id] });

  const L = lang === 'ko'
    ? { guide: '거래 진행 가이드', progress: '{n}/7 단계 완료', step: '단계', of: '/ 7', todo: '이번 단계에서 할 일', owner: '담당', prev: '이전 단계', next: '이 단계 완료 · 다음 단계', finish: '거래 완료로 표시', allDone: '모든 단계를 마쳤습니다. 다음 거래도 같은 순서로 진행하세요.', market: '시장 데이터 자세히 보기', hideMarket: '시장 데이터 접기', experts: '이 품목에 맞는 현지 전문가 서비스', expertsSub: '직접 하기 어려운 서류는 TradeScope 파트너 전문가가 대신 진행합니다. 요청하면 운영팀이 진행 방법과 견적을 안내합니다.', request: '요청하기', needs: '준비할 서류와 근거', pi: '제안 메일·PI 만들기', piSub: '조건을 입력하면 국/영 제안 메일과 Proforma Invoice가 바로 만들어집니다.', handover: '통관을 맡길 관세사가 필요하면', pdf: 'PDF 리포트' }
    : { guide: 'Trade guide', progress: '{n}/7 steps done', step: 'Step', of: '/ 7', todo: 'To do in this step', owner: 'Owner', prev: 'Previous', next: 'Done · next step', finish: 'Mark the trade complete', allDone: 'All steps are done. Run the next trade in the same order.', market: 'Show market data', hideMarket: 'Hide market data', experts: 'Local expert services for this product', expertsSub: 'Paperwork you cannot easily do yourself is handled by a TradeScope partner expert. Send a request and the team explains the process and the quote.', request: 'Request', needs: 'What you provide · sources', pi: 'Create proposal email & PI', piSub: 'Enter the terms and get a Korean/English proposal email and a proforma invoice.', handover: 'Need a customs broker for clearance?', pdf: 'PDF report' };

  const todos = (id: StepId) => todosFor(id, product, report, lang);

  return (
    <InStepContext.Provider value>
      <div ref={topRef} className="scroll-mt-20 space-y-4">
        {/* summary + stepper */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">{L.guide}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold text-slate-900 dark:text-white">
                <span aria-hidden>{product.emoji}</span>
                <span className="break-keep">{p(product.name)}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Flag code={product.direction === 'PH_TO_KR' ? 'PH' : 'KR'} />
                  →
                  <Flag code={product.direction === 'PH_TO_KR' ? 'KR' : 'PH'} />
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={doneCount === STEPS.length ? 'green' : 'slate'}>{L.progress.replace('{n}', String(doneCount))}</Badge>
              <Button variant="primary" size="sm" pill onClick={() => window.print()} className="no-print" aria-label={L.pdf}>
                <FileDown className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{L.pdf}</span>
              </Button>
            </div>
          </div>

          <ol className="no-print no-scrollbar -mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1" aria-label={L.guide}>
            {STEPS.map((s, i) => {
              const done = progress.done.includes(s.id);
              const active = i === progress.step;
              return (
                <li key={s.id} className="min-w-[7.25rem] flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={active ? 'step' : undefined}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                      active ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900' : done ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300',
                    )}
                  >
                    <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums', active ? 'bg-white/15 dark:bg-ink-900/10' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/[0.06]')}>
                      {done && !active ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className="min-w-0 text-[12.5px] font-semibold leading-tight">{p(s.title)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        {STEPS.map((s, i) => {
          const active = i === progress.step;
          const list = todos(s.id);
          return (
            <section key={s.id} aria-labelledby={`step-${s.id}`} className={cx('space-y-4', active ? 'block' : 'hidden', 'print:block')}>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20 [&>svg]:size-5">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {L.step} <span className="tabular-nums text-brand-600 dark:text-brand-400">{i + 1}</span> {L.of}
                      </p>
                      <h2 id={`step-${s.id}`} className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                        {p(s.title)}
                      </h2>
                      <p className="mt-0.5 break-keep text-sm text-slate-600 dark:text-slate-300">{p(s.goal)}</p>
                    </div>
                  </div>
                  <Badge>
                    {L.owner}: {p(s.owner)}
                  </Badge>
                </div>

                {list.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{L.todo}</p>
                    <ul className="mt-2 grid gap-1.5">
                      {list.map((td) => {
                        const on = progress.checks.includes(td.id);
                        return (
                          <li key={td.id}>
                            <button type="button" onClick={() => toggleCheck(td.id)} aria-pressed={on} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                              {on ? <CheckSquare className="mt-0.5 size-[18px] shrink-0 text-emerald-500" aria-hidden /> : <Square className="mt-0.5 size-[18px] shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />}
                              <span className={cx('break-keep text-[13.5px] leading-snug', on ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>{td.text}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {s.id === 'contract' && top && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <p className="min-w-0 break-keep text-xs text-slate-600 dark:text-slate-300">{L.piSub}</p>
                    <Button variant="brand" size="sm" onClick={() => onOpenAssistant(top.id, 'email')} className="no-print">
                      <FileSignature className="size-3.5" aria-hidden />
                      {L.pi}
                    </Button>
                  </div>
                )}
                {s.id === 'customs' && (
                  <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <p className="text-xs text-slate-600 dark:text-slate-300">{L.handover}</p>
                    <Button size="sm" onClick={() => onExpert({ product, topic: p(s.title), serviceIds: [product.direction === 'PH_TO_KR' ? 'kr-customs-broker' : 'ph-customs-broker'] })}>
                      <UserRoundCheck className="size-3.5" aria-hidden />
                      {L.request}
                    </Button>
                  </div>
                )}

                <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                  <Button size="md" variant="ghost" onClick={() => go(i - 1)} disabled={i === 0}>
                    <ArrowLeft className="size-4" aria-hidden />
                    {L.prev}
                  </Button>
                  <Button size="md" variant="primary" onClick={completeAndNext}>
                    {i === STEPS.length - 1 ? L.finish : L.next}
                    {i < STEPS.length - 1 && <ArrowRight className="size-4" aria-hidden />}
                  </Button>
                </div>
                {i === STEPS.length - 1 && doneCount === STEPS.length && (
                  <p role="status" className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {L.allDone}
                  </p>
                )}
              </Card>

              {/* the step's working tool */}
              {s.id === 'product' && (
                <>
                  <BriefingModule key={`b-${report.id}`} report={report} product={product} onOpenTrust={onOpenTrust} />
                  <div className="no-print">
                    <Button size="sm" variant="ghost" onClick={() => setShowMarket((v) => !v)} aria-expanded={showMarket}>
                      <ChevronDown className={cx('size-4 transition-transform', showMarket && 'rotate-180')} aria-hidden />
                      {showMarket ? L.hideMarket : L.market}
                    </Button>
                  </div>
                  <div className={cx(showMarket ? 'block' : 'hidden', 'print:block')}>
                    <MarketModule key={`m-${report.id}`} product={product} withLanes={false} />
                  </div>
                </>
              )}
              {s.id === 'tariff' && <TariffModule key={`t-${report.id}`} product={product} withChecklist={false} {...tariffProps} />}
              {s.id === 'permits' && (
                <>
                  <Card className="p-4 sm:p-5">
                    <ChecklistPanel product={product} onExpert={expertFor} />
                  </Card>
                  {services.length > 0 && (
                    <Card className="p-4 sm:p-5">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        <UserRoundCheck className="size-4 text-brand-600" aria-hidden />
                        {L.experts}
                      </p>
                      <p className="mt-1 break-keep text-xs leading-relaxed text-slate-500 dark:text-slate-400">{L.expertsSub}</p>
                      <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
                        {services.map((svc) => (
                          <li key={svc.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3.5 dark:border-white/[0.08]">
                            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900 dark:text-white">
                              <Flag code={svc.country} />
                              <span className="break-keep">{p(svc.title)}</span>
                            </p>
                            <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600 dark:text-slate-300">
                              {svc.handles.map((h) => (
                                <li key={h.en} className="break-keep">
                                  {p(h)}
                                </li>
                              ))}
                            </ul>
                            {svc.leadTime && (
                              <p className="flex items-start gap-1 break-keep text-[11.5px] text-slate-500 dark:text-slate-400">
                                <Clock className="mt-0.5 size-3 shrink-0" aria-hidden />
                                {p(svc.leadTime)}
                              </p>
                            )}
                            <details className="group text-xs text-slate-600 dark:text-slate-300">
                              <summary className="cursor-pointer select-none text-[11.5px] font-semibold text-brand-700 hover:underline dark:text-brand-300">{L.needs}</summary>
                              <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                                {svc.needs.map((n) => (
                                  <li key={n.en} className="break-keep">
                                    {p(n)}
                                  </li>
                                ))}
                              </ul>
                              {svc.basis?.length ? (
                                <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                                  {svc.basis.map((x) => (
                                    <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-200">
                                      {x.label}
                                    </a>
                                  ))}
                                </p>
                              ) : null}
                            </details>
                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                              <span className="text-[11px] text-slate-400">{p(svc.expert)}</span>
                              <Button size="sm" variant="subtle" onClick={() => expertForService(svc)} className="no-print shrink-0">
                                {L.request}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </>
              )}
              {s.id === 'partners' && <PartnersModule key={`p-${report.id}`} product={product} intent={report.intent} onOpen={onOpenAssistant} />}
              {s.id === 'shipping' && (
                <>
                  <Card>
                    <LogisticsLanes product={product} />
                  </Card>
                  <TrackingPanel product={product} mode="shipping" />
                </>
              )}
              {s.id === 'customs' && <TrackingPanel product={product} mode="customs" />}
            </section>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {current ? `${L.step} ${progress.step + 1}: ${p(current.title)}` : ''}
        </p>
      </div>
    </InStepContext.Provider>
  );
}
