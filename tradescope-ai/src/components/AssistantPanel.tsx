'use client';

import { AlertTriangle, Bot, ExternalLink, FileText, Mail, MapPin, Send, Sparkles, Star, Target, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalDialog } from './useModalDialog';
import { formatNumber, formatUsd } from '@/lib/format';
import { PARTNER_TYPE_LABEL, type DictKey } from '@/lib/i18n';
import { buildDraftLocal, defaultDraftOptions, DRAFT_LIMITS, partnerFactors, priceForIncoterm, priceOnBasis, proformaToText } from '@/lib/engine/simulate';
import type { DraftOptions, EmailDraft, Lang, Partner, QueryIntent, TradeProduct } from '@/lib/types';
import { useI18n } from './I18nProvider';
import { Badge, Button, buttonClass, CopyButton, cx, ProgressBar, ScoreRing, Segmented } from './ui';

interface Props {
  product: TradeProduct;
  partner: Partner & { regionMatch?: boolean };
  intent: QueryIntent;
  initialTab: 'analysis' | 'email';
  aiEnabled: boolean;
  onClose: () => void;
}

const FACTOR_LABEL: Record<string, DictKey> = { channel: 'fChannel', logistics: 'fLogistics', compliance: 'fCompliance', scale: 'fScale' };

const APPROACH = {
  buyer: [
    { ko: '카탈로그·가격표·무상 샘플 선발송으로 첫 미팅 확보', en: 'Send catalogue, price list and free samples first to win the first meeting' },
    { ko: 'FTA 원산지 서류·인증(등록) 지원 패키지를 제안서에 포함', en: 'Bundle FTA origin documents and registration support into the proposal' },
    { ko: '트라이얼 오더(LCL) → 성과 검증 후 정기 컨테이너 계약 전환', en: 'Start with a trial LCL order, then convert to regular container contracts' },
  ],
  seller: [
    { ko: '공장 실사(화상 포함)·시험성적서·위생 인증 현황 확인', en: 'Run a (video) factory audit and check test reports & hygiene certificates' },
    { ko: '수입국 정밀검사 항목 기준으로 샘플 사전 테스트', en: 'Pre-test samples against the importing country’s inspection items' },
    { ko: '연간 공급계약에 원산지증명 발급·품질 클레임 조항 명시', en: 'Write CO issuance and quality-claim clauses into an annual supply contract' },
  ],
};

