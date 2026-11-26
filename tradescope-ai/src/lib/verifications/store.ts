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
import { refresher } from '@/lib/store/refresh';

const DOC = 'verifications';
const MAX_ENTRIES = 2000;

export interface SavedVerification {
  id: string;
  savedAt: string;
  entry: OverrideEntry;
}

/** The stored document. `items` is everything stored, kept as is — a record this version cannot use is never dropped. */
interface Doc {
  format: 1;
  items: unknown[];
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** A record the admin screen and the product data can use: id, product and a target object. */
function usable(x: unknown): x is SavedVerification {
  return isObj(x) && typeof x.id === 'string' && isObj(x.entry) && typeof x.entry.productId === 'string' && isObj(x.entry.target);
}

function parse(raw: string | null): Doc {
  if (raw === null) return { format: 1, items: [] };
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error('verifications-corrupt');
  }
  if (!isObj(v) || v.format !== 1 || !Array.isArray(v.items)) throw new Error('verifications-corrupt');
  return { format: 1, items: v.items };
}

const usableItems = (doc: Doc) => doc.items.filter(usable);

export async function listVerifications(): Promise<SavedVerification[]> {
  return usableItems(parse(await readDoc(DOC)));
}

/**
 * Entries that apply today: re-validated against the product data (a product or partner may have changed since)
 * and with every date checked — the entry's validity and a partner licence's expiry.
 */
export function activeEntries(items: SavedVerification[], today = todayIso()): OverrideEntry[] {
  // validate against the seed-level product data, independent of other runtime entries
  return items.map((i) => validateEntry(i.entry, PRODUCTS, today)).flatMap((r) => (r.ok ? [r.entry] : []));
}

/** The values applied to the product data on this server, refreshed by loadVerifications(). */
const runtime = refresher<SavedVerification[]>({
  read: listVerifications,
  apply: (items) => {
    applyRuntimeOverrides(activeEntries(items));
  },
  // unreadable or damaged document: keep the values applied last time
  ttlMs: 1500,
});

/** Applies the saved verified values to the product data (rebuilt only when they changed). */
export async function loadVerifications(force = false): Promise<void> {
  await runtime.refresh(force);
}

/** For tests: forget what was loaded. */
export function resetVerificationsForTest(): void {
  runtime.reset();
}

/** Saves the change and applies the written document right away (no re-read that could fail or be stale). */
async function save(change: (doc: Doc) => boolean): Promise<boolean> {
  const written = await updateDoc(DOC, (raw) => {
    const doc = parse(raw);
    return change(doc) ? JSON.stringify(doc, null, 1) : null;
  });
  if (written === null) return false;
  runtime.set(usableItems(parse(written)));
  return true;
}

export async function addVerification(input: unknown): Promise<{ ok: true; item: SavedVerification } | { ok: false; errors: string[] }> {
  const check = validateEntry(input, PRODUCTS);
  if (!check.ok) return check;
  const item: SavedVerification = { id: `v-${randomBytes(6).toString('hex')}`, savedAt: new Date().toISOString(), entry: check.entry };
  const saved = await save((doc) => {
    if (doc.items.length >= MAX_ENTRIES) return false;
    doc.items.push(item);
    return true;
  });
  return saved ? { ok: true, item } : { ok: false, errors: ['too-many-entries'] };
}

export async function removeVerification(id: string): Promise<boolean> {
  return save((doc) => {
    const next = doc.items.filter((i) => !(isObj(i) && i.id === id));
    if (next.length === doc.items.length) return false;
    doc.items = next;
    return true;
  });
}
