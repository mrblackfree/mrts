/**
 * Validates one verified-value entry (the verified-overrides.json format) against the product it names, and
 * returns a clean copy with only known fields. Used for entries saved on the admin page; the same rules as
 * `npm run data:validate`, checked against the actual product data (partner, requirement, HS code, tariff table
 * and lane must exist in that product).
 */
import { todayIso } from '@/lib/format';
import type { TradeProduct } from '@/lib/types';
import type { OverrideEntry } from './index';

/** Target types that may carry basis: 'official' (read from an official source rather than an expert's opinion). */
export const BASIS_TYPES = ['tariff', 'hs', 'partner'];

const SCHEMES = ['MFN', 'AKFTA', 'RCEP', 'KRPH'];
const PLACEHOLDER = /(O{3}|_{3,}|0000호|\bTEST\b)/;

const isDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const isNum = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isRange = (v: unknown, hi: number): v is [number, number] => Array.isArray(v) && v.length === 2 && isNum(v[0], 0, hi) && isNum(v[1], 0, hi) && v[0] <= v[1];
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export type EntryCheck = { ok: true; entry: OverrideEntry } | { ok: false; errors: string[] };

/**
 * `today`: the date for "not in the future / not expired" checks; null skips them (re-checking stored entries,
 * whose expiry is handled separately).
 */
