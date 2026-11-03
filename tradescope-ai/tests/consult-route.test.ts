/* /api/consult POST without storage (webhook-only, as on Vercel): delivery result decides the answer. */
import { done, ok } from './assert';

process.env.SETTINGS_READONLY = '1';
process.env.CONSULT_CONTACT_EMAIL = 'ops@example.com';

let webhookStatus = 500;
let webhookCalls = 0;
globalThis.fetch = (async () => {
  webhookCalls++;
  return new Response('', { status: webhookStatus });
}) as typeof fetch;

const { GET, POST } = await import('@/app/api/consult/route');
const body = { name: 'Kim', email: 'kim@example.com', consent: true, serviceIds: ['ph-fda-food'], topic: 'FDA', lang: 'ko' };
const post = async () => {
  const res = await POST(new Request('http://localhost/api/consult', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
};

// no webhook at all: not accepting
delete process.env.CONSULT_WEBHOOK_URL;
let r = await post();
ok('no storage, no webhook → 503 not-accepting with contact', r.status === 503 && r.json.error === 'not-accepting' && r.json.contact === 'ops@example.com', r);

// an http:// webhook does not count
process.env.CONSULT_WEBHOOK_URL = 'http://hooks.example/x';
ok('GET reports not accepting for http webhook', ((await (await GET()).json()) as { accepting: boolean }).accepting === false);
r = await post();
ok('http webhook → 503, never ok', r.status === 503 && webhookCalls === 0, r);

// https webhook that fails: the trader is told, with the contact email
process.env.CONSULT_WEBHOOK_URL = 'https://hooks.example/x';
webhookStatus = 500;
r = await post();
ok('failed delivery → 502 delivery-failed with contact', r.status === 502 && r.json.error === 'delivery-failed' && r.json.contact === 'ops@example.com' && webhookCalls === 1, r);

// https webhook that works: ok with an id in the stored format
webhookStatus = 200;
r = await post();
ok('delivered → ok with TS- id', r.status === 200 && r.json.ok === true && /^TS-[A-HJ-NP-Z2-9]{8}$/.test(String(r.json.id)), r);

done('consult route (webhook-only)');
