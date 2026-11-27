export declare const PSA_BASE: string;
export declare const PSA_KOREA: string;
export declare const PSA_MIN_KG: number;
export declare const PSA_LINES: Record<string, { prefixes: string[]; line: string }>;
export declare function tableForYear(listing: unknown, year: number): { id: string; updated: string | null; text: string } | null;
export declare function sumByPrefix(csv: string, prefixes: string[]): { total: number; rows: number };
export declare function unitValue(fobUsd: number, kg: number): { usdPerKg: number; tonnes: number } | null;
export declare function countryQuery(country?: string): unknown;
