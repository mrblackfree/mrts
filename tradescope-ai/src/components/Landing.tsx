'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ClipboardCheck, ExternalLink, Handshake, MessageSquareText, Ship, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CORRIDORS } from '@/data/corridors';
import { EXPERT_INDEX } from '@/data/experts';
import { KR_PH_OVERVIEW, PRODUCTS } from '@/data/kr-ph-trade-db';
import { formatPct, formatUsd, trend, yoy } from '@/lib/format';
import type { PublicPricing } from '@/lib/pricing';
import { STATIC_PREVIEW } from '@/lib/preview';
import { bestTariff, mfnTariff } from '@/lib/engine/simulate';
import type { Direction } from '@/lib/types';
import { Flag } from './Flag';
import { useI18n } from './I18nProvider';
import { STEPS } from './journey/TradeJourney';
import { Button, cx, Segmented, SourceTag } from './ui';

/** Section anchors, shared with the header's page navigation. */
export const LANDING_SECTIONS = [
  { id: 'how', key: 'navHow' },
  { id: 'products', key: 'navProducts' },
  { id: 'experts', key: 'navExperts' },
  { id: 'pricing', key: 'navPricing' },
  { id: 'markets', key: 'navMarkets' },
  { id: 'trade', key: 'navTrade' },
] as const;

