/** Outbound calls to tracking APIs: bounded time and size, no redirects, never cached by Next. */
import { responseTextLimited } from '@/lib/http';

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2_000_000;

export class TrackApiError extends Error {
  constructor(
    readonly source: string,
    readonly status: number,
    message: string,
  ) {
    super(`${source}: ${message}`);
  }
}

export async function callApi(source: string, url: string, init: RequestInit = {}): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await responseTextLimited(res, MAX_BYTES);
  return { status: res.status, text };
}

export function parseJson<T>(source: string, text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TrackApiError(source, 0, 'invalid JSON');
  }
}

/** "Busan (KRPUS)" from whatever parts a source gives. */
export function place(name?: string | null, code?: string | null): string | undefined {
  const n = name?.trim();
  const c = code?.trim();
  if (n && c) return `${n} (${c})`;
  return n || c || undefined;
}

/** Small per-process cache so repeated lookups of one reference do not spend API calls. */
export function ttlCache<T>(ttlMs: number, maxEntries = 500) {
  const store = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value as string);
      store.set(key, { at: Date.now(), value });
    },
  };
}
