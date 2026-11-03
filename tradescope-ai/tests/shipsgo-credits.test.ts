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
let err = '';
try {
  await trackShipsGo('t', q('MSKU1234565'), 1);
} catch (e) {
  err = (e as Error).message;
}
ok('timeout surfaces as an error', /timeout/i.test(err), err);
mode = 'ok';
err = '';
try {
  await trackShipsGo('t', q('CSQU3054383'), 1);
} catch (e) {
  err = (e as Error).message;
}
ok('the timed-out POST keeps its slot (cap of 1 reached)', /daily new-shipment limit/.test(err) && posts === 1, { err, posts });

done('shipsgo credits');
