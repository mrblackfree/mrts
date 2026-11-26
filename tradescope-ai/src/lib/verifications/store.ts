/**
 * Verified values saved on the admin page (server-side only): the verified-overrides.json entry format, one
 * document "verifications" in the data folder or Redis (lib/store/docs). Every entry is validated against the
 * product it names before it is stored; the active ones are applied to the product data on each request.
 */
import { randomBytes } from 'node:crypto';
import { applyRuntimeOverrides, PRODUCTS } from '@/data/kr-ph-trade-db';
import type { OverrideEntry } from '@/data/official';
import { validateEntry } from '@/data/official/validate-entry';
import { todayIso } from '@/lib/format';
import { readDoc, updateDoc } from '@/lib/store/docs';

const DOC = 'verifications';
const MAX_ENTRIES = 2000;

export interface SavedVerification {
  id: string;
  savedAt: string;
  entry: OverrideEntry;
}

interface Doc {
  format: 1;
  items: SavedVerification[];
}

function parse(raw: string | null): Doc {
  if (raw === null) return { format: 1, items: [] };
  let v: Partial<Doc>;
  try {
    v = JSON.parse(raw) as Partial<Doc>;
  } catch {
    throw new Error('verifications-corrupt');
  }
  if (!v || v.format !== 1 || !Array.isArray(v.items)) throw new Error('verifications-corrupt');
  return { format: 1, items: v.items.filter((i) => i && typeof i.id === 'string' && i.entry && typeof i.entry === 'object') };
}

export async function listVerifications(): Promise<SavedVerification[]> {
  return parse(await readDoc(DOC)).items;
}

/** Entries that apply today: re-validated (a product or partner may have changed since) and not expired. */
export function activeEntries(items: SavedVerification[], today = todayIso()): OverrideEntry[] {
  // validate against the seed-level product data, independent of other runtime entries
  return items.map((i) => validateEntry(i.entry, PRODUCTS, null)).flatMap((r) => (r.ok ? [r.entry] : [])).filter((e) => !e.validUntil || e.validUntil >= today);
}

export async function addVerification(input: unknown): Promise<{ ok: true; item: SavedVerification } | { ok: false; errors: string[] }> {
  const check = validateEntry(input, PRODUCTS);
  if (!check.ok) return check;
  const item: SavedVerification = { id: `v-${randomBytes(6).toString('hex')}`, savedAt: new Date().toISOString(), entry: check.entry };
  let full = false;
  await updateDoc(DOC, (raw) => {
    const doc = parse(raw);
    if (doc.items.length >= MAX_ENTRIES) {
      full = true;
      return null;
    }
    doc.items.push(item);
    return JSON.stringify(doc, null, 1);
  });
  if (full) return { ok: false, errors: ['too-many-entries'] };
  return { ok: true, item };
}

export async function removeVerification(id: string): Promise<boolean> {
  let hit = false;
  await updateDoc(DOC, (raw) => {
    const doc = parse(raw);
    const next = doc.items.filter((i) => i.id !== id);
    hit = next.length !== doc.items.length;
    return hit ? JSON.stringify({ ...doc, items: next }, null, 1) : null;
  });
  return hit;
}

let loadedAt = 0;
const TTL_MS = 1500;

/** Applies the saved verified values to the product data (rebuilt only when they changed). */
export async function loadVerifications(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  loadedAt = Date.now();
  try {
    applyRuntimeOverrides(activeEntries(await listVerifications()));
  } catch {
    // unreadable or damaged document: keep the values applied last time
  }
}
