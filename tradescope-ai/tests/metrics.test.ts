/* Validation metrics: event parsing, counter store, verdict rules, browser re-check logic and the two routes. */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { done, ok } from './assert';

// writable storage needs an admin secret, as in production
process.env.ADMIN_SECRET = 'metrics-test-secret-0123456789abcdef';

const { eventKeys, optedOutHeaders, parseChannel, parseClientEvent } = await import('@/lib/metrics/events');
const { channelRows, hypothesisChecks, judgeRate, sampleFor, wilson, withAlso } = await import('@/lib/metrics/hypotheses');
const store = await import('@/lib/metrics/store');

const dir = process.env.TRADESCOPE_DATA_DIR!;
const file = path.join(dir, 'metrics.json');
const b = (x: string) => ({ ko: x, en: x });
const near = (a: number, e: number, tol = 0.0005) => Math.abs(a - e) <= tol;

// ---- events -------------------------------------------------------------------------------------------------------
ok('channel lower-cased', parseChannel(' KOTRA ') === 'kotra');
ok('channel with space rejected', parseChannel('a b') === undefined);
ok('channel over 32 rejected', parseChannel('a'.repeat(33)) === undefined);
ok('channel starting with - rejected', parseChannel('-x') === undefined);
ok('non-string channel rejected', parseChannel(42) === undefined);

ok('step_first parsed', JSON.stringify(parseClientEvent({ e: 'step_first', step: 'permits' })) === '{"e":"step_first","step":"permits"}');
ok('unknown step dropped', parseClientEvent({ e: 'step_first', step: 'admin' }) === null);
ok('report needs a boolean', parseClientEvent({ e: 'report', supported: 'yes' }) === null);
ok('browser cannot send consult_submit', parseClientEvent({ e: 'consult_submit', src: 'card' }) === null);
ok('browser cannot send track results', parseClientEvent({ e: 'track', kind: 'live' }) === null);
ok('extra fields are not kept', JSON.stringify(parseClientEvent({ e: 'visit', email: 'x@y.z' })) === '{"e":"visit"}');
ok('null event', parseClientEvent(null) === null);

const keys = (...a: Parameters<typeof eventKeys>) => eventKeys(...a).join(',');
ok('visit carries the channel', keys({ e: 'visit' }, 'kotra') === 'visit,ch:kotra:visit');
ok('report has no channel key', keys({ e: 'report', supported: false }, 'kotra') === 'report,report:unsupported');
ok('permits first open per channel', keys({ e: 'step_first', step: 'permits' }, 'kotra') === 'step_first:permits,ch:kotra:step_first:permits');
ok('shipping first open has no channel key', keys({ e: 'step_first', step: 'shipping' }, 'kotra') === 'step_first:shipping');
ok('expert open with source and channel', keys({ e: 'expert_open', src: 'card' }, 'kotra') === 'expert_open,expert_open:card,ch:kotra:expert_open');
ok('consult submit with source and channel', keys({ e: 'consult_submit', src: 'checklist' }, 'kotra') === 'consult_submit,consult_submit:checklist,ch:kotra:consult_submit');
ok('live track counts the provider', keys({ e: 'track', kind: 'live', provider: 'ShipsGo' }) === 'track:live,track_provider:ShipsGo');
ok('pending track counts the provider too', keys({ e: 'track', kind: 'pending', provider: 'ShipsGo' }) === 'track:pending,track_provider:ShipsGo');
ok('first permits request adds the pair key', keys({ e: 'consult_submit', src: 'card', first: true }) === 'consult_submit,consult_submit:card,consult_first:card');
ok('first flag ignored outside the permits step', keys({ e: 'consult_submit', src: 'customs', first: true }) === 'consult_submit,consult_submit:customs');
ok('opt-out headers', optedOutHeaders(new Headers({ 'Sec-GPC': '1' })) && optedOutHeaders(new Headers({ DNT: '1' })) && !optedOutHeaders(new Headers({ DNT: '0' })) && !optedOutHeaders(new Headers()));
ok('failed track has no provider key', keys({ e: 'track', kind: 'failed', provider: 'ShipsGo' }) === 'track:failed');
ok('odd provider name dropped', keys({ e: 'track', kind: 'live', provider: 'a:b' }) === 'track:live');

