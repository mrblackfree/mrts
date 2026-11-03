import { OFFICIAL } from '@/data/official';
import { adminJson, requireAdmin } from '@/lib/admin/http';
import { publicAiStatus } from '@/lib/ai-adapter';
import { adminFields, settingsUpdatedAt, storageState, updateSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function platform(): 'vercel' | 'netlify' | 'docker-or-node' {
  if (process.env.VERCEL === '1') return 'vercel';
  if (process.env.NETLIFY === 'true') return 'netlify';
  return 'docker-or-node';
}

function snapshot() {
  return {
    fields: adminFields(),
    storage: storageState(),
    updatedAt: settingsUpdatedAt(),
    platform: platform(),
    adminSecretSet: !!process.env.ADMIN_SECRET?.trim(),
    ai: publicAiStatus(),
    officialData: {
      generatedAt: OFFICIAL.generatedAt ?? null,
      sources: Object.fromEntries(Object.entries(OFFICIAL.sources).map(([k, v]) => [k, v?.status ?? null])),
      activeOverrides: OFFICIAL.activeOverrideCount(),
    },
  };
}

/** Current settings (secrets masked) and system state. */
export function GET(req: Request) {
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  return adminJson({ ok: true, ...snapshot() });
}

/** Save settings: body `{ values: { KEY: "value" | null } }` — null clears a saved value. */
export async function PUT(req: Request) {
  const denied = requireAdmin(req, { mutating: true });
  if (denied) return denied;
  let values: unknown;
  try {
    values = ((await req.json()) as { values?: unknown })?.values;
  } catch {
    values = undefined;
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) return adminJson({ ok: false, error: 'bad-request' }, { status: 400 });
  const result = updateSettings(values as Record<string, unknown>);
  if (!result.ok) return adminJson({ ok: false, error: 'invalid', errors: result.errors, ...snapshot() }, { status: 400 });
  return adminJson({ ok: true, ...snapshot() });
}
