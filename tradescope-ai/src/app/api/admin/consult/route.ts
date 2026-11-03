import { adminJson, requireAdmin } from '@/lib/admin/http';
import { CONSULT_STATUSES, listRequests, updateStatus, type ConsultStatus } from '@/lib/consult/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Expert-service requests, newest first. */
export function GET(req: Request) {
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  return adminJson({ ok: true, requests: listRequests() });
}

/** Change a request's status: body `{ id, status }`. */
export async function PATCH(req: Request) {
  const denied = requireAdmin(req, { mutating: true });
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty */
  }
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' && (CONSULT_STATUSES as string[]).includes(body.status) ? (body.status as ConsultStatus) : null;
  if (!id || !status) return adminJson({ ok: false, error: 'bad-request' }, { status: 400 });
  try {
    if (!updateStatus(id, status)) return adminJson({ ok: false, error: 'not-found' }, { status: 404 });
  } catch {
    return adminJson({ ok: false, error: 'storage-error' }, { status: 500 });
  }
  return adminJson({ ok: true, requests: listRequests() });
}
