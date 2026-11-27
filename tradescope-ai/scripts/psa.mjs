/**
 * Philippine Statistics Authority (PSA) OpenSTAT — FOB value and gross weight of Philippine exports by commodity
 * (PSCC 11-digit, which starts with the AHTN code) and country. Used as the price benchmark for products the
 * Philippines exports to Korea: same line, same basis (FOB) as the seed price. Keyless PXWeb API.
 */
export const PSA_BASE = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2L/IMT';
export const PSA_KOREA = '440';

/** product id → commodity-code prefixes (AHTN digits) and the line's description */
export const PSA_LINES = {
  'dried-mango': { prefixes: ['08045022'], line: 'AHTN 0804.50.22 Mangoes, dried — Philippines → Korea' },
  'banana-chips': { prefixes: ['20089940'], line: 'AHTN 2008.99.40 other prepared fruit with added sugar (incl. banana chips) — Philippines → Korea' },
  'coconut-oil': { prefixes: ['15131110'], line: 'AHTN 1513.11.10 virgin coconut oil — Philippines → Korea' },
};

/** Below this much traded weight a unit value says little; the previous benchmark is kept instead. */
export const PSA_MIN_KG = 5000;

/** The table id for a year from a folder listing (FOB or GKE), or null. */
export function tableForYear(listing, year) {
  const rows = Array.isArray(listing) ? listing : [];
  const hit = rows.find((r) => r && r.type === 't' && new RegExp(`,\\s*${year}\\s*$`).test(String(r.text ?? '')));
  return hit ? { id: hit.id, updated: hit.updated ?? null, text: hit.text } : null;
}

/** Sum of every month in a PXWeb CSV for commodity codes starting with any prefix ("..", "-" and blanks skipped). */
export function sumByPrefix(csv, prefixes) {
  let total = 0;
  let rows = 0;
  for (const line of String(csv ?? '').split(/\r?\n/).slice(1)) {
    const cells = line.match(/("([^"]*)"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')) ?? [];
    const code = cells[0];
    if (!code || !prefixes.some((p) => code.startsWith(p))) continue;
    rows++;
    for (const v of cells.slice(2)) {
      const n = Number(v);
      if (v !== '' && Number.isFinite(n)) total += n;
    }
  }
  return { total, rows };
}

/** USD/kg from FOB and weight sums, or null when there is too little weight to mean anything. */
export function unitValue(fobUsd, kg) {
  if (!(kg >= PSA_MIN_KG) || !(fobUsd > 0)) return null;
  return { usdPerKg: Math.round((fobUsd / kg) * 100) / 100, tonnes: Math.round(kg / 100) / 10 };
}

/** POST body selecting every commodity for one destination country, as CSV. */
export function countryQuery(country = PSA_KOREA) {
  return {
    query: [
      { code: 'Commodity Code', selection: { filter: 'all', values: ['*'] } },
      { code: 'Country', selection: { filter: 'item', values: [country] } },
    ],
    response: { format: 'csv' },
  };
}
