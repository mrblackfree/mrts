/**
 * Call at the start of every API route: refreshes the stored admin documents (settings, verified values) when
 * they live in Redis, so synchronous readers such as getSetting() see the current values. A no-op cost for the
 * data folder, which is read directly.
 */
import { loadSettings } from '@/lib/settings';
import { loadVerifications } from '@/lib/verifications/store';

export async function prepareRequest(): Promise<void> {
  await Promise.all([loadSettings(), loadVerifications()]);
}
