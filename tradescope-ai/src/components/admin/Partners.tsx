'use client';

/**
 * /admin → 파트너 관리: law firms and customs firms per country, from researched candidates to signed contracts.
 * Only firms marked "계약" appear on the public site (names, country, city, website).
 */
import { ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag } from '../Flag';
import { DEAL_MAX, FIRM_MAX, PARTNER_COUNTRIES, PIPELINE, type PartnerCountry, type PartnerDeal, type PartnerRow, type PartnerType, type PipelineStatus } from '@/lib/partners/types';
import type { Lang } from '@/lib/types';
import { Button, cx } from '../ui';

const T = {
  ko: {
    country: { PH: '필리핀', KR: '대한민국', VN: '베트남', ID: '인도네시아', TH: '태국', MY: '말레이시아' } as Record<PartnerCountry, string>,
    soon: '준비 중',
    type: { all: '전체', law: '법무법인', customs: '관세법인' },
    status: { candidate: '후보', contacted: '연락함', negotiating: '협상 중', contracted: '계약', 'on-hold': '보류', dropped: '제외' } as Record<PipelineStatus, string>,
    why: '추천 이유',
    sources: '근거',
    deal: '계약 · 연락 정보 (관리자만)',
    contactName: '담당자',
    contactEmail: '담당자 이메일',
    terms: '계약 조건 (수수료·범위·정산)',
    contractDate: '계약일',
    notes: '메모',
    save: '저장',
    saved: '저장했습니다',
    add: '직접 추가',
    addTitle: '파트너 직접 추가',
    name: '이름',
    nameLocal: '현지어 이름',
    city: '도시',
    website: '웹사이트 (https)',
    practice: '업무 분야 (쉼표로 구분)',
    remove: '삭제',
    empty: '이 국가는 아직 후보가 없습니다. 직접 추가하거나 조사 후 목록을 채우세요.',
    readOnly: '이 환경은 저장소가 읽기 전용이라 상태를 저장할 수 없습니다(Vercel 등). Docker·자체 서버에서 관리하세요.',
    failed: '처리하지 못했습니다',
    research: '조사 후보',
    custom: '직접 추가',
  },
  en: {
    country: { PH: 'Philippines', KR: 'Korea', VN: 'Vietnam', ID: 'Indonesia', TH: 'Thailand', MY: 'Malaysia' } as Record<PartnerCountry, string>,
    soon: 'Coming soon',
    type: { all: 'All', law: 'Law firms', customs: 'Customs firms' },
    status: { candidate: 'Candidate', contacted: 'Contacted', negotiating: 'Negotiating', contracted: 'Contracted', 'on-hold': 'On hold', dropped: 'Dropped' } as Record<PipelineStatus, string>,
    why: 'Why',
    sources: 'Sources',
    deal: 'Contract & contact (admin only)',
    contactName: 'Contact person',
    contactEmail: 'Contact email',
    terms: 'Terms (fees, scope, settlement)',
    contractDate: 'Contract date',
    notes: 'Notes',
    save: 'Save',
    saved: 'Saved',
    add: 'Add firm',
    addTitle: 'Add a partner',
    name: 'Name',
    nameLocal: 'Local name',
    city: 'City',
    website: 'Website (https)',
    practice: 'Practice areas (comma separated)',
    remove: 'Remove',
    empty: 'No candidates for this country yet. Add one by hand or fill the list after research.',
    readOnly: 'Storage is read-only here (e.g. Vercel), so changes cannot be saved. Manage partners on a Docker / own server.',
    failed: 'Could not complete',
    research: 'Researched',
    custom: 'Added by hand',
  },
};

const LIVE: PartnerCountry[] = ['PH', 'KR'];
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
const STATUS_TONE: Record<PipelineStatus, string> = {
  candidate: 'bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200',
  contacted: 'bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-200',
  negotiating: 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200',
  contracted: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200',
  'on-hold': 'bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200',
  dropped: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200',
};

