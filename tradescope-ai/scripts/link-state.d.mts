export interface LinkResult {
  status: number;
  state: 'ok' | 'protected' | 'unavailable' | 'unreachable' | 'broken';
  checkedAt: string;
}

export declare const CARRY_OVER_DAYS: number;

export declare function mergeLinkResult(prev: LinkResult | undefined, next: LinkResult, nowMs?: number): { result: LinkResult; carried: boolean };
