import { adminJson, requireAdmin } from '@/lib/admin/http';
import { readJsonLimited } from '@/lib/http';
import { addFirm, listPartners, removeFirm, updateDeal, validateFirm, type DealPatch } from '@/lib/partners/store';
import { storageState } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const failure = (e: unknown) =>
  (e as Error).message === 'partners-busy'
    ? adminJson({ ok: false, error: 'busy' }, { status: 503 })
    : adminJson({ ok: false, error: (e as Error).message === 'partners-file-corrupt' ? 'file-corrupt' : 'storage-error' }, { status: 500 });

function readOnly() {
  const st = storageState();
  return st.writable ? null : adminJson({ ok: false, error: 'read-only', reason: st.reason }, { status: 409 });
}

/** Candidate and contracted law / customs firms per country, with their pipeline records. */
export function GET(req: Request) {
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  try {
    return adminJson({ ok: true, partners: listPartners(), writable: storageState().writable });
  } catch (e) {
    return failure(e);
  }
}

/** Update a firm's pipeline record: body `{ id, deal: { status?, contactName?, contactEmail?, terms?, contractDate?, notes? } }`. */
export async function PATCH(req: Request) {
  const denied = requireAdmin(req, { mutating: true }) ?? readOnly();
  if (denied) return denied;
  const parsed = await readJsonLimited(req, 8_000);
  if (!parsed.ok) return adminJson({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  const deal = parsed.body.deal;
  if (!id || !deal || typeof deal !== 'object' || Array.isArray(deal)) return adminJson({ ok: false, error: 'bad-request' }, { status: 400 });
  try {
    const next = updateDeal(id, deal as DealPatch);
    return next ? adminJson({ ok: true, deal: next }) : adminJson({ ok: false, error: 'not-found' }, { status: 404 });
  } catch (e) {
    return failure(e);
  }
}

/** Add a firm by hand: body `{ firm: { country, type, name, nameLocal?, city?, website?, practice?, why? } }`. */
export async function POST(req: Request) {
  const denied = requireAdmin(req, { mutating: true }) ?? readOnly();
  if (denied) return denied;
  const parsed = await readJsonLimited(req, 8_000);
  if (!parsed.ok) return adminJson({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  const v = validateFirm(parsed.body.firm);
  if (!v.ok) return adminJson({ ok: false, error: 'invalid', errors: v.errors }, { status: 400 });
  try {
    return adminJson({ ok: true, firm: addFirm(v.firm) });
  } catch (e) {
    return failure(e);
  }
}

/** Remove a firm added by hand: `?id=c-…` (researched candidates are set to "dropped" instead). */
export function DELETE(req: Request) {
  const denied = requireAdmin(req, { mutating: true }) ?? readOnly();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id') ?? '';
  try {
    return removeFirm(id) ? adminJson({ ok: true }) : adminJson({ ok: false, error: 'not-found' }, { status: 404 });
  } catch (e) {
    return failure(e);
  }
}
