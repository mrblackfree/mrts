/* Tracking adapters: mappers on fixtures + provider flows against a mocked fetch. No real keys involved. */
import { fromDcsa, type DcsaEvent } from '@/lib/tracking/dcsa';
import { fromShipsGo } from '@/lib/tracking/shipsgo';
import { fromUnipassXml, kstToIso, unipassMilestone } from '@/lib/tracking/unipass';
import { belongsTo } from '@/lib/tracking/providers';
import { isContainerNumber } from '@/lib/tracking/types';
import { done, ok } from './assert';


// ---------- DCSA ----------
const dcsa: DcsaEvent[] = [
  { eventType: 'SHIPMENT', shipmentEventTypeCode: 'CONF', eventClassifierCode: 'ACT', eventDateTime: '2026-10-01T02:00:00Z' },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTOT', emptyIndicatorCode: 'EMPTY', eventClassifierCode: 'ACT', eventDateTime: '2026-10-03T02:00:00Z', eventLocation: { locationName: 'Busan', UNLocationCode: 'KRPUS' } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTIN', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-05T02:00:00Z', eventLocation: { locationName: 'Busan', UNLocationCode: 'KRPUS' } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'LOAD', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T02:00:00Z', eventLocation: { locationName: 'Busan', UNLocationCode: 'KRPUS' }, transportCall: { vessel: { vesselName: 'TEST STAR' }, exportVoyageNumber: '042S' } },
  { eventType: 'TRANSPORT', transportEventTypeCode: 'DEPA', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T10:00:00Z', transportCall: { location: { locationName: 'Busan', UNLocationCode: 'KRPUS' }, vessel: { vesselName: 'TEST STAR' }, exportVoyageNumber: '042S' } },
  // transshipment in Kaohsiung
  { eventType: 'TRANSPORT', transportEventTypeCode: 'ARRI', eventClassifierCode: 'ACT', eventDateTime: '2026-10-09T10:00:00Z', transportCall: { location: { locationName: 'Kaohsiung', UNLocationCode: 'TWKHH' } } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'DISC', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-09T12:00:00Z', eventLocation: { locationName: 'Kaohsiung', UNLocationCode: 'TWKHH' } },
  // two estimates for the Manila arrival; the newer one wins
  { eventType: 'TRANSPORT', transportEventTypeCode: 'ARRI', eventClassifierCode: 'EST', eventCreatedDateTime: '2026-10-02T00:00:00Z', eventDateTime: '2026-10-12T10:00:00Z', transportCall: { location: { locationName: 'Manila', UNLocationCode: 'PHMNL' } } },
  { eventType: 'TRANSPORT', transportEventTypeCode: 'ARRI', eventClassifierCode: 'EST', eventCreatedDateTime: '2026-10-08T00:00:00Z', eventDateTime: '2026-10-13T08:00:00Z', transportCall: { location: { locationName: 'Manila', UNLocationCode: 'PHMNL' } } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'DISC', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'EST', eventDateTime: '2026-10-13T20:00:00Z', eventLocation: { locationName: 'Manila', UNLocationCode: 'PHMNL' } },
  // junk is skipped
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'LOAD', eventDateTime: 'not-a-date' },
];
const d = fromDcsa('Hapag-Lloyd', { reference: 'HLXU1234561', kind: 'container' }, 'Hapag-Lloyd', dcsa)!;
ok('dcsa result', d && d.events.length >= 8, d);
ok('dcsa booked first', d.events[0].milestone === 'booked');
ok('dcsa empty-out', d.events[1].milestone === 'empty-out', d.events[1]);
ok('dcsa gate-in', d.events[2].milestone === 'gate-in');
ok('dcsa loaded with vessel/voyage', d.events[3].milestone === 'loaded' && d.events[3].vessel === 'TEST STAR / 042S', d.events[3]);
ok('dcsa pol', d.pol === 'Busan (KRPUS)', d.pol);
ok('dcsa pod', d.pod === 'Manila (PHMNL)', d.pod);
ok('dcsa transshipment relabel', d.events.filter((e) => e.milestone === 'transshipment').length === 2, d.events.map((e) => e.milestone));
ok('dcsa one Manila arrival estimate', d.events.filter((e) => e.milestone === 'arrived').length === 1, d.events);
ok('dcsa ETA = newest estimate', d.eta === '2026-10-13T08:00:00.000Z', d.eta);
ok('dcsa status = last actual', d.status === 'transshipment', d.status);
ok('dcsa estimates flagged', d.events.filter((e) => !e.actual).length === 2);
ok('dcsa empty list → null', fromDcsa('x', { reference: 'A', kind: 'bl' }, undefined, []) === null);
// actual supersedes estimate
const sup = fromDcsa('x', { reference: 'A', kind: 'bl' }, undefined, [
  { eventType: 'TRANSPORT', transportEventTypeCode: 'DEPA', eventClassifierCode: 'EST', eventDateTime: '2026-10-06T08:00:00Z', transportCall: { location: { UNLocationCode: 'KRPUS' } } },
  { eventType: 'TRANSPORT', transportEventTypeCode: 'DEPA', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T10:00:00Z', transportCall: { location: { UNLocationCode: 'KRPUS' } } },
])!;
ok('dcsa actual supersedes estimate', sup.events.length === 1 && sup.events[0].actual, sup.events);
// empty return after the voyage
const ret = fromDcsa('x', { reference: 'A', kind: 'container' }, undefined, [
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'LOAD', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T10:00:00Z', eventLocation: { UNLocationCode: 'KRPUS' } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTOT', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-15T10:00:00Z', eventLocation: { UNLocationCode: 'PHMNL' } },
  { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTIN', emptyIndicatorCode: 'EMPTY', eventClassifierCode: 'ACT', eventDateTime: '2026-10-18T10:00:00Z', eventLocation: { UNLocationCode: 'PHMNL' } },
])!;
ok('dcsa gate-out + empty-return', ret.events[1].milestone === 'gate-out' && ret.events[2].milestone === 'empty-return', ret.events.map((e) => e.milestone));

// ---------- ShipsGo ----------
const sg = fromShipsGo(
  { reference: 'TCNU7777777', kind: 'container' },
  {
    id: 1002,
    status: 'SAILING',
    carrier: { scac: 'ARKU', name: 'ARKAS LINE' },
    route: {
      port_of_loading: { location: { code: 'KRPUS', name: 'BUSAN' } },
      port_of_discharge: { location: { code: 'PHMNL', name: 'MANILA' }, date_of_discharge: '2026-10-18T12:00:00+08:00', date_of_discharge_predicted: '2026-10-19T12:00:00+08:00' },
    },
    containers: [
      { number: 'ARKU7777777', movements: [{ event: 'EMSH', status: 'ACT', timestamp: '2026-10-01T12:00:00+09:00' }] },
      {
        number: 'TCNU7777777',
        movements: [
          { event: 'LOAD', status: 'ACT', location: { code: 'KRPUS', name: 'BUSAN' }, vessel: { name: 'LODUR' }, voyage: 'ASA2325', timestamp: '2026-10-10T12:00:00+09:00' },
          { event: 'EMSH', status: 'ACT', location: { code: 'KRPUS', name: 'BUSAN' }, vessel: null, timestamp: '2026-10-03T12:00:00+09:00' },
          { event: 'DEPA', status: 'ACT', location: { code: 'KRPUS', name: 'BUSAN' }, vessel: { name: 'LODUR' }, voyage: 'ASA2325', timestamp: '2026-10-10T18:00:00+09:00' },
          { event: 'ARRV', status: 'EST', location: { code: 'PHMNL', name: 'MANILA' }, vessel: { name: 'LODUR' }, voyage: 'ASA2325', timestamp: '2026-10-18T12:00:00+08:00' },
          { event: 'ZZZZ', status: 'ACT', timestamp: '2026-10-11T00:00:00Z' },
        ],
      },
    ],
  },
);
ok('sg picks the matching container', sg.events.length === 5 && sg.events[0].milestone === 'empty-out', sg.events);
ok('sg sorted', sg.events.map((e) => e.milestone).join(',') === 'empty-out,loaded,departed,other,arrived', sg.events.map((e) => e.milestone));
ok('sg ETA predicted', sg.eta === '2026-10-19T04:00:00.000Z', sg.eta);
ok('sg pol/pod', sg.pol === 'BUSAN (KRPUS)' && sg.pod === 'MANILA (PHMNL)');
ok('sg status departed', sg.status === 'departed' || sg.status === 'other', sg.status);
ok('sg containers listed', sg.containers?.length === 2);
ok('sg carrier name', sg.carrier === 'ARKAS LINE');
ok('sg vessel', sg.vessel === 'LODUR / ASA2325', sg.vessel);
const sgNew = fromShipsGo({ reference: 'MSDU7777777', kind: 'container' }, { id: 1, status: 'INPROGRESS', containers: [] });
ok('sg pending when no events yet', sgNew.pending === true && sgNew.events.length === 0);

// ---------- UNI-PASS ----------
ok('kst datetime', kstToIso('20261101093015') === '2026-11-01T00:30:15.000Z', kstToIso('20261101093015'));
ok('kst date', kstToIso('20261101') === '2026-10-31T15:00:00.000Z');
ok('kst bad', kstToIso('2026-11-01') === undefined);
const ms: Array<[string, string]> = [
  ['입항적하목록 운항정보 정정', 'other'],
  ['입항보고 수리', 'arrived'],
  ['하선신고 수리', 'discharged'],
  ['반입신고', 'customs'],
  ['수입신고', 'customs'],
  ['수입신고수리', 'customs-cleared'],
  ['수입신고 수리', 'customs-cleared'],
  ['반출신고', 'gate-out'],
  ['보세운송 신고', 'other'],
];
for (const [k, m] of ms) ok(`unipass milestone ${k}`, unipassMilestone(k) === m, unipassMilestone(k));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cargCsclPrgsInfoQryRtnVo><tCnt>1</tCnt><ntceInfo></ntceInfo>
<cargCsclPrgsInfoQryVo><cargMtNo>26MSCU0123456789</cargMtNo><mblNo>MEDUAB123456</mblNo><hblNo></hblNo><prgsStts>반출완료</prgsStts><csclPrgsStts>수입신고수리</csclPrgsStts><etprDt>20261020</etprDt><dsprCd>KRPUS</dsprCd><dsprNm>부산항</dsprNm><ldprCd>PHMNL</ldprCd><ldprNm>Manila</ldprNm><shipNm>TEST &amp; SEA</shipNm><vydf>2611N</vydf><shcoFlco>MSC</shcoFlco><cntrNo>MSCU1234565</cntrNo></cargCsclPrgsInfoQryVo>
<cargCsclPrgsInfoDtlQryVo><cargTrcnRelaBsopTpcd>반출신고</cargTrcnRelaBsopTpcd><prcsDttm>20261023150000</prcsDttm><shedNm>부산신항 CY</shedNm><dclrNo></dclrNo><rlbrDttm></rlbrDttm><rlbrCn>수입신고수리후 반출</rlbrCn></cargCsclPrgsInfoDtlQryVo>
<cargCsclPrgsInfoDtlQryVo><cargTrcnRelaBsopTpcd>수입신고수리</cargTrcnRelaBsopTpcd><prcsDttm>20261022110000</prcsDttm><shedNm>부산신항 CY</shedNm><dclrNo>12345-26-0000001</dclrNo></cargCsclPrgsInfoDtlQryVo>
<cargCsclPrgsInfoDtlQryVo><cargTrcnRelaBsopTpcd>입항보고 수리</cargTrcnRelaBsopTpcd><prcsDttm>20261020080000</prcsDttm><shedNm></shedNm></cargCsclPrgsInfoDtlQryVo>
<cargCsclPrgsInfoDtlQryVo><cargTrcnRelaBsopTpcd>하선신고 수리</cargTrcnRelaBsopTpcd><prcsDttm>20261020170000</prcsDttm><shedNm></shedNm></cargCsclPrgsInfoDtlQryVo>
</cargCsclPrgsInfoQryRtnVo>`;
const u = fromUnipassXml({ reference: 'MEDUAB123456', kind: 'bl' }, xml);
ok('unipass parsed', u && !('many' in u), u);
if (u && !('many' in u)) {
  ok('unipass order', u.events.map((e) => e.milestone).join(',') === 'arrived,discharged,customs-cleared,gate-out', u.events.map((e) => e.milestone));
  ok('unipass status gate-out', u.status === 'gate-out');
  ok('unipass customs status', u.customsStatus === '반출완료 · 수입신고수리', u.customsStatus);
  ok('unipass entity decode', u.vessel === 'TEST & SEA / 2611N', u.vessel);
  ok('unipass arrival location falls back to port', u.events[0].location === '부산항', u.events[0]);
  ok('unipass declaration number kept', /12345-26-0000001/.test(u.events[2].description), u.events[2]);
  ok('unipass pol/pod', u.pol === 'Manila (PHMNL)' && u.pod === '부산항 (KRPUS)', [u.pol, u.pod]);
  ok('unipass container', u.containers?.[0] === 'MSCU1234565');
  ok('unipass eta from etprDt', u.eta === '2026-10-19T15:00:00.000Z', u.eta);
}
const many = fromUnipassXml(
  { reference: 'MEDUAB123456', kind: 'bl' },
  `<r><tCnt>2</tCnt><ntceInfo>[N00] 다건</ntceInfo><cargCsclPrgsInfoQryVo><cargMtNo>26AAAA1111111111</cargMtNo></cargCsclPrgsInfoQryVo><cargCsclPrgsInfoQryVo><cargMtNo>26AAAA2222222222</cargMtNo></cargCsclPrgsInfoQryVo></r>`,
);
ok('unipass many', many && 'many' in many && many.many.length === 2, many);
ok('unipass none', fromUnipassXml({ reference: 'X', kind: 'bl' }, '<r><tCnt>0</tCnt><ntceInfo>조회결과가 없습니다.</ntceInfo></r>') === null);
let threw = false;
try {
  fromUnipassXml({ reference: 'X', kind: 'bl' }, '<r><tCnt>0</tCnt><ntceInfo>[E] 인증키가 유효하지 않습니다</ntceInfo></r>');
} catch {
  threw = true;
}
ok('unipass key notice throws', threw);

// ---------- carrier detection ----------
const HAPAG = { scac: ['HLCU'], prefixes: ['HLXU', 'HLCU'] };
ok('prefix match', belongsTo(HAPAG, { reference: 'HLXU1234561', kind: 'container' }));
ok('explicit carrier wins', !belongsTo(HAPAG, { reference: 'HLXU1234561', kind: 'container', carrier: 'MSCU' }));
ok('explicit carrier match', belongsTo(HAPAG, { reference: 'TGHU1234567', kind: 'container', carrier: 'HLCU' }));
ok('iso6346 sanity', isContainerNumber('CSQU3054383') && !isContainerNumber('CSQU3054384'));



// ---------- review fixes (mappers) ----------
{
  // laden gate-out without a LOAD event, after the voyage started
  const noLoad = fromDcsa('x', { reference: 'A', kind: 'container' }, undefined, [
    { eventType: 'TRANSPORT', transportEventTypeCode: 'DEPA', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T10:00:00Z', transportCall: { location: { UNLocationCode: 'KRPUS' } } },
    { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTOT', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-15T10:00:00Z', eventLocation: { UNLocationCode: 'PHMNL' } },
  ])!;
  ok('dcsa gate-out without LOAD', noLoad.events[1].milestone === 'gate-out' && noLoad.status === 'gate-out', noLoad.events);
  // laden gate-out before any voyage event stays 'other' (not the delivery gate-out)
  const pre = fromDcsa('x', { reference: 'A', kind: 'container' }, undefined, [
    { eventType: 'EQUIPMENT', equipmentEventTypeCode: 'GTOT', emptyIndicatorCode: 'LADEN', eventClassifierCode: 'ACT', eventDateTime: '2026-10-02T10:00:00Z', eventLocation: { UNLocationCode: 'KRPUS' } },
  ])!;
  ok('dcsa pre-voyage laden gate-out is other', pre.events[0].milestone === 'other');
  // two location-less estimates with the same wording stay separate
  const noLoc = fromDcsa('x', { reference: 'A', kind: 'bl' }, undefined, [
    { eventType: 'TRANSPORT', transportEventTypeCode: 'ARRI', eventClassifierCode: 'EST', eventDateTime: '2026-10-09T10:00:00Z' },
    { eventType: 'TRANSPORT', transportEventTypeCode: 'ARRI', eventClassifierCode: 'EST', eventDateTime: '2026-10-12T10:00:00Z' },
  ])!;
  ok('dcsa location-less estimates kept apart', noLoc.events.length === 2, noLoc.events);
}
{
  const { ttlCache } = await import('@/lib/tracking/fetch');
  const c = ttlCache<number>(60_000, 2);
  c.set('a', 1);
  c.set('b', 2);
  c.set('a', 3); // refresh at capacity must not evict b
  ok('ttlCache refresh keeps other entries', c.get('b') === 2 && c.get('a') === 3);
  c.set('c', 4); // new key evicts the oldest (b, since a was refreshed)
  ok('ttlCache evicts oldest on new key', c.get('b') === undefined && c.get('a') === 3 && c.get('c') === 4);
  const { normaliseReference } = await import('@/lib/tracking/types');
  ok('normaliseReference keeps full length', normaliseReference('a'.repeat(45)).length === 45);
  const { demoTrack } = await import('@/lib/tracking/demo');
  const dc = demoTrack({ reference: 'ABC12345', kind: 'bl' }, undefined, 'customs');
  ok('demo customs sample has clearance steps', dc.demo === true && !!dc.customsStatus && dc.events.some((e) => e.milestone === 'customs-cleared') && !dc.events.some((e) => e.milestone === 'loaded'), dc);
  const ds = demoTrack({ reference: 'MSKU1234565', kind: 'container' });
  ok('demo shipping sample unchanged', ds.events.some((e) => e.milestone === 'loaded') && ds.customsStatus === undefined);
}

// ---------- provider flows against a mocked fetch ----------
type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
const calls: Call[] = [];
let handler: (c: Call) => { status: number; body: string } = () => ({ status: 404, body: '' });
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const c: Call = { url: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {})), body: init?.body as string | undefined };
  calls.push(c);
  if (init?.redirect !== 'error') throw new Error('redirects must be refused');
  const r = handler(c);
  return new Response(r.body, { status: r.status });
}) as typeof fetch;

process.env.TRACK_SHIPSGO_TOKEN = 'sg-test-token';
process.env.UNIPASS_CARGO_KEY = 'up-test-key';
process.env.TRACK_HLAG_CLIENT_ID = 'hl-id';
process.env.TRACK_HLAG_CLIENT_SECRET = 'hl-secret';
process.env.TRACK_SHIPSGO_DAILY_NEW = '2';

const { trackShipment } = await import('@/lib/tracking');

// Hapag container goes to Hapag first
handler = (c) => (c.url.startsWith('https://api.hlag.com/') ? { status: 200, body: JSON.stringify(dcsa) } : { status: 500, body: '' });
let out = await trackShipment({ reference: 'HLXU1234561', kind: 'container' }, { mode: 'shipping' });
ok('flow: hapag answered', out.result?.provider === 'Hapag-Lloyd' && out.tried.join() === 'Hapag-Lloyd', out);
ok('flow: hapag headers', calls.at(-1)?.headers['X-IBM-Client-Id'] === 'hl-id' && /equipmentReference=HLXU1234561/.test(calls.at(-1)!.url), calls.at(-1));
// cached on the second call
const n = calls.length;
await trackShipment({ reference: 'HLXU1234561', kind: 'container' }, { mode: 'shipping' });
ok('flow: cached', calls.length === n);

// Hapag misses → ShipsGo answers (409 reuse)
handler = (c) => {
  if (c.url.startsWith('https://api.hlag.com/')) return { status: 404, body: '' };
  if (c.url === 'https://api.shipsgo.com/v2/ocean/shipments' && c.method === 'POST') return { status: 409, body: JSON.stringify({ message: 'ALREADY_EXISTS', shipment: { id: 77 } }) };
  if (c.url === 'https://api.shipsgo.com/v2/ocean/shipments/77') return { status: 200, body: JSON.stringify({ message: 'SUCCESS', shipment: { id: 77, status: 'SAILING', containers: [{ number: 'HLXU7654328', movements: [{ event: 'LOAD', status: 'ACT', timestamp: '2026-10-10T00:00:00Z' }] }] } }) };
  return { status: 500, body: '' };
};
out = await trackShipment({ reference: 'HLXU7654328', kind: 'container' }, { mode: 'shipping' });
ok('flow: fallback to ShipsGo', out.result?.provider === 'ShipsGo' && out.tried.join() === 'Hapag-Lloyd,ShipsGo', out);
const post = calls.find((c) => c.method === 'POST' && c.url.endsWith('/ocean/shipments'));
ok('flow: ShipsGo token header', post?.headers['X-Shipsgo-User-Token'] === 'sg-test-token');
ok('flow: ShipsGo body', post && JSON.parse(post.body!).container_number === 'HLXU7654328' && !('carrier' in JSON.parse(post.body!)), post?.body);

// non-Hapag container skips Hapag; daily cap of 2 new registrations (409 refunds, 200 spends)
let created = 0;
handler = (c) => {
  if (c.method === 'POST') {
    created++;
    return { status: 200, body: JSON.stringify({ message: 'SUCCESS', shipment: { id: 1000 + created } }) };
  }
  if (c.url.startsWith('https://api.shipsgo.com/v2/ocean/shipments/')) return { status: 200, body: JSON.stringify({ shipment: { id: 1, status: 'NEW', containers: [] } }) };
  return { status: 500, body: '' };
};
const refs = ['MSKU1234565', 'CSQU3054383', 'TGHU0000000'];
const r1 = await trackShipment({ reference: refs[0], kind: 'container' }, { mode: 'shipping' });
ok('flow: hapag skipped for MSKU', r1.tried.join() === 'ShipsGo', r1.tried);
ok('flow: pending result returned', r1.result?.pending === true, r1);
await trackShipment({ reference: refs[1], kind: 'container' }, { mode: 'shipping' });
const r3 = await trackShipment({ reference: 'MSKU7777778', kind: 'booking' }, { mode: 'shipping' });
ok('flow: daily cap stops 3rd new shipment', created === 2 && r3.error === 'failed', { created, r3 });
// pending results are not cached: asking again re-reads (no new POST because the id is remembered)
const before = calls.length;
await trackShipment({ reference: refs[0], kind: 'container' }, { mode: 'shipping' });
ok('flow: pending not cached, id reused', calls.length === before + 1 && calls.at(-1)!.method === 'GET', calls.slice(before));

// 402 surfaces as failure, not "not found"
process.env.TRACK_SHIPSGO_DAILY_NEW = '100';
handler = (c) => (c.method === 'POST' ? { status: 402, body: JSON.stringify({ message: 'NOT_ENOUGH_CREDITS' }) } : { status: 500, body: '' });
const r402 = await trackShipment({ reference: 'MSKU0000005', kind: 'container' }, { mode: 'shipping' });
ok('flow: 402 → failed', r402.error === 'failed', r402);

// customs mode: UNI-PASS only, B/L only
handler = (c) => {
  if (!c.url.startsWith('https://unipass.customs.go.kr:38010/')) return { status: 500, body: '' };
  const u2 = new URL(c.url);
  if (u2.searchParams.get('crkyCn') !== 'up-test-key') return { status: 500, body: '' };
  if (u2.searchParams.get('hblNo') === 'HBL0001' && u2.searchParams.get('blYy') === String(new Date().getUTCFullYear())) return { status: 200, body: xml };
  return { status: 200, body: '<r><tCnt>0</tCnt><ntceInfo>조회결과가 없습니다.</ntceInfo></r>' };
};
const cu = await trackShipment({ reference: 'HBL0001', kind: 'bl' }, { mode: 'customs' });
ok('flow: UNI-PASS hbl lookup', cu.result?.provider === 'UNI-PASS' && cu.tried.join() === 'UNI-PASS', cu);
const upCalls = calls.filter((c) => c.url.includes('unipass'));
ok('flow: UNI-PASS tried mbl then hbl', upCalls.length === 2 && upCalls[0].url.includes('mblNo=HBL0001') && upCalls[1].url.includes('hblNo=HBL0001'), upCalls.map((c) => c.url.replace(/crkyCn=[^&]+/, 'crkyCn=***')));
const cc = await trackShipment({ reference: 'MSKU1234565', kind: 'container' }, { mode: 'customs' });
ok('flow: customs container → not-covered (never demo)', cc.error === 'not-covered' && !cc.result, cc);
const nf = await trackShipment({ reference: 'NOPE0001', kind: 'bl' }, { mode: 'customs' });
ok('flow: UNI-PASS not found', nf.error === 'not-found', nf);

// no source for the mode → demo
delete process.env.UNIPASS_CARGO_KEY;
const demo = await trackShipment({ reference: 'ABC12345', kind: 'bl' }, { mode: 'customs' });
ok('flow: demo when nothing configured', demo.result?.demo === true);


// ---------- review fixes (flows) ----------
{
  process.env.UNIPASS_CARGO_KEY = 'up-test-key';
  process.env.TRACK_SHIPSGO_DAILY_NEW = '0'; // cap reached from the start
  let posts = 0;
  handler = (c) => {
    if (c.method === 'POST') {
      posts++;
      return { status: 200, body: JSON.stringify({ shipment: { id: 9 } }) };
    }
    // free list search finds the registered shipment
    if (c.url.startsWith('https://api.shipsgo.com/v2/ocean/shipments?')) {
      const u = new URL(c.url);
      const known = u.searchParams.get('filters[container_number]') === 'eq:MSKU5555550';
      return { status: 200, body: JSON.stringify({ shipments: known ? [{ id: 555 }] : [] }) };
    }
    if (c.url === 'https://api.shipsgo.com/v2/ocean/shipments/555')
      return { status: 200, body: JSON.stringify({ shipment: { id: 555, status: 'SAILING', containers: [{ number: 'MSKU5555550', movements: [{ event: 'DEPA', status: 'ACT', timestamp: '2026-10-10T00:00:00Z' }] }] } }) };
    return { status: 500, body: '' };
  };
  const known = await trackShipment({ reference: 'MSKU5555550', kind: 'container' }, { mode: 'shipping' });
  ok('shipsgo: registered shipment found for free even at the cap', known.result?.provider === 'ShipsGo' && posts === 0, known);
  const unknown = await trackShipment({ reference: 'MSKU6666666', kind: 'container' }, { mode: 'shipping' });
  ok('shipsgo: new shipment at the cap fails without POST', unknown.error === 'failed' && posts === 0, unknown);

}
{
  // UNI-PASS: several cargo records → first shown, the others listed
  const many2 = `<r><tCnt>3</tCnt><cargCsclPrgsInfoQryVo><cargMtNo>26AAAA1111111111</cargMtNo></cargCsclPrgsInfoQryVo><cargCsclPrgsInfoQryVo><cargMtNo>26AAAA2222222222</cargMtNo></cargCsclPrgsInfoQryVo><cargCsclPrgsInfoQryVo><cargMtNo>26AAAA3333333333</cargMtNo></cargCsclPrgsInfoQryVo></r>`;
  handler = (c) => {
    if (!c.url.startsWith('https://unipass.customs.go.kr:38010/')) return { status: 500, body: '' };
    const u2 = new URL(c.url);
    if (u2.searchParams.get('mblNo') === 'MBLMANY01') return { status: 200, body: many2 };
    if (u2.searchParams.get('cargMtNo') === '26AAAA1111111111') return { status: 200, body: xml };
    return { status: 200, body: '<r><tCnt>0</tCnt></r>' };
  };
  const mr = await trackShipment({ reference: 'MBLMANY01', kind: 'bl' }, { mode: 'customs' });
  ok('unipass many: related refs listed', mr.result?.relatedRefs?.join() === '26AAAA2222222222,26AAAA3333333333', mr.result?.relatedRefs);
}
{
  // CMA CGM 206 → partial flag
  process.env.TRACK_CMACGM_KEY = 'cma-key';
  handler = (c) =>
    c.url.startsWith('https://apis.cma-cgm.net/')
      ? { status: 206, body: JSON.stringify([{ eventType: 'TRANSPORT', transportEventTypeCode: 'DEPA', eventClassifierCode: 'ACT', eventDateTime: '2026-10-06T10:00:00Z', transportCall: { location: { UNLocationCode: 'KRPUS' } } }]) }
      : { status: 500, body: '' };
  const pr = await trackShipment({ reference: 'CMAU1234564', kind: 'container' }, { mode: 'shipping' });
  ok('dcsa 206 flagged partial', pr.result?.provider === 'CMA CGM' && pr.result?.partial === true, pr);
  ok('cma key header', calls.at(-1)?.headers.KeyId === 'cma-key');
}
done('tracking adapters');
