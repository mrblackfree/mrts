/* Request notification: https-only webhook, escaped Slack text, delivery result. */
import { notify, summaryText, webhookUrl } from '@/lib/consult/notify';
import type { ConsultRequest } from '@/lib/consult/store';
import { validateSetting, SETTING_INDEX } from '@/lib/settings/schema';
import { done, ok } from './assert';

const rec: ConsultRequest = {
  id: 'TS-ABCDEFGH',
  createdAt: '2026-11-03T00:00:00Z',
  status: 'new',
  name: '<!here> Kim',
  company: 'A&B <https://evil.example|click>',
  email: 'kim@example.com',
  phone: '',
  topic: '<@U123> FDA',
  serviceIds: ['ph-fda-food'],
  message: 'hello <!channel>',
  lang: 'ko',
};
const text = summaryText(rec);
ok('no raw mention or link markup', !/<!here>|<!channel>|<@U123>|<https:/.test(text), text);
ok('escaped text kept readable', text.includes('&lt;!here&gt; Kim') && text.includes('A&amp;B'), text);
ok('service title in Korean', text.includes('필리핀 FDA 식품 인허가 대행'));

const def = SETTING_INDEX['CONSULT_WEBHOOK_URL'];
ok('setting rejects http://', !validateSetting(def, 'http://hooks.example/x').ok);
ok('setting rejects junk', !validateSetting(def, 'hooks.example').ok);
ok('setting accepts https://', validateSetting(def, 'https://hooks.example/services/T/B/x').ok);

process.env.CONSULT_WEBHOOK_URL = 'http://hooks.example/x';
ok('http env value is not used', webhookUrl() === undefined);
process.env.CONSULT_WEBHOOK_URL = 'https://hooks.example/x';
ok('https env value is used', webhookUrl() === 'https://hooks.example/x');

let status = 200;
let throwIt = false;
globalThis.fetch = (async (_u: RequestInfo | URL, init?: RequestInit) => {
  if (throwIt) throw new Error('network');
  ok('redirects refused', init?.redirect === 'error');
  return new Response('ok', { status });
}) as typeof fetch;
ok('2xx → delivered', await notify('https://hooks.example/x', rec));
status = 500;
ok('5xx → not delivered', !(await notify('https://hooks.example/x', rec)));
throwIt = true;
ok('network error → not delivered', !(await notify('https://hooks.example/x', rec)));

done('consult notify');