// ---- verdict rules ------------------------------------------------------------------------------------------------
ok('wilson with no data', JSON.stringify(wilson(0, 0)) === '{"low":0,"high":1}');
ok('wilson never NaN when k > n', Object.values(wilson(12, 10)).every(Number.isFinite) && wilson(12, 10).high === 1);
const w = wilson(5, 100);
ok('wilson 5/100 ≈ 2.15–11.18%', near(w.low, 0.0215) && near(w.high, 0.1118), w);
const w0 = wilson(0, 20);
ok('wilson 0/20 starts at 0', w0.low === 0 && near(w0.high, 0.1611), w0);
ok('sample for ±3% around 5% = 203', sampleFor(0.05, 0.03) === 203);
ok('sample for ±10% around 50% = 97', sampleFor(0.5, 0.1) === 97);

const judge = (success: number, base: number) => judgeRate({ id: 'X', title: b('x'), measure: b('x'), success, base, minBase: 20, pass: 0.5, stop: 0.2 }).verdict;
ok('below minimum → insufficient even at 100%', judge(19, 19) === 'insufficient');
ok('exactly the pass line → pass', judge(10, 20) === 'pass');
ok('just under pass → hold', judge(9, 20) === 'hold');
ok('exactly the stop line → hold', judge(4, 20) === 'hold');
ok('under the stop line → stop', judge(3, 20) === 'stop');
ok('insufficient keeps a rate and interval', judgeRate({ id: 'X', title: b('x'), measure: b('x'), success: 1, base: 4, minBase: 20, pass: 0.5, stop: 0.2 }).rate === 0.25);

const passing = judgeRate({ id: 'X', title: b('x'), measure: b('x'), success: 10, base: 20, minBase: 20, pass: 0.5, stop: 0.2 });
const also = (success: number, base: number) => withAlso(passing, { label: b('a'), success, base, target: 0.7, minBase: 10 });
ok('pass + second condition unknown → hold', also(5, 5).verdict === 'hold' && also(5, 5).also?.met === null);
ok('pass + second condition missed → hold', also(6, 10).verdict === 'hold' && also(6, 10).also?.met === false);
ok('pass + second condition met → pass', also(7, 10).verdict === 'pass' && also(7, 10).also?.met === true);
const stopping = judgeRate({ id: 'X', title: b('x'), measure: b('x'), success: 1, base: 20, minBase: 20, pass: 0.5, stop: 0.2 });
ok('a stop stays a stop', withAlso(stopping, { label: b('a'), success: 10, base: 10, target: 0.7, minBase: 10 }).verdict === 'stop');

const checks = hypothesisChecks(
  {
    'step_first:permits': 200,
    'consult_first:checklist': 6,
    'consult_first:card': 4,
    'consult_submit:checklist': 9, // repeat requests from the same pairs: not part of the rate
    'consult_submit:unsupported': 50, // not from the permits step: not part of H3
    'step_first:shipping': 20,
    track_recheck2: 9,
    'track:live': 17,
    'track:pending': 1,
    'track:not-covered': 2,
    'track:demo': 500, // example data never counts
  },
  { handled: 10, responded: 8 },
);
const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
ok('H3 counts only permits-step requests: 10/200 → pass', byId.H3.success === 10 && byId.H3.base === 200 && byId.H3.verdict === 'pass', byId.H3);
ok('H3 response condition attached', byId.H3.also?.met === true && byId.H3.also.success === 8);
ok('H3 without a request tally → hold', hypothesisChecks({ 'step_first:permits': 200, 'consult_first:card': 10 })[0].verdict === 'hold');
ok('H7 9/20 → hold', byId.H7.verdict === 'hold' && byId.H7.rate === 0.45);
ok('H8 counts not-covered against coverage, ignores demo: 18/20 → pass', byId.H8.success === 18 && byId.H8.base === 20 && byId.H8.verdict === 'pass', byId.H8);

