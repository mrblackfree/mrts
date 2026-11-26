/**
 * Call at the start of an API route that reads settings, verified values or admin sessions: refreshes those
 * stored documents when they live in Redis, so synchronous readers such as getSetting() and isRevoked() see the
 * current values. A no-op cost for the data folder, which is read directly.
 *
 * Bounded: a request waits at most PREPARE_BUDGET_MS. When Redis is slow or down the request goes on with the last
 * copies (the reads finish in the background), so health checks and the local fallbacks never hang on storage.
 * Admin sessions fail closed on their own when their copy gets too old (see lib/admin/revocation).
 */
import { loadRevocations } from '@/lib/admin/revocation';
import { loadSettings } from '@/lib/settings';
import { loadVerifications } from '@/lib/verifications/store';

export type StoredDoc = 'settings' | 'verifications' | 'sessions';
const ALL: StoredDoc[] = ['settings', 'verifications', 'sessions'];
export const PREPARE_BUDGET_MS = 1500;

export async function prepareRequest(needs: StoredDoc[] = ALL): Promise<void> {
  if (!needs.length) return;
  const loads = needs.map((n) => (n === 'settings' ? loadSettings() : n === 'verifications' ? loadVerifications() : loadRevocations()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([Promise.all(loads), new Promise<void>((resolve) => (timer = setTimeout(resolve, PREPARE_BUDGET_MS)))]);
  clearTimeout(timer);
}
