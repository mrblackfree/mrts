import { adminJson, requireAdmin } from '@/lib/admin/http';
import { listRequests } from '@/lib/consult/store';
import { channelRows, hypothesisChecks, requestTally, type RequestTally } from '@/lib/metrics/hypotheses';
import { metricsSummary } from '@/lib/metrics/store';
import { prepareRequest } from '@/lib/store/prepare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIODS = [7, 28, 90, 400];

/** H3's response condition: permits-step requesters in the period, by what happened after contact. */
async function tally(from: string): Promise<RequestTally | undefined> {
  try {
    return requestTally(await listRequests(), from);
  } catch {
    return undefined; // unreadable store: the condition shows as unknown rather than as zero
  }
}

/** Validation metrics for the admin page: `?days=7|28|90|400` (default 28). */
export async function GET(req: Request)  {
  await prepareRequest();
  const denied = requireAdmin(req, { mutating: false });
  if (denied) return denied;
  const asked = Number(new URL(req.url).searchParams.get('days'));
  const days = PERIODS.includes(asked) ? asked : 28;
  let summary: Awaited<ReturnType<typeof metricsSummary>>;
  try {
    summary = await metricsSummary(days);
  } catch {
    return adminJson({ ok: false, error: 'storage-error' }, { status: 503 });
  }
  const requests = await tally(summary.from);
  return adminJson({ ok: true, days, ...summary, requests: requests ?? null, checks: hypothesisChecks(summary.totals, requests), channels: channelRows(summary.totals) });
}
