/* Link checks: "no answer from this network" never downgrades a link that answered recently. */
import { done, ok } from './assert';

const { CARRY_OVER_DAYS, mergeLinkResult } = await import('../scripts/link-state.mjs');

const now = Date.parse('2026-11-26T12:00:00Z');
const day = 86_400_000;
const at = (daysAgo: number) => new Date(now - daysAgo * day).toISOString();
const unreachable = { status: 0, state: 'unreachable', checkedAt: new Date(now).toISOString() };

const recentOk = { status: 200, state: 'ok', checkedAt: at(10) };
let r = mergeLinkResult(recentOk, unreachable, now);
ok('unreachable after a recent ok keeps the ok check, date and all', r.carried && r.result === recentOk);

const recentBroken = { status: 404, state: 'broken', checkedAt: at(3) };
r = mergeLinkResult(recentBroken, unreachable, now);
ok('unreachable after a recent 404 keeps the 404 (no answer says nothing new)', r.carried && r.result.state === 'broken');

const old = { status: 200, state: 'ok', checkedAt: at(CARRY_OVER_DAYS + 1) };
r = mergeLinkResult(old, unreachable, now);
ok(`after ${CARRY_OVER_DAYS} days the unreachable result is recorded`, !r.carried && r.result.state === 'unreachable');

r = mergeLinkResult({ status: 0, state: 'unreachable', checkedAt: at(1) }, unreachable, now);
ok('unreachable twice stays unreachable (with the new date)', !r.carried && r.result === unreachable);

r = mergeLinkResult(undefined, unreachable, now);
ok('a new link that is unreachable is recorded as such', !r.carried && r.result.state === 'unreachable');

const answered = { status: 503, state: 'unavailable', checkedAt: new Date(now).toISOString() };
r = mergeLinkResult(recentOk, answered, now);
ok('an answer always replaces the previous check', !r.carried && r.result === answered);

r = mergeLinkResult({ status: 200, state: 'ok', checkedAt: 'garbage' }, unreachable, now);
ok('a previous check without a usable date is not carried over', !r.carried && r.result.state === 'unreachable');

done('link state');
