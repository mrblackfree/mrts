import { adminAvailability, clearedCookie, clearLoginFailures, issueSession, loginBlocked, passwordMatches, recordLoginFailure, sameOrigin, sessionCookie, sessionExpiry } from '@/lib/admin/auth';
import { adminJson } from '@/lib/admin/http';
import { clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Session state for the admin page: whether the admin is enabled and whether this browser is signed in. */
export function GET(req: Request) {
  const availability = adminAvailability();
  const expiresAt = sessionExpiry(req);
  return adminJson({ ...availability, authenticated: expiresAt !== null, expiresAt });
}

/** Sign in with ADMIN_PASSWORD. */
export async function POST(req: Request) {
  const availability = adminAvailability();
  if (!availability.enabled) return adminJson({ ok: false, error: 'admin-disabled', reason: availability.reason }, { status: 403 });
  if (!sameOrigin(req)) return adminJson({ ok: false, error: 'bad-origin' }, { status: 403 });
  const client = clientKey(req);
  if (loginBlocked(client)) return adminJson({ ok: false, error: 'too-many-attempts' }, { status: 429 });

  let password = '';
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body?.password === 'string' ? body.password.slice(0, 512) : '';
  } catch {
    /* empty body */
  }
  if (!passwordMatches(password)) {
    recordLoginFailure(client);
    return adminJson({ ok: false, error: 'wrong-password' }, { status: 401 });
  }
  clearLoginFailures(client);
  const session = issueSession();
  return adminJson({ ok: true, expiresAt: session.expiresAt }, { headers: { 'Set-Cookie': sessionCookie(req, session.token, session.maxAge) } });
}

/** Sign out. */
export function DELETE(req: Request) {
  if (!sameOrigin(req)) return adminJson({ ok: false, error: 'bad-origin' }, { status: 403 });
  return adminJson({ ok: true }, { headers: { 'Set-Cookie': clearedCookie(req) } });
}
