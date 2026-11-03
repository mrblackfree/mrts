#!/usr/bin/env node
/**
 * TradeScope AI — official data sync.
 *
 * Pulls values from documented, official sources and writes a timestamped snapshot that the app
 * merges over its seed data (src/data/official/snapshot.json). Nothing here scrapes undocumented
 * endpoints: every connector below uses a published API.
 *
 *   node scripts/sync-official-data.mjs                  # all keyless sources (Comtrade, WITS, link check)
 *   node scripts/sync-official-data.mjs --only=wits      # one source: comtrade | wits | links | kcs
 *   DATA_GO_KR_SERVICE_KEY=... node scripts/sync-official-data.mjs   # + Korea Customs monthly trade & FX
 *   COMTRADE_API_KEY=...                                  # uses the full Comtrade API (higher limits)
 *
 * Sources
 *  - UN Comtrade public API        https://comtradeapi.un.org   (annual bilateral & market statistics)
 *  - World Bank WITS TRAINS API    https://wits.worldbank.org   (official MFN + partner-specific preferential tariffs per HS6)
 *  - UN Comtrade monthly           current-year year-to-date bilateral flows (keyless)
 *  - 관세청 품목별 국가별 수출입실적  https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList (key)
 *  - 관세청 관세환율정보            https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo (key)
 *  - Link check of every URL in src/data/kr-ph-trade-db.ts
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_FILE = path.join(ROOT, 'src/data/kr-ph-trade-db.ts');
const LINK_FILES = [DB_FILE, path.join(ROOT, 'src/data/official/roadmap.ts')];
const OVERRIDES_FILE = path.join(ROOT, 'src/data/verified-overrides.json');
const OUT_FILE = path.join(ROOT, 'src/data/official/snapshot.json');

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const ONLY = args.only ? String(args.only).split(',') : null;
const want = (s) => !ONLY || ONLY.includes(s);
const UA = 'TradeScopeAI-DataSync/1.0 (+official-data-verification)';

const KR = 410;
const PH = 608;

/** Products → importing reporter, flow and HS6 codes (primary first). Mirrors kr-ph-trade-db.ts. */
const MANIFEST = [
  { id: 'banana-chips', direction: 'PH_TO_KR', basis: '200899', hs6: ['200899', '080390', '200600'] },
  { id: 'dried-mango', direction: 'PH_TO_KR', basis: '080450', hs6: ['200899', '080450', '200600'] },
  { id: 'coconut-oil', direction: 'PH_TO_KR', basis: '151319', hs6: ['151319', '151311', '151620'] },
  { id: 'seasoned-laver', direction: 'KR_TO_PH', basis: '200899', hs6: ['200899', '121221', '190590'] },
  { id: 'k-beauty', direction: 'KR_TO_PH', basis: '330499', hs6: ['330499', '340130'] },
  { id: 'instant-ramen', direction: 'KR_TO_PH', basis: '190230', hs6: ['190230', '190219'] },
  { id: 'smart-building', direction: 'KR_TO_PH', basis: '830140', hs6: ['830140', '391810', '854370'], prefHs: ['391810'] },
];

