import { NextResponse } from 'next/server';
import { prepareRequest } from '@/lib/store/prepare';
import { sameOrigin, sessionExpiry, signedSession } from './auth';

/** Admin responses are never cached or indexed. */
export function adminJson(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...init.headers },
  });
}

/**
 * Guard for admin API handlers: a valid session, and for state-changing methods a same-origin request.
 * Returns a response to send when the request is not allowed, otherwise null.
 */
export function requireAdmin(req: Request, { mutating }: { mutating: boolean }): Response | null {
  if (sessionExpiry(req) === null) return adminJson({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (mutating && !sameOrigin(req)) return adminJson({ ok: false, error: 'bad-origin' }, { status: 403 });
  return null;
}

/**
 * requireAdmin for route handlers, with the stored documents refreshed in between: a request without a validly
 * signed session cookie (or, for changes, from another origin) is turned away before any storage is read.
 */
export async function authorizeAdmin(req: Request, opts: { mutating: boolean }): Promise<Response | null> {
  if (!signedSession(req)) return adminJson({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (opts.mutating && !sameOrigin(req)) return adminJson({ ok: false, error: 'bad-origin' }, { status: 403 });
  await prepareRequest();
  return requireAdmin(req, opts);
}
