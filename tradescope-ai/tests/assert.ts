/** Minimal assertion helper: prints failures, sets a failing exit code, summarises at the end. */
/** JSON when possible; functions, symbols, BigInt and circular values fall back to String(). */
function show(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

let pass = 0;
let fail = 0;
export function ok(name: string, cond: unknown, extra?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL ${name}${extra === undefined ? '' : ` — ${show(extra).slice(0, 400)}`}`);
  }
}
export function done(label: string) {
  console.log(`  ${label}: ${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
}
