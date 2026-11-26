/**
 * Expert-service requests ("전문가에게 맡기기"), read only through the admin page. Server-side only.
 *
 * Stored next to the admin settings as JSON lines (consult-requests.jsonl, mode 0600) or — when Redis is configured
 * (lib/store/kv), as on Vercel — in one Redis hash "consult-requests" (field = request id, value = the record).
 */
import type { ExpertSource } from '@/lib/metrics/events';
import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settingsDir } from '@/lib/settings/core.mjs';
import { docBackend } from '@/lib/store/docs';
import { kv, kvKey, kvPairs } from '@/lib/store/kv';

export type ConsultStatus = 'new' | 'contacted' | 'in-progress' | 'done' | 'closed';
export const CONSULT_STATUSES: ConsultStatus[] = ['new', 'contacted', 'in-progress', 'done', 'closed'];

export interface ConsultRequest {
  id: string;
  createdAt: string;
  status: ConsultStatus;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** product in the knowledge base, when the request came from a report */
  productId?: string;
  /** what the trader typed or the requirement the request came from */
  topic: string;
  serviceIds: string[];
  message: string;
  lang: 'ko' | 'en';
  /** where the request was started on the site (checklist, card, unsupported, customs) */
  source?: ExpertSource;
  /** acquisition channel of the visit (?utm_source= / ?ref=) */
  channel?: string;
}

const file = () => path.join(settingsDir(), 'consult-requests.jsonl');
const HASH = 'consult-requests';

/** Readable reference the trader can quote (e.g. TS-7F3K9QW2): 8 of 32 symbols, 40 random bits. */
export function newRequestId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols: 256 % 32 === 0, so no modulo bias
  return `TS-${Array.from(randomBytes(8), (x) => alphabet[x % alphabet.length]).join('')}`;
}

/** The file's text; '' only when it does not exist yet. Any other read error is thrown (callers answer 5xx). */
function readRaw(): string {
  try {
    return readFileSync(file(), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw e;
  }
}

type NewRequest = Omit<ConsultRequest, 'id' | 'createdAt' | 'status'>;

/**
 * A write that failed or whose answer was lost. `record` is the request as it was being written — it may have been
 * stored after all — so a fallback delivery (webhook) carries the same id and the two can be matched.
 */
export class RequestNotStoredError extends Error {
  constructor(readonly record: ConsultRequest) {
    super('request-not-stored');
  }
}

/** Stores a new request and returns it with its id. Throws when it could not be stored. */
export async function appendRequest(input: NewRequest): Promise<ConsultRequest> {
  if (docBackend() !== 'kv') return appendToFile(input);
  // HSETNX never replaces an existing request; a taken id (1 in 2^40) just draws another
  for (let i = 0; i < 5; i++) {
    const record: ConsultRequest = { id: newRequestId(), createdAt: new Date().toISOString(), status: 'new', ...input };
    let set: unknown;
    try {
      set = await kv(['HSETNX', kvKey(HASH), record.id, JSON.stringify(record)]);
    } catch {
      throw new RequestNotStoredError(record);
    }
    if (Number(set) === 1) return record;
  }
  throw new Error('request-id-taken');
}

// a local file write has no lost answer: it either fails (nothing readable stored) or succeeds
function appendToFile(input: NewRequest): ConsultRequest {
  mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
  const f = file();
  const created = !existsSync(f);
  const raw = created ? '' : readRaw();
  const taken = new Set(parseLines(raw).map((r) => r.id));
  let id = newRequestId();
  for (let i = 0; i < 5 && taken.has(id); i++) id = newRequestId();
  const record: ConsultRequest = { id, createdAt: new Date().toISOString(), status: 'new', ...input };
  // an interrupted earlier append can leave a partial last line: start a fresh one so this record stays readable
  const lead = raw && !raw.endsWith('\n') ? '\n' : '';
  appendFileSync(f, `${lead}${JSON.stringify(record)}\n`, { mode: 0o600 });
  if (created) {
    try {
      chmodSync(f, 0o600);
    } catch {
      /* not supported on every filesystem */
    }
  }
  return record;
}

function parseLine(line: string): ConsultRequest | null {
  if (!line.trim()) return null;
  try {
    const r = JSON.parse(line) as ConsultRequest;
    return r && typeof r === 'object' && !Array.isArray(r) && typeof r.id === 'string' ? r : null;
  } catch {
    return null;
  }
}
const parseLines = (raw: string) => raw.split('\n').map(parseLine).filter((r): r is ConsultRequest => r !== null);

/** All requests, newest first. Records that cannot be parsed are skipped (and kept where they are). */
export async function listRequests(): Promise<ConsultRequest[]> {
  if (docBackend() !== 'kv') return parseLines(readRaw()).reverse();
  const all = Object.values(kvPairs(await kv(['HGETALL', kvKey(HASH)])))
    .map(parseLine)
    .filter((r): r is ConsultRequest => r !== null);
  // hash fields have no order: newest first by creation time
  return all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id.localeCompare(a.id));
}

/**
 * Sets a request's status. Only the matching record changes — damaged or unknown records are kept as they are, so a
 * status change never deletes anything. Returns false when the id is unknown.
 */
export async function updateStatus(id: string, status: ConsultStatus): Promise<boolean> {
  if (docBackend() !== 'kv') return updateStatusInFile(id, status);
  const key = kvKey(HASH);
  const current = parseLine(String((await kv(['HGET', key, id])) ?? ''));
  if (!current || current.id !== id) return false;
  // a read then a write: only the status ever changes and records are never deleted, so two changes racing end
  // exactly as if they had run one after the other
  await kv(['HSET', key, id, JSON.stringify({ ...current, status })]);
  return true;
}

/** Rewrites the file atomically with one line changed. */
function updateStatusInFile(id: string, status: ConsultStatus): boolean {
  const lines = readRaw().split('\n');
  let hit = false;
  const next = lines.map((line) => {
    if (hit) return line;
    const r = parseLine(line);
    if (!r || r.id !== id) return line;
    hit = true;
    return JSON.stringify({ ...r, status });
  });
  if (!hit) return false;
  const f = file();
  const tmp = `${f}.${process.pid}.tmp`;
  const text = next.join('\n');
  writeFileSync(tmp, text.endsWith('\n') ? text : `${text}\n`, { mode: 0o600 });
  renameSync(tmp, f);
  return true;
}
