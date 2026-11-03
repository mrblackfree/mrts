/**
 * Grounding check for LLM output: every percentage, dollar amount and HS code the model writes must come from
 * the context it was given (or from the arithmetic the answer is expected to do with it). A model that invents a
 * tariff rate, a market size or an HS line fails the check, and the caller keeps the deterministic report.
 *
 * Forms that are checked:
 *  - percentages: 12% · 12.5 % · -3.4% · 1,000% · 5%p · 5 pp · 12 percent · 12퍼센트
 *  - dollar amounts: $1,234 · $1.2M · US$50k · USD 1.2 million · 1.2 million dollars · 50,000 USD ·
 *    5만 달러 · 2,250달러 · 1억 2천만 달러 · 3천불
 *  - HS codes: 2008.99 / 2008.99.9000 anywhere, and undotted 200899 / 2008999000 after "HS" / "HSK"
 * Not checked: years, day counts, quantities, scores without a % sign and amounts in other currencies.
 */

export interface Allowed {
  /** values a percentage may take: rates, shares, fit scores and the differences / growth derived from them */
  percents: number[];
  /**
   * values a percentage written about duty may take (tariff rates and the gaps between them). Checked on its own
   * because the general set is dense enough that an invented whole-number rate could match a share or growth.
   */
  rates: number[];
  /** values a dollar amount may take */
  amounts: number[];
  hsCodes: string[];
}

interface Claim {
  text: string;
  value: number;
  tol: number;
  /** written about a duty rate (관세, 세율, FTA, MFN, duty, tariff …) — must match a tariff rate */
  tariff?: boolean;
}

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const decimalsOf = (raw: string) => (raw.includes('.') ? raw.split('.')[1].length : 0);
const toNumber = (raw: string) => Number(raw.replace(/,/g, '').replace('−', '-'));
/** Half a unit of the precision the number was written with: "12%" covers 11.5–12.5, "12.3%" covers 12.25–12.35. */
const tolerance = (raw: string, unit = 1) => (0.5 * unit) / 10 ** decimalsOf(raw.replace(/,/g, '')) + 1e-9;

// ---- percentages ----------------------------------------------------------------------------------------------

const TARIFF_WORDS = /관세|세율|협정|fta|mfn|akfta|rcep|duty|duties|tariff/i;
/** "100% 면제", "89% savings": a reduction, not a rate */
const SAVING_WORDS = /절감|감면|면제|절약|인하|saving|savings|reduction|cut|lower|off\b/i;

function percentClaims(text: string): Claim[] {
  const out: Claim[] = [];
  const re = new RegExp(String.raw`(?<![\d.,])([+\-−]?${NUM})\s*(?:%p|%|퍼센트(?:포인트)?|percentage points?|percent|pp\b)`, 'gi');
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    // the words around the figure, within the same clause
    const lead = text.slice(Math.max(0, at - 28), at).split(/[.!?;\n·|]|,\s/).pop() ?? '';
    const trail = text.slice(end, end + 24).split(/[.!?;,\n·|]|\d/)[0] ?? '';
    const saving = SAVING_WORDS.test(trail) || SAVING_WORDS.test(lead);
    // a duty word just before the figure ("관세 5%", "MFN 45%"), or as the very next word ("5% tariff", "5% 관세")
    const nextWord = /^\s*(?:의\s*)?(?:관세|세율|tariff|duty|duties|ad valorem)/i.test(trail);
    out.push({ text: m[0], value: toNumber(m[1]), tol: Math.max(tolerance(m[1].replace(/^[+\-−]/, '')), 0.05), tariff: !saving && (TARIFF_WORDS.test(lead) || nextWord) });
  }
  return out;
}

// ---- dollar amounts -------------------------------------------------------------------------------------------

const EN_UNIT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };
const KO_UNIT: Record<string, number> = { 백: 1e2, 천: 1e3, 만: 1e4, 억: 1e8 };

function enClaim(raw: string, unit: string | undefined, whole: string): Claim {
  const mult = unit ? (EN_UNIT[unit.toLowerCase()] ?? 1) : 1;
  const value = toNumber(raw) * mult;
  return { text: whole, value, tol: Math.max(tolerance(raw, mult), value * 0.005) };
}

