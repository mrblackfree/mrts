/**
 * Partner pipeline store (server-side only): the admin's status, contact and contract notes for each candidate
 * firm, plus firms added by hand. One document "partners" in the data folder (partners.json, 0600) or in Redis
 * (see lib/store/docs); every change is a read-change-write that never loses a concurrent one.
 * The researched candidate list itself ships with the code (src/data/partner-candidates.ts).
 */
import { randomBytes } from 'node:crypto';
import { PARTNER_CANDIDATES } from '@/data/partner-candidates';
import { isHttpsUrl } from '@/lib/settings/schema';
import { readDoc, updateDoc } from '@/lib/store/docs';
import {
  DEAL_MAX,
  EMPTY_DEAL,
  FIRM_MAX,
  PARTNER_COUNTRIES,
  PARTNER_TYPES,
  PIPELINE,
  type PartnerCountry,
  type PartnerDeal,
  type PartnerFirm,
  type PartnerRow,
  type PartnerType,
  type PipelineStatus,
} from './types';

interface StoreFile {
  format: 1;
  deals: Record<string, PartnerDeal>;
  custom: PartnerFirm[];
  /** entries in `custom` that do not validate: never listed, written back unchanged */
  keep: unknown[];
}

const DOC = 'partners';
const empty = (): StoreFile => ({ format: 1, deals: Object.create(null), custom: [], keep: [] });

/** The stored state from its text; an empty one when nothing is stored. A damaged document throws (never overwritten). */
function parse(raw: string | null): StoreFile {
  if (raw === null) return empty();
  let v: Partial<StoreFile>;
  try {
    v = JSON.parse(raw) as Partial<StoreFile>;
  } catch {
    throw new Error('partners-file-corrupt');
  }
  if (!v || v.format !== 1 || typeof v.deals !== 'object' || !Array.isArray(v.custom)) throw new Error('partners-file-corrupt');
  const deals: Record<string, PartnerDeal> = Object.create(null);
  for (const [id, d] of Object.entries(v.deals ?? {})) deals[id] = cleanDeal(d);
  const custom: PartnerFirm[] = [];
  const keep: unknown[] = [];
  for (const f of v.custom as unknown[]) {
    const c = cleanFirm(f);
    if (c) custom.push(c);
    else keep.push(f);
  }
  return { format: 1, deals, custom, keep };
}

/** A hand-added firm read back from the file, normalised; null when it does not validate. */
function cleanFirm(f: unknown): PartnerFirm | null {
  if (!f || typeof f !== 'object') return null;
  const x = f as Record<string, unknown>;
  if (typeof x.id !== 'string' || !/^c-[0-9a-f]{6,32}$/.test(x.id)) return null;
  if (!PARTNER_COUNTRIES.includes(x.country as PartnerCountry) || !PARTNER_TYPES.includes(x.type as PartnerType)) return null;
  const name = str(x.name, FIRM_MAX.name);
  if (!name) return null;
  const website = str(x.website, FIRM_MAX.website);
  const strings = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, max)).filter(Boolean).slice(0, n) : []);
  return {
    id: x.id,
    country: x.country as PartnerCountry,
    type: x.type as PartnerType,
    name,
    nameLocal: str(x.nameLocal, FIRM_MAX.nameLocal) || undefined,
    city: str(x.city, FIRM_MAX.city),
    website: website && isHttpsUrl(website) ? website : '',
    practice: strings(x.practice, 60, 8),
    why: str(x.why, FIRM_MAX.why),
    sources: strings(x.sources, 300, 10).filter(isHttpsUrl),
    origin: 'custom',
  };
}

