/**
 * Server-side settings: environment variable → admin-saved value → default (see ./schema).
 * Never import this from client components — it reads the settings file with Node APIs.
 */
import { accessSync, constants, mkdirSync } from 'node:fs';
import { masterSecret, readSettings, settingsDir, settingsFile, settingsFileProblem, settingsMtime, writeSettings } from './core.mjs';
import { SECRET_KEYS, SETTING_INDEX, SETTINGS, validateSetting, type SettingDef } from './schema';

type Stored = { values: Record<string, string>; unreadable: string[]; updatedAt: string | null };

let cache: (Stored & { mtime: number; checkedAt: number }) | null = null;

/** Saved values, re-read when the file changes (checked at most once per second). */
function stored(): Stored {
  const now = Date.now();
  if (cache && now - cache.checkedAt < 1000) return cache;
  const mtime = settingsMtime();
  if (!cache || cache.mtime !== mtime) cache = { ...readSettings(), mtime, checkedAt: now };
  else cache.checkedAt = now;
  return cache;
}

function envValue(def: SettingDef): { name: string; value: string } | undefined {
  for (const name of def.env) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return undefined;
}

/** Effective value of a setting (undefined when unset and without default). */
export function getSetting(key: string): string | undefined {
  const def = SETTING_INDEX[key];
  if (!def) return process.env[key]?.trim() || undefined;
  const env = envValue(def);
  if (env) return env.value;
  const saved = stored().values[key];
  if (saved !== undefined && saved !== '') return saved;
  return def.default;
}

export type StorageState =
  | { writable: true; path: string }
  | {
      writable: false;
      path: string;
      reason: 'vercel' | 'netlify' | 'readonly-env' | 'no-secret' | 'fs-error' | 'file-unreadable' | 'file-corrupt';
      detail?: string;
    };

/** Whether the admin page can persist values here. Serverless filesystems are not persistent. */
export function storageState(): StorageState {
  const path = settingsFile();
  if (process.env.SETTINGS_READONLY === '1' || process.env.SETTINGS_READONLY === 'true') return { writable: false, path, reason: 'readonly-env' };
  if (process.env.VERCEL === '1') return { writable: false, path, reason: 'vercel' };
  if (process.env.NETLIFY === 'true') return { writable: false, path, reason: 'netlify' };
  if (!masterSecret()) return { writable: false, path, reason: 'no-secret' };
  try {
    mkdirSync(settingsDir(), { recursive: true, mode: 0o700 });
    accessSync(settingsDir(), constants.W_OK);
  } catch (e) {
    return { writable: false, path, reason: 'fs-error', detail: (e as NodeJS.ErrnoException).code ?? 'error' };
  }
  // an existing file we cannot parse is never overwritten — saving would lose every stored value
  const problem = settingsFileProblem();
  if (problem) return { writable: false, path, reason: problem };
  return { writable: true, path };
}

const mask = (v: string) => (v.length >= 12 ? `••••${v.slice(-4)}` : '••••');

export interface AdminField {
  key: string;
  source: 'env' | 'admin' | 'default' | 'unset';
  envName?: string;
  /** effective value for non-secret settings */
  value?: string;
  /** masked effective value for secrets (never the value itself) */
  masked?: string;
  /** a saved secret exists but cannot be decrypted with the current ADMIN_SECRET / ADMIN_PASSWORD */
  unreadable?: boolean;
}

/** Field states for the admin page. Secrets are only ever returned masked. */
export function adminFields(): AdminField[] {
  const s = stored();
  return SETTINGS.map((def) => {
    const env = envValue(def);
    const saved = s.values[def.key];
    const secret = def.type === 'secret';
    const field: AdminField = { key: def.key, source: 'unset' };
    if (env) Object.assign(field, { source: 'env', envName: env.name }, secret ? { masked: mask(env.value) } : { value: env.value });
    else if (saved) Object.assign(field, { source: 'admin' }, secret ? { masked: mask(saved) } : { value: saved });
    else if (def.default !== undefined) Object.assign(field, { source: 'default', value: def.default });
    if (s.unreadable.includes(def.key)) field.unreadable = true;
    return field;
  });
}

export function settingsUpdatedAt(): string | null {
  return stored().updatedAt;
}

/**
 * Saves a patch from the admin page: `null` or '' clears a saved value. Settings provided by an environment
 * variable are locked and rejected. Returns per-key errors; nothing is written when any key is invalid.
 */
export function updateSettings(patch: Record<string, unknown>): { ok: true } | { ok: false; errors: Record<string, string> } {
  // null prototype: a `__proto__` key from the request must land in `errors`, not change the object's prototype
  const errors: Record<string, string> = Object.create(null);
  const clean: Record<string, string | null> = Object.create(null);
  for (const [key, raw] of Object.entries(patch)) {
    const def = SETTING_INDEX[key];
    if (!def) {
      errors[key] = 'unknown-setting';
      continue;
    }
    if (envValue(def)) {
      errors[key] = 'locked-by-env';
      continue;
    }
    if (raw === null || raw === '') {
      clean[key] = null;
      continue;
    }
    if (typeof raw !== 'string') {
      errors[key] = 'not-a-string';
      continue;
    }
    const r = validateSetting(def, raw);
    if (!r.ok) errors[key] = r.error;
    else clean[key] = r.value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const st = storageState();
  if (!st.writable) return { ok: false, errors: { _storage: st.reason } };
  try {
    writeSettings(clean, SECRET_KEYS);
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, errors: { _storage: msg === 'file-unreadable' || msg === 'file-corrupt' ? msg : 'fs-error' } };
  } finally {
    cache = null;
  }
  return { ok: true };
}
