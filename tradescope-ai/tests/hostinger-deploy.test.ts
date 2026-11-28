/* scripts/hostinger-deploy.mjs against a local mock of the Hostinger API: picks the only VPS, validates and replaces
   only the apex/www records, deploys the project with the settings, never leaks secret values, and makes no write
   call in a dry run. */
import { execFile } from 'node:child_process';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { done, ok } from './assert';

type Call = { method: string; url: string; auth?: string; body?: Record<string, unknown> };
const calls: Call[] = [];
const vm = { id: 4242, hostname: 'srv.example', state: 'running', plan: 'KVM 2', template: { name: 'Ubuntu 24.04 with Docker' }, ipv4: [{ id: 1, address: '203.0.113.10' }], ipv6: [{ id: 2, address: '2001:db8::10' }] };
const readBody = (req: IncomingMessage) => new Promise<string>((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });

const server = createServer(async (req, res) => {
  const raw = await readBody(req);
  calls.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined });
  const send = (code: number, data: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (req.url === '/api/vps/v1/virtual-machines') return send(200, [vm]);
  if (req.url === '/api/dns/v1/zones/trade.xn--3e0b707e' && req.method === 'GET') return send(200, [{ name: '@', type: 'A', ttl: 600, records: [{ content: '198.51.100.1' }] }, { name: '@', type: 'MX', ttl: 600, records: [{ content: 'mx.example.' }] }]);
  if (req.url === '/api/dns/v1/zones/trade.xn--3e0b707e/validate') return send(200, {});
  if (req.url === '/api/dns/v1/zones/trade.xn--3e0b707e' && req.method === 'PUT') return send(200, { message: 'ok' });
  if (req.url === '/api/vps/v1/virtual-machines/4242/docker' && req.method === 'POST') return send(200, { id: 77, name: 'docker_compose_up', state: 'success' });
  send(404, { message: 'not found' });
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const run = promisify(execFile);
const script = path.join(process.cwd(), 'scripts/hostinger-deploy.mjs');
const secret = 'pw-super-secret-0123';
const env = { ...process.env, HOSTINGER_API_BASE: base, HOSTINGER_API_TOKEN: 'tok-test', ADMIN_PASSWORD: secret, ADMIN_SECRET: 's'.repeat(40), HOSTINGER_VM_ID: '', GITHUB_SHA: '' };

// dry run: reads only
let out = (await run('node', [script, '--dns', '--deploy', '--dry-run', '--ref=5589d47e62d2'], { env })).stdout;
ok('dry run: only GET calls', calls.length > 0 && calls.every((c) => c.method === 'GET'), calls.map((c) => `${c.method} ${c.url}`));
ok('dry run: shows the record being replaced and the new ones', out.includes('@ A 198.51.100.1') && out.includes('@ A 203.0.113.10') && out.includes('www CNAME trade.xn--3e0b707e.') && out.includes('dry run'));
ok('token sent as a bearer token', calls.every((c) => c.auth === 'Bearer tok-test'));
ok('secret values never printed', !out.includes(secret) && out.includes('ADMIN_PASSWORD'));

// real run against the mock
calls.length = 0;
out = (await run('node', [script, '--dns', '--deploy', '--no-wait', '--ref=5589d47e62d2'], { env })).stdout;
const put = calls.find((c) => c.method === 'PUT')!;
const validate = calls.find((c) => c.url.endsWith('/validate'))!;
ok('DNS validated before it is replaced', !!validate && calls.indexOf(validate) < calls.indexOf(put));
const zone = (put?.body?.zone ?? []) as Array<{ name: string; type: string; records: Array<{ content: string }> }>;
ok('DNS: overwrite only apex A/AAAA and www (MX untouched)', put?.body?.overwrite === true && zone.map((z) => `${z.name}/${z.type}`).join() === '@/A,@/AAAA,www/CNAME' && zone[0].records[0].content === '203.0.113.10');
const deploy = calls.find((c) => c.url.endsWith('/docker'))!;
const dBody = deploy?.body ?? {};
ok('deploy: project "tradescope" with the pinned compose', dBody.project_name === 'tradescope' && String(dBody.content).includes('#5589d47e62d2:tradescope-ai'));
ok('deploy: settings travel in the project environment, compose only references them', String(dBody.environment).includes(`ADMIN_PASSWORD=${secret}`) && !String(dBody.content).includes(secret) && String(dBody.content).includes('${ADMIN_PASSWORD}'));
ok('real run: secret values never printed', !out.includes(secret) && out.includes('✓ DNS updated') && out.includes('✓ project deployed'));

// refusals
let refused = '';
try {
  await run('node', [script, '--deploy'], { env: { ...env, HOSTINGER_API_TOKEN: '' } });
} catch (e) {
  refused = String((e as { stderr?: string }).stderr);
}
ok('no token: refuses with a pointer to hPanel', refused.includes('HOSTINGER_API_TOKEN is not set'));
let badRef = '';
try {
  await run('node', [script, '--deploy', '--ref=x;rm'], { env });
} catch (e) {
  badRef = String((e as { stderr?: string }).stderr);
}
ok('unsafe ref: refused before any call', badRef.includes('invalid --ref'));
const { apiBase, HOSTINGER_API } = await import('../scripts/hostinger.mjs');
ok('a non-loopback API base is ignored (the token only goes to Hostinger)', ['https://evil.example', 'http://localhost:1', 'http://127.0.0.1.evil:1', 'http://127.0.0.1:80/x', ''].every((b) => apiBase(b) === HOSTINGER_API) && apiBase(base) === base);

server.close();
done('hostinger deploy');