/** Korean money with 억 / 만 / 천 / 백, e.g. "1억 2천만" = 120,000,000, "3만 5천" = 35,000, "2,500만" = 25,000,000. */
function koreanValue(tokens: Array<{ num?: string; unit?: string }>): number {
  let total = 0;
  let group = 0;
  for (const { num, unit } of tokens) {
    const n = num !== undefined ? toNumber(num) : 0;
    if (unit === '천' || unit === '백') group += (num !== undefined ? n : 1) * KO_UNIT[unit];
    else if (unit === '만' || unit === '억') {
      total += (group + n) * KO_UNIT[unit];
      group = 0;
    } else group += n;
  }
  return total + group;
}

function koreanClaim(expr: string, whole: string): Claim | undefined {
  const tokens = [...expr.matchAll(new RegExp(String.raw`(${NUM})?\s?([억만천백])|(${NUM})`, 'g'))].map((t) => ({ num: t[1] ?? t[3], unit: t[2] }));
  if (!tokens.length) return undefined;
  const value = koreanValue(tokens);
  // precision: how much the amount moves when the last written number moves by one unit of its own precision
  const lastIdx = tokens.map((t) => t.num !== undefined).lastIndexOf(true);
  if (lastIdx < 0) return undefined;
  const last = tokens[lastIdx].num!;
  const bumped = tokens.map((t, i) => (i === lastIdx ? { ...t, num: String(toNumber(last) + 1) } : t));
  const step = koreanValue(bumped) - value;
  return { text: whole, value, tol: Math.max(step / 2 / 10 ** decimalsOf(last.replace(/,/g, '')), value * 0.005) };
}

export function moneyClaims(text: string): Claim[] {
  const out: Claim[] = [];
  // a word unit may follow after a space ("1.2 million"); a letter unit must be attached ("$1.2M", "$50k").
  // Only spaces or tabs separate them, never a line break.
  const unit = String.raw`(?:[ \t]?(bn|thousand|million|billion)(?![a-zA-Z])|([kKmMbB])(?![a-zA-Z]))`;
  // $1,234.5 · $1.2M · US$ 50k · USD 1.2 million
  for (const m of text.matchAll(new RegExp(String.raw`(?:US\$|\$|USD[ \t]?)[ \t]?(${NUM})${unit}?`, 'g'))) out.push(enClaim(m[1], m[2] ?? m[3], m[0]));
  // 1.2 million dollars · 50,000 USD · 12 thousand US dollars (not when the number already followed "$" / "USD")
  for (const m of text.matchAll(new RegExp(String.raw`(?<![\d.,$]|USD[ \t]?)(${NUM})${unit}?[ \t]?(?:US[ \t]?dollars?|dollars?|USD)(?![a-zA-Z])`, 'gi'))) {
    out.push(enClaim(m[1], m[2] ?? m[3], m[0]));
  }
  // 5만 달러 · 2,250달러 · 1억 2천만 달러 · 3천불
  const ko = String.raw`(?<![\d.,])(${NUM}(?:[ \t]?[억만천백]|[ \t]?${NUM}[ \t]?[억만천백])*(?:[ \t]?${NUM})?)[ \t]?(?:달러|불(?!가|확))`;
  for (const m of text.matchAll(new RegExp(ko, 'g'))) {
    const c = koreanClaim(m[1], m[0]);
    if (c) out.push(c);
  }
  return out;
}

// ---- HS codes -------------------------------------------------------------------------------------------------

function hsDigits(text: string): Array<{ text: string; digits: string }> {
  const out: Array<{ text: string; digits: string }> = [];
  for (const m of text.matchAll(/\b\d{4}\.\d{2}(?:\.\d{2,4})?\b/g)) out.push({ text: m[0], digits: m[0].replace(/\./g, '') });
  // undotted (or space / dash separated) codes are only read as HS codes right after "HS" / "HSK"
  for (const m of text.matchAll(/\bHSK?(?:\s*(?:code|코드))?\s*[:#]?\s*(\d{4}(?:[.\s-]?\d{2}){0,3})(?![\d.])/gi)) out.push({ text: m[0], digits: m[1].replace(/\D/g, '') });
  return out;
}

// ---- collecting what the context allows -----------------------------------------------------------------------

/** Every number in a JSON-like value, including numbers written inside strings. */
export function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (typeof value === 'string') for (const m of value.matchAll(new RegExp(NUM, 'g'))) out.push(toNumber(m[0]));
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, out));
  return out;
}

