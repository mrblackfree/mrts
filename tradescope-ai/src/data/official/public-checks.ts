/**
 * Public evidence for freight lanes and reference prices — cross-checks, never quotes.
 *
 * - LANE_SCHEDULES: port-to-port transit days a carrier publishes in its service schedule. They confirm how long a
 *   sailing takes, not what it costs: freight stays an estimate until a forwarder's quote (a `logistics` entry in
 *   verified-overrides.json) replaces it.
 * - PRICE_BENCHMARKS: official export unit values for the same product line, on the same basis (FOB) as the seed
 *   price, from the exporting country's statistics office. They replace the coarser HS6 Comtrade unit value for the
 *   price cross-check; a buyer's or supplier's quotation is still what verifies a price.
 */
import type { Bilingual } from '@/lib/types';

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export interface LaneSchedule {
  carrier: string;
  service: string;
  /** published port-to-port transit days */
  transitDays: number;
  frequency: Bilingual;
  source: string;
  url: string;
  /** YYYY-MM-DD */
  checkedAt: string;
}

/** Keyed by "from→to" (FCL only: an LCL shipment adds consolidation time the schedule does not show). */
export const LANE_SCHEDULES: Record<string, LaneSchedule> = {
  'Busan→Manila': {
    carrier: 'ONE (Ocean Network Express)',
    service: 'JPH (Japan–Philippines)',
    transitDays: 4,
    frequency: b('주 1항차 (부산 일·월 → 마닐라 MICT 목)', 'Weekly (Busan Sun/Mon → Manila MICT Thu)'),
    source: 'ONE East Asia – Japan service schedule, effective April 2026 (p. 8, southbound transit table PUS→MNL 4)',
    url: 'https://cms-resources.one-line.com/sites/oneglobal/files/2026-08/2026%20East%20Asia%20-%20Japan%20Service.pdf',
    checkedAt: '2026-11-27',
  },
  'Manila→Busan': {
    carrier: 'ONE (Ocean Network Express)',
    service: 'JPH (Japan–Philippines)',
    transitDays: 3,
    frequency: b('주 1항차 (마닐라 MICT 일 → 부산 수)', 'Weekly (Manila MICT Sun → Busan Wed)'),
    source: 'ONE East Asia – Japan service schedule, effective April 2026 (p. 8, northbound transit table MNL→PUS 3)',
    url: 'https://cms-resources.one-line.com/sites/oneglobal/files/2026-08/2026%20East%20Asia%20-%20Japan%20Service.pdf',
    checkedAt: '2026-11-27',
  },
  // Maersk service pages give a cumulative transit day for each call from the first port of the loop and no effective
  // date; the lane figure is the difference of two published calls. PH3's weekly Incheon call is confirmed by the
  // Incheon Port Authority regular-service list (2026-11-01 version), which has no Incheon–Manila direct service.
  'Incheon→Manila': {
    carrier: 'Maersk',
    service: 'PH3',
    transitDays: 10,
    frequency: b('주 1항차 (인천항만공사 정기서비스 목록 2026-11-01)', 'Weekly (Incheon Port Authority service list, 2026-11-01)'),
    source: 'Maersk PH3 service timetable — Inchon day 11 → Manila day 21, via Shanghai and Ningbo (page shows no effective date)',
    url: 'https://www.maersk.com/local-information/intra-asia-pacific-shipping-routes/ph3',
    checkedAt: '2026-11-27',
  },
  'Manila→Incheon': {
    carrier: 'Maersk',
    service: 'PH3',
    transitDays: 11,
    frequency: b('주 1항차 (인천항만공사 정기서비스 목록 2026-11-01)', 'Weekly (Incheon Port Authority service list, 2026-11-01)'),
    source: 'Maersk PH3 service timetable — Manila day 0 → Inchon day 11 via Qingdao (9 days from the second Manila call; page shows no effective date)',
    url: 'https://www.maersk.com/local-information/intra-asia-pacific-shipping-routes/ph3',
    checkedAt: '2026-11-27',
  },
  'Davao→Busan': {
    carrier: 'Maersk',
    service: 'IA5',
    transitDays: 9,
    frequency: b('선사 페이지에 빈도 표기 없음', 'Frequency not stated on the carrier page'),
    source: 'Maersk IA5 service timetable — Davao City day 40 → Busan day 49, via Cagayan de Oro and Shanghai (page shows no effective date)',
    url: 'https://www.maersk.com/local-information/intra-asia-pacific-shipping-routes/ia5',
    checkedAt: '2026-11-27',
  },
};

export interface PriceBenchmark {
  year: number;
  usdPerKg: number;
  basis: 'FOB' | 'CIF';
  /** the statistical line compared */
  line: string;
  /** volume behind the unit value, in tonnes */
  tonnes: number;
  source: string;
  url: string;
  /** YYYY-MM-DD */
  checkedAt: string;
}

/** Keyed by product id. Philippine exports to Korea, so FOB like the seed prices. */
export const PRICE_BENCHMARKS: Record<string, PriceBenchmark> = {
  'dried-mango': {
    year: 2025,
    usdPerKg: 12.66,
    basis: 'FOB',
    line: 'AHTN 0804.50.22 Mangoes, dried — Philippines → Korea',
    tonnes: 63.3,
    source: 'Philippine Statistics Authority (PSA) OpenSTAT — FOB value and weight of exports by commodity and country, 2025',
    url: 'https://openstat.psa.gov.ph/',
    checkedAt: '2026-11-27',
  },
  'banana-chips': {
    year: 2025,
    usdPerKg: 2.41,
    basis: 'FOB',
    line: 'AHTN 2008.99.40 other prepared fruit with added sugar (incl. banana chips) — Philippines → Korea',
    tonnes: 851.2,
    source: 'Philippine Statistics Authority (PSA) OpenSTAT — FOB value and weight of exports by commodity and country, 2025',
    url: 'https://openstat.psa.gov.ph/',
    checkedAt: '2026-11-27',
  },
  'coconut-oil': {
    year: 2025,
    usdPerKg: 5.88,
    basis: 'FOB',
    line: 'AHTN 1513.11.10 virgin coconut oil — Philippines → Korea',
    tonnes: 25.4,
    source: 'Philippine Statistics Authority (PSA) OpenSTAT — FOB value and weight of exports by commodity and country, 2025',
    url: 'https://openstat.psa.gov.ph/',
    checkedAt: '2026-11-27',
  },
};

/** The published schedule for an FCL lane, if one was read. */
export function laneSchedule(from: string, to: string, mode: string): LaneSchedule | undefined {
  return mode.startsWith('FCL') ? LANE_SCHEDULES[`${from}→${to}`] : undefined;
}
