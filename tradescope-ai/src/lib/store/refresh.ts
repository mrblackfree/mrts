/**
 * An in-memory copy of a stored document (Redis), refreshed at most every `ttlMs`. Server-side only.
 *
 * - Concurrent callers share one read in flight, so the first requests after a cold start all wait for the same
 *   read instead of seeing nothing.
 * - Reads are numbered: a read never replaces the result of one that started after it, so a refresh that began
 *   before a save cannot restore the old values when it finishes late.
 * - `set` installs a value known to be current (the document a save just wrote), newer than any read in flight.
 */
export interface Refresher<T> {
  /** Waits for a current copy. `force` starts a new read even when the copy is fresh or a read is in flight. */
  refresh(force?: boolean): Promise<void>;
  set(value: T): void;
  reset(): void;
}

export function refresher<T>(opts: { read: () => Promise<T>; apply: (value: T) => void; onError?: (e: unknown) => void; ttlMs: number }): Refresher<T> {
  let started = 0; // number of the latest read (or set) started
  let applied = 0; // number of the latest read (or set) whose result is installed
  let freshAt = 0; // when the installed result's read started
  let inflight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    const n = ++started;
    const at = Date.now();
    try {
      const value = await opts.read();
      if (n <= applied) return; // something newer is installed already
      applied = n;
      freshAt = at;
      opts.apply(value);
    } catch (e) {
      if (n <= applied) return;
      applied = n;
      freshAt = at; // retry after the TTL, not on every request during an outage
      opts.onError?.(e);
    }
  };

  return {
    refresh(force = false) {
      if (!force && Date.now() - freshAt < opts.ttlMs) return Promise.resolve();
      if (!force && inflight) return inflight;
      const p: Promise<void> = run().finally(() => {
        if (inflight === p) inflight = null;
      });
      inflight = p;
      return p;
    },
    set(value) {
      applied = ++started;
      freshAt = Date.now();
      opts.apply(value);
    },
    reset() {
      started = 0;
      applied = 0;
      freshAt = 0;
      inflight = null;
    },
  };
}
