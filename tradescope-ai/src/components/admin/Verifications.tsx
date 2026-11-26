'use client';

/**
 * /admin → 검증 입력: values a contracted partner confirmed (rate, ruling, licence, quote…) are entered here,
 * validated on the server and applied right away — the site's trust score rises without a deploy.
 */
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import type { OverrideEntry } from '@/data/official';
import type { Lang } from '@/lib/types';
import OverrideHelper from '../OverrideHelper';
import { overallTrustScore } from '../DataTrustCenter';
import { Button, cx } from '../ui';

type Saved = { id: string; savedAt: string; entry: OverrideEntry };

const T = {
  ko: {
    score: '현재 데이터 신뢰도',
    how: '관세법인·법무법인·포워더가 확인해 준 값을 입력하세요. 서버가 품목 데이터와 대조해 검증한 뒤 저장하고, 사이트의 분석·신뢰도에 바로 반영합니다. 근거(문서번호·URL)와 확인자, 확인일은 필수입니다.',
    saved: '저장된 검증값',
    none: '아직 저장한 검증값이 없습니다.',
    remove: '삭제',
    until: '유효',
    readOnly: '이 환경은 저장소가 읽기 전용이라 저장할 수 없습니다. JSON을 복사해 verified-overrides.json에 넣거나, Vercel이라면 Upstash Redis를 연결하세요.',
    failed: '처리하지 못했습니다',
    type: { tariff: '세율', hs: 'HS 분류', partner: '거래처 인허가', requirement: '요건 검토', logistics: '운임', pricing: '단가·MOQ' } as Record<string, string>,
  },
  en: {
    score: 'Data trust now',
    how: 'Enter values a contracted customs firm, law firm or forwarder has confirmed. The server checks them against the product data, saves them and applies them to the site’s analysis and trust score right away. A source (document no. / URL), verifier and date are required.',
    saved: 'Saved verified values',
    none: 'No verified values saved yet.',
    remove: 'Remove',
    until: 'valid until',
    readOnly: 'Storage is read-only here. Copy the JSON into verified-overrides.json, or on Vercel connect Upstash Redis.',
    failed: 'Could not complete',
    type: { tariff: 'Tariff', hs: 'HS ruling', partner: 'Partner licence', requirement: 'Requirement review', logistics: 'Freight', pricing: 'Price & MOQ' } as Record<string, string>,
  },
};

function describe(e: OverrideEntry): string {
  const t = e.target;
  switch (t.type) {
    case 'tariff':
      return `${t.scheme} ${t.rate}%${t.hs ? ` · HS ${t.hs}` : ''}${t.roo ? ` · ${t.roo}` : ''}`;
    case 'hs':
      return `HS ${t.code} · ${t.ruling}`;
    case 'partner':
      return `${t.id} · ${t.license}`;
    case 'requirement':
      return t.id;
    case 'logistics':
      return `lane ${t.index}${t.cost ? ` · $${t.cost[0]}–${t.cost[1]}` : ''}${t.transitDays ? ` · ${t.transitDays[0]}–${t.transitDays[1]}d` : ''}`;
    case 'pricing':
      return `${t.unitPrice !== undefined ? `$${t.unitPrice}` : ''}${t.moq !== undefined ? ` · MOQ ${t.moq}` : ''}`;
  }
}

export default function Verifications({ lang, writable, version, onApplied, onUnauthorized }: { lang: Lang; writable: boolean; version: number; onApplied: () => Promise<void>; onUnauthorized: () => void }) {
  const s = T[lang];
  const [items, setItems] = useState<Saved[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/verifications', { credentials: 'same-origin' }).catch(() => null);
    if (res?.status === 401) return onUnauthorized();
    const j = (await res?.json().catch(() => null)) as { ok?: boolean; items?: Saved[]; error?: string } | null;
    if (j?.ok && j.items) {
      setItems(j.items);
      setError('');
    } else setError(`${s.failed}${j?.error ? ` (${j.error})` : ''}`);
  }, [onUnauthorized, s.failed]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (entry: unknown): Promise<string | null> => {
    const res = await fetch('/api/admin/verifications', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry }) }).catch(() => null);
    if (res?.status === 401) {
      onUnauthorized();
      return s.failed;
    }
    const j = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string; errors?: string[] } | null;
    if (!j?.ok) return `${s.failed}: ${j?.errors?.join(', ') ?? j?.error ?? 'network'}`;
    await Promise.all([load(), onApplied()]);
    return null;
  };
  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/verifications?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    if (res?.status === 401) return onUnauthorized();
    if (res?.ok) await Promise.all([load(), onApplied()]);
    else setError(s.failed);
  };

  // recomputed whenever the applied values change
  const score = overallTrustScore();
  const name = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return p ? `${p.emoji} ${p.name[lang]} · ${p.verification?.score ?? 0}` : id;
  };

  return (
    <div className="space-y-5" data-version={version}>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <ShieldCheck className="size-6 text-brand-600 dark:text-brand-300" aria-hidden />
        <div>
          <p className="text-[12px] font-semibold text-slate-500">{s.score}</p>
          <p className="text-[26px] font-bold leading-none tabular-nums text-slate-900 dark:text-white">{score}</p>
        </div>
        <p className="min-w-0 flex-1 basis-80 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{s.how}</p>
      </div>
      {!writable && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">{s.readOnly}</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <OverrideHelper onSave={writable ? save : undefined} />
      </section>

      <section aria-labelledby="ver-saved" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <h3 id="ver-saved" className="border-b border-slate-100 px-5 py-3 text-[13px] font-bold text-slate-800 dark:border-white/[0.06] dark:text-slate-100">
          {s.saved} {items ? `· ${items.length}` : ''}
        </h3>
        {items === null ? (
          <p className="flex items-center gap-2 px-5 py-4 text-[13px] text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />…
          </p>
        ) : items.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-slate-500">{s.none}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className={cx('rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', 'bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200')}>{s.type[it.entry.target.type]}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{name(it.entry.productId)}</span>
                  </p>
                  <p className="mt-0.5 break-all text-[12.5px] text-slate-600 dark:text-slate-300">{describe(it.entry)}</p>
                  <p className="mt-0.5 text-[11.5px] text-slate-400">
                    {it.entry.source} · {it.entry.reference} · {it.entry.verifiedBy} · {it.entry.verifiedAt}
                    {it.entry.validUntil ? ` · ${s.until} ${it.entry.validUntil}` : ''}
                  </p>
                </div>
                {writable && (
                  <Button size="xs" variant="ghost" onClick={() => remove(it.id)}>
                    <Trash2 className="size-3.5" aria-hidden />
                    {s.remove}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
