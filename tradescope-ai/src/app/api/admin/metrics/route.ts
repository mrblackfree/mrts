import { adminJson, requireAdmin } from '@/lib/admin/http';
import { listRequests } from '@/lib/consult/store';
import { channelRows, hypothesisChecks, requestTally, type RequestTally } from '@/lib/metrics/hypotheses';
import { metricsSummary } from '@/lib/metrics/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIODS = [7, 28, 90, 400];

/** H3's response condition: permits-step requesters in the period, by what happened after contact. */
function tally(from: string): RequestTally | undefined {
  try {
    return requestTally(listRequests(), from);
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
