/** Minimal assertion helper: prints failures, sets a failing exit code, summarises at the end. */
let pass = 0;
let fail = 0;
export function ok(name: string, cond: unknown, extra?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL ${name}${extra === undefined ? '' : ` — ${JSON.stringify(extra).slice(0, 400)}`}`);
  }
}
export function done(label: string) {
  console.log(`  ${label}: ${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
}
