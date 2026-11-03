import { adminJson, requireAdmin } from '@/lib/admin/http';
import { listRequests } from '@/lib/consult/store';
import { channelRows, hypothesisChecks, type RequestTally } from '@/lib/metrics/hypotheses';
import { metricsSummary } from '@/lib/metrics/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIODS = [7, 28, 90, 400];

/** Permits-step requests (checklist, service cards) created in the period, by what happened after the team got in
 * touch — the same population as H3's request rate. */
function tally(from: string): RequestTally | undefined {
  try {
    const rows = listRequests().filter((r) => r.createdAt.slice(0, 10) >= from && (r.source === 'checklist' || r.source === 'card'));
    return {
      handled: rows.filter((r) => r.status !== 'new').length,
      responded: rows.filter((r) => r.status === 'in-progress' || r.status === 'done').length,
    };
  } catch {
    return undefined; // unreadable store: the condition shows as unknown rather than as zero
  }
}

/** Validation metrics for the admin page: `?days=7|28|90|400` (default 28). */
export function GET(req: Request) {
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  const asked = Number(new URL(req.url).searchParams.get('days'));
  const days = PERIODS.includes(asked) ? asked : 28;
  const summary = metricsSummary(days);
  const requests = tally(summary.from);
  return adminJson({ ok: true, days, ...summary, requests: requests ?? null, checks: hypothesisChecks(summary.totals, requests), channels: channelRows(summary.totals) });
}
