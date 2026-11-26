/**
 * Runs best-effort work (metric counts) without holding the response: after it is sent, via Next's `after()` —
 * which keeps a serverless function alive until the work settles — or right away when there is no request scope
 * (tests, scripts). Errors are swallowed: the work must never fail the request. Server-side only.
 */
import { after } from 'next/server';

export function inBackground(task: () => Promise<unknown>): void {
  const run = () => task().catch(() => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}