// Comtrade partner codes (M49-based) → ISO2 + names. 490 = "Other Asia, nes" (Taiwan) in Comtrade.
const PARTNERS = {
  36: ['AU', '호주', 'Australia'], 32: ['AR', '아르헨티나', 'Argentina'], 50: ['BD', '방글라데시', 'Bangladesh'], 56: ['BE', '벨기에', 'Belgium'],
  76: ['BR', '브라질', 'Brazil'], 96: ['BN', '브루나이', 'Brunei'], 104: ['MM', '미얀마', 'Myanmar'], 116: ['KH', '캄보디아', 'Cambodia'],
  124: ['CA', '캐나다', 'Canada'], 144: ['LK', '스리랑카', 'Sri Lanka'], 152: ['CL', '칠레', 'Chile'], 156: ['CN', '중국', 'China'],
  170: ['CO', '콜롬비아', 'Colombia'], 188: ['CR', '코스타리카', 'Costa Rica'], 203: ['CZ', '체코', 'Czechia'], 208: ['DK', '덴마크', 'Denmark'],
  218: ['EC', '에콰도르', 'Ecuador'], 246: ['FI', '핀란드', 'Finland'], 251: ['FR', '프랑스', 'France'], 276: ['DE', '독일', 'Germany'],
  300: ['GR', '그리스', 'Greece'], 320: ['GT', '과테말라', 'Guatemala'], 340: ['HN', '온두라스', 'Honduras'], 344: ['HK', '홍콩', 'Hong Kong'],
  348: ['HU', '헝가리', 'Hungary'], 360: ['ID', '인도네시아', 'Indonesia'], 372: ['IE', '아일랜드', 'Ireland'], 376: ['IL', '이스라엘', 'Israel'],
  381: ['IT', '이탈리아', 'Italy'], 392: ['JP', '일본', 'Japan'], 410: ['KR', '대한민국', 'Korea'], 418: ['LA', '라오스', 'Laos'],
  440: ['LT', '리투아니아', 'Lithuania'], 458: ['MY', '말레이시아', 'Malaysia'], 484: ['MX', '멕시코', 'Mexico'], 490: ['TW', '대만', 'Taiwan'],
  528: ['NL', '네덜란드', 'Netherlands'], 554: ['NZ', '뉴질랜드', 'New Zealand'], 586: ['PK', '파키스탄', 'Pakistan'], 591: ['PA', '파나마', 'Panama'],
  604: ['PE', '페루', 'Peru'], 608: ['PH', '필리핀', 'Philippines'], 616: ['PL', '폴란드', 'Poland'], 620: ['PT', '포르투갈', 'Portugal'],
  642: ['RO', '루마니아', 'Romania'], 643: ['RU', '러시아', 'Russia'], 682: ['SA', '사우디아라비아', 'Saudi Arabia'], 699: ['IN', '인도', 'India'],
  702: ['SG', '싱가포르', 'Singapore'], 704: ['VN', '베트남', 'Vietnam'], 710: ['ZA', '남아프리카공화국', 'South Africa'], 724: ['ES', '스페인', 'Spain'],
  752: ['SE', '스웨덴', 'Sweden'], 757: ['CH', '스위스', 'Switzerland'], 764: ['TH', '태국', 'Thailand'], 784: ['AE', '아랍에미리트', 'UAE'],
  792: ['TR', '튀르키예', 'Türkiye'], 818: ['EG', '이집트', 'Egypt'], 826: ['GB', '영국', 'United Kingdom'], 842: ['US', '미국', 'USA'],
  858: ['UY', '우루과이', 'Uruguay'],
};
const AGGREGATE_PARTNERS = new Set([0, 97, 568, 577, 636, 637, 837, 838, 839, 899]);
const flagOf = (iso2) => iso2.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
const partnerInfo = (code) => {
  const p = PARTNERS[code];
  return p ? { code, iso2: p[0], flag: flagOf(p[0]), ko: p[1], en: p[2] } : { code, iso2: '', flag: '🏳️', ko: `기타(${code})`, en: `Other (${code})` };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

async function getText(url, { headers = {}, timeoutMs = 25_000, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ctrl.signal });
      const text = await res.text();
      if (res.status === 429 && attempt < retries) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      return { status: res.status, text };
    } catch (e) {
      if (attempt === retries) return { status: 0, text: '', error: e.name === 'AbortError' ? 'timeout' : e.cause?.code || e.message };
      await sleep(1500);
    } finally {
      clearTimeout(t);
    }
  }
  return { status: 0, text: '', error: 'exhausted' };
}

// ---------------------------------------------------------------------------
// UN Comtrade
// ---------------------------------------------------------------------------
const COMTRADE_KEY = process.env.COMTRADE_API_KEY?.trim();
let lastComtradeCall = 0;

async function comtrade(params, freq = 'A') {
  const base = COMTRADE_KEY ? `https://comtradeapi.un.org/data/v1/get/C/${freq}/HS` : `https://comtradeapi.un.org/public/v1/preview/C/${freq}/HS`;
  const qs = new URLSearchParams(params).toString();
  const url = `${base}?${qs}`;
  const wait = 1300 - (Date.now() - lastComtradeCall);
  if (wait > 0) await sleep(wait);
  lastComtradeCall = Date.now();
  const res = await getText(url, { headers: COMTRADE_KEY ? { 'Ocp-Apim-Subscription-Key': COMTRADE_KEY } : {} });
  let json = null;
  try {
    json = JSON.parse(res.text);
  } catch {
    /* non-JSON */
  }
  return { url: url.replace(/subscription-key=[^&]+/i, ''), status: res.status, data: json?.data ?? null, error: json?.error ?? res.error };
}

