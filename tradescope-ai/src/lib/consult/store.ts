/**
 * Expert-service requests ("전문가에게 맡기기"), stored next to the admin settings as JSON lines (mode 0600) and
 * read only through the admin page. Server-side only.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settingsDir } from '@/lib/settings/core.mjs';

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
  source?: string;
  /** acquisition channel of the visit (?utm_source= / ?ref=) */
  channel?: string;
}

const file = () => path.join(settingsDir(), 'consult-requests.jsonl');

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

export function appendRequest(input: Omit<ConsultRequest, 'id' | 'createdAt' | 'status'>): ConsultRequest {
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
    return r && typeof r === 'object' && typeof r.id === 'string' ? r : null;
  } catch {
    return null;
  }
}
const parseLines = (raw: string) => raw.split('\n').map(parseLine).filter((r): r is ConsultRequest => r !== null);

/** All requests, newest first. Lines that cannot be parsed are skipped (and kept in the file). */
export function listRequests(): ConsultRequest[] {
  return parseLines(readRaw()).reverse();
}

/**
 * Sets a request's status; rewrites the file atomically. Only the matching line changes — damaged or unknown
 * lines are kept byte for byte, so a status change never deletes anything. Returns false when the id is unknown.
 */
export function updateStatus(id: string, status: ConsultStatus): boolean {
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
