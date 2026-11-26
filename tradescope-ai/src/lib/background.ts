/**
 * Runs best-effort work (metric counts) without holding the response: after it is sent, via Next's `after()` —
 * which keeps a serverless function alive until the work settles — or right away when there is no request scope
 * (tests, scripts). Errors are swallowed: the work must never fail the request. Server-side only.
 */
import { after } from 'next/server';

/** work started outside a request scope that has not settled yet */
const pending = new Set<Promise<unknown>>();

export function inBackground(task: () => Promise<unknown>): void {
  const run = () => task().catch(() => undefined);
  try {
    after(run);
  } catch {
    const p = run();
    pending.add(p);
    void p.finally(() => pending.delete(p));
  }
}

/** For tests: waits until all work started outside a request scope has settled. */
export async function backgroundSettled(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}
