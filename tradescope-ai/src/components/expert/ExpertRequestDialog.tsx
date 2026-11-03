'use client';

import { CheckCircle2, Send, UserRoundCheck, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { EXPERT_INDEX, EXPERT_SERVICES } from '@/data/experts';
import type { TradeProduct } from '@/lib/types';
import { Flag } from '../Flag';
import { useI18n } from '../I18nProvider';
import { Button, cx } from '../ui';
import { useModalDialog } from '../useModalDialog';

export interface ExpertContext {
  product?: TradeProduct;
  /** requirement title or the free-text query the request starts from */
  topic: string;
  serviceIds: string[];
}

const L = {
  ko: {
    title: '전문가에게 맡기기',
    sub: 'TradeScope 운영팀이 요청을 확인하고, 해당 분야의 현지 파트너 전문가(면허 관세사·인허가 컨설턴트)를 연결해 진행 방법과 견적을 안내합니다.',
    services: '필요한 서비스',
    topic: '요청 내용',
    message: '추가 설명 (선택)',
    messagePh: '예: 제품 3종, 6월 첫 선적 목표, 현지 수입자 없음',
    name: '이름',
    company: '회사명 (선택)',
    email: '이메일',
    phone: '전화번호 (선택)',
    consent: '상담 연결을 위해 입력한 연락처를 TradeScope 운영팀과 연결되는 전문가가 확인하는 데 동의합니다.',
    submit: '요청 보내기',
    sending: '보내는 중…',
    done: '요청을 접수했습니다',
    doneBody: '접수번호 {id}. 운영팀이 내용을 확인한 뒤 입력하신 이메일로 연락드립니다.',
    close: '닫기',
    notAccepting: '지금은 온라인 접수를 받을 수 없습니다.',
    contactAlt: '아래 이메일로 문의해 주세요',
    rateLimited: '짧은 시간에 요청이 많았습니다. 잠시 뒤 다시 시도해 주세요.',
    failed: '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    required: '필수 항목입니다',
    invalidEmail: '이메일 형식을 확인해 주세요',
    pickOne: '서비스를 고르거나 요청 내용을 적어 주세요',
    expert: '담당',
  },
  en: {
    title: 'Hand it to an expert',
    sub: 'The TradeScope team reviews your request and connects you with a partner expert in that field (licensed customs broker, regulatory consultant), then explains the process and the quote.',
    services: 'Services you need',
    topic: 'Request',
    message: 'Anything else (optional)',
    messagePh: 'e.g. 3 SKUs, first shipment in June, no local importer yet',
    name: 'Name',
    company: 'Company (optional)',
    email: 'Email',
    phone: 'Phone (optional)',
    consent: 'I agree that the TradeScope team and the expert it connects me with may use these contact details to follow up on this request.',
    submit: 'Send request',
    sending: 'Sending…',
    done: 'Request received',
    doneBody: 'Reference {id}. The team will review it and reply to the email you entered.',
    close: 'Close',
    notAccepting: 'Requests cannot be taken online right now.',
    contactAlt: 'Please email us instead',
    rateLimited: 'Too many requests in a short time. Please try again shortly.',
    failed: 'Could not send. Please try again shortly.',
    required: 'Required',
    invalidEmail: 'Check the email address',
    pickOne: 'Pick a service or describe the request',
    expert: 'Handled by',
  },
} as const;

export default function ExpertRequestDialog({ context, onClose }: { context: ExpertContext; onClose: () => void }) {
  const { p, lang } = useI18n();
  const s = L[lang];
  const uid = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(onClose, closeRef);
  const [picked, setPicked] = useState<Set<string>>(new Set(context.serviceIds));
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '', website: '', consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; id?: string; message?: string; contact?: string | null }>({ kind: 'idle' });
  const [availability, setAvailability] = useState<{ accepting: boolean; contact: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/consult')
      .then((r) => r.json())
      .then((j) => alive && setAvailability({ accepting: !!j?.accepting, contact: j?.contact ?? null }))
      .catch(() => alive && setAvailability({ accepting: true, contact: null }));
    return () => {
      alive = false;
    };
  }, []);

  // the product's own services first, then the rest
  const ordered = [...EXPERT_SERVICES].sort((a, b) => Number(context.serviceIds.includes(b.id)) - Number(context.serviceIds.includes(a.id)));
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = s.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = s.invalidEmail;
    if (!form.consent) errs.consent = s.required;
    if (!picked.size && !context.topic && !form.message.trim()) errs.message = s.pickOne;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productId: context.product?.id, topic: context.topic, serviceIds: [...picked], lang }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) return setState({ kind: 'done', id: j.id });
      if (j?.error === 'not-accepting') return setState({ kind: 'error', message: s.notAccepting, contact: j.contact });
      if (res.status === 429) return setState({ kind: 'error', message: s.rateLimited });
      if (j?.errors) {
        setErrors(Object.fromEntries(Object.entries(j.errors as Record<string, string>).map(([k, v]) => [k, v === 'invalid' ? s.invalidEmail : s.required])));
        return setState({ kind: 'idle' });
      }
      setState({ kind: 'error', message: s.failed, contact: j?.contact ?? null });
    } catch {
      setState({ kind: 'error', message: s.failed });
    }
  };

  const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_3px_rgb(42_133_166/0.14)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white';
  const err = (k: string) => errors[k] && <span className="mt-1 block text-[11.5px] font-semibold text-rose-600 dark:text-rose-400">{errors[k]}</span>;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-t`}
        className="thin-scroll max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-white shadow-elevated sm:rounded-[24px] dark:bg-[#0c121d]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 dark:border-white/[0.06] dark:bg-[#0c121d]/95">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
              <UserRoundCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id={`${uid}-t`} className="text-[17px] font-bold text-slate-900 dark:text-white">
                {s.title}
              </h2>
              <p className="mt-0.5 text-pretty break-keep text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.sub}</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={s.close} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
            <X className="size-4" />
          </button>
        </div>

        {state.kind === 'done' ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500" aria-hidden />
            <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white" role="status">
              {s.done}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.doneBody.replace('{id}', state.id ?? '')}</p>
            <Button className="mt-6" onClick={onClose}>
              {s.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5 sm:px-6">
            {availability && !availability.accepting && (
              <p role="note" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {s.notAccepting} {availability.contact && <span className="font-bold">{s.contactAlt}: <span className="select-all">{availability.contact}</span></span>}
              </p>
            )}
            {context.topic && (
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.topic}</p>
                <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">
                  {context.product ? `${context.product.emoji} ${p(context.product.name)} · ` : ''}
                  {context.topic}
                </p>
              </div>
            )}

            <fieldset>
              <legend className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.services}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ordered.map((svc) => {
                  const on = picked.has(svc.id);
                  return (
                    <label
                      key={svc.id}
                      className={cx(
                        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                        on ? 'border-brand-300 bg-brand-50/70 dark:border-brand-400/40 dark:bg-brand-400/10' : 'border-slate-200 hover:border-slate-300 dark:border-white/[0.08]',
                      )}
                    >
                      <input id={`${uid}-svc-${svc.id}`} type="checkbox" checked={on} onChange={() => toggle(svc.id)} className="mt-0.5 size-4 accent-[#1d6c8c]" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          <Flag code={svc.country} />
                          <span className="break-keep">{p(svc.title)}</span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-slate-500 dark:text-slate-400">
                          {s.expert}: {p(svc.expert)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.message}</span>
              <textarea id={`${uid}-msg`} rows={3} maxLength={2000} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder={s.messagePh} className={cx(input, 'mt-1 h-auto py-2')} />
              {err('message')}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.name}</span>
                <input id={`${uid}-name`} autoComplete="name" maxLength={60} value={form.name} onChange={(e) => set('name', e.target.value)} className={cx(input, 'mt-1')} />
                {err('name')}
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.company}</span>
                <input id={`${uid}-company`} autoComplete="organization" maxLength={100} value={form.company} onChange={(e) => set('company', e.target.value)} className={cx(input, 'mt-1')} />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.email}</span>
                <input id={`${uid}-email`} type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => set('email', e.target.value)} className={cx(input, 'mt-1')} />
                {err('email')}
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.phone}</span>
                <input id={`${uid}-phone`} type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(e) => set('phone', e.target.value)} className={cx(input, 'mt-1')} />
              </label>
            </div>
            {/* honeypot: hidden from people, filled by bots */}
            <input tabIndex={-1} aria-hidden autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} name="website" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <input id={`${uid}-consent`} type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#1d6c8c]" />
              <span>
                {s.consent}
                {err('consent')}
              </span>
            </label>

            {state.kind === 'error' && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {state.message} {state.contact && <span>{s.contactAlt}: <span className="select-all">{state.contact}</span></span>}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              <p className="text-[11px] text-slate-400">
                {picked.size ? [...picked].map((id) => p(EXPERT_INDEX[id]?.title ?? { ko: id, en: id })).join(' · ') : ''}
              </p>
              <Button type="submit" variant="primary" size="md" loading={state.kind === 'sending'}>
                {state.kind !== 'sending' && <Send className="size-4" aria-hidden />}
                {state.kind === 'sending' ? s.sending : s.submit}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