/** Latest year (≤ maxYear) for which `reporter` has data for the given commodity codes. */
async function latestYear(reporter, cmdCodes, maxYear) {
  for (let y = maxYear; y >= maxYear - 2; y--) {
    const r = await comtrade({ reporterCode: reporter, period: y, cmdCode: cmdCodes.join(','), flowCode: 'M' });
    if (r.data && r.data.length) return { year: y, rows: r.data, url: r.url };
  }
  return null;
}

async function syncComtrade(snapshot) {
  const nowYear = new Date().getUTCFullYear();
  const lastFull = nowYear - 1;
  const years = [lastFull - 2, lastFull - 1, lastFull];
  const out = { products: {}, overview: null, years, errors: [] };

  // 1) bilateral series (Korea-reported, both directions) — one call per year & flow
  const importCodes = [...new Set(MANIFEST.filter((m) => m.direction === 'PH_TO_KR').map((m) => m.basis))];
  const exportCodes = [...new Set(MANIFEST.filter((m) => m.direction === 'KR_TO_PH').map((m) => m.basis))];
  const bilateral = {};
  for (const y of years) {
    for (const [flow, codes] of [
      ['M', importCodes],
      ['X', exportCodes],
    ]) {
      const r = await comtrade({ reporterCode: KR, partnerCode: PH, period: y, cmdCode: codes.join(','), flowCode: flow });
      if (!r.data) out.errors.push(`series ${flow} ${y}: ${r.error ?? r.status}`);
      for (const row of r.data ?? []) bilateral[`${flow}:${row.cmdCode}:${y}`] = { value: Math.round(row.primaryValue), netWgt: Number(row.netWgt) || 0, url: r.url };
      log(`  comtrade series ${flow} ${y}: ${r.data?.length ?? 0} rows`);
    }
  }

  // 2) importing-market size & competitor shares — latest available year per importing reporter
  const markets = {};
  for (const [reporter, codes] of [
    [KR, importCodes],
    [PH, exportCodes],
  ]) {
    const latest = await latestYear(reporter, codes, lastFull);
    if (!latest) {
      out.errors.push(`market reporter ${reporter}: no data`);
      continue;
    }
    log(`  comtrade market reporter=${reporter} year=${latest.year}: ${latest.rows.length} rows`);
    for (const code of codes) {
      const rows = latest.rows.filter((r) => r.cmdCode === code);
      const world = rows.find((r) => r.partnerCode === 0)?.primaryValue;
      if (!world) continue;
      const partners = rows
        .filter((r) => !AGGREGATE_PARTNERS.has(r.partnerCode))
        .map((r) => ({ ...partnerInfo(r.partnerCode), value: Math.round(r.primaryValue), share: Math.round((r.primaryValue / world) * 1000) / 10 }))
        .sort((a, b) => b.value - a.value);
      markets[`${reporter}:${code}`] = { year: latest.year, world: Math.round(world), partners: partners.slice(0, 12), url: latest.url };
    }
  }

  const prev = snapshot.comtrade ?? {};
  for (const m of MANIFEST) {
    const flow = m.direction === 'PH_TO_KR' ? 'M' : 'X';
    const prevP = prev.products?.[m.id];
    const fresh = years.map((y) => ({ year: y, value: bilateral[`${flow}:${m.basis}:${y}`]?.value })).filter((s) => typeof s.value === 'number');
    // Keep the last good series when this run returned fewer years (partial outage).
    const nowIso = new Date().toISOString();
    const series = fresh.length >= (prevP?.series?.length ?? 0) ? fresh : prevP.series;
    const seriesFetchedAt = series === fresh ? nowIso : (prevP?.fetchedAt ?? prev.fetchedAt ?? snapshot.sources?.comtrade?.fetchedAt);
    if (fresh.length < years.length) out.errors.push(`series ${m.id}: ${fresh.length}/${years.length} years${series !== fresh ? ' (kept previous)' : ''}`);
    const importer = m.direction === 'PH_TO_KR' ? KR : PH;
    const counterpart = m.direction === 'PH_TO_KR' ? PH : KR;
    const market = markets[`${importer}:${m.basis}`];
    const counterpartRow = market?.partners.find((p) => p.code === counterpart);
    const latest = bilateral[`${flow}:${m.basis}:${lastFull}`];
    out.products[m.id] = {
      hsBasis: m.basis,
      series,
      fetchedAt: seriesFetchedAt,
      // Official customs unit value (USD per kg): imports CIF, exports FOB.
      unitValue:
        latest && latest.netWgt > 0
          ? { year: lastFull, usdPerKg: Math.round((latest.value / latest.netWgt) * 100) / 100, netWgtKg: Math.round(latest.netWgt), basis: flow === 'M' ? 'CIF' : 'FOB' }
          : (prevP?.unitValue ?? null),
      seriesSource: `UN Comtrade · reporter ${KR} (Korea) · partner ${PH} · flow ${flow} · HS ${m.basis}`,
      market: market
        ? {
            year: market.year,
            reporter: importer,
            world: market.world,
            competitors: market.partners.slice(0, 5),
            counterpart: counterpartRow ?? { ...partnerInfo(counterpart), value: 0, share: 0 },
            source: `UN Comtrade · reporter ${importer} · partner World · flow M · HS ${m.basis} · ${market.year}`,
            fetchedAt: nowIso,
          }
        : prevP?.market
          ? { ...prevP.market, fetchedAt: prevP.market.fetchedAt ?? prevP.fetchedAt ?? snapshot.sources?.comtrade?.fetchedAt }
          : null,
    };
    if (!market) out.errors.push(`market ${m.id}: no data${prevP?.market ? ' (kept previous)' : ''}`);
  }

  // 3) bilateral totals
  const overview = { krExportsToPh: [], krImportsFromPh: [] };
  for (const y of years) {
    const r = await comtrade({ reporterCode: KR, partnerCode: PH, period: y, cmdCode: 'TOTAL', flowCode: 'M,X' });
    if (!r.data || r.data.length < 2) out.errors.push(`totals ${y}: ${r.data?.length ?? 0}/2 flows (${r.error ?? r.status})`);
    for (const row of r.data ?? []) {
      (row.flowCode === 'X' ? overview.krExportsToPh : overview.krImportsFromPh).push({ year: y, value: Math.round(row.primaryValue) });
    }
    log(`  comtrade totals ${y}: ${r.data?.length ?? 0} rows`);
  }
  // Keep the previous totals for a flow that came back incomplete.
  for (const k of ['krExportsToPh', 'krImportsFromPh']) {
    if (overview[k].length < years.length && (prev.overview?.[k]?.length ?? 0) > overview[k].length) overview[k] = prev.overview[k];
  }
  out.overview = overview;

  // 4) current-year monthly year-to-date (Korea-reported) — one call per month, both flows
  const allCodes = [...new Set(MANIFEST.map((m) => m.basis))];
  const ytd = {};
  const months = [];
  const empty = [];
  const thisMonth = new Date().getUTCMonth() + 1;
  for (let mo = 1; mo < thisMonth; mo++) {
    const period = `${nowYear}${String(mo).padStart(2, '0')}`;
    const r = await comtrade({ reporterCode: KR, partnerCode: PH, period, cmdCode: allCodes.join(','), flowCode: 'M,X' }, 'M');
    if (!r.data) out.errors.push(`monthly ${period}: ${r.error ?? r.status}`);
    if (!r.data || !r.data.length) {
      empty.push(period);
      continue; // keep going: a failed month must not hide later months
    }
    months.push(period);
    for (const row of r.data) ytd[`${row.flowCode}:${row.cmdCode}`] = (ytd[`${row.flowCode}:${row.cmdCode}`] ?? 0) + row.primaryValue;
    log(`  comtrade monthly ${period}: ${r.data.length} rows`);
  }
  // A year-to-date total is only valid for a contiguous run from January.
  const gaps = months.length ? empty.filter((p) => p < months[months.length - 1]) : [];
  if (gaps.length) out.errors.push(`monthly gap ${gaps.join(',')} — YTD not published`);
  if (months.length && !gaps.length && months[0].endsWith('01')) {
    for (const m of MANIFEST) {
      const flow = m.direction === 'PH_TO_KR' ? 'M' : 'X';
      const value = ytd[`${flow}:${m.basis}`];
      if (value) out.products[m.id].ytd = { from: months[0], to: months[months.length - 1], value: Math.round(value), source: 'UN Comtrade monthly (Korea-reported)' };
    }
  }

  const anyData = Object.values(out.products).some((p) => p.series.length);
  snapshot.sources.comtrade = {
    status: !anyData ? 'error' : out.errors.length ? 'partial' : 'ok',
    fetchedAt: new Date().toISOString(),
    endpoint: COMTRADE_KEY ? 'comtradeapi.un.org/data/v1 (keyed)' : 'comtradeapi.un.org/public/v1/preview (keyless)',
    years,
    errors: out.errors,
  };
  snapshot.comtrade = { products: out.products, overview: out.overview };
}