const rows = channelRows({ 'ch:a:visit': 50, 'ch:a:consult_submit': 1, 'ch:b:visit': 10, 'ch:b:consult_submit': 3, 'ch:c:visit': 70, visit: 999 });
ok('channels sorted by requests, then visits', rows.map((r) => r.channel).join(',') === 'b,a,c', rows);
ok('channel row fields', rows[0].visits === 10 && rows[0].requests === 3 && rows[0].permitsViews === 0);

// ---- store --------------------------------------------------------------------------------------------------------
const day = new Date().toISOString().slice(0, 10);
store.countMetrics(['a', 'a', 'b']);
ok('counts in memory', store.metricsSummary(1).totals.a === 2 && store.metricsSummary(1).totals.b === 1);
ok('summary is persistent with storage', store.metricsSummary(1).persistent === true);
ok('flush writes', store.flushMetrics() === true);
ok('file mode 0600', process.platform === 'win32' || (statSync(file).mode & 0o777) === 0o600);
store.resetMetricsForTest();
ok('read back after a restart', store.metricsSummary(1).totals.a === 2, store.metricsSummary(1));
ok('today in the period', store.metricsSummary(7).to === day && store.metricsSummary(7).daily.some((d) => d.date === day));

// channel names come from visitors' links: they have their own budget and never crowd out other counters
store.countMetrics(Array.from({ length: 1100 }, (_, i) => `ch:c${i}:visit`));
store.countMetrics(['consult_first:card', 'track:live']);
let counts = store.metricsSummary(1).daily[0].counts;
ok('at most 1000 channel keys a day', Object.keys(counts).filter((k) => k.startsWith('ch:')).length === 1000);
ok('verdict counters still counted after the channel budget is spent', counts['consult_first:card'] === 1 && counts['track:live'] === 1, counts['consult_first:card']);
store.countMetrics(Array.from({ length: 1100 }, (_, i) => `k${i}`));
counts = store.metricsSummary(1).daily[0].counts;
ok('at most 1000 other keys a day', Object.keys(counts).filter((k) => !k.startsWith('ch:')).length === 1000);
store.countMetrics(['a']);
ok('existing keys still count at the cap', store.metricsSummary(1).totals.a === 3);

// another process writing the same file: each flush adds only its own new counts
store.flushMetrics();
const other = JSON.parse(readFileSync(file, 'utf8')) as { days: Record<string, Record<string, number>> };
other.days[day].fromOther = 5;
other.days[day].a += 10;
writeFileSync(file, JSON.stringify(other));
ok('summary shows the other process’s counts', store.metricsSummary(1).totals.fromOther === 5 && store.metricsSummary(1).totals.a === 13);
store.countMetrics(['a']);
ok('…plus this process’s unwritten ones', store.metricsSummary(1).totals.a === 14);
store.flushMetrics();
const merged = (JSON.parse(readFileSync(file, 'utf8')) as typeof other).days[day];
ok('flush keeps the other process’s counts', merged.fromOther === 5 && merged.a === 14, { a: merged.a, fromOther: merged.fromOther });
ok('nothing new → no write', store.flushMetrics() === false);

