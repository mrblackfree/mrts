export declare const KCCI_URL: string;

export interface KcciParsed {
  date: string;
  prevDate: string;
  unit: string;
  routes: Record<string, { route: string; weight: string; value: number; prev: number }>;
}

export declare function parseKcci(html: string): KcciParsed | null;
