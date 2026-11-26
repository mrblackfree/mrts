/**
 * Small JSON documents the admin edits (settings, partner pipeline, verified values…), stored either in the data
 * folder or — when Redis is configured (see ./kv) — in Redis, so they survive on serverless hosting.
 *
 * `updateDoc` is a read-change-write that never loses a concurrent change: under a lock file on disk, as a
 * compare-and-set loop in Redis. Server-side only.
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withFileLock } from '@/lib/file-lock';
import { settingsDir } from '@/lib/settings/core.mjs';
import { kvCompareAndSet, kvConfig, kvGet } from './kv';

export type DocBackend = 'kv' | 'file';
export const docBackend = (): DocBackend => (kvConfig() ? 'kv' : 'file');

const filePath = (name: string) => path.join(settingsDir(), `${name}.json`);

function readFileDoc(name: string): string | null {
  try {
    return readFileSync(filePath(name), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

function writeFileDoc(name: string, text: string): void {
  mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
  const f = filePath(name);
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, text, { mode: 0o600 });
  renameSync(tmp, f);
  try {
    chmodSync(f, 0o600);
  } catch {
    /* not supported on every filesystem */
  }
}

/** The stored text, or null when nothing is stored yet. Read errors throw. */
export async function readDoc(name: string): Promise<string | null> {
  return docBackend() === 'kv' ? kvGet(name) : readFileDoc(name);
}

export class DocBusyError extends Error {
  constructor() {
    super('doc-busy');
  }
}

/**
 * Applies `change` to the stored text and writes the result. `change` returns the new text, or null to write
 * nothing; it may throw to abort (nothing is written). Returns what was written (or null).
 */
export async function updateDoc(name: string, change: (current: string | null) => string | null): Promise<string | null> {
  if (docBackend() === 'kv') {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await kvGet(name);
      const next = change(current);
      if (next === null) return null;
      if (await kvCompareAndSet(name, current, next)) return next;
    }
    throw new DocBusyError();
  }
  let written: string | null = null;
  const locked = withFileLock(`${filePath(name)}.lock`, () => {
    const next = change(readFileDoc(name));
    if (next !== null) writeFileDoc(name, next);
    written = next;
  });
  if (!locked) throw new DocBusyError();
  return written;
}
