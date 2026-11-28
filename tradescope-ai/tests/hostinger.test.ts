/* Hostinger deploy kit: the Compose file builds the pinned ref for the right domain, keeps data on the host, passes
   only the settings given (never their values), and the DNS update points apex and www at the VPS. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { done, ok } from './assert';

const h = await import('../scripts/hostinger.mjs');

ok('trade.한국 is trade.xn--3e0b707e in ASCII', h.asciiDomain('trade.한국') === 'trade.xn--3e0b707e' && h.asciiDomain('TRADE.한국.') === 'trade.xn--3e0b707e');
ok('a bad domain is refused', h.asciiDomain('not a domain') === null && h.asciiDomain('') === null);
ok('refs: SHAs and plain branch names only', h.validRef('main') && h.validRef('a6d43bd') && h.validRef('feature/x') && !h.validRef('main;rm') && !h.validRef('../x') && !h.validRef('-x') && !h.validRef(''));
ok('image tag: short SHA or sanitised branch', h.imageTag('5589d47e62d284bccf1b1e10f88fa2f781502e53') === '5589d47e62d2' && h.imageTag('feature/x') === 'feature-x');

const sha = '5589d47e62d284bccf1b1e10f88fa2f781502e53';
const c = h.renderCompose({ ref: sha, domain: 'trade.한국', envKeys: ['ADMIN_PASSWORD', 'AI_API_KEY', 'NOT_ALLOWED'] });
ok('builds the pinned commit of the app folder from the public repo', c.includes(`context: https://github.com/mrblackfree/mrts.git#${sha}:tradescope-ai`) && c.includes('pull_policy: build'));
ok('site URL and Caddy use the ASCII domain, www redirects to the apex', c.includes('NEXT_PUBLIC_SITE_URL: https://trade.xn--3e0b707e') && c.includes('www.trade.xn--3e0b707e {') && c.includes('redir https://trade.xn--3e0b707e{uri} permanent'));
ok('data and certificates live in host folders, not Compose volumes', c.includes('/opt/tradescope/data:/app/.data') && c.includes('/opt/tradescope/caddy/data:/data') && !/^volumes:/m.test(c));
ok('the data folder is handed to the app user before the app starts', c.includes('chown -R 1001:1001 /data') && c.includes('condition: service_completed_successfully'));
ok('only the given, allowed settings are referenced, as ${KEY}', c.includes('ADMIN_PASSWORD: ${ADMIN_PASSWORD}') && c.includes('AI_API_KEY: ${AI_API_KEY}') && !c.includes('NOT_ALLOWED') && !c.includes('ADMIN_SECRET'));
ok('the app is reachable only through Caddy (no published app port)', c.includes('expose:') && !c.includes('3000:3000'));
let threw = false;
try {
  h.renderCompose({ ref: 'x;y' });
} catch {
  threw = true;
}
ok('an unsafe ref is refused', threw);

const committed = readFileSync(path.join(process.cwd(), 'deploy/hostinger/compose.yml'), 'utf8');
ok('deploy/hostinger/compose.yml is the generated default (regenerate after changing the template)', committed === h.renderCompose());

const env = { ADMIN_PASSWORD: ' pw-0123456789 ', AI_API_KEY: '', UNRELATED: 'x', ADMIN_SECRET: 's'.repeat(40) };
ok('environment: set allowed keys only, trimmed', h.envFile(env) === `ADMIN_PASSWORD=pw-0123456789\nADMIN_SECRET=${'s'.repeat(40)}` && h.envKeys(env).join() === 'ADMIN_PASSWORD,ADMIN_SECRET');
for (const bad of ['a\nb', 'a$b']) {
  let t = false;
  try {
    h.envFile({ ADMIN_PASSWORD: bad });
  } catch (e) {
    t = !(e as Error).message.includes(bad);
  }
  ok(`environment: a value with ${JSON.stringify(bad.replace(/[a-z]/g, ''))} is refused without echoing it`, t);
}

const vm = { ipv4: [{ id: 1, address: '203.0.113.10' }], ipv6: [{ id: 2, address: '2001:db8::10' }] };
ok('VPS addresses: first IPv4 and IPv6', JSON.stringify(h.vmAddresses(vm)) === JSON.stringify({ ipv4: '203.0.113.10', ipv6: '2001:db8::10' }) && h.vmAddresses({ ipv4: null, ipv6: null }).ipv4 === null);
const z = h.dnsZone({ domain: 'trade.한국', ...h.vmAddresses(vm) });
ok('DNS: apex A and AAAA to the VPS, www CNAME to the apex, replacing only those', z.overwrite === true && z.zone.length === 3 && z.zone[0].name === '@' && z.zone[0].type === 'A' && z.zone[0].records[0].content === '203.0.113.10' && z.zone[1].type === 'AAAA' && z.zone[2].name === 'www' && z.zone[2].records[0].content === 'trade.xn--3e0b707e.');
ok('DNS: no AAAA when the VPS has no IPv6', h.dnsZone({ ipv4: '203.0.113.10', ipv6: null }).zone.every((r: { type: string }) => r.type !== 'AAAA'));
let badIp = false;
try {
  h.dnsZone({ ipv4: 'nope' });
} catch {
  badIp = true;
}
ok('DNS: an invalid IPv4 is refused', badIp);

done('hostinger');
