/**
 * Grounding check for LLM output: every percentage, dollar amount and HS code the model writes must come from
 * the context it was given (or from the arithmetic the answer is expected to do with it). A model that invents a
 * tariff rate, a market size or an HS line fails the check, and the caller keeps the deterministic report.
 *
 * Deliberately narrow: years, day counts and other bare numbers are not checked, and complex Korean money forms
 * ("1억 2천만 달러") are skipped rather than guessed — those are low-risk next to a wrong duty rate.
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

/** Every number in a JSON-like value, including numbers written inside strings ("5%", "$1,200"). */
export function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (typeof value === 'string') for (const m of value.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.push(Number(m[0].replace(/,/g, '')));
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, out));
  return out;
}

/**
 * Numbers that are percentages in a JSON-like value: fields whose name says so (ratePct, sharePct, fit, score)
 * and numbers written with a % sign inside strings. Day counts, years and prices are left out, so "30%" is not
 * grounded by "30 days".
 */
export function collectPercents(value: unknown, out: number[] = [], key = ''): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (/pct|share|fit|score|rate|^(min|max|avg)$/i.test(key)) out.push(value);
  } else if (typeof value === 'string') {
    for (const m of value.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|퍼센트|percent)/gi)) out.push(Number(m[1]));
  } else if (Array.isArray(value)) value.forEach((v) => collectPercents(v, out, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectPercents(v, out, k));
  return out;
}

/** HS codes (####.## with optional further digits) found in a JSON-like value, as digit strings. */
export function collectHsCodes(value: unknown, out: string[] = []): string[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  for (const m of text.matchAll(/\b\d{4}\.\d{2}(?:\.\d{2,4})?\b/g)) out.push(m[0].replace(/\./g, ''));
  return out;
}

const decimalsOf = (raw: string) => (raw.includes('.') ? raw.split('.')[1].length : 0);
/** Half a unit of the precision the number was written with: "12%" covers 11.5–12.5, "12.3%" covers 12.25–12.35. */
const tolerance = (raw: string, unit = 1) => (0.5 * unit) / 10 ** decimalsOf(raw) + 1e-9;

const MONEY_UNIT: Record<string, number> = { k: 1e3, K: 1e3, m: 1e6, M: 1e6, b: 1e9, B: 1e9, bn: 1e9, thousand: 1e3, million: 1e6, billion: 1e9, 천: 1e3, 만: 1e4, 억: 1e8 };

interface Claim {
  text: string;
  value: number;
  tol: number;
  /** written about duty (관세, 세율, FTA, MFN, duty, tariff …) — must match a tariff rate */
  tariff?: boolean;
}

const TARIFF_WORDS = /관세|세율|협정|기본세율|fta|mfn|akfta|rcep|duty|duties|tariff/i;

function percentClaims(text: string): Claim[] {
  const out: Claim[] = [];
  for (const m of text.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:%p|%|퍼센트(?:포인트)?|percentage points?|percent|pp\b)/gi)) {
    const at = m.index ?? 0;
    // the words just before the figure, within the same sentence or list item
    const lead = text.slice(Math.max(0, at - 28), at).split(/[.!?\n·|]|,\s/).pop() ?? '';
    out.push({ text: m[0], value: Number(m[1]), tol: Math.max(tolerance(m[1]), 0.05), tariff: TARIFF_WORDS.test(lead) });
  }
  return out;
}

function moneyClaims(text: string): Claim[] {
  const out: Claim[] = [];
  const push = (raw: string, unit: string | undefined, whole: string) => {
    const n = Number(raw.replace(/,/g, ''));
    const mult = unit ? (MONEY_UNIT[unit] ?? MONEY_UNIT[unit.toLowerCase()] ?? 1) : 1;
    out.push({ text: whole, value: n * mult, tol: Math.max(tolerance(raw.replace(/,/g, ''), mult), n * mult * 0.005) });
  };
  // $1,234.5 · $1.2M · US$ 50k · USD 1.2 million
  for (const m of text.matchAll(/(?:US\$|\$|USD\s?)\s?(\d[\d,]*(?:\.\d+)?)(?:\s?(bn|[kKmMbB](?![a-z])|thousand|million|billion))?/g)) push(m[1], m[2], m[0]);
  // 5만 달러 · 2,250달러 · 3천불 (a number directly followed by one unit and 달러/불)
  for (const m of text.matchAll(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s?(천|만|억)?\s?(?:달러|불)/g)) {
    // "1억 2천만 달러" style compounds are skipped (see module comment)
    const before = text.slice(Math.max(0, (m.index ?? 0) - 3), m.index);
    if (/[억만천]\s?$/.test(before)) continue;
    push(m[1], m[2], m[0]);
  }
  return out;
}

function hsClaims(text: string): string[] {
  return [...text.matchAll(/\b\d{4}\.\d{2}(?:\.\d{2,4})?\b/g)].map((m) => m[0]);
}

const close = (claim: Claim, allowed: number[]) => allowed.some((n) => Math.abs(claim.value - n) <= claim.tol);

/** The claims in `texts` that the allowed values do not support (empty = grounded). */
export function findUngrounded(texts: string[], allowed: Allowed): string[] {
  const bad: string[] = [];
  const text = texts.join('\n');
  for (const c of percentClaims(text)) if (!close(c, c.tariff ? allowed.rates : allowed.percents)) bad.push(c.text.trim());
  for (const c of moneyClaims(text)) if (!close(c, allowed.amounts)) bad.push(c.text.trim());
  for (const hs of hsClaims(text)) {
    const digits = hs.replace(/\./g, '');
    // the model may shorten a code (2008.99 for 2008.99.9000) but not extend or change it
    if (!allowed.hsCodes.some((code) => code.startsWith(digits))) bad.push(hs);
  }
  return Array.from(new Set(bad));
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
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const from = series[i];
      const to = series[j];
      if (from > 0) percents.push((to / from - 1) * 100, Math.abs(to / from - 1) * 100, (Math.pow(to / from, 1 / (j - i)) - 1) * 100);
      amounts.push(Math.abs(to - from));
    }
  }
  for (const amount of input.amounts) {
    for (const r of rates) amounts.push((amount * r) / 100);
    for (const a of rates) for (const b of rates) if (a > b) amounts.push((amount * (a - b)) / 100);
  }
  return { rates, percents: [...rates, ...percents], amounts };
}
