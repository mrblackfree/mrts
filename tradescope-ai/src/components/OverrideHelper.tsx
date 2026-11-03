'use client';

import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import { todayIso } from '@/lib/format';
import { useI18n } from './I18nProvider';
import { CopyButton, cx } from './ui';
import { useBusinessDay } from './useBusinessDay';

type TargetType = 'tariff' | 'hs' | 'partner' | 'requirement' | 'logistics' | 'pricing';
const TYPES: TargetType[] = ['tariff', 'hs', 'partner', 'requirement', 'logistics', 'pricing'];
const TYPE_LABEL: Record<TargetType, { ko: string; en: string; hint: { ko: string; en: string } }> = {
  tariff: { ko: '세율·원산지기준', en: 'Tariff & ROO', hint: { ko: 'UNI-PASS 세율정보 / FTA 포털 / PH Tariff Finder 조회 결과', en: 'UNI-PASS / FTA portal / PH Tariff Finder lookup' } },
  hs: { ko: 'HS 사전심사', en: 'HS ruling', hint: { ko: '관세청 품목분류 사전심사 결정서 / BOC Advance Ruling', en: 'KCS advance ruling / BOC advance ruling' } },
  partner: { ko: '기업 인허가', en: 'Company licence', hint: { ko: 'FDA PH verification 포털·SEC·DTI / 국세청·DART 조회', en: 'FDA PH verification / SEC / DTI / NTS / DART' } },
  requirement: { ko: '규정 원문 검수', en: 'Regulation review', hint: { ko: '식약처 고시 / FDA Circular 원문 대조', en: 'MFDS notice / FDA circular compared' } },
  logistics: { ko: '운임 견적', en: 'Freight quote', hint: { ko: '포워더 견적서 (유효기간 입력)', en: 'Forwarder quotation (set validUntil)' } },
  pricing: { ko: '단가·MOQ', en: 'Price & MOQ', hint: { ko: '공급사 견적서 / 계약서', en: 'Supplier quotation / contract' } },
};

/** Same placeholder rule as `npm run data:validate`. */
const PLACEHOLDER = /(O{3}|_{3,}|0000호|\bTEST\b)/;
/** Fields that point into one product and must be cleared when the product changes. */
const PRODUCT_SCOPED = ['partnerId', 'reqId', 'lane', 'code', 'hs'];

