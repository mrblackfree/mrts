/**
 * Settings file shared by the server (admin page) and `scripts/sync-official-data.mjs`.
 *
 * File: <data dir>/settings.json, mode 0600
 *   { "format": 1, "salt": "<base64>", "updatedAt": "<iso>", "values": { "KEY": { "v": "plain" } | { "enc": "<base64 iv|tag|ciphertext>" } } }
 *
 * Secret values are encrypted with AES-256-GCM. The key is derived (scrypt) from ADMIN_SECRET, or from ADMIN_PASSWORD
 * when ADMIN_SECRET is not set — so the file is useless without the server's environment. Changing that secret
 * makes stored secrets unreadable; they are then reported as such and must be re-entered.
 *
 * Plain ESM so the Node sync script can use it without a build step; types are in core.d.mts.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const FORMAT = 1;

/**
 * TRADESCOPE_DATA_DIR, else `<project>/.data`. The Next.js standalone server chdirs into `.next/standalone`,
 * which every build replaces, so that case resolves back to the project folder.
 */
export function settingsDir() {
  const fromEnv = process.env.TRADESCOPE_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  const cwd = process.cwd();
  const base = /[\\/]\.next[\\/]standalone$/.test(cwd) ? path.resolve(cwd, '..', '..') : cwd;
  return path.join(base, '.data');
}

export function settingsFile() {
  return path.join(settingsDir(), 'settings.json');
}

export const MIN_ADMIN_SECRET = 32;

/**
 * The secret that protects stored values (and admin sessions); null when the admin is not configured.
 * An ADMIN_SECRET shorter than MIN_ADMIN_SECRET is rejected outright (no fallback to the password), so a weak value
 * can never protect anything — the admin page reports it instead.
 */
export function masterSecret() {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (secret) return secret.length >= MIN_ADMIN_SECRET ? secret : null;
  return process.env.ADMIN_PASSWORD?.trim() || null;
}

const keyCache = new Map();
function deriveKey(secret, saltB64) {
  const id = `${saltB64}:${secret}`;
  let key = keyCache.get(id);
  if (!key) {
    key = scryptSync(secret, Buffer.from(saltB64, 'base64'), 32, { N: 16384, r: 8, p: 1 });
    keyCache.clear(); // only the current secret/salt pair is ever needed
    keyCache.set(id, key);
  }
  return key;
}

function encrypt(plain, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

function decrypt(b64, key) {
  const buf = Buffer.from(b64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

/** File modification time (ms) or 0 when there is no file — used for cheap cache invalidation. */
export function settingsMtime() {
  try {
    return statSync(settingsFile()).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Reads the settings document. A missing file is `{ doc: null }`; anything else that prevents reading it
 * (permissions, invalid JSON, unknown format) is reported as `problem`, so callers never mistake it for "empty".
 */
function loadDoc() {
  let raw;
  try {
    raw = readFileSync(settingsFile(), 'utf8');
  } catch (e) {
    return e && e.code === 'ENOENT' ? { doc: null } : { doc: null, problem: 'file-unreadable' };
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return { doc: null, problem: 'file-corrupt' };
  }
  const plainObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  if (!plainObject(doc) || doc.format !== FORMAT || typeof doc.salt !== 'string' || (doc.values !== undefined && !plainObject(doc.values))) {
    return { doc: null, problem: 'file-corrupt' };
  }
  return { doc };
}

/** Why the settings file cannot be used, or null when it is fine or simply does not exist yet. */
export function settingsFileProblem() {
  return loadDoc().problem ?? null;
}

/**
 * Decrypted values. Secrets that cannot be decrypted (secret changed, file tampered) are listed in `unreadable`
 * instead of throwing; a file that cannot be read at all yields no values and a `problem`.
 */
export function readSettings() {
  const { doc, problem = null } = loadDoc();
  const values = {};
  const unreadable = [];
  if (!doc) return { values, unreadable, updatedAt: null, problem };
  const secret = masterSecret();
  for (const [k, entry] of Object.entries(doc.values ?? {})) {
    if (entry && typeof entry.v === 'string') values[k] = entry.v;
    else if (entry && typeof entry.enc === 'string') {
      try {
        if (!secret) throw new Error('no secret');
        values[k] = decrypt(entry.enc, deriveKey(secret, doc.salt));
      } catch {
        unreadable.push(k);
      }
    }
  }
  return { values, unreadable, updatedAt: doc.updatedAt ?? null, problem };
}

/**
 * Applies a patch (`null` removes a key) and writes the file atomically with mode 0600.
 * `secretKeys` lists the keys that must be stored encrypted. Throws `admin-not-configured`, `file-unreadable` or
 * `file-corrupt` without touching the file.
 */
export function writeSettings(patch, secretKeys) {
  const secret = masterSecret();
  if (!secret) throw new Error('admin-not-configured');
  const { doc: prev, problem } = loadDoc();
  // never overwrite a file we could not read: that would drop every saved value and rotate the salt
  if (problem) throw new Error(problem);
  const salt = prev?.salt ?? randomBytes(16).toString('base64');
  const key = deriveKey(secret, salt);
  const values = { ...(prev?.values ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') delete values[k];
    else values[k] = secretKeys.includes(k) ? { enc: encrypt(String(v), key) } : { v: String(v) };
  }
  const dir = settingsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = settingsFile();
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ format: FORMAT, salt, updatedAt: new Date().toISOString(), values }, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    /* not supported on every filesystem */
  }
}