export function validateEntry(input: unknown, products: TradeProduct[], today: string | null = todayIso()): EntryCheck {
  const errors: string[] = [];
  const x = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const productId = typeof x.productId === 'string' ? x.productId : '';
  const product = products.find((p) => p.id === productId);
  if (!product) return { ok: false, errors: ['productId: unknown product'] };

  const source = text(x.source, 200);
  const reference = text(x.reference, 200);
  const verifiedBy = text(x.verifiedBy, 120);
  for (const [k, v] of [['source', source], ['reference', reference], ['verifiedBy', verifiedBy]] as const) {
    if (!v) errors.push(`${k}: required`);
    else if (PLACEHOLDER.test(v)) errors.push(`${k}: looks like a placeholder`);
  }
  if (!isDate(x.verifiedAt)) errors.push('verifiedAt: YYYY-MM-DD');
  else if (today !== null && x.verifiedAt > today) errors.push('verifiedAt: in the future');
  if (x.validFrom !== undefined && x.validFrom !== '') {
    // may lie in the future: a scheduled rate read ahead from the same official schedule
    if (!isDate(x.validFrom)) errors.push('validFrom: YYYY-MM-DD');
    else if (isDate(x.validUntil) && x.validUntil < x.validFrom) errors.push('validUntil: before validFrom');
  }
  if (x.validUntil !== undefined && x.validUntil !== '') {
    if (!isDate(x.validUntil)) errors.push('validUntil: YYYY-MM-DD');
    else if (today !== null && x.validUntil < today) errors.push('validUntil: already expired');
    else if (isDate(x.verifiedAt) && x.validUntil < x.verifiedAt) errors.push('validUntil: before verifiedAt');
  }

  const t = (x.target && typeof x.target === 'object' ? x.target : {}) as Record<string, unknown>;
  let target: OverrideEntry['target'] | null = null;
  switch (t.type) {
    case 'tariff': {
      // left out = the product's main tariff table; anything present must name one of its HS tables
      const hs = t.hs === undefined ? undefined : typeof t.hs === 'string' && t.hs ? t.hs : null;
      if (hs === null) errors.push('target.hs: an HS code string, or leave it out');
      const table = hs ? product.tariffsByHs?.[hs]?.tariffs : product.tariffs;
      if (hs && !table) errors.push(`target.hs: ${hs} is not an HS tariff table of this product`);
      if (typeof t.scheme !== 'string' || !SCHEMES.includes(t.scheme)) errors.push('target.scheme: MFN | AKFTA | RCEP | KRPH');
      else if (table && !table.some((r) => r.scheme === t.scheme)) errors.push(`target.scheme: ${t.scheme} is not in this tariff table`);
      if (!isNum(t.rate, 0, 100)) errors.push('target.rate: 0–100');
      const roo = t.roo === undefined ? undefined : text(t.roo, 200);
      if (t.roo !== undefined && !roo) errors.push('target.roo: empty');
      target = { type: 'tariff', scheme: String(t.scheme), rate: Number(t.rate), ...(roo ? { roo } : {}), ...(hs ? { hs } : {}) };
      break;
    }
    case 'hs': {
      const code = typeof t.code === 'string' ? t.code : '';
      if (!product.hs.some((h) => h.code === code)) errors.push('target.code: not an HS candidate of this product');
      const ruling = text(t.ruling, 300);
      if (!ruling) errors.push('target.ruling: required');
      else if (PLACEHOLDER.test(ruling)) errors.push('target.ruling: looks like a placeholder');
      target = { type: 'hs', code, ruling };
      break;
    }
    case 'partner': {
      const id = typeof t.id === 'string' ? t.id : '';
      if (!product.partners.some((p) => p.id === id)) errors.push('target.id: not a partner of this product');
      const license = text(t.license, 300);
      if (!license) errors.push('target.license: required');
      let licenseValidUntil: string | undefined;
      if (t.licenseValidUntil !== undefined && t.licenseValidUntil !== '') {
        if (!isDate(t.licenseValidUntil)) errors.push('target.licenseValidUntil: YYYY-MM-DD');
        else if (today !== null && t.licenseValidUntil < today) errors.push('target.licenseValidUntil: already expired');
        else licenseValidUntil = t.licenseValidUntil;
      }
      target = { type: 'partner', id, license, ...(licenseValidUntil ? { licenseValidUntil } : {}) };
      break;
    }
    case 'requirement': {
      const id = typeof t.id === 'string' ? t.id : '';
      if (!product.requirements.some((r) => r.id === id)) errors.push('target.id: not a requirement of this product');
      target = { type: 'requirement', id };
      break;
    }
    case 'logistics': {
      // a JSON number only: null, "" or true must not quietly become lane 0 or 1
      const index = typeof t.index === 'number' ? t.index : NaN;
      if (!Number.isInteger(index) || index < 0 || index >= product.logistics.length) errors.push('target.index: not a lane of this product');
      if (t.cost === undefined && t.transitDays === undefined) errors.push('target: cost and/or transitDays');
      if (t.cost !== undefined && !isRange(t.cost, 100_000)) errors.push('target.cost: [min, max] 0–100000');
      if (t.transitDays !== undefined && !isRange(t.transitDays, 120)) errors.push('target.transitDays: [min, max] 0–120');
      target = { type: 'logistics', index, ...(isRange(t.cost, 100_000) ? { cost: t.cost } : {}), ...(isRange(t.transitDays, 120) ? { transitDays: t.transitDays } : {}) };
      break;
    }
    case 'pricing': {
      if (t.unitPrice === undefined && t.moq === undefined) errors.push('target: unitPrice and/or moq');
      if (t.unitPrice !== undefined && !isNum(t.unitPrice, 0.0001, 1e6)) errors.push('target.unitPrice: > 0');
      if (t.moq !== undefined && !isNum(t.moq, 1, 1e9)) errors.push('target.moq: ≥ 1');
      target = { type: 'pricing', ...(isNum(t.unitPrice, 0.0001, 1e6) ? { unitPrice: t.unitPrice } : {}), ...(isNum(t.moq, 1, 1e9) ? { moq: t.moq } : {}) };
      break;
    }
    default:
      errors.push('target.type: tariff | hs | partner | requirement | logistics | pricing');
  }
  // 'official' = read from an official published schedule or register, not an expert opinion (shown as "official")
  if (x.basis !== undefined && x.basis !== 'official') errors.push("basis: 'official' or leave it out");
  // a published schedule, an official classification ruling or an official register can be read without an expert;
  // requirement reviews, freight and price quotes stay expert / partner confirmations
  else if (x.basis !== undefined && !BASIS_TYPES.includes(String(t.type))) errors.push('basis: only for tariff, hs and partner entries');
  if (errors.length || !target) return { ok: false, errors };
  return {
    ok: true,
    entry: {
      productId,
      target,
      source,
      reference,
      verifiedBy,
      verifiedAt: x.verifiedAt as string,
      ...(isDate(x.validFrom) ? { validFrom: x.validFrom } : {}),
      ...(isDate(x.validUntil) ? { validUntil: x.validUntil } : {}),
      ...(x.basis === 'official' ? { basis: 'official' as const } : {}),
    },
  };
}
