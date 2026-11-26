export declare const FORMAT: 1;
export declare function settingsDir(): string;
export declare function settingsFile(): string;
export declare const MIN_ADMIN_SECRET: 32;
export declare function masterSecret(): string | null;
export declare function settingsFileProblem(): 'file-unreadable' | 'file-corrupt' | null;
export declare function settingsMtime(): number;
export declare function readSettings(): {
  values: Record<string, string>;
  unreadable: string[];
  updatedAt: string | null;
  problem: 'file-unreadable' | 'file-corrupt' | null;
};
export declare function writeSettings(patch: Record<string, string | null>, secretKeys: string[]): void;
export interface SettingsDoc {
  format: 1;
  salt: string;
  updatedAt?: string;
  values?: Record<string, { v: string } | { enc: string }>;
}
export type ParsedSettings = { doc: SettingsDoc | null; problem?: 'file-unreadable' | 'file-corrupt' };
export declare function parseSettingsDoc(raw: string | null): ParsedSettings;
export declare function decodeSettings(parsed: ParsedSettings): {
  values: Record<string, string>;
  unreadable: string[];
  updatedAt: string | null;
  problem: 'file-unreadable' | 'file-corrupt' | null;
};
export declare function patchSettingsDoc(prev: SettingsDoc | null, patch: Record<string, string | null>, secretKeys: string[]): SettingsDoc;
