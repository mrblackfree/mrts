'use client';

import { Copy, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import { freightRfq, licenceRfq, priceRfq, type RfqKind, type RfqLang } from '@/lib/rfq';
import RfqLink from './RfqLink';
import { useI18n } from './I18nProvider';
import { cx } from './ui';

/**
 * Builds a request for quotation / confirmation for the gaps only a partner can close (freight, price & MOQ,
 * licence). The reply's amount, validity date and reference number go straight into the verified-value helper.
 */
export default function RfqHelper({ defaultProductId }: { defaultProductId?: string }) {
  const { lang, p } = useI18n();
  const [productId, setProductId] = useState(defaultProductId ?? PRODUCTS[0].id);
  const [kind, setKind] = useState<RfqKind>('freight');
  const [lane, setLane] = useState(0);
  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [out, setOut] = useState<RfqLang>('en');
  const [copied, setCopied] = useState(false);
  const product = PRODUCTS.find((x) => x.id === productId) ?? PRODUCTS[0];
  const partner = product.partners.find((x) => x.id === partnerId) ?? product.partners[0];

  const rfq = useMemo(
    () => (kind === 'freight' ? freightRfq(product, Math.min(lane, product.logistics.length - 1), out) : kind === 'price' ? priceRfq(product, out) : licenceRfq(product, partner, out)),
    [kind, product, lane, partner, out],
  );

  const select = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/[0.04]';
  const label = 'mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400';
  const kinds: Array<{ id: RfqKind; ko: string; en: string }> = [
    { id: 'freight', ko: '운임 견적 (포워더)', en: 'Freight quote (forwarder)' },
    { id: 'price', ko: '단가·MOQ 견적 (공급사·바이어)', en: 'Price & MOQ quote (supplier / buyer)' },
    { id: 'licence', ko: '인허가 확인 (거래처)', en: 'Licence confirmation (partner)' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="sm:col-span-1">
          <span className={label}>{lang === 'ko' ? '품목' : 'Product'}</span>
          <select className={select} value={productId} onChange={(e) => (setProductId(e.target.value), setLane(0), setPartnerId(undefined))}>
            {PRODUCTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {p(x.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-1">
          <span className={label}>{lang === 'ko' ? '요청 종류' : 'Request'}</span>
          <select className={select} value={kind} onChange={(e) => setKind(e.target.value as RfqKind)}>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {lang === 'ko' ? k.ko : k.en}
              </option>
            ))}
          </select>
        </label>
        {kind === 'freight' && (
          <label className="sm:col-span-1">
            <span className={label}>{lang === 'ko' ? '노선' : 'Lane'}</span>
            <select className={select} value={lane} onChange={(e) => setLane(Number(e.target.value))}>
              {product.logistics.map((l, i) => (
                <option key={i} value={i}>
                  {l.from} → {l.to} · {l.mode}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'licence' && (
          <label className="sm:col-span-1">
            <span className={label}>{lang === 'ko' ? '거래처' : 'Partner'}</span>
            <select className={select} value={partner.id} onChange={(e) => setPartnerId(e.target.value)}>
              {product.partners.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="sm:col-span-1">
          <span className={label}>{lang === 'ko' ? '요청서 언어' : 'Language'}</span>
          <select className={select} value={out} onChange={(e) => setOut(e.target.value as RfqLang)}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{rfq.subject}</p>
        <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{rfq.body}</pre>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RfqLink rfq={rfq} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700">
          <Mail className="size-3.5" aria-hidden />
          {lang === 'ko' ? '메일로 열기' : 'Open in mail'}
        </RfqLink>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(`${rfq.subject}\n\n${rfq.body}`).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset', copied ? 'text-emerald-700 ring-emerald-300' : 'text-slate-700 ring-slate-200 dark:text-slate-200 dark:ring-white/10')}
        >
          <Copy className="size-3.5" aria-hidden />
          {copied ? (lang === 'ko' ? '복사됨' : 'Copied') : lang === 'ko' ? '복사' : 'Copy'}
        </button>
        <span className="text-[11px] text-slate-400">
          {lang === 'ko' ? '회신의 금액·유효기간·견적번호를 아래 검증값 입력 도우미에 넣으면 「전문가 검증」으로 반영됩니다.' : 'Enter the reply’s amount, validity and reference in the helper below to mark it expert-verified.'}
        </span>
      </div>
    </div>
  );
}