/**
 * Numbers that are percentages in a JSON-like value: fields whose name says so (ratePct, sharePct, fit, score)
 * and numbers written as percentages inside strings. Day counts, years and prices are left out, so "30%" is not
 * grounded by "30 days".
 */
export function collectPercents(value: unknown, out: number[] = [], key = ''): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (/pct|share|fit|score|rate|^(min|max|avg)$/i.test(key)) out.push(value);
  } else if (typeof value === 'string') out.push(...percentClaims(value).map((c) => c.value));
  else if (Array.isArray(value)) value.forEach((v) => collectPercents(v, out, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectPercents(v, out, k));
  return out;
}

/**
 * Money values in a JSON-like value: numeric fields named as money (…Usd, value, price, cost, size, amount) and
 * dollar amounts written inside strings. Years, day counts, scores and HS-code digits are left out, so an invented
 * "$9,000" is not grounded by the "9000" of an HS line.
 */
export function collectAmounts(value: unknown, out: number[] = [], key = ''): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (/usd|value|price|cost|size|amount/i.test(key)) out.push(value);
  } else if (typeof value === 'string') out.push(...moneyClaims(value).map((c) => c.value));
  else if (Array.isArray(value)) value.forEach((v) => collectAmounts(v, out, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectAmounts(v, out, k));
  return out;
}

/** HS codes in a JSON-like value, as digit strings. */
export function collectHsCodes(value: unknown, out: string[] = []): string[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  out.push(...hsDigits(text).map((h) => h.digits));
  return out;
}

/** Differences, growth rates and amount-based duties an analyst would derive from the context. */
export function derived(input: { rates: number[]; percents: number[]; series: number[]; amounts: number[] }): { rates: number[]; percents: number[]; amounts: number[] } {
  const percents: number[] = [];
  const amounts: number[] = [];
  const { series } = input;
  const rates = [...input.rates];
  // percentage-point gaps between rates, and between other percentages (shares, fit)
  for (const a of input.rates) for (const b of input.rates) if (a > b) rates.push(a - b);
  for (const a of input.percents) for (const b of input.percents) if (a > b) percents.push(a - b);
  // relative duty saving: 45% → 5% is an 88.9% saving
  for (const a of input.rates) for (const b of input.rates) if (a > b && a > 0) percents.push(((a - b) / a) * 100);
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const from = series[i];
      const to = series[j];
      if (from > 0) percents.push((to / from - 1) * 100, Math.abs(to / from - 1) * 100, (Math.pow(to / from, 1 / (j - i)) - 1) * 100);
      amounts.push(Math.abs(to - from));
    }
  }
  for (const amount of input.amounts) {
    for (const r of input.rates) amounts.push((amount * r) / 100);
    for (const a of input.rates) for (const b of input.rates) if (a > b) amounts.push((amount * (a - b)) / 100);
  }
  return { rates, percents: [...rates, ...percents, 100], amounts };
}

/** The percentages and dollar amounts written in a text (to allow exactly what a source document states). */
export function statedFigures(texts: string[]): { percents: number[]; amounts: number[] } {
  const text = texts.join('\n');
  return { percents: percentClaims(text).map((c) => c.value), amounts: moneyClaims(text).map((c) => c.value) };
}

// ---- the check ------------------------------------------------------------------------------------------------

const close = (claim: Claim, allowed: number[]) => allowed.some((n) => Math.abs(claim.value - n) <= claim.tol);

/** The claims in `texts` that the allowed values do not support (empty = grounded). */
export function findUngrounded(texts: string[], allowed: Allowed): string[] {
  const bad: string[] = [];
  const text = texts.join('\n');
  for (const c of percentClaims(text)) if (!close(c, c.tariff ? allowed.rates : allowed.percents)) bad.push(c.text.trim());
  for (const c of moneyClaims(text)) if (!close(c, allowed.amounts)) bad.push(c.text.trim());
  for (const hs of hsDigits(text)) {
    // the model may shorten a code (2008.99 for 2008.99.9000) but not extend or change it
    if (!allowed.hsCodes.some((code) => code.startsWith(hs.digits))) bad.push(hs.text.trim());
  }
  return Array.from(new Set(bad));
}
