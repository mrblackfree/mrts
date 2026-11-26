/**
 * The law each requirement rests on, matched against an official text of that law.
 *
 * An entry says: this instrument and article exist, and their operative text (quoted) says what the requirement
 * claims. It is a cross-check, not legal advice — how the rule applies to a given product and shipment still needs a
 * lawyer or customs broker, whose review (a `requirement` entry in verified-overrides.json) makes the item verified.
 *
 * Only texts on official hosts count (see OFFICIAL_LAW_HOSTS). Requirements without an entry stay at the seed level.
 */
import type { Bilingual, LegalBasis } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export interface LegalBasisEntry extends LegalBasis {
  /** requirement ids are shared across products; limit an entry to these products when the basis differs */
  products?: string[];
}

/** Hosts whose texts count as official: government portals, the Korea Legislation Research Institute, ASEAN. */
const OFFICIAL_HOSTS = ['law.go.kr', 'elaw.klri.re.kr', 'asean.org', 'docs.wto.org'];
const OFFICIAL_SUFFIXES = ['.go.kr', '.gov.ph'];

export function isOfficialLawUrl(url: string): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  return OFFICIAL_HOSTS.includes(bare) || OFFICIAL_SUFFIXES.some((s) => host.endsWith(s));
}

export const LEGAL_BASES: Record<string, LegalBasisEntry> = {};

/** The legal basis of a product's requirement, if one has been matched. */
export function legalBasisFor(requirementId: string, productId: string): LegalBasis | undefined {
  const e = LEGAL_BASES[requirementId];
  if (!e || (e.products && !e.products.includes(productId))) return undefined;
  const { products, ...basis } = e;
  void products;
  return basis;
}

/** Problems with an entry (empty when it is usable). Run by tests over every entry. */
export function legalBasisProblems(e: LegalBasisEntry, today: string): string[] {
  const out: string[] = [];
  if (!e.citation?.ko?.trim() || !e.citation?.en?.trim()) out.push('citation: ko and en required');
  if (!isOfficialLawUrl(e.url)) out.push(`url: not an official https law host (${e.url})`);
  if (!e.quote?.trim() || e.quote.trim().length < 20) out.push('quote: the operative text is required');
  if (!e.source?.trim()) out.push('source: required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt ?? '')) out.push('checkedAt: YYYY-MM-DD');
  else if (e.checkedAt > today) out.push('checkedAt: in the future');
  return out;
}
