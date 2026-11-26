/**
 * Link-check results across syncs.
 *
 * "unreachable" means the checker's own network got no answer at all (DNS, TCP or TLS failure, timeout). That
 * depends on where the check runs — GitHub's US runners cannot reach several Korean government sites that answer
 * fine elsewhere — so it is no evidence that a link broke. A link that answered on an earlier check keeps that
 * result (and its date) while it stays unreachable, for up to CARRY_OVER_DAYS; after that the "unreachable" result
 * is recorded, so a site that is really gone still shows up.
 */
export const CARRY_OVER_DAYS = 60;

/**
 * The result to record for one link: `next` unless it is "unreachable" and `prev` is a recent answered check.
 * Returns `{ result, carried }`.
 */
export function mergeLinkResult(prev, next, nowMs = Date.now()) {
  if (next?.state !== 'unreachable' || !prev || prev.state === 'unreachable') return { result: next, carried: false };
  const at = Date.parse(prev.checkedAt ?? '');
  if (!Number.isFinite(at) || nowMs - at > CARRY_OVER_DAYS * 86_400_000) return { result: next, carried: false };
  return { result: prev, carried: true };
}