export default function AssistantPanel({ product, partner, intent, initialTab, aiEnabled, onClose }: Props) {
  const { t, p, lang } = useI18n();
  const [tab, setTab] = useState<'analysis' | 'email'>(initialTab);
  const [options, setOptions] = useState<DraftOptions>(() => defaultDraftOptions(product, intent, partner));
  // raw text of the price field, so partially typed decimals ("3.") are not coerced away
  const [priceText, setPriceText] = useState(() => String(options.unitPrice));
  const [emailLang, setEmailLang] = useState<Lang>(lang);
  // a polished email is only valid for the exact options it was requested with
  const [polished, setPolished] = useState<{ lang: Lang; email: EmailDraft; model?: string; options: DraftOptions } | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(onClose, closeRef);

  useEffect(() => setTab(initialTab), [initialTab, partner.id]);

  const draft = useMemo(() => buildDraftLocal(product.id, partner.id, options), [product.id, partner.id, options]);
  const factors = useMemo(() => partnerFactors(partner), [partner]);
  const polishedValid = !!polished && polished.lang === emailLang && polished.options === options;
  const email = polishedValid ? polished!.email : draft?.email[emailLang];
  const update = (patch: Partial<DraftOptions>) => {
    setOptions((o) => ({ ...o, ...patch }));
    if (patch.unitPrice !== undefined) setPriceText(String(patch.unitPrice));
    setPolished(null);
    setNotice(null);
  };

  const polish = async () => {
    setPolishing(true);
    setNotice(null);
    const requested = options;
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, partnerId: partner.id, options: requested, lang: emailLang, polish: true }),
      });
      const json = await res.json();
      if (json?.error === 'invalid-option') {
        setNotice(`${t('polishInvalid')}: ${String(json.field ?? '')}`);
      } else if (json?.ok && json.draft?.engine?.mode === 'llm') {
        setPolished({ lang: emailLang, email: json.draft.email[emailLang], model: json.draft.engine.model, options: requested });
      } else {
        setNotice(json?.draft?.engine?.fallbackReason === 'no-api-key' ? t('polishNoKey') : t('polishFail'));
      }
    } catch {
      setNotice(t('polishFail'));
    } finally {
      setPolishing(false);
    }
  };

  // Some desktop mail clients truncate long mailto URLs (Korean text triples in size when encoded). Above the
  // limit the full text goes to the clipboard and the mail client opens with a short pointer instead.
  const MAILTO_MAX = 1800;
  const fullMailto = email ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}` : '#';
  const mailtoTooLong = fullMailto.length > MAILTO_MAX;
  const mailto = email && mailtoTooLong ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(t('mailtoPaste'))}` : fullMailto;
  const onMailto = () => {
    if (!email || !mailtoTooLong) return;
    navigator.clipboard?.writeText(`${email.body}`).then(
      () => setNotice(t('mailtoCopied')),
      () => setNotice(t('mailtoCopyFail')),
    );
  };
  const inputCls =
    'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-hairline outline-none transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_4px_rgb(42_133_166/0.12)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white';
  const labelCls = 'mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400';

  return (
    <div ref={dialogRef} className="no-print fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t('m5Title')}>
      <button type="button" aria-label={t('close')} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="rise-in relative flex h-full w-full min-w-0 max-w-2xl flex-col bg-white shadow-float ring-1 ring-slate-900/5 sm:rounded-l-[24px] dark:bg-[#0b111c] dark:ring-white/10">
        {/* Header */}
        <div className="border-b border-slate-200/80 px-5 pb-0 pt-5 dark:border-white/[0.07]">
          <div className="flex items-start gap-3">
            <ScoreRing value={partner.score} size={60} label={t('match')} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
                <Bot className="size-3.5" /> Module 5 · {t('m5Title')}
              </p>
              <h2 className="mt-1 text-xl font-bold leading-snug text-slate-900 dark:text-white">{partner.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {partner.city}
                </span>
                <span>{partner.country === 'KR' ? '🇰🇷' : '🇵🇭'} {PARTNER_TYPE_LABEL[partner.type][lang]}</span>
                <a href={partner.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-brand-700 hover:underline dark:text-brand-400">
                  {partner.linkType === 'official' ? t('linkOfficial') : t('linkListing')} <ExternalLink className="size-3" />
                </a>
              </p>
            </div>
            <Button ref={closeRef} variant="ghost" size="md" icon onClick={onClose} aria-label={t('close')} className="-mr-1 -mt-1 rounded-full">
              <X className="size-5" />
            </Button>
          </div>
          <div className="mt-4 flex gap-5" role="tablist">
            {(['analysis', 'email'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cx(
                  '-mb-px inline-flex items-center gap-1.5 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors',
                  tab === k ? 'border-ink-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                )}
              >
                {k === 'analysis' ? <Target className="size-4" /> : <Mail className="size-4" />}
                {k === 'analysis' ? t('tabAnalysis') : t('tabEmail')}
              </button>
            ))}
          </div>
        </div>

        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {tab === 'analysis' ? (
            <div className="space-y-5">
              <p className="rounded-2xl bg-gradient-to-b from-slate-50 to-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200/70 dark:from-white/[0.04] dark:to-transparent dark:text-slate-200 dark:ring-white/[0.07]">{p(partner.comment)}</p>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('factors')}</p>
                <ul className="space-y-2.5">
                  {factors.map((f) => (
                    <li key={f.key} className="grid grid-cols-[8.5rem_1fr_2.75rem] items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{t(FACTOR_LABEL[f.key])}</span>
                      <ProgressBar value={f.value} tone={f.value >= 85 ? 'green' : 'brand'} />
                      <span className="text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">{f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('strengths')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {partner.strengths.map((s, i) => (
                    <Badge key={i} tone="green">
                      <Star className="size-3" />
                      {p(s)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('appeal')}</p>
                <ol className="space-y-2">
                  {partner.appeal.map((a, i) => (
                    <li key={i} className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-b from-brand-500 to-brand-700 text-xs font-bold text-white">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{p(a)}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('approach')}</p>
                <ol className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                  {APPROACH[partner.role].map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-bold text-brand-600">{i + 1}.</span>
                      {p(a)}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-bold">{t('caution')}: </span>
                  {p(partner.caution)}
                </span>
              </p>

              <button
                type="button"
                onClick={() => setTab('email')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/30 hover:brightness-110"
              >
                <Mail className="size-4" />
                {t('makeEmail')}
              </button>
            </div>
          ) : (
            draft &&
            email && (
              <div className="space-y-5">
                {/* Options */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-4 dark:border-white/[0.07]">
                  <label className="col-span-2">
                    <span className={labelCls}>{t('incoterm')}</span>
                    <select className={inputCls} value={options.incoterm} onChange={(e) => update({ incoterm: e.target.value, unitPrice: priceForIncoterm(product, e.target.value) })}>
                      {product.pricing.incoterms.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelCls}>{t('unitPrice')}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputCls}
                      value={priceText}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        setPriceText(raw);
                        const n = Math.min(DRAFT_LIMITS.unitPrice, Number(raw));
                        if (raw !== '' && !raw.endsWith('.') && Number.isFinite(n)) {
                          setOptions((o) => ({ ...o, unitPrice: n }));
                          setPolished(null);
                          setNotice(null);
                        }
                      }}
                      onBlur={() => setPriceText(String(options.unitPrice))}
                    />
                  </label>
                  <label>
                    <span className={labelCls}>
                      {t('moq')} ({product.pricing.unit})
                    </span>
                    <input type="number" min={0} max={DRAFT_LIMITS.moq} className={inputCls} value={options.moq} onChange={(e) => update({ moq: Math.min(DRAFT_LIMITS.moq, Math.max(0, Number(e.target.value))) })} />
                  </label>
                  <p className="col-span-2 -mt-1 text-[11px] text-slate-400 sm:col-span-4">{t('priceHint')}</p>
                  {(() => {
                    const pc = product.verification?.priceCheck;
                    if (!pc || !product.pricing.unitKg || pc.status === 'not-comparable') return null;
                    // compare on the benchmark's own basis (CIF for imports, FOB for exports), not the selected incoterm
                    const onBasis = priceOnBasis(product, options.unitPrice, options.incoterm, pc.basis);
                    if (onBasis === undefined) return null;
                    const perKg = onBasis / product.pricing.unitKg;
                    return (
                      <p className="col-span-2 -mt-1 text-[11px] font-semibold text-emerald-700 sm:col-span-4 dark:text-emerald-400">
                        {lang === 'ko' ? '공식 통관 단가 기준' : 'Official unit-value benchmark'}: ${pc.usdPerKg}/kg ({pc.year} {pc.basis}) → {lang === 'ko' ? `현재 단가 ${pc.basis} 환산` : `current price on ${pc.basis} basis`} ${perKg.toFixed(2)}/kg ({(perKg / pc.usdPerKg).toFixed(2)}×)
                      </p>
                    );
                  })()}
                  <label className="col-span-2">
                    <span className={labelCls}>{t('payment')}</span>
                    <select className={inputCls} value={options.payment} onChange={(e) => update({ payment: e.target.value as DraftOptions['payment'] })}>
                      <option value="TT_30_70">T/T 30/70</option>
                      <option value="TT_100">T/T 100% advance</option>
                      <option value="LC_SIGHT">L/C at sight</option>
                    </select>
                  </label>
                  <label className="col-span-2">
                    <span className={labelCls}>{t('quantity')}</span>
                    <input type="number" min={0} max={DRAFT_LIMITS.quantity} className={inputCls} value={options.quantity} onChange={(e) => update({ quantity: Math.min(DRAFT_LIMITS.quantity, Math.max(0, Number(e.target.value))) })} />
                  </label>
                  <fieldset className="col-span-2 sm:col-span-4">
                    <legend className={labelCls}>{t('sample')}</legend>
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ['free', t('sampleFree')],
                          ['paid-credit', t('samplePaid')],
                          ['none', t('sampleNone')],
                        ] as const
                      ).map(([v, label]) => (
                        <label key={v} className={cx('inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs font-semibold transition-[background-color,border-color,color] duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500', options.sample === v ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300')}>
                          <input type="radio" name="sample" className="sr-only" checked={options.sample === v} onChange={() => update({ sample: v })} />
                          {label}
                        </label>
                      ))}
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <input type="checkbox" className="size-4 accent-[#1d6c8c]" checked={options.sampleCourierByBuyer} onChange={(e) => update({ sampleCourierByBuyer: e.target.checked })} disabled={options.sample === 'none'} />
                        {t('courierBuyer')}
                      </label>
                    </div>
                  </fieldset>
                  <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-2 sm:col-span-4">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input type="checkbox" className="size-4 accent-[#1d6c8c]" checked={options.includeFtaNote} onChange={(e) => update({ includeFtaNote: e.target.checked })} />
                      {t('ftaNote')}
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input type="checkbox" className="size-4 accent-[#1d6c8c]" checked={options.includeCertNote} onChange={(e) => update({ includeCertNote: e.target.checked })} />
                      {t('certNote')}
                    </label>
                  </div>
                  <label className="col-span-2">
                    <span className={labelCls}>{t('senderCompany')}</span>
                    <input className={inputCls} value={options.senderCompany} maxLength={80} placeholder={emailLang === 'ko' ? '[회사명]' : '[Your Company]'} onChange={(e) => update({ senderCompany: e.target.value })} />
                  </label>
                  <label className="col-span-2">
                    <span className={labelCls}>{t('senderName')}</span>
                    <input className={inputCls} value={options.senderName} maxLength={80} placeholder={emailLang === 'ko' ? '[담당자명]' : '[Your Name]'} onChange={(e) => update({ senderName: e.target.value })} />
                  </label>
                </div>

                {/* Email */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Send className="size-4 text-brand-500" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('emailLang')}</span>
                      <Segmented
                        size="sm"
                        value={emailLang}
                        onChange={(v) => setEmailLang(v)}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'ko', label: '국문' },
                        ]}
                      />
                    </div>
                    <Badge tone={polishedValid ? 'green' : 'brand'}>
                      {polishedValid ? `${t('engineLlm')} · ${polished!.model ?? ''}` : t('engineSim')}
                    </Badge>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-xs text-slate-400">{t('subject')}</p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 dark:bg-white/[0.04] dark:text-white">{email.subject}</p>
                    <pre className="thin-scroll max-h-[22rem] overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-3 font-sans text-[13px] leading-relaxed text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">{email.body}</pre>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-white/[0.07]">
                    <CopyButton text={`${email.subject}\n\n${email.body}`} />
                    <a href={mailto} onClick={onMailto} title={mailtoTooLong ? t('mailtoCopied') : undefined} className={buttonClass({ size: 'sm' })}>
                      <Mail className="size-3.5" aria-hidden />
                      {t('openMail')}
                    </a>
                    <Button variant="ai" size="sm" onClick={polish} loading={polishing} title={aiEnabled ? undefined : t('polishNoKey')} className="ml-auto">
                      {!polishing && (aiEnabled ? <Sparkles className="size-3.5" aria-hidden /> : <Wand2 className="size-3.5" aria-hidden />)}
                      {polishing ? t('polishing') : t('polish')}
                    </Button>
                  </div>
                  {notice && <p className="px-4 pb-3 text-xs font-medium text-amber-600 dark:text-amber-400">{notice}</p>}
                </div>

                {/* Proforma invoice */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <FileText className="size-4 text-brand-500" />
                      {t('piTitle')}
                    </span>
                    <CopyButton text={proformaToText(draft.pi)} label={t('copyPi')} />
                  </div>
                  <div className="space-y-3 p-4 text-xs">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-base font-extrabold tracking-wide text-slate-900 dark:text-white">PROFORMA INVOICE</p>
                      <p className="font-mono text-slate-500">{draft.pi.number}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {[
                        ['Seller', draft.pi.seller],
                        ['Buyer', draft.pi.buyer],
                        ['Date', draft.pi.date],
                        ['Valid until', draft.pi.validUntil],
                        ['Terms', draft.pi.incoterm],
                        ['Payment', draft.pi.payment],
                        ['Port of loading', draft.pi.portOfLoading],
                        ['Port of discharge', draft.pi.portOfDischarge],
                      ].map(([k, v]) => (
                        <div key={k} className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                          <dd className="font-semibold text-slate-700 dark:text-slate-200">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="thin-scroll overflow-x-auto">
                      <table className="w-full min-w-[460px] text-left">
                        <thead>
                          <tr className="border-y border-slate-200 text-[10px] uppercase tracking-wide text-slate-400 dark:border-white/10">
                            <th className="py-1.5">Description</th>
                            <th className="py-1.5">HS</th>
                            <th className="py-1.5 text-right">Qty</th>
                            <th className="py-1.5 text-right">Unit price</th>
                            <th className="py-1.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.pi.lines.map((l, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-white/[0.07]">
                              <td className="py-1.5 pr-2 font-medium text-slate-700 dark:text-slate-200">{l.description}</td>
                              <td className="py-1.5 font-mono text-slate-500">{l.hsCode}</td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatNumber(l.quantity)} {l.unit}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">{formatUsd(l.unitPrice, { decimals: 2 })}</td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">{formatUsd(l.amount, { decimals: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="pt-2 text-right text-[11px] font-bold uppercase text-slate-500">
                              Total (USD)
                            </td>
                            <td className="pt-2 text-right text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">{formatUsd(draft.pi.total, { decimals: 2 })}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {draft.pi.remarks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
