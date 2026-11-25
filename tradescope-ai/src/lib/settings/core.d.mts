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
