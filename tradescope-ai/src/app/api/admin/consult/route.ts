import { getProduct } from '@/data/kr-ph-trade-db';
import { adminJson, requireAdmin } from '@/lib/admin/http';
import { CONSULT_STATUSES, listRequests, updateStatus, type ConsultStatus } from '@/lib/consult/store';
import { readJsonLimited } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Requests with the product's name, so the operator sees which trade a step-level topic belongs to. */
const withProduct = () =>
  listRequests().map((r) => {
    const product = r.productId ? getProduct(r.productId) : undefined;
    return product ? { ...r, productName: product.name, productEmoji: product.emoji } : r;
  });

/** Expert-service requests, newest first. */
export function GET(req: Request) {
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  return adminJson({ ok: true, requests: withProduct() });
}

/** Change a request's status: body `{ id, status }`. */
export async function PATCH(req: Request) {
  const denied = requireAdmin(req, { mutating: true });
  if (denied) return denied;
  const parsed = await readJsonLimited(req, 2_000);
  if (!parsed.ok) return adminJson({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  const body = parsed.body;
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' && (CONSULT_STATUSES as string[]).includes(body.status) ? (body.status as ConsultStatus) : null;
  if (!id || !status) return adminJson({ ok: false, error: 'bad-request' }, { status: 400 });
  try {
    if (!updateStatus(id, status)) return adminJson({ ok: false, error: 'not-found' }, { status: 404 });
  } catch {
    return adminJson({ ok: false, error: 'storage-error' }, { status: 500 });
  }
  return adminJson({ ok: true, requests: withProduct() });
}