function SectionHead({ eyebrow, title, sub, id, right }: { eyebrow: string; title: string; sub?: string; id: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">{eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-2 text-balance break-keep text-[24px] font-bold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[30px] dark:text-white">
          {title}
        </h2>
        {sub && <p className="mt-2 text-pretty break-keep text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Route({ direction, short }: { direction: Direction; short?: boolean }) {
  const { t } = useI18n();
  const [from, to] = direction === 'PH_TO_KR' ? (['PH', 'KR'] as const) : (['KR', 'PH'] as const);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Flag code={from} />
      {short ? from : t(`country${from}`)}
      <ArrowRight className="size-3 opacity-60" aria-hidden />
      <Flag code={to} />
      {short ? to : t(`country${to}`)}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------
function HowItWorks() {
  const { t, p } = useI18n();
  const steps = [
    { icon: <MessageSquareText className="size-5" />, title: t('how1Title'), body: t('how1Body') },
    { icon: <ClipboardCheck className="size-5" />, title: t('how2Title'), body: t('how2Body') },
    { icon: <UserRoundCheck className="size-5" />, title: t('how3Title'), body: t('how3Body') },
    { icon: <Ship className="size-5" />, title: t('how4Title'), body: t('how4Body') },
  ];
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24">
      <SectionHead id="how" eyebrow={t('howEyebrow')} title={t('howTitle')} sub={t('howSub')} />
      <ol className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-hairline sm:p-5 dark:border-white/[0.07] dark:bg-[#0c121d]">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 sm:size-11 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">{s.icon}</span>
              <span className="font-mono text-[13px] font-semibold text-slate-300 dark:text-slate-600">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="mt-4 text-[17px] font-bold tracking-[-0.02em] text-slate-900 sm:mt-5 sm:text-[18px] dark:text-white">{s.title}</h3>
            <p className="mt-1.5 text-pretty break-keep text-[13px] leading-relaxed text-slate-500 sm:text-[14px] dark:text-slate-400">{s.body}</p>
          </li>
        ))}
      </ol>

      {/* the report itself: the 7 steps of a real trade, in order */}
      <div className="mt-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
        <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{t('railTitle')}</p>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200/80 dark:bg-white/[0.04] dark:text-slate-200 dark:ring-white/[0.07]">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">{i + 1}</span>
              <span className="min-w-0 break-keep leading-tight">{p(s.title)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
function ProductPicker({ onPick }: { onPick: (productId: string) => void }) {
  const { t, p } = useI18n();
  const [filter, setFilter] = useState<'all' | Direction>('all');
  const shown = PRODUCTS.filter((x) => filter === 'all' || x.direction === filter);
  return (
    <section id="products" aria-labelledby="products-title" className="scroll-mt-24">
      <SectionHead
        id="products"
        eyebrow={t('productsEyebrow')}
        title={t('productsTitle')}
        sub={t('productsSub')}
        right={
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            ariaLabel={t('directionLabel')}
            options={[
              { value: 'all', label: t('filterAll') },
              { value: 'PH_TO_KR', label: t('dirImport') },
              { value: 'KR_TO_PH', label: t('dirExport') },
            ]}
          />
        }
      />
      <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((prod) => {
          const best = bestTariff(prod);
          const mfn = mfnTariff(prod);
          return (
            <li key={prod.id}>
              <button
                type="button"
                onClick={() => onPick(prod.id)}
                aria-label={`${p(prod.name)} · ${prod.direction === 'PH_TO_KR' ? t('dirImport') : t('dirExport')} · ${t('dutyWithFta')} ${mfn.rate === best.rate ? '' : `${mfn.rate}% → `}${best.rate}% · ${t('openGuide')}`}
                className="group flex h-full w-full flex-col rounded-[22px] border border-slate-200/80 bg-white p-4 text-left sm:p-5 shadow-hairline transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevated dark:border-white/[0.07] dark:bg-[#0c121d] dark:hover:border-white/15"
              >
                <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-slate-50 text-[24px] ring-1 ring-inset ring-slate-200/70 sm:size-12 sm:text-[26px] dark:bg-white/[0.05] dark:ring-white/10">
                  {prod.emoji}
                </span>
                <p className="mt-4 text-pretty break-keep text-[15px] font-bold leading-snug tracking-[-0.015em] text-slate-900 sm:text-[16px] dark:text-white">{p(prod.name)}</p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{prod.direction === 'PH_TO_KR' ? t('dirImport') : t('dirExport')}</span> · <Route direction={prod.direction} short />
                </p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4 sm:pt-5">
                  <div>
                    <p className="text-[11.5px] font-medium text-slate-400">{t('dutyWithFta')}</p>
                    <p className="mt-0.5 text-[15px] font-bold tabular-nums text-slate-900 dark:text-white">
                      {mfn.rate !== best.rate && (
                        <>
                          <span className="text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{mfn.rate}%</span>
                          <ArrowRight className="mx-1 inline size-3.5 text-slate-400" aria-label="→" />
                        </>
                      )}
                      <span className="text-emerald-700 dark:text-emerald-400">{best.rate}%</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                    <span className="sr-only sm:not-sr-only">{t('openGuide')}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
const FEATURED_SERVICES = ['ph-fda-food', 'ph-bai-petfood', 'ph-customs-broker', 'ph-importer-partner'];

type PublicPartner = { country: string; type: 'law' | 'customs'; name: string; city: string; website: string };

function ExpertBand({ onExpert }: { onExpert: () => void }) {
  const { t, p } = useI18n();
  // contracted firms only (set on /admin → 파트너 관리); nothing is shown before a contract is signed
  const [partners, setPartners] = useState<PublicPartner[]>([]);
  useEffect(() => {
    if (STATIC_PREVIEW) return;
    let alive = true;
    fetch('/api/partners')
      .then((r) => r.json())
      .then((j) => alive && Array.isArray(j?.partners) && setPartners(j.partners.slice(0, 8)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <section id="experts" aria-labelledby="experts-title" className="scroll-mt-24">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-ink-900 px-6 py-10 text-white shadow-float sm:px-10 sm:py-12 dark:bg-[#0d1626] dark:ring-1 dark:ring-white/[0.08]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-brand-500/25 blur-3xl" />
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-300">{t('expertsEyebrow')}</p>
            <h2 id="experts-title" className="mt-2 text-balance break-keep text-[24px] font-bold leading-tight tracking-[-0.03em] sm:text-[30px]">
              {t('expertsTitle')}
            </h2>
            <p className="mt-4 max-w-xl text-pretty break-keep text-[15px] leading-relaxed text-slate-300">{t('expertsBody')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExpert}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-semibold text-ink-900 shadow-hairline transition hover:bg-slate-100"
              >
                <Handshake className="size-4" aria-hidden />
                {t('expertsCta')}
              </button>
            </div>
            {partners.length > 0 && (
              <div className="mt-7">
                <p className="text-[12px] font-semibold text-slate-400">{t('expertsPartners')}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {partners.map((x) => (
                    <li key={`${x.country}-${x.name}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 text-[12.5px] font-medium text-slate-200 ring-1 ring-inset ring-white/10">
                      <Flag code={x.country} />
                      {x.name}
                      <span className="text-slate-400">· {x.type === 'law' ? t('partnerLaw') : t('partnerCustoms')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <ul className="grid gap-2">
              {FEATURED_SERVICES.map((id) => {
                const svc = EXPERT_INDEX[id];
                if (!svc) return null;
                return (
                  <li key={id} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
                    <p className="flex items-start gap-2.5 text-[14.5px] font-semibold leading-snug">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                      <span className="break-keep">{p(svc.title)}</span>
                    </p>
                    {svc.leadTime && (
                      <p className="mt-1.5 hidden pl-[26px] text-[12.5px] leading-relaxed text-slate-400 sm:block">
                        {t('expertsLead')} · {p(svc.leadTime)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 hidden text-[11.5px] leading-relaxed text-slate-500 sm:block">{t('expertsNote')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
const PLAN_TEXT = {
  ko: {
    free: { name: '무료', tag: '바로 시작', price: '₩0', unit: '', cta: '무료로 분석하기', features: ['품목 분석 · 관세·FTA 비교', '7단계 거래 진행 가이드 · PDF 리포트', '제안 메일 · Proforma Invoice', '데이터 신뢰도 센터'] },
    case: { name: '건당', tag: '맡길 때만', unit: '/ 건부터', quote: '견적 후 안내', cta: '결제하기', ctaQuote: '견적 요청', features: ['국가별 계약 법무법인 · 관세법인 연결', 'FDA·BAI 인허가 · 수입자 등록 · 통관 대행 중 1건', '착수 전 범위 · 기간 · 금액 확정', '완료까지 담당 매니저가 진행 공유'] },
    sub: { name: '구독', tag: '거래가 잦다면', unit: '/ 월', yearly: '연 결제', quote: '문의', cta: '구독하기', ctaQuote: '구독 문의', features: ['전문가 요청 우선 배정 · 전담 매니저', '실제 선사·통관 소스로 화물 추적', '선적·통관 단계 진행 알림', '월간 규정 · 시장 업데이트'] },
    note: 'VAT 별도 · 기관 수수료(FDA·BAI·BOC 등)는 실비 별도 · 결제는 연결된 결제 페이지에서 진행됩니다.',
  },
  en: {
    free: { name: 'Free', tag: 'Start now', price: '₩0', unit: '', cta: 'Analyse for free', features: ['Product analysis · duty & FTA comparison', '7-step trade guide · PDF report', 'Proposal email · proforma invoice', 'Data Trust Center'] },
    case: { name: 'Per case', tag: 'Only when you hand it over', unit: '/ case, from', quote: 'Quoted on request', cta: 'Check out', ctaQuote: 'Request a quote', features: ['Contracted law & customs firms in each country', 'One case: FDA/BAI permit, importer registration or clearance', 'Scope, timing and price fixed before work starts', 'A case manager keeps you updated to the end'] },
    sub: { name: 'Subscription', tag: 'For frequent trade', unit: '/ month', yearly: 'billed yearly', quote: 'Contact us', cta: 'Subscribe', ctaQuote: 'Ask about plans', features: ['Priority on expert requests · dedicated manager', 'Cargo tracking from real carrier & customs sources', 'Shipment and clearance progress alerts', 'Monthly regulation & market update'] },
    note: 'Excl. VAT · agency fees (FDA, BAI, BOC…) at cost · payment happens on the linked checkout page.',
  },
};

const krw = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

function Pricing({ onStart, onPlan }: { onStart: () => void; onPlan: (plan: 'case' | 'sub') => void }) {
  const { t, lang } = useI18n();
  const L = PLAN_TEXT[lang];
  const [pricing, setPricing] = useState<PublicPricing | null>(null);
  useEffect(() => {
    if (STATIC_PREVIEW) return;
    let alive = true;
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((j) => alive && j?.ok && setPricing(j.pricing))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const casePrice = pricing?.perCase.price ?? null;
  const subMonthly = pricing?.subscription.monthly ?? null;
  const subYearly = pricing?.subscription.yearly ?? null;
  const plans = [
    { id: 'free' as const, name: L.free.name, tag: L.free.tag, price: L.free.price, unit: '', extra: null as string | null, features: L.free.features, cta: L.free.cta, href: null as string | null, featured: false },
    { id: 'case' as const, name: L.case.name, tag: L.case.tag, price: casePrice ? krw(casePrice) : L.case.quote, unit: casePrice ? L.case.unit : '', extra: null, features: L.case.features, cta: pricing?.perCase.checkoutUrl ? L.case.cta : L.case.ctaQuote, href: pricing?.perCase.checkoutUrl ?? null, featured: false },
    { id: 'sub' as const, name: L.sub.name, tag: L.sub.tag, price: subMonthly ? krw(subMonthly) : L.sub.quote, unit: subMonthly ? L.sub.unit : '', extra: subYearly ? `${L.sub.yearly} ${krw(subYearly)}` : null, features: L.sub.features, cta: pricing?.subscription.checkoutUrl ? L.sub.cta : L.sub.ctaQuote, href: pricing?.subscription.checkoutUrl ?? null, featured: true },
  ];
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24">
      <SectionHead id="pricing" eyebrow={t('pricingEyebrow')} title={t('pricingTitle')} sub={t('pricingSub')} />
      <ul className="mt-8 grid gap-3 lg:grid-cols-3">
        {plans.map((pl) => (
          <li
            key={pl.id}
            className={cx(
              'relative flex min-w-0 flex-col rounded-[24px] border p-5 sm:p-6',
              pl.featured ? 'border-ink-900 bg-ink-900 text-white shadow-soft dark:border-white/20 dark:bg-white/[0.06]' : 'border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-[#0c121d]',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className={cx('text-[17px] font-bold tracking-[-0.02em]', pl.featured ? 'text-white' : 'text-slate-900 dark:text-white')}>{pl.name}</h3>
              <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-bold', pl.featured ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300')}>{pl.tag}</span>
            </div>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
              <span className={cx('text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums', pl.featured ? 'text-white' : 'text-slate-900 dark:text-white')}>{pl.price}</span>
              {pl.unit && <span className={cx('text-[13px] font-medium', pl.featured ? 'text-white/70' : 'text-slate-500 dark:text-slate-400')}>{pl.unit}</span>}
            </p>
            <p className={cx('mt-1.5 h-4 text-[12px] tabular-nums', pl.featured ? 'text-white/60' : 'text-slate-400')}>{pl.extra ?? ''}</p>
            <ul className="mt-5 grid gap-2.5">
              {pl.features.map((f) => (
                <li key={f} className={cx('flex items-start gap-2 break-keep text-[13.5px] leading-snug', pl.featured ? 'text-white/85' : 'text-slate-600 dark:text-slate-300')}>
                  <Check className={cx('mt-0.5 size-4 shrink-0', pl.featured ? 'text-brand-300' : 'text-brand-600 dark:text-brand-400')} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              {pl.href ? (
                <a
                  href={pl.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(
                    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors',
                    pl.featured ? 'bg-white text-ink-900 hover:bg-white/90' : 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900',
                  )}
                >
                  {pl.cta}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              ) : (
                <Button
                  variant={pl.featured ? 'secondary' : pl.id === 'free' ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full"
                  onClick={() => (pl.id === 'free' ? onStart() : onPlan(pl.id))}
                >
                  {pl.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 break-keep text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">{L.note}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
/** The live corridor and the next ones — the coming-soon cards are shown only, nothing behind them yet. */
function Markets() {
  const { t, p } = useI18n();
  return (
    <section id="markets" aria-labelledby="markets-title" className="scroll-mt-24">
      <SectionHead id="markets" eyebrow={t('marketsEyebrow')} title={t('marketsTitle')} sub={t('marketsSub')} />
      <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {CORRIDORS.map((c) => {
          const live = c.status === 'live';
          return (
            <li
              key={c.code}
              aria-label={`${p(c.name)} · ${live ? t('marketLive') : t('comingSoon')}`}
              className={cx(
                'relative flex min-w-0 flex-col rounded-[22px] border p-4 sm:p-5',
                live
                  ? 'col-span-2 border-brand-300 bg-white shadow-soft ring-1 ring-brand-500/15 lg:col-span-1 dark:border-brand-400/40 dark:bg-[#0c121d]'
                  : 'border-dashed border-slate-300/90 bg-slate-50/60 dark:border-white/15 dark:bg-white/[0.02]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  <Flag code="KR" className={live ? '' : 'opacity-70 grayscale-[40%]'} />
                  <span aria-hidden>↔</span>
                  <Flag code={c.code} className={cx('h-[1.05em]', live ? '' : 'opacity-70 grayscale-[40%]')} />
                </span>
                <span
                  className={cx(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]',
                    live ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-slate-900 text-white dark:bg-white/90 dark:text-slate-900',
                  )}
                >
                  {live ? t('marketLive') : t('comingSoon')}
                </span>
              </div>
              <p className={cx('mt-4 text-[17px] font-bold tracking-[-0.02em]', live ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{p(c.name)}</p>
              <p className="mt-1 break-keep text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{p(c.agreements)}</p>
              {live && <p className="mt-3 break-keep text-[12.5px] font-medium leading-relaxed text-brand-800 dark:text-brand-200">{t('marketLiveNote')}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">{t('marketsNote')}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
function TradeSnapshot({ onOpenTrust }: { onOpenTrust: () => void }) {
  const { t, p } = useI18n();
  const ex = KR_PH_OVERVIEW.krExportsToPh;
  const im = KR_PH_OVERVIEW.krImportsFromPh;
  const last = ex.length - 1;
  const year = ex[last].year;
  const total = ex[last].value + im[last].value;
  const totalPrev = ex[last - 1].value + im[last - 1].value;
  const kpis = [
    { label: t('totalTrade'), value: total, delta: yoy(total, totalPrev) },
    { label: t('krExports'), value: ex[last].value, delta: yoy(ex[last].value, ex[last - 1].value) },
    { label: t('krImports'), value: im[last].value, delta: yoy(im[last].value, im[last - 1].value) },
  ];
  return (
    <section id="trade" aria-labelledby="trade-title" className="scroll-mt-24">
      <SectionHead
        id="trade"
        eyebrow={t('tradeEyebrow')}
        title={t('overviewTitle')}
        sub={t('overviewSub')}
        right={
          <Button variant="secondary" size="sm" onClick={onOpenTrust}>
            <ShieldCheck className="size-4" aria-hidden />
            {t('openTrustCenter')}
          </Button>
        }
      />
      <dl className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {kpis.map((k) => {
          const dir = trend(k.delta);
          return (
            <div key={k.label} className="flex flex-col rounded-[22px] border border-slate-200/80 bg-white p-3.5 shadow-hairline sm:p-5 dark:border-white/[0.07] dark:bg-[#0c121d]">
              <dt className="break-keep text-[11.5px] font-medium leading-snug text-slate-500 sm:text-[13px] dark:text-slate-400">
                {k.label} · {year}
              </dt>
              <dd className="mt-auto pt-3 text-[19px] font-bold leading-none tracking-[-0.03em] tabular-nums text-slate-900 sm:text-[30px] dark:text-white">{formatUsd(k.value, { compact: true })}</dd>
              <dd className="mt-2 inline-flex flex-wrap items-center gap-x-1 text-[11.5px] font-medium tabular-nums text-slate-500 sm:mt-3 sm:text-[13px] dark:text-slate-400">
                {dir === 'up' ? (
                  <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : dir === 'down' ? (
                  <ArrowDownRight className="size-4 text-rose-600 dark:text-rose-400" aria-hidden />
                ) : null}
                {t('yoyLabel')} {formatPct(k.delta, 1, true)}
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
          <Handshake className="size-4 text-brand-700 dark:text-brand-300" aria-hidden />
          {p(KR_PH_OVERVIEW.ftaInForce)}
        </p>
        <SourceTag meta={KR_PH_OVERVIEW.meta} />
      </div>
    </section>
  );
}

export default function Landing({
  onPick,
  onExpert,
  onOpenTrust,
  onStart,
  onPlan,
}: {
  onPick: (productId: string) => void;
  onExpert: () => void;
  onOpenTrust: () => void;
  onStart: () => void;
  onPlan: (plan: 'case' | 'sub') => void;
}) {
  return (
    <div className="rise-in space-y-20 pt-8 sm:space-y-24 sm:pt-12">
      <HowItWorks />
      <ProductPicker onPick={onPick} />
      <ExpertBand onExpert={onExpert} />
      <Pricing onStart={onStart} onPlan={onPlan} />
      <Markets />
      <TradeSnapshot onOpenTrust={onOpenTrust} />
    </div>
  );
}