/** Builds a valid verified-overrides.json entry so reviewers never hand-write JSON. */
/** `editUrl`: the server-resolved link (null = none); undefined until it is known, then the build-time value is used. */
export default function OverrideHelper({ defaultProductId, editUrl: editUrlProp }: { defaultProductId?: string; editUrl?: string | null }) {
  const { p, lang } = useI18n();
  const [productId, setProductId] = useState(defaultProductId && PRODUCTS.some((x) => x.id === defaultProductId) ? defaultProductId : PRODUCTS[0].id);
  const [type, setType] = useState<TargetType>('tariff');
  const [f, setF] = useState<Record<string, string>>({ scheme: 'KRPH', verifiedAt: todayIso() });
  const product = PRODUCTS.find((x) => x.id === productId)!;
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));
  const changeProduct = (id: string) => {
    setProductId(id);
    setF((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !PRODUCT_SCOPED.includes(k))));
  };
  const hsTables = Object.entries(product.tariffsByHs ?? {});
  const tariffTable = f.hs && product.tariffsByHs?.[f.hs] ? product.tariffsByHs[f.hs].tariffs : product.tariffs;
  const editUrl = editUrlProp !== undefined ? editUrlProp : process.env.NEXT_PUBLIC_OVERRIDES_EDIT_URL;
  // expiry checks follow the calendar, also in a page left open past midnight
  const today = useBusinessDay();

  const { entry, missing, invalid } = useMemo(() => {
    const num = (k: string) => (f[k] !== undefined && f[k] !== '' ? Number(f[k]) : undefined);
    let target: Record<string, unknown> = { type };
    const need: string[] = [];
    const bad: string[] = [];
    const inRange = (k: string, lo: number, hi: number, msg: string) => {
      const v = num(k);
      if (v !== undefined && (!Number.isFinite(v) || v < lo || v > hi)) bad.push(msg);
    };
    // a [min, max] pair: both or neither, and min ≤ max
    const pair = (lo: string, hi: string, name: string, max: number) => {
      const a = num(lo);
      const b = num(hi);
      if ((a === undefined) !== (b === undefined)) bad.push(`${name}: min + max`);
      inRange(lo, 0, max, `${name} 0–${max}`);
      inRange(hi, 0, max, `${name} 0–${max}`);
      return a !== undefined && b !== undefined ? (a <= b ? [a, b] : (bad.push(`${name}: min ≤ max`), undefined)) : undefined;
    };
    if (type === 'tariff') {
      target = { type, ...(f.hs ? { hs: f.hs } : {}), scheme: f.scheme ?? 'KRPH', rate: num('rate'), ...(f.roo?.trim() ? { roo: f.roo.trim() } : {}) };
      if (num('rate') === undefined) need.push('rate');
      inRange('rate', 0, 100, 'rate 0–100%');
    } else if (type === 'hs') {
      target = { type, code: f.code ?? product.hs[0].code, ruling: f.ruling?.trim() ?? '' };
      if (!f.ruling?.trim()) need.push('ruling');
      else if (PLACEHOLDER.test(f.ruling)) bad.push('ruling (placeholder)');
    } else if (type === 'partner') {
      target = { type, id: f.partnerId ?? product.partners[0].id, license: f.license?.trim() ?? '', ...(f.licenseValidUntil ? { licenseValidUntil: f.licenseValidUntil } : {}) };
      if (!f.license?.trim()) need.push('license');
      if (f.licenseValidUntil && f.licenseValidUntil < today) bad.push('licenseValidUntil (expired)');
    } else if (type === 'requirement') {
      target = { type, id: f.reqId ?? product.requirements[0].id };
    } else if (type === 'logistics') {
      const cost = pair('costMin', 'costMax', 'cost', 100_000);
      const days = pair('dMin', 'dMax', 'transitDays', 120);
      target = { type, index: Number(f.lane ?? 0), ...(cost ? { cost } : {}), ...(days ? { transitDays: days } : {}) };
      // only "missing" when nothing was entered; half-filled or reversed ranges are reported by pair()
      if (!cost && !days && !['costMin', 'costMax', 'dMin', 'dMax'].some((k) => f[k])) need.push('cost / transitDays');
    } else {
      target = { type, ...(num('unitPrice') !== undefined ? { unitPrice: num('unitPrice') } : {}), ...(num('moq') !== undefined ? { moq: num('moq') } : {}) };
      if (num('unitPrice') === undefined && num('moq') === undefined) need.push('unitPrice / moq');
      inRange('unitPrice', 0.0001, 1e6, 'unitPrice > 0');
      inRange('moq', 1, 1e9, 'moq ≥ 1');
    }
    for (const k of ['source', 'reference', 'verifiedBy', 'verifiedAt']) if (!f[k]?.trim()) need.push(k);
    for (const k of ['source', 'reference', 'verifiedBy']) if (f[k] && PLACEHOLDER.test(f[k])) bad.push(`${k} (placeholder)`);
    if (f.verifiedAt && f.verifiedAt > today) bad.push('verifiedAt (future)');
    if (f.validUntil && f.validUntil < today) bad.push('validUntil (expired)');
    else if (f.validUntil && f.verifiedAt && f.validUntil < f.verifiedAt) bad.push('validUntil < verifiedAt');
    const e = {
      productId,
      target,
      source: f.source ?? '',
      reference: f.reference ?? '',
      verifiedBy: f.verifiedBy ?? '',
      verifiedAt: f.verifiedAt ?? '',
      ...(f.validUntil ? { validUntil: f.validUntil } : {}),
    };
    return { entry: JSON.stringify(e, null, 2), missing: need, invalid: bad };
  }, [f, type, productId, product, today]);

  const input =
    'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-hairline outline-none transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_4px_rgb(42_133_166/0.12)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white';
  const label = 'mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="col-span-2">
          <span className={label}>Product</span>
          <select className={input} value={productId} onChange={(e) => changeProduct(e.target.value)}>
            {PRODUCTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {p(x.name)}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={lang === 'ko' ? '검증 대상' : 'Target type'} className="col-span-2 flex flex-wrap gap-1.5">
          {TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              aria-pressed={type === ty}
              onClick={() => setType(ty)}
              className={cx(
                'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[11.5px] font-semibold transition-[background-color,border-color,color] duration-150',
                type === ty
                  ? 'border-violet-600 bg-violet-600 text-white shadow-[0_1px_2px_rgb(76_29_149/0.3)] dark:border-violet-400 dark:bg-violet-400 dark:text-violet-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white',
              )}
            >
              {TYPE_LABEL[ty][lang]}
            </button>
          ))}
        </div>
        <p className="col-span-2 -mt-1 text-[11px] text-slate-400">{TYPE_LABEL[type].hint[lang]}</p>

        {type === 'tariff' && (
          <>
            {hsTables.length > 0 && (
              <label className="col-span-2">
                <span className={label}>HS tariff table</span>
                {/* a rate typed for one table must not be carried over to another */}
                <select className={input} value={f.hs ?? ''} onChange={(e) => setF((o) => ({ ...o, hs: e.target.value, rate: '' }))}>
                  <option value="">HS {product.hs[0].code} ({p(product.hs[0].desc)})</option>
                  {hsTables.map(([code, table]) => (
                    <option key={code} value={code}>
                      {p(table.label)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className={label}>Scheme</span>
              <select className={input} value={f.scheme ?? 'KRPH'} onChange={(e) => set('scheme', e.target.value)}>
                {tariffTable.map((x) => (
                  <option key={x.scheme} value={x.scheme}>
                    {x.scheme} (now {x.rate}%)
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Rate %</span>
              <input className={input} type="number" min={0} max={100} step={0.1} value={f.rate ?? ''} onChange={(e) => set('rate', e.target.value)} />
            </label>
            <label className="col-span-2">
              <span className={label}>Rule of origin (optional)</span>
              <input className={input} value={f.roo ?? ''} onChange={(e) => set('roo', e.target.value)} placeholder="CTH or RVC 40%" />
            </label>
          </>
        )}
        {type === 'hs' && (
          <>
            <label>
              <span className={label}>HS code</span>
              <select className={input} value={f.code ?? product.hs[0].code} onChange={(e) => set('code', e.target.value)}>
                {product.hs.map((h) => (
                  <option key={h.code}>{h.code}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Ruling no.</span>
              <input className={input} value={f.ruling ?? ''} onChange={(e) => set('ruling', e.target.value)} placeholder="품목분류 사전심사 제2026-0000호" />
            </label>
          </>
        )}
        {type === 'partner' && (
          <>
            <label className="col-span-2">
              <span className={label}>Company</span>
              <select className={input} value={f.partnerId ?? product.partners[0].id} onChange={(e) => set('partnerId', e.target.value)}>
                {product.partners.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Licence</span>
              <input className={input} value={f.license ?? ''} onChange={(e) => set('license', e.target.value)} placeholder="FDA LTO no." />
            </label>
            <label>
              <span className={label}>Licence valid until</span>
              <input className={input} type="date" value={f.licenseValidUntil ?? ''} onChange={(e) => set('licenseValidUntil', e.target.value)} />
            </label>
          </>
        )}
        {type === 'requirement' && (
          <label className="col-span-2">
            <span className={label}>Requirement</span>
            <select className={input} value={f.reqId ?? product.requirements[0].id} onChange={(e) => set('reqId', e.target.value)}>
              {product.requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {p(r.title)}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === 'logistics' && (
          <>
            <label className="col-span-2">
              <span className={label}>Lane</span>
              <select className={input} value={f.lane ?? '0'} onChange={(e) => set('lane', e.target.value)}>
                {product.logistics.map((l, i) => (
                  <option key={i} value={i}>
                    {l.from}→{l.to} {l.mode}
                  </option>
                ))}
              </select>
            </label>
            {(['costMin', 'costMax', 'dMin', 'dMax'] as const).map((k) => (
              <label key={k}>
                <span className={label}>{k === 'costMin' ? 'Cost min $' : k === 'costMax' ? 'Cost max $' : k === 'dMin' ? 'Days min' : 'Days max'}</span>
                <input className={input} type="number" min={0} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
              </label>
            ))}
          </>
        )}
        {type === 'pricing' && (
          <>
            <label>
              <span className={label}>Unit price $</span>
              <input className={input} type="number" min={0.01} step={0.01} value={f.unitPrice ?? ''} onChange={(e) => set('unitPrice', e.target.value)} />
            </label>
            <label>
              <span className={label}>MOQ</span>
              <input className={input} type="number" min={1} value={f.moq ?? ''} onChange={(e) => set('moq', e.target.value)} />
            </label>
          </>
        )}

        {(
          [
            ['source', 'Source', 'UNI-PASS 세율정보'],
            ['reference', 'Reference (URL / doc no.)', '조회 화면·문서번호'],
            ['verifiedBy', 'Verified by', '관세사 OOO'],
          ] as const
        ).map(([k, l, ph]) => (
          <label key={k} className="col-span-2">
            <span className={label}>{l}</span>
            <input className={input} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
          </label>
        ))}
        <label>
          <span className={label}>Verified at</span>
          <input className={input} type="date" value={f.verifiedAt ?? ''} onChange={(e) => set('verifiedAt', e.target.value)} />
        </label>
        <label>
          <span className={label}>Valid until (optional)</span>
          <input className={input} type="date" value={f.validUntil ?? ''} onChange={(e) => set('validUntil', e.target.value)} />
        </label>
      </div>

      <div className="flex min-w-0 flex-col">
        <pre className="thin-scroll max-h-80 flex-1 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11.5px] leading-relaxed text-emerald-200">{entry}</pre>
        {missing.length > 0 || invalid.length > 0 ? (
          <div className="mt-2 space-y-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400" role="status">
            {missing.length > 0 && (
              <p>
                {lang === 'ko' ? '필수 항목 입력 필요: ' : 'Required: '}
                {missing.join(', ')}
              </p>
            )}
            {invalid.length > 0 && (
              <p className="text-rose-600 dark:text-rose-400">
                {lang === 'ko' ? '값 확인 필요: ' : 'Invalid: '}
                {invalid.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ClipboardCheck className="size-3.5" />
            {lang === 'ko' ? '형식 검증 통과 — verified-overrides.json의 entries 배열에 붙여넣으세요' : 'Valid — paste into the entries array of verified-overrides.json'}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {missing.length === 0 && invalid.length === 0 && <CopyButton text={entry} />}
          {editUrl && (
            <a href={editUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
              verified-overrides.json {lang === 'ko' ? '편집' : 'edit'} <ExternalLink className="size-3" />
            </a>
          )}
          <span className="text-[11px] text-slate-400">npm run data:validate</span>
        </div>
      </div>
    </div>
  );
}