// ---------------------------------------------------------------------------
// World Bank WITS — TRAINS MFN summary per HS6
// ---------------------------------------------------------------------------
async function witsMfn(reporter, hs6) {
  const nowYear = new Date().getUTCFullYear();
  for (let y = nowYear - 1; y >= nowYear - 5; y--) {
    const url = `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/${reporter}/partner/000/product/${hs6}/year/${y}/datatype/reported`;
    const res = await getText(url, { retries: 1 });
    const obs = res.text.match(/<Obs\b[^>]*\/>/);
    if (res.status === 200 && obs) {
      const attr = (n) => obs[0].match(new RegExp(`${n}="([^"]*)"`))?.[1];
      return {
        year: Number(attr('TIME_PERIOD')),
        avg: Math.round(Number(attr('OBS_VALUE')) * 100) / 100,
        min: Number(attr('MIN_RATE')),
        max: Number(attr('MAX_RATE')),
        lines: Number(attr('TOTALNOOFLINES')),
        nomenclature: attr('NOMENCODE'),
        url,
      };
    }
    await sleep(300);
  }
  return null;
}

/** Partner-specific preferential rate (TARIFFTYPE=PREF) actually applied by `reporter` to goods from `partner`. */
/**
 * Latest PREF observation for a reporter/partner/HS6. Returns the observation, `null` when TRAINS has no PREF record
 * (every year answered 200 without PREF, or 404 NoRecordsFound), or `{ failed }` when a request itself failed —
 * so a transient outage is never mistaken for "not published".
 */
