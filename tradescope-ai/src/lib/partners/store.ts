/**
 * Partner pipeline store (server-side only): the admin's status, contact and contract notes for each candidate
 * firm, plus firms added by hand. Kept in TRADESCOPE_DATA_DIR/partners.json (0600), rewritten atomically.
 * The researched candidate list itself ships with the code (src/data/partner-candidates.ts).
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PARTNER_CANDIDATES } from '@/data/partner-candidates';
import { withFileLock } from '@/lib/file-lock';
import { settingsDir } from '@/lib/settings/core.mjs';
import { isHttpsUrl } from '@/lib/settings/schema';
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
}

const file = () => path.join(settingsDir(), 'partners.json');
const empty = (): StoreFile => ({ format: 1, deals: Object.create(null), custom: [] });

/** The stored state; an empty one when the file does not exist. A damaged file throws (never overwritten). */
function read(): StoreFile {
  let raw: string;
  try {
    raw = readFileSync(file(), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return empty();
    throw e;
  }
  let v: Partial<StoreFile>;
  try {
    v = JSON.parse(raw) as Partial<StoreFile>;
  } catch {
    throw new Error('partners-file-corrupt');
  }
  if (!v || v.format !== 1 || typeof v.deals !== 'object' || !Array.isArray(v.custom)) throw new Error('partners-file-corrupt');
  const deals: Record<string, PartnerDeal> = Object.create(null);
  for (const [id, d] of Object.entries(v.deals ?? {})) deals[id] = cleanDeal(d);
  return { format: 1, deals, custom: v.custom.filter((f) => f && typeof f.id === 'string' && f.id.startsWith('c-')).map((f) => ({ ...f, origin: 'custom' as const })) };
}

function write(state: StoreFile): void {
  mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
  const f = file();
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 1), { mode: 0o600 });
  renameSync(tmp, f);
  try {
    chmodSync(f, 0o600);
  } catch {
    /* not supported on every filesystem */
  }
}

/** Read, change and write under the lock file, so two admins cannot overwrite each other's edits. */
function mutate<T>(change: (st: StoreFile) => T): T {
  let out!: T;
  const locked = withFileLock(`${file()}.lock`, () => {
    const st = read();
    out = change(st);
    write(st);
  });
  if (!locked) throw new Error('partners-busy');
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
    contractDate: /^\d{4}-\d{2}-\d{2}$/.test(str(x.contractDate, 10)) ? str(x.contractDate, 10) : '',
    notes: str(x.notes, DEAL_MAX.notes),
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : null,
  };
}

/** Every firm (research + custom) with its pipeline record. */
export function listPartners(): PartnerRow[] {
  const st = read();
  return [...PARTNER_CANDIDATES, ...st.custom].map((f) => ({ ...f, deal: Object.hasOwn(st.deals, f.id) ? st.deals[f.id] : { ...EMPTY_DEAL } }));
}

/** Contracted firms only: the public list. Never includes contacts, terms or notes. */
export function contractedPartners(): Array<Pick<PartnerFirm, 'country' | 'type' | 'name' | 'nameLocal' | 'city' | 'website'>> {
  let rows: PartnerRow[];
  try {
    rows = listPartners();
  } catch {
    return [];
  }
  return rows.filter((r) => r.deal.status === 'contracted').map(({ country, type, name, nameLocal, city, website }) => ({ country, type, name, nameLocal, city, website }));
}

export type DealPatch = Partial<Omit<PartnerDeal, 'updatedAt'>>;

/** Updates the pipeline record of a known firm. Returns the new record, or null when the id is unknown. */
export function updateDeal(id: string, patch: DealPatch): PartnerDeal | null {
  return mutate((st) => {
    const known = PARTNER_CANDIDATES.some((f) => f.id === id) || st.custom.some((f) => f.id === id);
    if (!known) return null;
    const prev = Object.hasOwn(st.deals, id) ? st.deals[id] : { ...EMPTY_DEAL };
    const next = cleanDeal({ ...prev, ...patch, updatedAt: new Date().toISOString() });
    st.deals[id] = next;
    return next;
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

export function addFirm(firm: Omit<PartnerFirm, 'id' | 'origin' | 'sources'>): PartnerFirm {
  return mutate((st) => {
    const rec: PartnerFirm = { ...firm, id: `c-${randomBytes(6).toString('hex')}`, origin: 'custom', sources: [] };
    st.custom.push(rec);
    return rec;
  });
}

/** Removes a hand-entered firm (researched candidates are set to "dropped" instead). */
export function removeFirm(id: string): boolean {
  return mutate((st) => {
    const before = st.custom.length;
    st.custom = st.custom.filter((f) => f.id !== id);
    if (st.custom.length === before) return false;
    delete st.deals[id];
    return true;
  });
}