async function call<T>(method: string, body?: unknown, query = ''): Promise<{ status: number; data: T }> {
  const res = await fetch(`/api/admin/partners${query}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

function DealForm({ row, s, writable, onSaved, onError }: { row: PartnerRow; s: (typeof T)['ko']; writable: boolean; onSaved: (d: PartnerDeal) => void; onError: (m: string) => void }) {
  const [d, setD] = useState(row.deal);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => setD(row.deal), [row.deal]);
  const save = async () => {
    setBusy(true);
    setOk(false);
    const r = await call<{ ok: boolean; deal?: PartnerDeal; error?: string }>('PATCH', { id: row.id, deal: d }).catch(() => null);
    setBusy(false);
    if (r?.data.ok && r.data.deal) {
      onSaved(r.data.deal);
      setOk(true);
    } else onError(`${s.failed}${r?.data.error ? ` (${r.data.error})` : ''}`);
  };
  const f = (key: 'contactName' | 'contactEmail' | 'terms' | 'notes', multiline = false) => (
    <label className="grid gap-1 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
      {s[key]}
      {multiline ? (
        <textarea rows={2} className={cx(inputCls, 'resize-y')} value={d[key]} maxLength={DEAL_MAX[key]} disabled={!writable} onChange={(e) => setD({ ...d, [key]: e.target.value })} />
      ) : (
        <input className={inputCls} value={d[key]} maxLength={DEAL_MAX[key]} disabled={!writable} onChange={(e) => setD({ ...d, [key]: e.target.value })} />
      )}
    </label>
  );
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {f('contactName')}
      {f('contactEmail')}
      <label className="grid gap-1 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
        {s.contractDate}
        <input type="date" className={inputCls} value={d.contractDate} disabled={!writable} onChange={(e) => setD({ ...d, contractDate: e.target.value })} />
      </label>
      <div className="sm:col-span-2">{f('terms', true)}</div>
      <div className="sm:col-span-2">{f('notes', true)}</div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button size="sm" variant="primary" onClick={save} disabled={!writable || busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Save className="size-3.5" aria-hidden />}
          {s.save}
        </Button>
        {ok && (
          <span role="status" className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
            {s.saved}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Partners({ lang, onUnauthorized }: { lang: Lang; onUnauthorized: () => void }) {
  const s = T[lang];
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [writable, setWritable] = useState(false);
  const [country, setCountry] = useState<PartnerCountry>('PH');
  const [type, setType] = useState<'all' | PartnerType>('all');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', nameLocal: '', city: '', website: '', practice: '', why: '', type: 'law' as PartnerType });

  const load = useCallback(async () => {
    const r = await call<{ ok: boolean; partners?: PartnerRow[]; writable?: boolean; error?: string }>('GET').catch(() => null);
    if (r?.status === 401) return onUnauthorized();
    if (r?.data.ok && r.data.partners) {
      setRows(r.data.partners);
      setWritable(!!r.data.writable);
    } else setError(`${s.failed}${r?.data.error ? ` (${r.data.error})` : ''}`);
  }, [onUnauthorized, s.failed]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => r.country === country && (type === 'all' || r.type === type)), [rows, country, type]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(PIPELINE.map((p) => [p, 0])) as Record<PipelineStatus, number>;
    for (const r of rows ?? []) if (r.country === country) c[r.deal.status] += 1;
    return c;
  }, [rows, country]);

  const setStatus = async (row: PartnerRow, status: PipelineStatus) => {
    const r = await call<{ ok: boolean; deal?: PartnerDeal; error?: string }>('PATCH', { id: row.id, deal: { status } }).catch(() => null);
    if (r?.status === 401) return onUnauthorized();
    if (r?.data.ok && r.data.deal) setRows((xs) => xs?.map((x) => (x.id === row.id ? { ...x, deal: r.data.deal! } : x)) ?? null);
    else setError(`${s.failed}${r?.data.error ? ` (${r.data.error})` : ''}`);
  };
  const add = async () => {
    const r = await call<{ ok: boolean; error?: string; errors?: Record<string, string> }>('POST', { firm: { ...draft, country } }).catch(() => null);
    if (r?.status === 401) return onUnauthorized();
    if (r?.data.ok) {
      setAdding(false);
      setDraft({ name: '', nameLocal: '', city: '', website: '', practice: '', why: '', type: draft.type });
      load();
    } else setError(`${s.failed}${r?.data.errors ? `: ${Object.entries(r.data.errors).map(([k, v]) => `${k} ${v}`).join(', ')}` : r?.data.error ? ` (${r.data.error})` : ''}`);
  };
  const remove = async (row: PartnerRow) => {
    const r = await call<{ ok: boolean; error?: string }>('DELETE', undefined, `?id=${encodeURIComponent(row.id)}`).catch(() => null);
    if (r?.data.ok) setRows((xs) => xs?.filter((x) => x.id !== row.id) ?? null);
    else setError(s.failed);
  };

  return (
    <div className="space-y-4">
      {!writable && rows && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">{s.readOnly}</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
          {error}
        </p>
      )}

      <div role="tablist" aria-label={lang === 'ko' ? '국가' : 'Country'} className="flex flex-wrap gap-1.5">
        {PARTNER_COUNTRIES.map((c) => {
          const n = (rows ?? []).filter((r) => r.country === c).length;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={country === c}
              onClick={() => setCountry(c)}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold',
                country === c ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900' : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200',
              )}
            >
              <Flag code={c} />
              {s.country[c]}
              {LIVE.includes(c) ? <span className="tabular-nums opacity-70">{n}</span> : <span className="text-[11px] opacity-70">{s.soon}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
          {(['all', 'law', 'customs'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={cx('rounded-lg px-3 py-1.5 text-[12.5px] font-semibold', type === k ? 'bg-white text-slate-900 shadow-hairline dark:bg-white/10 dark:text-white' : 'text-slate-500')}>
              {s.type[k]}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap gap-1.5 text-[12px]">
          {PIPELINE.filter((p) => counts[p]).map((p) => (
            <span key={p} className={cx('rounded-full px-2 py-0.5 font-semibold', STATUS_TONE[p])}>
              {s.status[p]} {counts[p]}
            </span>
          ))}
        </p>
        <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} disabled={!writable}>
          <Plus className="size-3.5" aria-hidden />
          {s.add}
        </Button>
      </div>

      {adding && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {s.addTitle} · {s.country[country]}
          </h3>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="grid gap-1 text-[11.5px] font-semibold text-slate-500">
              {lang === 'ko' ? '구분' : 'Type'}
              <select className={inputCls} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PartnerType })}>
                <option value="law">{s.type.law}</option>
                <option value="customs">{s.type.customs}</option>
              </select>
            </label>
            {(['name', 'nameLocal', 'city', 'website', 'practice', 'why'] as const).map((k) => (
              <label key={k} className="grid gap-1 text-[11.5px] font-semibold text-slate-500">
                {k === 'why' ? s.why : s[k]}
                <input className={inputCls} value={draft[k]} maxLength={FIRM_MAX[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </label>
            ))}
            <div className="sm:col-span-2">
              <Button size="sm" variant="primary" onClick={add} disabled={!draft.name.trim()}>
                <Save className="size-3.5" aria-hidden />
                {s.save}
              </Button>
            </div>
          </div>
        </section>
      )}

      {rows === null ? (
        <p className="flex items-center gap-2 text-[13px] text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />…
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-[13px] text-slate-500 dark:border-white/15">{s.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((row) => (
            <li key={row.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={cx('rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', row.type === 'law' ? 'bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200' : 'bg-brand-50 text-brand-800 dark:bg-brand-400/10 dark:text-brand-200')}>
                      {row.type === 'law' ? s.type.law : s.type.customs}
                    </span>
                    <span className="text-[14.5px] font-bold text-slate-900 dark:text-white">{row.name}</span>
                    {row.nameLocal && <span className="text-[12.5px] text-slate-500">{row.nameLocal}</span>}
                    <span className="text-[11px] text-slate-400">· {row.origin === 'research' ? s.research : s.custom}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                    {row.city}
                    {row.website && (
                      <>
                        {' · '}
                        <a href={row.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300">
                          {row.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                  <span className="sr-only">{lang === 'ko' ? '상태' : 'Status'}</span>
                  <select className={cx(inputCls, 'w-auto font-semibold', STATUS_TONE[row.deal.status])} value={row.deal.status} disabled={!writable} onChange={(e) => setStatus(row, e.target.value as PipelineStatus)}>
                    {PIPELINE.map((p) => (
                      <option key={p} value={p}>
                        {s.status[p]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {row.practice.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {row.practice.map((p) => (
                    <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                      {p}
                    </span>
                  ))}
                </p>
              )}
              {row.why && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <b className="font-semibold text-slate-800 dark:text-slate-100">{s.why}</b> · {row.why}
                </p>
              )}
              {row.sources.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-400">
                  {s.sources}:
                  {row.sources.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="max-w-[18rem] truncate text-brand-700 hover:underline dark:text-brand-300">
                      {u.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  ))}
                </p>
              )}
              <details className="mt-3 rounded-xl bg-slate-50/80 p-3 dark:bg-white/[0.03]">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{s.deal}</summary>
                <div className="mt-3">
                  <DealForm row={row} s={s} writable={writable} onSaved={(deal) => setRows((xs) => xs?.map((x) => (x.id === row.id ? { ...x, deal } : x)) ?? null)} onError={setError} />
                </div>
                {row.origin === 'custom' && writable && (
                  <Button size="xs" variant="ghost" className="mt-2 text-rose-700" onClick={() => remove(row)}>
                    <Trash2 className="size-3.5" aria-hidden />
                    {s.remove}
                  </Button>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
