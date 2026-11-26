/**
 * Where the invoice details live in the browser (localStorage only, never sent to the server):
 * - company-wide: name, signatory, address, contacts, tax id and bank — one record for every invoice;
 * - per partner: counterparty address, consignee and notify party — so one buyer's address never appears on
 *   another buyer's invoice.
 */
import { cleanProfile, EMPTY_PROFILE, type InvoiceProfile } from './template';

export const COMPANY_KEYS = ['address', 'phone', 'email', 'website', 'taxId', 'signatoryTitle', 'bankBeneficiary', 'bankName', 'bankSwift', 'bankAccount', 'bankAddress'] as const;
export const PARTY_KEYS = ['counterpartyAddress', 'consignee', 'notifyParty'] as const;

const COMPANY_STORE = 'ts-invoice-company:v1';
const partyStore = (partnerId: string) => `ts-invoice-party:v1:${partnerId}`;
const NAME_MAX = 80;

export interface CompanyIdentity {
  companyName: string;
  signatoryName: string;
}

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full storage: kept for this visit only */
  }
}
function pick<K extends keyof InvoiceProfile>(p: InvoiceProfile, keys: readonly K[]): Pick<InvoiceProfile, K> {
  return Object.fromEntries(keys.map((k) => [k, p[k]])) as Pick<InvoiceProfile, K>;
}
function ownString(raw: unknown, key: string, max: number): string {
  if (!raw || typeof raw !== 'object' || !Object.hasOwn(raw, key)) return '';
  const v = (raw as Record<string, unknown>)[key];
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export function loadIdentity(): CompanyIdentity {
  const raw = read(COMPANY_STORE);
  return { companyName: ownString(raw, 'companyName', NAME_MAX), signatoryName: ownString(raw, 'signatoryName', NAME_MAX) };
}

export function saveIdentity(id: CompanyIdentity): void {
  const raw = read(COMPANY_STORE);
  write(COMPANY_STORE, { ...pick(cleanProfile(raw), COMPANY_KEYS), companyName: id.companyName.slice(0, NAME_MAX), signatoryName: id.signatoryName.slice(0, NAME_MAX) });
}

/** The company-wide details plus this partner's transaction parties. */
export function loadInvoiceProfile(partnerId: string): InvoiceProfile {
  const company = pick(cleanProfile(read(COMPANY_STORE)), COMPANY_KEYS);
  const party = pick(cleanProfile(read(partyStore(partnerId))), PARTY_KEYS);
  return { ...EMPTY_PROFILE, ...company, ...party };
}

export function saveInvoiceProfile(partnerId: string, profile: InvoiceProfile): void {
  write(COMPANY_STORE, { ...loadIdentity(), ...pick(profile, COMPANY_KEYS) });
  write(partyStore(partnerId), pick(profile, PARTY_KEYS));
}
