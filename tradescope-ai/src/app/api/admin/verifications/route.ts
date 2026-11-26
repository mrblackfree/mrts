import { adminJson, authorizeAdmin } from '@/lib/admin/http';
import { readJsonLimited } from '@/lib/http';
import { storageState } from '@/lib/settings';
import { addVerification, listVerifications, removeVerification } from '@/lib/verifications/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const failure = (e: unknown) => {
  const m = (e as Error).message;
  if (m === 'doc-busy') return adminJson({ ok: false, error: 'busy' }, { status: 503 });
  return adminJson({ ok: false, error: m === 'verifications-corrupt' ? 'file-corrupt' : 'storage-error' }, { status: 500 });
};
function readOnly() {
  const st = storageState();
  return st.writable ? null : adminJson({ ok: false, error: 'read-only', reason: st.reason }, { status: 409 });
}

/** Verified values saved here, newest first. */
export async function GET(req: Request) {
  const denied = await authorizeAdmin(req, { mutating: false });
  if (denied) return denied;
  try {
    return adminJson({ ok: true, items: (await listVerifications()).slice().reverse(), writable: storageState().writable });
  } catch (e) {
    return failure(e);
  }
}

/** Save one verified value: body `{ entry }` in the verified-overrides.json format; applied right away. */
export async function POST(req: Request) {
  const denied = (await authorizeAdmin(req, { mutating: true })) ?? readOnly();
  if (denied) return denied;
  const parsed = await readJsonLimited(req, 8_000);
  if (!parsed.ok) return adminJson({ ok: false, error: parsed.error === 'too-large' ? 'too-large' : 'bad-request' }, { status: parsed.error === 'too-large' ? 413 : 400 });
  try {
    const r = await addVerification(parsed.body.entry);
    if (!r.ok) return adminJson({ ok: false, error: 'invalid', errors: r.errors }, { status: 400 });
    return adminJson({ ok: true, item: r.item });
  } catch (e) {
    return failure(e);
  }
}

/** Remove a saved verified value: `?id=v-…`. */
export async function DELETE(req: Request) {
  const denied = (await authorizeAdmin(req, { mutating: true })) ?? readOnly();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id') ?? '';
  try {
    const hit = await removeVerification(id);
    return hit ? adminJson({ ok: true }) : adminJson({ ok: false, error: 'not-found' }, { status: 404 });
  } catch (e) {
    return failure(e);
  }
}
