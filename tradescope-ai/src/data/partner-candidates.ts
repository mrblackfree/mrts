/**
 * Candidate law firms and customs firms per country, from public sources (firm websites, legal directories,
 * government lists). These are candidates to approach — not partners. Nothing here is shown on the public site;
 * only firms the admin marks as contracted are (see /api/partners).
 */
import type { PartnerFirm } from '@/lib/partners/types';

export const PARTNER_CANDIDATES: PartnerFirm[] = [];
