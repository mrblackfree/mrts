export const DEFAULT_DOMAIN: string;
export const REPO_GIT: string;
export const APP_DIR: string;
export const PROJECT: string;
export const HOST_DIR: string;
export const HOSTINGER_API: string;
export function apiBase(override?: string): string;
export const PASS_THROUGH: string[];
export function asciiDomain(domain: string): string | null;
export function validRef(ref: string): boolean;
export function imageTag(ref: string): string;
export function renderCompose(opts?: { ref?: string; domain?: string; envKeys?: string[] }): string;
export function envFile(env: Record<string, string | undefined>): string;
export function envKeys(env: Record<string, string | undefined>): string[];
export function vmAddresses(vm: unknown): { ipv4: string | null; ipv6: string | null };
export function dnsZone(opts: { domain?: string; ipv4: string | null; ipv6?: string | null; ttl?: number }): {
  overwrite: boolean;
  zone: Array<{ name: string; type: string; ttl: number; records: Array<{ content: string }> }>;
};
