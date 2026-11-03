/**
 * Tracking sources, tried in order until one answers. Each is enabled by its key on /admin (or the environment);
 * with none configured for the mode the built-in example timeline is returned, flagged `demo`.
 */
import type { TradeProduct } from '@/lib/types';
import { demoTrack } from './demo';
import { PROVIDERS } from './providers';
import type { TrackQuery, TrackResult } from './types';

export type TrackMode = 'shipping' | 'customs';

export interface TrackOutcome {
  result?: TrackResult;
  /** providers that were asked, in order (names only) */
  tried: string[];
  /** not-covered: sources are configured, but none handles this kind of reference or carrier */
  error?: 'not-found' | 'failed' | 'not-covered';
}

/** Names of the configured sources (for the admin page and health checks). */
export const configuredProviders = (mode?: TrackMode) => PROVIDERS.filter((p) => p.enabled() && (!mode || p.modes.includes(mode))).map((p) => p.name);

export async function trackShipment(q: TrackQuery, opts: { mode: TrackMode; product?: TradeProduct }): Promise<TrackOutcome> {
  const configured = PROVIDERS.filter((p) => p.enabled() && p.modes.includes(opts.mode));
  // the example is only shown when nothing real is set up — never in place of a live source that missed
  if (!configured.length) return { result: demoTrack(q, opts.product), tried: [] };
  const providers = configured.filter((p) => p.kinds.includes(q.kind) && (!p.accepts || p.accepts(q)));
  if (!providers.length) return { tried: [], error: 'not-covered' };
  const tried: string[] = [];
  let sawError = false;
  for (const p of providers) {
    tried.push(p.name);
    try {
      const r = await p.track(q);
      if (r && (r.events.length || r.pending)) return { result: r, tried };
    } catch (e) {
      sawError = true;
      console.warn('[track]', p.name, e instanceof Error ? e.message : e);
    }
  }
  return { tried, error: sawError ? 'failed' : 'not-found' };
}