// retention is by date: days older than 400 go, whether or not anything new is counted
const ago = (n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const old: Record<string, Record<string, number>> = {};
for (let i = 1; i <= 405; i++) old[ago(i)] = { visit: 1 };
writeFileSync(file, JSON.stringify({ format: 1, days: old }));
store.resetMetricsForTest();
store.countMetrics(['visit']);
store.flushMetrics();
let kept = Object.keys((JSON.parse(readFileSync(file, 'utf8')) as { days: object }).days);
ok('keeps 400 days by date', kept.length === 400 && kept.includes(day) && kept.includes(ago(399)) && !kept.includes(ago(400)), kept.length);
ok('period is capped at 400 days', store.metricsSummary(10_000).daily.length <= 400);
writeFileSync(file, JSON.stringify({ format: 1, days: { [ago(500)]: { visit: 1 }, [ago(1)]: { visit: 2 } } }));
store.resetMetricsForTest();
ok('expired day not reported', store.metricsSummary(400).totals.visit === 2);
store.flushMetrics();
kept = Object.keys((JSON.parse(readFileSync(file, 'utf8')) as { days: object }).days);
ok('expired day removed after reading, with nothing new counted', kept.length === 1 && kept[0] === ago(1), kept);

// a damaged file is set aside, never overwritten
writeFileSync(file, '{"format":1,"days":');
store.resetMetricsForTest();
store.countMetrics(['x']);
ok('damaged file kept aside', readdirSync(dir).some((f) => f.startsWith('metrics.json.corrupt-')));
ok('fresh start after damage', store.metricsSummary(1).totals.x === 1 && store.metricsSummary(1).totals.visit === undefined);
// a parseable file of another shape is set aside too, not replaced
const before = readdirSync(dir).filter((f) => f.startsWith('metrics.json.corrupt-')).length;
writeFileSync(file, JSON.stringify({ format: 2, days: { [day]: { visit: 99 } } }));
store.resetMetricsForTest();
store.countMetrics(['y']);
ok('unknown format kept aside', readdirSync(dir).filter((f) => f.startsWith('metrics.json.corrupt-')).length === before + 1 && store.metricsSummary(1).totals.visit === undefined);

// ---- browser re-check rule (H7) -----------------------------------------------------------------------------------
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
};
const { firstTime, noteSavedLookup, RECHECK_GAP_MS } = await import('@/lib/metrics/client');
const H = RECHECK_GAP_MS;
const T = Date.UTC(2026, 10, 3); // a real clock reading
ok('first time once', firstTime('step:p:permits') === true && firstTime('step:p:permits') === false);
ok('saving starts the clock', noteSavedLookup('p', true, T) === false);
ok('refresh within the hour is not a re-check', noteSavedLookup('p', false, T + H / 2) === false);
ok('first re-check', noteSavedLookup('p', false, T + H) === false);
ok('too soon after the first re-check', noteSavedLookup('p', false, T + H + H / 2) === false);
ok('second re-check reports once', noteSavedLookup('p', false, T + 2 * H) === true);
ok('never again for this trade', noteSavedLookup('p', false, T + 10 * H) === false && noteSavedLookup('p', true, T + 11 * H) === false && noteSavedLookup('p', false, T + 20 * H) === false);
ok('a re-check without a saved start only starts the clock', noteSavedLookup('q', false, T) === false && noteSavedLookup('q', false, T + H) === false);
ok('saving a second number keeps the count', noteSavedLookup('q', true, T + 2 * H) === false && noteSavedLookup('q', false, T + 2 * H) === true);
mem.set('ts-m:recheck:r', 'not json');
ok('damaged entry → false, no throw', noteSavedLookup('r', false, T) === false);

