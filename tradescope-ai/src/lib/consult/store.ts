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
}

const file = () => path.join(settingsDir(), 'consult-requests.jsonl');

/** Short, readable reference the trader can quote (e.g. TS-7F3K9Q). */
function newId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `TS-${Array.from(randomBytes(6), (x) => alphabet[x % alphabet.length]).join('')}`;
}

export function appendRequest(input: Omit<ConsultRequest, 'id' | 'createdAt' | 'status'>): ConsultRequest {
  const record: ConsultRequest = { id: newId(), createdAt: new Date().toISOString(), status: 'new', ...input };
  mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
  const f = file();
  const created = !existsSync(f);
  appendFileSync(f, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  if (created) {
    try {
      chmodSync(f, 0o600);
    } catch {
      /* not supported on every filesystem */
    }
  }
  return record;
}

/** All requests, newest first. Lines that cannot be parsed are skipped. */
export function listRequests(): ConsultRequest[] {
  let raw = '';
  try {
    raw = readFileSync(file(), 'utf8');
  } catch {
    return [];
  }
  const out: ConsultRequest[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as ConsultRequest;
      if (r && typeof r.id === 'string') out.push(r);
    } catch {
      /* skip a damaged line */
    }
  }
  return out.reverse();
}

/** Sets a request's status; rewrites the file atomically. Returns false when the id is unknown. */
export function updateStatus(id: string, status: ConsultStatus): boolean {
  const all = listRequests().reverse();
  const hit = all.find((r) => r.id === id);
  if (!hit) return false;
  hit.status = status;
  const f = file();
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, all.map((r) => JSON.stringify(r)).join('\n') + '\n', { mode: 0o600 });
  renameSync(tmp, f);
  return true;
}