async function witsPref(reporter, partner, hs6) {
  const nowYear = new Date().getUTCFullYear();
  const failures = [];
  for (let y = nowYear - 1; y >= nowYear - 10; y--) {
    const url = `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/${reporter}/partner/${partner}/product/${hs6}/year/${y}/datatype/reported`;
    const res = await getText(url, { retries: 1 });
    if (res.status !== 200 && res.status !== 404) failures.push(`${y}:${res.status || res.error || 'error'}`);
    const obs = res.text.match(/<Obs\b[^>]*TARIFFTYPE="PREF"[^>]*\/>/);
    if (res.status === 200 && obs) {
      const attr = (n) => obs[0].match(new RegExp(`${n}="([^"]*)"`))?.[1];
      return {
        year: Number(attr('TIME_PERIOD')),
        avg: Math.round(Number(attr('OBS_VALUE')) * 100) / 100,
        min: Number(attr('MIN_RATE')),
        max: Number(attr('MAX_RATE')),
        lines: Number(attr('TOTALNOOFLINES')),
        prefLines: Number(attr('NBR_PREF_LINES')),
        url,
      };
    }
    await sleep(250);
  }
  return failures.length ? { failed: failures.join(',') } : null;
}

async function syncWits(snapshot) {
  const prevWits = snapshot.wits ?? {};
  const prevPref = snapshot.witsPref ?? {};
  const out = {};
  const pref = {};
  const prefByHs = {};
  const prevPrefByHs = snapshot.witsPrefByHs ?? {};
  const errors = [];
  const missing = [];
  let fetched = 0;
  // result: observation | null (TRAINS has no PREF record) | { failed } (request errors)
  const keepPref = (label, result, prevValue) => {
    if (result?.failed) errors.push(`${label}: request failed (${result.failed})${prevValue ? ' — kept previous' : ''}`);
    else if (prevValue) errors.push(`${label}: no PREF record any more (kept previous)`);
    else missing.push(`${label}: not published in TRAINS`);
    return prevValue;
  };
  const isObs = (r) => !!r && !r.failed;
  for (const m of MANIFEST) {
    const reporter = m.direction === 'PH_TO_KR' ? KR : PH;
    out[m.id] = {};
    for (const hs6 of m.hs6) {
      const r = await witsMfn(reporter, hs6);
      if (r) {
        out[m.id][hs6] = { reporter, ...r };
        fetched++;
      } else {
        errors.push(`${m.id} ${reporter}/${hs6}: no record${prevWits[m.id]?.[hs6] ? ' (kept previous)' : ''}`);
        if (prevWits[m.id]?.[hs6]) out[m.id][hs6] = prevWits[m.id][hs6];
      }
      log(`  wits ${m.id} ${reporter}/${hs6}: ${r ? `${r.year} avg ${r.avg}% (min ${r.min}–max ${r.max}, ${r.lines} lines)` : 'no record'}`);
    }
    // preferential rate applied by the importing country to the counterpart (primary HS6 only)
    const partner = m.direction === 'PH_TO_KR' ? PH : KR;
    const pr = await witsPref(reporter, partner, m.hs6[0]);
    if (isObs(pr)) pref[m.id] = { reporter, partner, hs6: m.hs6[0], ...pr };
    else {
      const kept = keepPref(`pref ${m.id} ${reporter}←${partner}/${m.hs6[0]}`, pr, prevPref[m.id]);
      if (kept) pref[m.id] = kept;
    }
    log(`  wits pref ${m.id} ${reporter}←${partner}/${m.hs6[0]}: ${isObs(pr) ? `${pr.year} ${pr.min === pr.max ? pr.min : `${pr.min}–${pr.max}`}% (${pr.prefLines}/${pr.lines} pref lines)` : pr?.failed ? `request failed (${pr.failed})` : 'no record'}`);
    // HS-specific tariff tables (e.g. flooring next to door locks)
    for (const hs6 of m.prefHs ?? []) {
      const alt = await witsPref(reporter, partner, hs6);
      prefByHs[m.id] ??= {};
      if (isObs(alt)) prefByHs[m.id][hs6] = { reporter, partner, hs6, ...alt };
      else {
        const kept = keepPref(`pref ${m.id} ${reporter}←${partner}/${hs6}`, alt, prevPrefByHs[m.id]?.[hs6]);
        if (kept) prefByHs[m.id][hs6] = kept;
      }
      log(`  wits pref ${m.id} ${reporter}←${partner}/${hs6}: ${isObs(alt) ? `${alt.year} ${alt.min === alt.max ? alt.min : `${alt.min}–${alt.max}`}%` : alt?.failed ? `request failed (${alt.failed})` : 'no record'}`);
    }
  }
  snapshot.witsPref = pref;
  snapshot.witsPrefByHs = prefByHs;
  snapshot.sources.wits = {
    status: fetched === 0 ? 'error' : errors.length ? 'partial' : 'ok',
    fetchedAt: new Date().toISOString(),
    endpoint: 'wits.worldbank.org/API/V1/SDMX (TRAINS, MFN + PREF, HS6)',
    errors,
    missing,
  };
  snapshot.wits = out;
}