// ---- /api/metrics -------------------------------------------------------------------------------------------------
store.resetMetricsForTest();
const { POST } = await import('@/app/api/metrics/route');
const send = (body: string) => POST(new Request('http://localhost/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
let res = await send(JSON.stringify({ events: [{ e: 'visit' }, { e: 'step_first', step: 'permits' }, { e: 'nope' }], ch: 'KOTRA' }));
let totals = store.metricsSummary(1).totals;
ok('204 and counted', res.status === 204 && totals['visit'] === 1 && totals['step_first:permits'] === 1 && totals['ch:kotra:visit'] === 1, totals);
ok('unknown event dropped', !Object.keys(totals).some((k) => k.includes('nope')));
res = await send(JSON.stringify({ events: Array.from({ length: 12 }, () => ({ e: 'expert_open', src: 'card' })) }));
ok('at most 10 events per request', store.metricsSummary(1).totals['expert_open:card'] === 10);
res = await send(JSON.stringify({ events: [{ e: 'track_recheck2' }, { e: 'track_recheck2' }, { e: 'step_first', step: 'shipping' }, { e: 'step_first', step: 'shipping' }, { e: 'step_first', step: 'customs' }] }));
totals = store.metricsSummary(1).totals;
ok('one-time events counted once per request', totals.track_recheck2 === 1 && totals['step_first:shipping'] === 1 && totals['step_first:customs'] === 1, totals);
const sendGpc = (body: string) => POST(new Request('http://localhost/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-GPC': '1' }, body }));
res = await sendGpc(JSON.stringify({ events: [{ e: 'step_first', step: 'contract' }] }));
ok('GPC request accepted but not counted', res.status === 204 && store.metricsSummary(1).totals['step_first:contract'] === undefined);
ok('bad JSON → 400', (await send('{')).status === 400);
ok('too large → 413', (await send(JSON.stringify({ events: [], pad: 'x'.repeat(3000) }))).status === 413);
res = await send(JSON.stringify({ events: [{ e: 'visit' }], ch: 'has space' }));
ok('bad channel ignored, event kept', res.status === 204 && store.metricsSummary(1).totals.visit === 2 && !Object.keys(store.metricsSummary(1).totals).some((k) => k.startsWith('ch:has')));

// ---- /api/consult counts the submission with its source and channel ----------------------------------------------
const consult = await import('@/app/api/consult/route');
const { listRequests } = await import('@/lib/consult/store');
const submit = (extra: Record<string, unknown>, headers: Record<string, string> = {}) =>
  consult.POST(
    new Request('http://localhost/api/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ name: 'Kim', email: 'kim@example.com', consent: true, serviceIds: ['ph-fda-food'], topic: 'FDA', lang: 'ko', ...extra }),
    }),
  );
res = await submit({ source: 'checklist', ch: 'kotra', first: true });
totals = store.metricsSummary(1).totals;
ok('consult 200', res.status === 200, await res.clone().text());
ok('consult_submit counted with source and channel', totals.consult_submit === 1 && totals['consult_submit:checklist'] === 1 && totals['ch:kotra:consult_submit'] === 1, totals);
ok('first permits request counted as a pair', totals['consult_first:checklist'] === 1);
ok('record keeps source and channel', listRequests()[0].source === 'checklist' && listRequests()[0].channel === 'kotra');
res = await submit({ source: 'admin', ch: 'Bad Channel!' });
totals = store.metricsSummary(1).totals;
ok('unknown source and channel dropped', res.status === 200 && totals.consult_submit === 2 && listRequests()[0].source === undefined && listRequests()[0].channel === undefined, listRequests()[0]);
res = await submit({ source: ['card'] });
ok('array source is not a source', res.status === 200 && listRequests()[0].source === undefined && store.metricsSummary(1).totals['consult_submit:card'] === undefined, listRequests()[0]);
res = await submit({ source: 'checklist', ch: 'kotra', first: true }, { DNT: '1' });
totals = store.metricsSummary(1).totals;
ok('DNT request stored but not counted, no channel kept', res.status === 200 && totals.consult_submit === 3 && listRequests()[0].channel === undefined && listRequests()[0].source === 'checklist', { totals: totals.consult_submit, row: listRequests()[0] });
res = await submit({ email: 'not-an-email', source: 'card' });
ok('rejected request is not counted', res.status === 400 && store.metricsSummary(1).totals['consult_submit:card'] === undefined);

done('metrics');
