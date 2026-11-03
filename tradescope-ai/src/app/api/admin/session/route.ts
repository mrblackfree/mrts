import {
  adminAvailability,
  clearedCookie,
  clearLoginFailures,
  issueSession,
  loginBlocked,
  MAX_PASSWORD,
  passwordMatches,
  recordLoginFailure,
  sameOrigin,
  sessionCookie,
  sessionExpiry,
} from '@/lib/admin/auth';
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

// room for a MAX_PASSWORD-character password in multi-byte UTF-8 plus JSON escaping
const MAX_BODY_BYTES = MAX_PASSWORD * 8 + 256;

/** Reads the request body, giving up (null) once it exceeds `max` bytes — never buffers more than that. */
async function readBodyLimited(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get('content-length')) > max) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Sign in with ADMIN_PASSWORD. */
export async function POST(req: Request) {
  const availability = adminAvailability();
  if (!availability.enabled) return adminJson({ ok: false, error: 'admin-disabled', reason: availability.reason }, { status: 403 });
  if (!sameOrigin(req)) return adminJson({ ok: false, error: 'bad-origin' }, { status: 403 });
  const client = clientKey(req);
  // cheap early exit: a blocked client never gets its body read
  if (loginBlocked(client)) return adminJson({ ok: false, error: 'too-many-attempts' }, { status: 429 });

  // a body that cannot be read (e.g. the client aborted mid-upload) counts as an empty, failed sign-in, as before
  const raw = await readBodyLimited(req, MAX_BODY_BYTES).catch(() => '');
  if (raw === null) return adminJson({ ok: false, error: 'too-large' }, { status: 413 });
  let password = '';
  try {
    const body = JSON.parse(raw) as { password?: unknown };
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    /* empty or invalid body */
  }
  // checked again after the await: limit check, verification and failure record run with no await in between
  if (loginBlocked(client)) return adminJson({ ok: false, error: 'too-many-attempts' }, { status: 429 });
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
