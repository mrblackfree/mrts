/** Shipment tracking: one normalised timeline whatever the source (carrier API, aggregator, Korea Customs). */

export type TrackKind = 'container' | 'bl' | 'booking';

/** Milestones in shipping order; providers map their own codes onto these. */
export const MILESTONES = [
  'booked',
  'empty-out',
  'gate-in',
  'loaded',
  'departed',
  'transshipment',
  'arrived',
  'discharged',
  'customs',
  'customs-cleared',
  'gate-out',
  'delivered',
  'empty-return',
  'other',
] as const;
export type Milestone = (typeof MILESTONES)[number];

export interface TrackEvent {
  milestone: Milestone;
  /** provider wording, shown as is */
  description: string;
  /** ISO timestamp */
  at: string;
  /** false for estimated / planned events */
  actual: boolean;
  location?: string;
  vessel?: string;
}

export interface TrackResult {
  provider: string;
  reference: string;
  kind: TrackKind;
  carrier?: string;
  /** latest actual milestone */
  status: Milestone | 'unknown';
  eta?: string;
  vessel?: string;
  pol?: string;
  pod?: string;
  events: TrackEvent[];
  /** containers on the booking / B/L when there are several (the timeline shows the first) */
  containers?: string[];
  /** customs clearance status in the source's own words (UNI-PASS) */
  customsStatus?: string;
  /** the source accepted the reference but has no events yet (first lookup at an aggregator) */
  pending?: boolean;
  /** the source returned only part of the history (a paged answer): the latest steps may be missing */
  partial?: boolean;
  /** other references found for the same number (e.g. house B/Ls under one master B/L), each trackable */
  relatedRefs?: string[];
  /** true for the built-in sample timeline (no tracking source configured) */
  demo?: boolean;
  fetchedAt: string;
}

export interface TrackQuery {
  reference: string;
  kind: TrackKind;
  /** SCAC or carrier code when the user chose one */
  carrier?: string;
}

/** ISO 6346 container number (4 letters + 6 digits + check digit), e.g. MSKU1234565. */
export function isContainerNumber(raw: string): boolean {
  const v = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{3}[UJZR]\d{7}$/.test(v)) return false;
  const value = (c: string) => {
    if (/\d/.test(c)) return Number(c);
    // letters map to 10..38 skipping multiples of 11
    let n = 10;
    for (let code = 65; code < c.charCodeAt(0); code++) {
      n++;
      if (n % 11 === 0) n++;
    }
    return n;
  };
  const sum = v
    .slice(0, 10)
    .split('')
    .reduce((acc, c, i) => acc + value(c) * 2 ** i, 0);
  return (sum % 11) % 10 === Number(v[10]);
}

/** Spaces and dashes removed, upper case. Length is checked by the caller, never cut: a cut number is a different one. */
export const normaliseReference = (raw: string) => raw.replace(/[\s-]/g, '').toUpperCase();

/**
 * Latest actual milestone of a timeline. Events the source could not map (`other`, e.g. an unknown code) are
 * skipped when a known milestone exists, so the current step never reads "Other" after "Departed".
 */
export function statusOf(events: TrackEvent[]): Milestone | 'unknown' {
  const actual = events.filter((e) => e.actual).sort((a, b) => a.at.localeCompare(b.at));
  if (!actual.length) return 'unknown';
  const known = actual.filter((e) => e.milestone !== 'other');
  return (known.length ? known : actual)[(known.length ? known : actual).length - 1].milestone;
}