// ---------------------------------------------------------------------------
// 관세청 (Korea Customs Service) via data.go.kr — requires DATA_GO_KR_SERVICE_KEY
// ---------------------------------------------------------------------------
const DGK = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
const dgkKey = () => (DGK.includes('%') ? DGK : encodeURIComponent(DGK));
const xmlItems = (xml) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map((f) => [f[1], f[2].trim()])));
const xmlResult = (xml) => ({ code: xml.match(/<resultCode>([^<]*)<\/resultCode>/)?.[1], msg: xml.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1] ?? xml.match(/<errMsg>([^<]*)<\/errMsg>/)?.[1] });

async function syncKcs(snapshot) {
  if (!DGK) {
    snapshot.sources.kcs = { status: 'not-configured', note: 'Set DATA_GO_KR_SERVICE_KEY (data.go.kr, free auto-approval) to enable monthly KCS trade data and customs FX.' };
    log('  kcs: skipped (DATA_GO_KR_SERVICE_KEY not set)');
    return;
  }
  const errors = [];
  const now = new Date();
  // KCS publishes the previous month around the 15th.
  const lag = now.getUTCDate() >= 16 ? 1 : 2;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - lag, 1));
  const yyyymm = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const strt = `${end.getUTCFullYear()}01`;
  const ytd = {};
  for (const m of MANIFEST) {
    const url = `https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList?serviceKey=${dgkKey()}&strtYymm=${strt}&endYymm=${yyyymm(end)}&cntyCd=PH&hsSgn=${m.basis}`;
    const res = await getText(url);
    const result = xmlResult(res.text);
    const items = xmlItems(res.text).filter((it) => it.hsCd && it.hsCd !== '-' && it.year !== '총계');
    if (res.status !== 200 || (result.code && result.code !== '00')) {
      errors.push(`nitemtrade ${m.basis}: ${result.msg ?? res.error ?? res.status}`);
      continue;
    }
    const sum = (k) => items.reduce((s, it) => s + (Number(it[k]) || 0), 0);
    ytd[m.id] = { from: strt, to: yyyymm(end), hs: m.basis, expUsd: sum('expDlr'), impUsd: sum('impDlr'), rows: items.length, source: 'KCS nitemtrade (data.go.kr)' };
    log(`  kcs nitemtrade ${m.id}: ${items.length} rows`);
    await sleep(300);
  }
  // Weekly customs exchange rate (import)
  let fx = null;
  const ymd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const fxRes = await getText(`https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo?serviceKey=${dgkKey()}&aplyBgnDt=${ymd}&weekFxrtTpcd=2`);
  const usd = xmlItems(fxRes.text).find((it) => it.currSgn === 'USD');
  if (usd) fx = { usdKrw: Number(usd.fxrt), appliedFrom: usd.aplyBgnDt, type: 'import', source: 'KCS 관세환율 (data.go.kr)' };
  else errors.push(`fx: ${xmlResult(fxRes.text).msg ?? fxRes.error ?? fxRes.status}`);
  snapshot.sources.kcs = { status: errors.length ? (Object.keys(ytd).length || fx ? 'partial' : 'error') : 'ok', fetchedAt: new Date().toISOString(), errors };
  snapshot.kcs = { ytd, fx };
}

