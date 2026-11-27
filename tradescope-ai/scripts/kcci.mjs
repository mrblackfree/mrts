/**
 * KOBC KCCI (KOBC Container Composite Index) — the weekly container freight index published by the Korea Ocean
 * Business Corporation (한국해양진흥공사), USD per FEU from Busan.
 *
 * Only a reference level for this app: the Southeast Asia route (KSEI) is Busan → Ho Chi Minh, Jakarta and
 * Singapore, not Manila or Cebu, and it covers no northbound (PH → KR) leg. It never verifies a lane — a forwarder's
 * quote does that.
 */
export const KCCI_URL = 'https://www.kobc.or.kr/ebz/shippinginfo/kcci/gridList.do?mId=0304000000';

const cells = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .split(/<[^>]+>/)
    .map((s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const num = (s) => {
  const n = Number(String(s ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Reads the index table: the two dates from the header and, per route code, the current and previous values.
 * Returns null when the page does not have that shape (so a layout change is never read as data).
 */
export function parseKcci(html) {
  const c = cells(String(html ?? ''));
  const iCur = c.indexOf('Current Index');
  const iPrev = c.indexOf('Previous Index');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(c[iCur + 1] ?? '') ? c[iCur + 1] : null;
  const prevDate = /^\d{4}-\d{2}-\d{2}$/.test(c[iPrev + 1] ?? '') ? c[iPrev + 1] : null;
  if (!date || !prevDate) return null;
  const routes = {};
  for (const code of ['KCCI', 'KSEI', 'KCI', 'KJI']) {
    const i = c.indexOf(code, iPrev);
    if (i < 0) continue;
    // code | route | weight | current | previous | change
    const value = num(c[i + 3]);
    const prev = num(c[i + 4]);
    if (value !== null && prev !== null && /%$/.test(c[i + 2] ?? '')) routes[code] = { route: c[i + 1], weight: c[i + 2], value, prev };
  }
  if (!routes.KSEI) return null;
  return { date, prevDate, unit: 'USD/FEU', routes };
}
