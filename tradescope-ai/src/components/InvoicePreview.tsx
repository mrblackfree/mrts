'use client';

import { Download, FileText, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { proformaToText } from '@/lib/engine/simulate';
import { loadInvoiceProfile, saveInvoiceProfile } from '@/lib/invoice/profile-store';
import { EMPTY_PROFILE, PROFILE_MAX, renderProformaHtml, type InvoiceProfile } from '@/lib/invoice/template';
import { STATIC_PREVIEW } from '@/lib/preview';
import type { ProformaInvoice } from '@/lib/types';
import { useI18n } from './I18nProvider';
import { Button, CopyButton, cx } from './ui';

/** A4 at 96 dpi */
const PAGE_W = 794;
const PAGE_H = 1123;

const STR = {
  ko: {
    title: 'Proforma Invoice',
    sub: '바로 보낼 수 있는 A4 인보이스 — 입력한 회사·은행 정보가 그대로 들어갑니다.',
    print: 'PDF 저장 · 인쇄',
    download: 'HTML 내려받기',
    copy: '텍스트 복사',
    details: '회사 · 은행 정보 입력',
    detailsHint: '이 브라우저에만 저장되고 서버로 보내지 않습니다. 상대 회사·수하인 정보는 거래처별로 따로 저장됩니다.',
    mine: '우리 회사',
    them: '상대 회사 · 수하인',
    bank: '대금 받을 계좌',
    bankBuyer: '수입(구매) 건이라 이 계좌는 인보이스에 넣지 않습니다 — 판매자가 자기 계좌를 기입합니다.',
    reset: '입력 지우기',
    preview: '인보이스 미리보기',
    f: {
      address: '회사 주소 (영문)',
      phone: '전화',
      email: '이메일',
      website: '웹사이트',
      taxId: '사업자등록번호 · Tax ID',
      signatoryTitle: '서명자 직함',
      counterpartyAddress: '상대 회사 주소 (영문)',
      consignee: 'Consignee (비우면 구매자와 같음)',
      notifyParty: 'Notify party (비우면 수하인과 같음)',
      bankBeneficiary: '예금주 (Beneficiary)',
      bankName: '은행명',
      bankSwift: 'SWIFT / BIC',
      bankAccount: '계좌번호',
      bankAddress: '은행 주소',
    } as Record<keyof InvoiceProfile, string>,
  },
  en: {
    title: 'Proforma invoice',
    sub: 'A ready-to-send A4 invoice — your company and bank details go straight in.',
    print: 'Save PDF · print',
    download: 'Download HTML',
    copy: 'Copy as text',
    details: 'Company & bank details',
    detailsHint: 'Saved in this browser only — never sent to the server. Counterparty and consignee details are kept per partner.',
    mine: 'Your company',
    them: 'Counterparty & consignee',
    bank: 'Account for payment',
    bankBuyer: 'This is a purchase, so your account is not printed — the seller fills in theirs.',
    reset: 'Clear details',
    preview: 'Invoice preview',
    f: {
      address: 'Company address',
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      taxId: 'Business reg. no. · Tax ID',
      signatoryTitle: 'Signatory title',
      counterpartyAddress: 'Counterparty address',
      consignee: 'Consignee (empty = buyer)',
      notifyParty: 'Notify party (empty = consignee)',
      bankBeneficiary: 'Beneficiary',
      bankName: 'Bank name',
      bankSwift: 'SWIFT / BIC',
      bankAccount: 'Account number',
      bankAddress: 'Bank address',
    } as Record<keyof InvoiceProfile, string>,
  },
};

const MULTILINE = new Set<keyof InvoiceProfile>(['address', 'counterpartyAddress', 'consignee', 'notifyParty']);

export default function InvoicePreview({ pi, partnerId, mineIsSeller, signatoryName }: { pi: ProformaInvoice; partnerId: string; mineIsSeller: boolean; signatoryName: string }) {
  const { lang } = useI18n();
  const s = STR[lang];
  const [profile, setProfile] = useState<InvoiceProfile>(EMPTY_PROFILE);
  // the partner whose details are in `profile` — saving never writes one partner's parties under another
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(PAGE_W);
  const [height, setHeight] = useState(PAGE_H);

  useEffect(() => {
    setProfile(loadInvoiceProfile(partnerId));
    setLoadedFor(partnerId);
  }, [partnerId]);
  useEffect(() => {
    if (loadedFor === partnerId) saveInvoiceProfile(partnerId, profile);
  }, [profile, loadedFor, partnerId]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const html = useMemo(() => renderProformaHtml({ pi, profile, mineIsSeller, signatoryName }), [pi, profile, mineIsSeller, signatoryName]);
  const scale = Math.min(1, width / PAGE_W);

  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.documentElement) setHeight(Math.max(PAGE_H, doc.documentElement.scrollHeight));
  };

  const print = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pi.number}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const set = (key: keyof InvoiceProfile, value: string) => setProfile((p) => ({ ...p, [key]: value.slice(0, PROFILE_MAX[key]) }));
  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
  const field = (key: keyof InvoiceProfile) => (
    <label key={key} className={cx('grid gap-1 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400', MULTILINE.has(key) && 'sm:col-span-2')}>
      {s.f[key]}
      {MULTILINE.has(key) ? (
        <textarea rows={2} className={cx(inputCls, 'resize-y')} value={profile[key]} maxLength={PROFILE_MAX[key]} onChange={(e) => set(key, e.target.value)} />
      ) : (
        <input className={inputCls} value={profile[key]} maxLength={PROFILE_MAX[key]} onChange={(e) => set(key, e.target.value)} autoComplete="off" />
      )}
    </label>
  );
  const group = (title: string, keys: (keyof InvoiceProfile)[], note?: string) => (
    <fieldset className="grid gap-2.5 sm:grid-cols-2">
      <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">{title}</legend>
      {keys.map(field)}
      {note && <p className="text-[11.5px] text-slate-400 sm:col-span-2">{note}</p>}
    </fieldset>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <FileText className="size-4 text-brand-500" aria-hidden />
            {s.title}
          </p>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400">{s.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <CopyButton text={proformaToText(pi, mineIsSeller ? { beneficiary: profile.bankBeneficiary, bankName: profile.bankName, swift: profile.bankSwift, account: profile.bankAccount, address: profile.bankAddress } : undefined)} label={s.copy} />
          <Button size="sm" onClick={download}>
            <Download className="size-3.5" aria-hidden />
            {s.download}
          </Button>
          {!STATIC_PREVIEW && (
            <Button size="sm" variant="primary" onClick={print}>
              <Printer className="size-3.5" aria-hidden />
              {s.print}
            </Button>
          )}
        </div>
      </div>

      <details className="group border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
        <summary className="cursor-pointer list-none text-[13px] font-semibold text-slate-700 marker:hidden dark:text-slate-200">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
            {s.details}
          </span>
          <span className="ml-2 text-[11.5px] font-normal text-slate-400">{s.detailsHint}</span>
        </summary>
        <div className="mt-3 grid gap-5">
          {group(s.mine, ['address', 'phone', 'email', 'website', 'taxId', 'signatoryTitle'])}
          {group(s.them, ['counterpartyAddress', 'consignee', 'notifyParty'])}
          {group(s.bank, ['bankBeneficiary', 'bankName', 'bankSwift', 'bankAccount', 'bankAddress'], mineIsSeller ? undefined : s.bankBuyer)}
          <div>
            <Button size="sm" variant="ghost" onClick={() => setProfile({ ...EMPTY_PROFILE })}>
              {s.reset}
            </Button>
          </div>
        </div>
      </details>

      <div className="bg-slate-100/80 p-3 sm:p-5 dark:bg-black/30">
        <div ref={box} className="mx-auto w-full max-w-[794px]">
          <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_12px_32px_-12px_rgb(15_23_42/0.25)]" style={{ height: height * scale }}>
            <iframe
              ref={frame}
              title={s.preview}
              srcDoc={html}
              onLoad={measure}
              // no scripts inside; same origin only so the page can print it
              sandbox="allow-same-origin allow-modals"
              style={{ width: PAGE_W, height, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
