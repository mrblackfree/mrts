/* ShipsGo credit cap (own process, so the per-day counter starts at zero). */
import { trackShipsGo } from '@/lib/tracking/shipsgo';
import { done, ok } from './assert';

let posts = 0;
let mode: 'timeout' | 'ok' = 'timeout';
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('https://api.shipsgo.com/v2/ocean/shipments?')) return new Response(JSON.stringify({ shipments: [] }), { status: 200 });
  if (init?.method === 'POST') {
    posts++;
    // the POST may have been accepted (and charged) before the connection dropped
    if (mode === 'timeout') throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    return new Response(JSON.stringify({ shipment: { id: 7 } }), { status: 200 });
  }
  if (url === 'https://api.shipsgo.com/v2/ocean/shipments/7') return new Response(JSON.stringify({ shipment: { id: 7, status: 'NEW', containers: [] } }), { status: 200 });
  return new Response('', { status: 500 });
}) as typeof fetch;

const q = (reference: string) => ({ reference, kind: 'container' as const });
const attempt = async (ref: string, cap: number) => {
  try {
    return { result: await trackShipsGo('t', q(ref), cap), err: '' };
  } catch (e) {
    return { result: null, err: (e as Error).message };
  }
};
// cap 2: a timed-out POST (slot kept), a successful one (slot used), then the cap
const first = await attempt('MSKU1234565', 2);
ok('timeout surfaces as an error', /timeout/i.test(first.err), first.err);
mode = 'ok';
const second = await attempt('CSQU3054383', 2);
ok('second registration succeeds and reads back (pending)', second.result?.pending === true && posts === 2, { second, posts });
const third = await attempt('TGHU1234560', 2);
ok('the timed-out slot still counts: third new shipment hits the cap without a POST', /daily new-shipment limit/.test(third.err) && posts === 2, { third, posts });

done('shipsgo credits');