// ---------------------------------------------------------------------------
// Link check
// ---------------------------------------------------------------------------
async function checkLink(url) {
  const res = await getText(url, { timeoutMs: 12_000, retries: 0, headers: { Accept: 'text/html,*/*' } });
  const s = res.status;
  const state =
    s >= 200 && s < 400 ? 'ok' : s === 401 || s === 403 || s === 423 || s === 429 ? 'protected' : s >= 500 ? 'unavailable' : s === 0 ? 'unreachable' : 'broken';
  return { status: s, state };
}

async function syncLinks(snapshot) {
  const src = (await Promise.all(LINK_FILES.map((f) => readFile(f, 'utf8')))).join('\n');
  const urls = [...new Set([...src.matchAll(/https?:\/\/[^'"\s`)]+/g)].map((m) => m[0]))];
  const results = {};
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const u = queue.shift();
        results[u] = { ...(await checkLink(u)), checkedAt: new Date().toISOString() };
      }
    }),
  );
  const counts = Object.values(results).reduce((acc, r) => ((acc[r.state] = (acc[r.state] ?? 0) + 1), acc), {});
  log(`  links: ${urls.length} checked`, counts);
  snapshot.sources.links = {
    status: 'ok',
    fetchedAt: new Date().toISOString(),
    counts,
    note: 'protected = site answered but blocks automated clients (401/403/429); unavailable = server error (5xx, may be bot protection or downtime); unreachable = no answer from the checker network.',
  };
  snapshot.links = results;
}

// ---------------------------------------------------------------------------
// Verified overrides (human-verified values) — validation only
// ---------------------------------------------------------------------------
async function validateOverrides(snapshot) {
  let doc;
  try {
    doc = JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'));
  } catch (e) {
    snapshot.sources.overrides = { status: 'error', errors: [`cannot read verified-overrides.json: ${e.message}`] };
    return;
  }
  const required = ['productId', 'target', 'source', 'reference', 'verifiedBy', 'verifiedAt'];
  const errors = [];
  const db = await readFile(DB_FILE, 'utf8');
  const knownIds = new Set([...db.matchAll(/\bid: '([a-z0-9-]+)'/g)].map((m) => m[1]));
  const knownHs = new Set([...db.matchAll(/\bcode: '(\d{4}\.\d{2}\.\d{4})'/g)].map((m) => m[1]));
  // keys of `tariffsByHs` blocks (HS-specific tariff tables), per product: product blocks in SEED_PRODUCTS start
  // with a 4-space-indented `id:`; table keys inside a block belong to that product
  const tablesByProduct = Object.create(null); // no prototype keys (e.g. a productId "constructor")
  {
    const start = db.indexOf('const SEED_PRODUCTS');
    const seed = db.slice(start, db.indexOf('\n];\n', start));
    const heads = [...seed.matchAll(/^    id: '([a-z0-9-]+)',$/gm)];
    heads.forEach((h, i) => {
      const block = seed.slice(h.index, heads[i + 1]?.index ?? seed.length);
      tablesByProduct[h[1]] = new Set([...block.matchAll(/^\s+'(\d{4}\.\d{2}\.\d{4})': \{$/gm)].map((m) => m[1]));
    });
  }
  // round-trip so impossible dates such as 2025-02-31 are rejected
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const isRange = (v, hi) => Array.isArray(v) && v.length === 2 && isNum(v[0], 0, hi) && isNum(v[1], 0, hi) && v[0] <= v[1];
  const placeholder = (v) => typeof v === 'string' && /(O{3}|_{3,}|0000호|\bTEST\b)/.test(v);
  (doc.entries ?? []).forEach((e, i) => {
    const at = `entries[${i}]`;
    for (const k of required) if (!e[k]) errors.push(`${at} missing ${k}`);
    if (e.productId && !MANIFEST.some((m) => m.id === e.productId)) errors.push(`${at} unknown productId ${e.productId}`);
    if (e.verifiedAt && !isDate(e.verifiedAt)) errors.push(`${at} verifiedAt must be YYYY-MM-DD`);
    if (e.validUntil !== undefined && !isDate(e.validUntil)) errors.push(`${at} validUntil must be YYYY-MM-DD`);
    for (const k of ['source', 'reference', 'verifiedBy']) if (placeholder(e[k])) errors.push(`${at} ${k} looks like a placeholder`);
    const t = e.target ?? {};
    switch (t.type) {
      case 'tariff':
        if (!['MFN', 'AKFTA', 'RCEP', 'KRPH'].includes(t.scheme)) errors.push(`${at} target.scheme must be MFN|AKFTA|RCEP|KRPH`);
        if (!isNum(t.rate, 0, 100)) errors.push(`${at} target.rate must be 0–100`);
        if (t.roo !== undefined && (typeof t.roo !== 'string' || !t.roo.trim())) errors.push(`${at} target.roo must be a non-empty string`);
        if (t.hs !== undefined && !tablesByProduct[e.productId]?.has(t.hs)) errors.push(`${at} target.hs ${t.hs} is not an HS tariff table of ${e.productId}`);
        break;
      case 'hs':
        if (!knownHs.has(t.code)) errors.push(`${at} target.code ${t.code} is not an HS candidate of the product`);
        if (typeof t.ruling !== 'string' || !t.ruling.trim()) errors.push(`${at} target.ruling required`);
        break;
      case 'partner':
        if (!knownIds.has(t.id)) errors.push(`${at} unknown partner id ${t.id}`);
        if (typeof t.license !== 'string' || !t.license.trim()) errors.push(`${at} target.license required`);
        if (t.licenseValidUntil !== undefined && !isDate(t.licenseValidUntil)) errors.push(`${at} target.licenseValidUntil must be YYYY-MM-DD`);
        break;
      case 'requirement':
        if (!knownIds.has(t.id)) errors.push(`${at} unknown requirement id ${t.id}`);
        break;
      case 'logistics':
        if (!Number.isInteger(t.index) || t.index < 0 || t.index > 9) errors.push(`${at} target.index must be an integer 0–9`);
        if (t.cost === undefined && t.transitDays === undefined) errors.push(`${at} target needs cost and/or transitDays`);
        if (t.cost !== undefined && !isRange(t.cost, 100000)) errors.push(`${at} target.cost must be [min, max]`);
        if (t.transitDays !== undefined && !isRange(t.transitDays, 120)) errors.push(`${at} target.transitDays must be [min, max]`);
        break;
      case 'pricing':
        if (t.unitPrice === undefined && t.moq === undefined) errors.push(`${at} target needs unitPrice and/or moq`);
        if (t.unitPrice !== undefined && !isNum(t.unitPrice, 0.0001, 1e6)) errors.push(`${at} target.unitPrice must be > 0`);
        if (t.moq !== undefined && !isNum(t.moq, 1, 1e9)) errors.push(`${at} target.moq must be ≥ 1`);
        break;
      default:
        errors.push(`${at} target.type must be tariff|hs|partner|requirement|logistics|pricing`);
    }
  });
  snapshot.sources.overrides = { status: errors.length ? 'error' : 'ok', entries: (doc.entries ?? []).length, errors };
  log(`  overrides: ${(doc.entries ?? []).length} entries, ${errors.length} errors`);
}

// ---------------------------------------------------------------------------
async function main() {
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  } catch {
    snapshot = {};
  }
  snapshot.schema = 1;
  snapshot.sources ??= {};
  log(`TradeScope official data sync → ${path.relative(ROOT, OUT_FILE)}`);
  if (want('comtrade')) await syncComtrade(snapshot);
  if (want('wits')) await syncWits(snapshot);
  if (want('kcs')) await syncKcs(snapshot);
  if (want('links')) await syncLinks(snapshot);
  await validateOverrides(snapshot);
  if (snapshot.sources.overrides?.status === 'error') {
    console.error('verified-overrides.json is invalid:', snapshot.sources.overrides.errors);
    process.exitCode = 1;
  }
  snapshot.generatedAt = new Date().toISOString();
  if (args['dry-run']) {
    log(JSON.stringify(snapshot.sources, null, 2));
    return;
  }
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
  log('done.', Object.fromEntries(Object.entries(snapshot.sources).map(([k, v]) => [k, v.status])));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
