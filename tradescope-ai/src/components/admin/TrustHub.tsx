'use client';

/**
 * /admin → API 연결 · 신뢰도: every connection the product uses, its status, and how much each one (or each
 * partner verification) would raise the data trust score. Projections use the live scoring formula on today's
 * data (see lib/trust/levers); the score shown on the site only changes when data is actually synced or verified.
 */
import { ArrowRight, CheckCircle2, CircleDashed, FlaskConical, Loader2, PlugZap, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import { CATEGORY_LABEL } from '@/data/official';
import { LEVERS, projectTrust, type LeverKind } from '@/lib/trust/levers';
import type { Lang, VerificationCategory } from '@/lib/types';
import { Button, cx, ScoreRing } from '../ui';

type Field = { key: string; source: 'env' | 'admin' | 'default' | 'unset' };
type TestResult = { ok: boolean; message: string; latencyMs: number; detail?: string };
export type HubTarget = 'data' | 'ai' | 'tracking' | 'service' | 'pricing' | 'partners';

const T = {
  ko: {
    title: '데이터 신뢰도 100%까지',
    lead: '각 연결과 검증이 데이터 신뢰도를 얼마나 올리는지 미리 계산했습니다. 공식 데이터 API는 이미 반영되어 있고, 남은 점수는 국가별 계약 관세법인·법무법인과 포워더의 검증으로 채웁니다.',
    now: '현재',
    full: '모두 적용 시 (예상)',
    steps: '올리는 순서',
    gain: '예상 상승',
    after: '누적',
    done: '반영 완료',
    notScored: '점수 항목 아님',
    kind: { api: 'API', check: '자동 점검', expert: '파트너 검증' } as Record<LeverKind, string>,
    status: { ok: '연결됨', partial: '일부 반영', error: '오류', off: '미연결', key: '키 등록됨', nokey: '키 없음', keyOptional: '키 선택 사항', partner: '계약 파트너 필요' },
    setKey: '키 입력',
    openPartners: '파트너 관리',
    viaHelper: '신뢰도 센터 → 검증값 입력 도우미',
    test: '연결 테스트',
    testing: '확인 중…',
    other: '기능 연결 (신뢰도 점수에는 영향 없음)',
    products: '품목별 예상',
    missing: '부족한 항목',
    footnote:
      '예상 점수는 해당 항목이 공식 자료나 계약 파트너의 검증으로 확인됐다고 가정한 값입니다. 사이트에 표시되는 점수는 실제 반영된 값이며, 동기화(npm run data:sync · 주간 GitHub Actions)나 검증값 반영 후에 오릅니다.',
    conns: {
      ai: ['AI 엔진 (LLM)', 'AI 브리핑·메일 다듬기', 'ai'],
      tracking: ['컨테이너·통관 추적', '선사 API · ShipsGo · UNI-PASS 실시간 조회', 'tracking'],
      webhook: ['요청 알림 웹훅', '전문가 요청이 들어오면 Slack 등으로 알림', 'service'],
      pay: ['결제 링크', '요금제 버튼에서 결제 페이지로 연결', 'pricing'],
    } as Record<string, [string, string, HubTarget]>,
  },
  en: {
    title: 'Towards 100% data trust',
    lead: 'How much each connection and each verification would raise the data trust score. The official-data APIs are already reflected; the rest comes from verification by contracted customs and law firms and forwarders in each country.',
    now: 'Now',
    full: 'With everything (projected)',
    steps: 'Order of impact',
    gain: 'Projected gain',
    after: 'Cumulative',
    done: 'Already reflected',
    notScored: 'Not a scored item',
    kind: { api: 'API', check: 'Automated check', expert: 'Partner verification' } as Record<LeverKind, string>,
    status: { ok: 'Connected', partial: 'Partly reflected', error: 'Error', off: 'Not connected', key: 'Key saved', nokey: 'No key', keyOptional: 'Key optional', partner: 'Needs a contracted partner' },
    setKey: 'Enter key',
    openPartners: 'Partners',
    viaHelper: 'Trust Center → verified-value helper',
    test: 'Test connection',
    testing: 'Checking…',
    other: 'Feature connections (no effect on the trust score)',
    products: 'By product',
    missing: 'Weakest areas',
    footnote:
      'Projections assume the items are confirmed by official sources or contracted partners. The score shown on the site is the real one and rises after a sync (npm run data:sync · weekly GitHub Actions) or once verified values are applied.',
    conns: {
      ai: ['AI engine (LLM)', 'AI briefing and email polishing', 'ai'],
      tracking: ['Container & customs tracking', 'Carrier APIs · ShipsGo · UNI-PASS live lookups', 'tracking'],
      webhook: ['Request webhook', 'Notifies Slack etc. when an expert request arrives', 'service'],
      pay: ['Checkout links', 'Pricing buttons lead to your checkout page', 'pricing'],
    } as Record<string, [string, string, HubTarget]>,
  },
};

const TEST_TARGET: Record<string, string> = { comtrade: 'comtrade', kcs: 'dataGoKr' };
/** Each connection's sources; a source counts as connected when every one of its keys is set. */
const CONN_KEYS: Record<string, string[][]> = {
  ai: [['AI_API_KEY']],
  tracking: [['TRACK_SHIPSGO_TOKEN'], ['UNIPASS_CARGO_KEY'], ['TRACK_HLAG_CLIENT_ID', 'TRACK_HLAG_CLIENT_SECRET'], ['TRACK_CMACGM_KEY']],
  webhook: [['CONSULT_WEBHOOK_URL']],
  pay: [['CHECKOUT_CASE_URL'], ['CHECKOUT_SUB_URL']],
};
const TEST_MSG: Record<Lang, Record<string, string>> = {
  ko: { 'no-key': '키가 없습니다', 'no-api-key': 'API 키가 없습니다', 'invalid-key': '키가 올바르지 않습니다', timeout: '응답 시간 초과', 'network-error': '연결할 수 없습니다', 'unknown-target': '알 수 없는 테스트' },
  en: { 'no-key': 'No key', 'no-api-key': 'No API key', 'invalid-key': 'Invalid key', timeout: 'Timed out', 'network-error': 'Could not connect', 'unknown-target': 'Unknown test' },
};
const testMessage = (lang: Lang, code: string) => TEST_MSG[lang][code] ?? (/^http-\d{3}$/.test(code) ? (lang === 'ko' ? `HTTP ${code.slice(5)} 응답` : `HTTP ${code.slice(5)} response`) : code);
const CONN_TEST: Record<string, string | undefined> = { ai: 'ai' };

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'off' | 'err'; children: React.ReactNode }) {
  const cls = {
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300',
    warn: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300',
    off: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/[0.06] dark:text-slate-300',
    err: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300',
  }[tone];
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'err' ? TriangleAlert : CircleDashed;
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1', cls)}>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

export default function TrustHub({
  lang,
  fields,
  sources,
  go,
  onUnauthorized,
}: {
  lang: Lang;
  fields: Record<string, Field>;
  sources: Record<string, string | null>;
  go: (to: HubTarget) => void;
  onUnauthorized: () => void;
}) {
  const s = T[lang];
  const proj = useMemo(() => projectTrust(PRODUCTS, LEVERS), []);
  const [tests, setTests] = useState<Record<string, TestResult | 'busy'>>({});
  const isSet = (k: string) => !!fields[k] && fields[k].source !== 'unset' && fields[k].source !== 'default';

  const runTest = async (target: string) => {
    setTests((t) => ({ ...t, [target]: 'busy' }));
    try {
      const res = await fetch('/api/admin/test', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target }) });
      if (res.status === 401) return onUnauthorized();
      const j = (await res.json()) as { result?: TestResult };
      setTests((t) => ({ ...t, [target]: j.result ?? { ok: false, message: `http-${res.status}`, latencyMs: 0 } }));
    } catch {
      setTests((t) => ({ ...t, [target]: { ok: false, message: 'network-error', latencyMs: 0 } }));
    }
  };
  const testView = (target: string) => {
    const r = tests[target];
    return (
      <span className="inline-flex items-center gap-2">
        <Button size="xs" variant="ghost" onClick={() => runTest(target)} disabled={r === 'busy'}>
          {r === 'busy' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <FlaskConical className="size-3.5" aria-hidden />}
          {r === 'busy' ? s.testing : s.test}
        </Button>
        {r && r !== 'busy' && (
          <span role="status" className={cx('text-[12px] font-semibold', r.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
            {r.ok ? `OK · ${r.latencyMs}ms${r.detail ? ` · ${r.detail}` : ''}` : testMessage(lang, r.message)}
          </span>
        )}
      </span>
    );
  };

  const leverStatus = (id: string) => {
    const l = LEVERS.find((x) => x.id === id)!;
    if (l.kind === 'expert') return <Pill tone="off">{s.status.partner}</Pill>;
    const st = l.source ? sources[l.source] : null;
    const tone = st === 'ok' ? 'ok' : st === 'partial' ? 'warn' : st === 'error' ? 'err' : 'off';
    const label = st === 'ok' ? s.status.ok : st === 'partial' ? s.status.partial : st === 'error' ? s.status.error : s.status.off;
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <Pill tone={tone}>{label}</Pill>
        {l.settings?.map((k) => (
          <Pill key={k} tone={isSet(k) ? 'ok' : 'off'}>
            {isSet(k) ? s.status.key : l.id === 'comtrade' ? s.status.keyOptional : s.status.nokey}
          </Pill>
        ))}
      </span>
    );
  };

  // stacked bar: today's score, then each lever's cumulative step
  let prev = proj.now;
  const segments = proj.levers
    .filter((l) => l.cumulative > 0)
    .map((l) => {
      const seg = { id: l.lever.id, from: prev, to: l.cumulative, kind: l.lever.kind };
      prev = Math.max(prev, l.cumulative);
      return seg;
    })
    .filter((x) => x.to > x.from);

  const weakest = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id);
    const byCat = new Map<VerificationCategory, number[]>();
    for (const it of p?.verification?.items ?? []) byCat.set(it.category, [...(byCat.get(it.category) ?? []), it.level === 'official' || it.level === 'verified' ? 1 : it.level === 'crosscheck' ? 0.5 : 0]);
    return [...byCat.entries()]
      .map(([c, v]) => ({ c, v: v.reduce((a, x) => a + x, 0) / v.length }))
      .filter((x) => x.v < 1)
      .sort((a, b) => a.v - b.v)
      .slice(0, 3)
      .map((x) => CATEGORY_LABEL[x.c][lang]);
  };

  return (
    <div className="space-y-5">
      {/* summary */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <ScoreRing value={proj.now} size={64} />
            <div>
              <p className="text-[12px] font-semibold text-slate-500">{s.now}</p>
              <p className="text-[26px] font-bold leading-none tabular-nums text-slate-900 dark:text-white">{proj.now}</p>
            </div>
          </div>
          <ArrowRight className="size-5 text-slate-300" aria-hidden />
          <div className="flex items-center gap-3">
            <ScoreRing value={proj.full} size={64} />
            <div>
              <p className="text-[12px] font-semibold text-slate-500">{s.full}</p>
              <p className="text-[26px] font-bold leading-none tabular-nums text-brand-700 dark:text-brand-300">{proj.full}</p>
            </div>
          </div>
        </div>
        <h2 className="mt-5 text-[15px] font-bold text-slate-900 dark:text-white">{s.title}</h2>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{s.lead}</p>
        <div className="mt-4" aria-hidden>
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div className="absolute inset-y-0 left-0 bg-slate-400 dark:bg-slate-500" style={{ width: `${proj.now}%` }} />
            {segments.map((g, i) => (
              <div
                key={g.id}
                className={cx('absolute inset-y-0 border-l border-white/70 dark:border-black/40', g.kind === 'expert' ? (i % 2 ? 'bg-brand-500' : 'bg-brand-600') : 'bg-emerald-500')}
                style={{ left: `${g.from}%`, width: `${g.to - g.from}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </section>

      {/* levers */}
      <section aria-labelledby="hub-steps" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <h3 id="hub-steps" className="border-b border-slate-100 px-5 py-3 text-[13px] font-bold text-slate-800 dark:border-white/[0.06] dark:text-slate-100">
          {s.steps}
        </h3>
        <ol className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {proj.levers.map(({ lever: l, gain, cumulative }) => (
            <li key={l.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      'rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
                      l.kind === 'expert' ? 'bg-brand-50 text-brand-800 dark:bg-brand-400/10 dark:text-brand-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200',
                    )}
                  >
                    {s.kind[l.kind]}
                  </span>
                  <span className="text-[14px] font-bold text-slate-900 dark:text-white">{l.name[lang]}</span>
                  {leverStatus(l.id)}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{l.effect[lang]}</p>
                <p className="mt-0.5 text-[12px] text-slate-400">{l.by[lang]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {l.kind !== 'expert' && l.settings?.length ? (
                    <Button size="xs" variant="secondary" onClick={() => go('data')}>
                      <PlugZap className="size-3.5" aria-hidden />
                      {s.setKey}
                    </Button>
                  ) : null}
                  {TEST_TARGET[l.id] && isSet(l.settings?.[0] ?? '') && testView(TEST_TARGET[l.id])}
                  {l.section === 'partners' && (
                    <Button size="xs" variant="secondary" onClick={() => go('partners')}>
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {s.openPartners}
                    </Button>
                  )}
                  {l.section === 'trust-center' && <span className="text-[12px] text-slate-500">{s.viaHelper}</span>}
                  {l.getKey && !isSet(l.settings?.[0] ?? '') && (
                    <a href={l.getKey.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
                      {l.getKey.label[lang]} ↗
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-3 md:flex-col md:items-end md:gap-0.5">
                <p className={cx('text-[22px] font-bold leading-none tabular-nums', gain > 0 ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400')}>{gain > 0 ? `+${gain}` : '±0'}</p>
                <p className="text-[11.5px] tabular-nums text-slate-500">
                  {gain > 0 ? `${s.after} ${cumulative}` : Object.keys(l.raises).length === 0 ? s.notScored : s.done}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* connections without a trust effect */}
      <section aria-labelledby="hub-other" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <h3 id="hub-other" className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
          {s.other}
        </h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(s.conns).map(([id, [name, what, to]]) => {
            const n = CONN_KEYS[id].filter((keys) => keys.every(isSet)).length;
            return (
              <li key={id} className="rounded-xl border border-slate-200/80 p-3.5 dark:border-white/[0.07]">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-slate-900 dark:text-white">{name}</span>
                  <Pill tone={n ? 'ok' : 'off'}>{n ? `${s.status.ok}${CONN_KEYS[id].length > 1 ? ` ${n}/${CONN_KEYS[id].length}` : ''}` : s.status.off}</Pill>
                </p>
                <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">{what}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="xs" variant="secondary" onClick={() => go(to)}>
                    <PlugZap className="size-3.5" aria-hidden />
                    {s.setKey}
                  </Button>
                  {CONN_TEST[id] && n > 0 && testView(CONN_TEST[id]!)}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* per product */}
      <section aria-labelledby="hub-products" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-hairline dark:border-white/[0.07] dark:bg-white/[0.02]">
        <h3 id="hub-products" className="border-b border-slate-100 px-5 py-3 text-[13px] font-bold text-slate-800 dark:border-white/[0.06] dark:text-slate-100">
          {s.products}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-semibold">{lang === 'ko' ? '품목' : 'Product'}</th>
                <th className="px-3 py-2 text-right font-semibold">{s.now}</th>
                <th className="px-3 py-2 text-right font-semibold">{s.full}</th>
                <th className="px-5 py-2 font-semibold">{s.missing}</th>
              </tr>
            </thead>
            <tbody>
              {proj.products.map((r) => {
                const p = PRODUCTS.find((x) => x.id === r.id)!;
                return (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-white/[0.06]">
                    <td className="px-5 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                      <span aria-hidden className="mr-1.5">{p.emoji}</span>
                      {p.name[lang]}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.now}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-brand-700 dark:text-brand-300">{r.full}</td>
                    <td className="px-5 py-2.5 text-[12.5px] text-slate-500 dark:text-slate-400">{weakest(r.id).join(' · ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{s.footnote}</p>
    </div>
  );
}
