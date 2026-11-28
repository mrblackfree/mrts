#!/usr/bin/env node
/**
 * Deploy TradeScope AI to a Hostinger VPS and point the domain at it, through the Hostinger API.
 *
 *   HOSTINGER_API_TOKEN=… node scripts/hostinger-deploy.mjs --list                 # VPSs on the account
 *   HOSTINGER_API_TOKEN=… node scripts/hostinger-deploy.mjs --dns --deploy        # DNS + build & start
 *   … --vm=123456          which VPS (or HOSTINGER_VM_ID; optional when the account has exactly one)
 *   … --ref=<sha|branch>   what to build (default: GITHUB_SHA, else main)
 *   … --domain=trade.한국  default trade.한국 (trade.xn--3e0b707e)
 *   … --dry-run            show what would change; only read calls are made
 *   … --no-wait            do not wait for https://<domain>/api/health
 *
 * App settings come from the environment (ADMIN_PASSWORD, ADMIN_SECRET, AI_API_KEY, … — see PASS_THROUGH in
 * scripts/hostinger.mjs) and go to the Docker Manager project environment. Values are never printed.
 * Never purchases, recreates or reinstalls anything: the VPS must already exist with Docker available.
 */
import { DEFAULT_DOMAIN, PROJECT, apiBase, asciiDomain, dnsZone, envFile, envKeys, renderCompose, validRef, vmAddresses } from './hostinger.mjs';

// tests point this at a local mock; nothing else can redirect the token
const API = apiBase(process.env.HOSTINGER_API_BASE);
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const TOKEN = (process.env.HOSTINGER_API_TOKEN ?? '').trim();
const DRY = !!args['dry-run'];
const domain = asciiDomain(args.domain ?? DEFAULT_DOMAIN);
const ref = String(args.ref ?? process.env.GITHUB_SHA ?? 'main');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const msg = json?.message ?? text.slice(0, 200);
    const err = new Error(`${method} ${path} → HTTP ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function pickVm() {
  const vms = await api('GET', '/api/vps/v1/virtual-machines');
  if (!Array.isArray(vms) || !vms.length) fail('no VPS on this Hostinger account — create one in hPanel first (this script never purchases).');
  const wanted = String(args.vm ?? process.env.HOSTINGER_VM_ID ?? '').trim();
  const vm = wanted ? vms.find((v) => String(v.id) === wanted) : vms.length === 1 ? vms[0] : null;
  if (!vm) {
    for (const v of vms) log(`  ${v.id}  ${v.hostname}  ${v.state}  ${v.plan ?? ''}  ${v.template?.name ?? ''}  ${vmAddresses(v).ipv4 ?? ''}`);
    fail(wanted ? `VPS ${wanted} not found` : 'several VPSs — choose one with --vm=<id> or HOSTINGER_VM_ID');
  }
  return vm;
}

async function waitAction(vmId, action, label) {
  if (!action?.id) return;
  const started = Date.now();
  let state = action.state;
  while (!['success', 'error', 'cancelled'].includes(state) && Date.now() - started < 30 * 60_000) {
    await sleep(10_000);
    const a = await api('GET', `/api/vps/v1/virtual-machines/${vmId}/actions/${action.id}`);
    if (a.state !== state) log(`  ${label}: ${a.state}`);
    state = a.state;
  }
  if (state !== 'success') fail(`${label} ended as "${state}" — see the project logs in hPanel → VPS → Docker Manager`);
}

async function waitHealth() {
  const url = `https://${domain}/api/health`;
  const started = Date.now();
  log(`… waiting for ${url} (first build and certificate can take 10–15 minutes)`);
  while (Date.now() - started < 25 * 60_000) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (r.ok) {
        const h = await r.json().catch(() => ({}));
        log(`✓ ${url} → ${h.status ?? r.status} (${h.data?.products ?? '?'} products, ${h.data?.partners ?? '?'} partners)`);
        return;
      }
    } catch {
      /* not up yet: DNS, certificate or build still in progress */
    }
    await sleep(20_000);
  }
  fail(`${url} did not answer within 25 minutes — check DNS (A record), ports 80/443, and the project logs`);
}

async function main() {
  if (!TOKEN) fail('HOSTINGER_API_TOKEN is not set (hPanel → Account → API → new token).');
  if (!domain) fail(`invalid --domain: ${args.domain}`);
  if (!validRef(ref)) fail(`invalid --ref: ${ref}`);

  if (args.list) {
    const vms = await api('GET', '/api/vps/v1/virtual-machines');
    for (const v of vms ?? []) log(`${v.id}  ${v.hostname}  ${v.state}  ${v.plan ?? ''}  ${v.template?.name ?? ''}  ${vmAddresses(v).ipv4 ?? ''}`);
    if (!vms?.length) log('(no VPS on this account)');
    return;
  }
  if (!args.dns && !args.deploy) fail('nothing to do — pass --list, --dns and/or --deploy (add --dry-run to preview)');

  const vm = await pickVm();
  const { ipv4, ipv6 } = vmAddresses(vm);
  log(`VPS ${vm.id} (${vm.hostname}, ${vm.state}, ${vm.template?.name ?? 'template ?'}) ${ipv4 ?? ''}${ipv6 ? ` / ${ipv6}` : ''}`);
  if (vm.state !== 'running') fail(`VPS is ${vm.state}, not running`);

  if (args.dns) {
    if (!ipv4) fail('the VPS has no IPv4 address');
    const body = dnsZone({ domain, ipv4, ipv6 });
    let current = [];
    try {
      current = await api('GET', `/api/dns/v1/zones/${domain}`);
    } catch (e) {
      fail(`cannot read the DNS zone of ${domain}: ${e.message} — is the domain on this Hostinger account?`);
    }
    const show = (r) => `${r.name} ${r.type} ${(r.records ?? []).map((x) => x.content).join(',')}`;
    const touched = (r) => body.zone.some((z) => z.name === r.name && z.type === r.type);
    log(`DNS ${domain}: replacing ${current.filter(touched).map(show).join(' · ') || '(no existing A/AAAA/www records)'}`);
    log(`  with ${body.zone.map(show).join(' · ')}`);
    if (!DRY) {
      await api('POST', `/api/dns/v1/zones/${domain}/validate`, body);
      await api('PUT', `/api/dns/v1/zones/${domain}`, body);
      log('✓ DNS updated');
    }
  }

  if (args.deploy) {
    const keys = envKeys(process.env);
    if (!keys.includes('ADMIN_PASSWORD')) log('! ADMIN_PASSWORD not set — the /admin page stays disabled on the server');
    else if (!keys.includes('ADMIN_SECRET')) log('! ADMIN_SECRET not set — settings encryption will derive from ADMIN_PASSWORD');
    const content = renderCompose({ ref, domain, envKeys: keys });
    const environment = envFile(process.env);
    log(`Docker Manager project "${PROJECT}": build ${ref} for https://${domain}; settings passed: ${keys.join(', ') || '(none)'}`);
    if (!DRY) {
      const action = await api('POST', `/api/vps/v1/virtual-machines/${vm.id}/docker`, { project_name: PROJECT, content, ...(environment ? { environment } : {}) });
      log(`  deploy action ${action?.id ?? '?'}: ${action?.state ?? '?'}`);
      await waitAction(vm.id, action, 'deploy');
      log('✓ project deployed');
      if (!args['no-wait']) await waitHealth();
    }
  }
  if (DRY) log('(dry run — nothing was changed)');
}

main().catch((e) => fail(e.message));
