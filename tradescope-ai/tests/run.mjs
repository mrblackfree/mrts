// Runs every tests/*.test.ts in its own Node process (so environment variables set by one test cannot leak into
// another), with the `@/` alias resolved through jiti. Exits non-zero when any file fails.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = readdirSync(here)
  .filter((f) => f.endsWith('.test.ts') && (!only || f.includes(only)))
  .sort();
let failed = 0;
for (const f of files) {
  // each file gets an empty data directory: tests never read or write the real .data/settings.json
  const dataDir = mkdtempSync(path.join(tmpdir(), 'ts-test-'));
  const r = spawnSync(process.execPath, [path.join(here, 'load.mjs'), path.join(here, f)], {
    stdio: 'inherit',
    env: { ...process.env, TRADESCOPE_DATA_DIR: dataDir, ADMIN_PASSWORD: '', ADMIN_SECRET: '', NODE_ENV: 'test' },
  });
  rmSync(dataDir, { recursive: true, force: true });
  if (r.status !== 0) {
    failed++;
    console.error(`✗ ${f}`);
  } else console.log(`✓ ${f}`);
}
console.log(`${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