/** A real calendar date in YYYY-MM-DD, or ''. */
function calendarDate(v: unknown): string {
  const d = str(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d ? d : '';
}

function serialize(state: StoreFile): string {
  const { keep, ...rest } = state;
  return JSON.stringify({ ...rest, custom: [...state.custom, ...keep] }, null, 1);
}

/** Read, change and write as one step; `change` returns false to write nothing. */
async function mutate<T>(change: (st: StoreFile) => { write: boolean; out: T }): Promise<T> {
  let out!: T;
  await updateDoc(DOC, (raw) => {
    const st = parse(raw);
    const r = change(st);
    out = r.out;
    return r.write ? serialize(st) : null;
  });
  return out;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanDeal(d: unknown): PartnerDeal {
  const x = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  const status = PIPELINE.includes(x.status as PipelineStatus) ? (x.status as PipelineStatus) : 'candidate';
  return {
    status,
    contactName: str(x.contactName, DEAL_MAX.contactName),
    contactEmail: str(x.contactEmail, DEAL_MAX.contactEmail),
    terms: str(x.terms, DEAL_MAX.terms),
    contractDate: calendarDate(x.contractDate),
    notes: str(x.notes, DEAL_MAX.notes),
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : null,
  };
}

/** Every firm (research + custom) with its pipeline record. */
export async function listPartners(): Promise<PartnerRow[]> {
  const st = parse(await readDoc(DOC));
  return [...PARTNER_CANDIDATES, ...st.custom].map((f) => ({ ...f, deal: Object.hasOwn(st.deals, f.id) ? st.deals[f.id] : { ...EMPTY_DEAL } }));
}

/** Contracted firms only: the public list. Never includes contacts, terms or notes. */
export async function contractedPartners(): Promise<Array<Pick<PartnerFirm, 'country' | 'type' | 'name' | 'nameLocal' | 'city' | 'website'>>> {
  let rows: PartnerRow[];
  try {
    rows = await listPartners();
  } catch {
    return [];
  }
  return rows.filter((r) => r.deal.status === 'contracted').map(({ country, type, name, nameLocal, city, website }) => ({ country, type, name, nameLocal, city, website }));
}

export type DealPatch = Partial<Omit<PartnerDeal, 'updatedAt'>>;

/** Updates the pipeline record of a known firm. Returns the new record, or null when the id is unknown. */
export async function updateDeal(id: string, patch: DealPatch): Promise<PartnerDeal | null> {
  return mutate<PartnerDeal | null>((st) => {
    const known = PARTNER_CANDIDATES.some((f) => f.id === id) || st.custom.some((f) => f.id === id);
    if (!known) return { write: false, out: null };
    const prev = Object.hasOwn(st.deals, id) ? st.deals[id] : { ...EMPTY_DEAL };
    const next = cleanDeal({ ...prev, ...patch, updatedAt: new Date().toISOString() });
    st.deals[id] = next;
    return { write: true, out: next };
  });
}

export type FirmInput = { country: PartnerCountry; type: PartnerType; name: string; nameLocal?: string; city?: string; website?: string; practice?: string; why?: string };

/** Validates a hand-entered firm; returns per-field errors or the cleaned firm. */
export function validateFirm(input: unknown): { ok: true; firm: Omit<PartnerFirm, 'id' | 'origin' | 'sources'> } | { ok: false; errors: Record<string, string> } {
  const x = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const country = x.country as PartnerCountry;
  const type = x.type as PartnerType;
  if (!PARTNER_COUNTRIES.includes(country)) errors.country = 'invalid';
  if (!PARTNER_TYPES.includes(type)) errors.type = 'invalid';
  const name = str(x.name, FIRM_MAX.name);
  if (!name) errors.name = 'required';
  const website = str(x.website, FIRM_MAX.website);
  if (website && !isHttpsUrl(website)) errors.website = 'not-https-url';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    firm: {
      country,
      type,
      name,
      nameLocal: str(x.nameLocal, FIRM_MAX.nameLocal) || undefined,
      city: str(x.city, FIRM_MAX.city),
      website,
      practice: str(x.practice, FIRM_MAX.practice)
        .split(/[,·]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 8),
      why: str(x.why, FIRM_MAX.why),
    },
  };
}

export async function addFirm(firm: Omit<PartnerFirm, 'id' | 'origin' | 'sources'>): Promise<PartnerFirm> {
  return mutate((st) => {
    const rec: PartnerFirm = { ...firm, id: `c-${randomBytes(6).toString('hex')}`, origin: 'custom', sources: [] };
    st.custom.push(rec);
    return { write: true, out: rec };
  });
}

/** Removes a hand-entered firm (researched candidates are set to "dropped" instead). */
export async function removeFirm(id: string): Promise<boolean> {
  return mutate((st) => {
    const before = st.custom.length;
    st.custom = st.custom.filter((f) => f.id !== id);
    if (st.custom.length === before) return { write: false, out: false };
    delete st.deals[id];
    return { write: true, out: true };
  });
}
