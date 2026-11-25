// Helper of admin-session.test.ts (not a test by itself): one of several processes signing sessions out at the same
// moment on one data folder. argv: worker id, count, start time (unix ms).
export {};

const [id, count, startAt] = process.argv.slice(3);
const revocation = await import('@/lib/admin/revocation');
const exp = Math.floor(Date.now() / 1000) + 3600;
// start together, sleeping until then
await new Promise((r) => setTimeout(r, Math.max(0, Number(startAt) - Date.now())));
const where = new Set<string>();
for (let i = 0; i < Number(count); i++) where.add(revocation.revokeSession(`w${id}-${i}`, exp));
process.stdout.write(JSON.stringify([...where]));
