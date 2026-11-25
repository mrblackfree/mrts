/**
 * Korea Customs UNI-PASS — 화물통관진행정보조회 (API001). Free key, cargo entering Korea only: arrival, discharge,
 * bonded-area entry, import declaration, acceptance and release, looked up by cargo management number or B/L.
 * The response is flat XML, read with a small tag extractor (no XML dependency).
 */
import { callApi, place, TrackApiError } from './fetch';
import type { Milestone, TrackEvent, TrackQuery, TrackResult } from './types';
import { statusOf } from './types';

const URL_BASE = 'https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo';
const SOURCE = 'UNI-PASS';

const decode = (v: string) =>
  v
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();

/** Inner XML of every `<tag>…</tag>` (not nested in itself). */
function blocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(m[1]);
  return out;
}
/** Direct text fields of a block: { tag: value }. */
function fields(block: string): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  const re = /<([A-Za-z][\w]*)(?:\s[^>]*)?>([^<]*(?:<!\[CDATA\[[\s\S]*?\]\]>)?[^<]*)<\/\1>/g;
  for (let m = re.exec(block); m; m = re.exec(block)) out[m[1]] = decode(m[2]);
  return out;
}

/** "20261101093015" (KST) → ISO; "20261101" → ISO midnight KST. */
export function kstToIso(v?: string): string | undefined {
  const m = v?.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})?)?$/);
  if (!m) return undefined;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? '00'}:${m[5] ?? '00'}:${m[6] ?? '00'}+09:00`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** 처리구분 wording → milestone. Order matters: "입항보고 수리" is an arrival, "수입신고수리" the clearance. */
export function unipassMilestone(kind: string): Milestone {
  if (/수입신고\s*수리/.test(kind)) return 'customs-cleared';
  if (/수입신고/.test(kind)) return 'customs';
  if (/반출/.test(kind)) return 'gate-out';
  if (/반입/.test(kind)) return 'customs';
  if (/하선|하기/.test(kind)) return 'discharged';
  if (/적하목록/.test(kind)) return 'other';
  if (/입항/.test(kind)) return 'arrived';
  return 'other';
}

export function fromUnipassXml(q: TrackQuery, xml: string): TrackResult | { many: string[] } | null {
  const headers = blocks(xml, 'cargCsclPrgsInfoQryVo').map(fields);
  if (!headers.length) {
    const notice = fields(xml).ntceInfo ?? blocks(xml, 'ntceInfo')[0];
    const total = Number(fields(xml).tCnt ?? blocks(xml, 'tCnt')[0] ?? '0');
    if (notice && !total && !/없|0건|no data/i.test(notice)) throw new TrackApiError(SOURCE, 200, decode(notice).slice(0, 120));
    return null;
  }
  // several cargo records for one B/L (e.g. house B/Ls under a master): ask again by cargo number
  if (headers.length > 1) return { many: headers.map((h) => h.cargMtNo).filter(Boolean) };
  const h = headers[0];
  const events: TrackEvent[] = blocks(xml, 'cargCsclPrgsInfoDtlQryVo')
    .map(fields)
    .map((d): TrackEvent | null => {
      const kind = d.cargTrcnRelaBsopTpcd || d.rlbrCn || '처리';
      const at = kstToIso(d.prcsDttm) ?? kstToIso(d.rlbrDttm);
      if (!at) return null;
      const milestone = unipassMilestone(kind);
      const detail = [d.rlbrCn && d.rlbrCn !== kind ? d.rlbrCn : '', d.dclrNo ? `No. ${d.dclrNo}` : ''].filter(Boolean).join(' · ');
      return {
        milestone,
        description: detail ? `${kind} — ${detail}` : kind,
        at,
        actual: true,
        location: d.shedNm || (milestone === 'arrived' || milestone === 'discharged' ? h.dsprNm : undefined) || undefined,
      };
    })
    .filter((e): e is TrackEvent => e !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
  const vessel = h.shipNm ? (h.vydf ? `${h.shipNm} / ${h.vydf}` : h.shipNm) : undefined;
  const status = [h.prgsStts, h.csclPrgsStts].filter(Boolean).join(' · ');
  return {
    provider: SOURCE,
    reference: q.reference,
    kind: q.kind,
    carrier: h.shcoFlco || q.carrier,
    status: statusOf(events),
    eta: kstToIso(h.etprDt),
    vessel,
    pol: place(h.ldprNm, h.ldprCd),
    pod: place(h.dsprNm, h.dsprCd),
    events,
    containers: h.cntrNo ? h.cntrNo.split(/[,\s]+/).filter(Boolean) : undefined,
    customsStatus: status || undefined,
    // the cargo is registered but has no processing records yet (manifest filed, not arrived)
    pending: !events.length,
    fetchedAt: new Date().toISOString(),
  };
}

async function query(key: string, params: Record<string, string>): Promise<string> {
  const url = `${URL_BASE}?${new URLSearchParams({ crkyCn: key, ...params }).toString()}`;
  const res = await callApi(SOURCE, url, { headers: { Accept: 'application/xml' } });
  if (res.status !== 200) throw new TrackApiError(SOURCE, res.status, `HTTP ${res.status}`);
  return res.text;
}

export async function trackUnipass(key: string, q: TrackQuery): Promise<TrackResult | null> {
  const attempts: Array<Record<string, string>> = [];
  // 화물관리번호: 2-digit year + 4-char carrier/forwarder code + serial (15–19 chars)
  if (/^\d{2}[A-Z0-9]{13,17}$/.test(q.reference)) attempts.push({ cargMtNo: q.reference });
  const year = new Date().getUTCFullYear();
  for (const y of [year, year - 1]) {
    attempts.push({ mblNo: q.reference, blYy: String(y) });
    attempts.push({ hblNo: q.reference, blYy: String(y) });
  }
  for (const params of attempts) {
    const r = fromUnipassXml(q, await query(key, params));
    if (!r) continue;
    if ('many' in r) {
      if (!r.many.length) continue;
      // several consignments under one B/L (e.g. house B/Ls): show the first, list the others so each can be
      // looked up on its own — their timelines are different cargo and are not merged
      const one = fromUnipassXml(q, await query(key, { cargMtNo: r.many[0] }));
      if (!one || 'many' in one) return null;
      return { ...one, relatedRefs: r.many.slice(1, 20) };
    }
    return r;
  }
  return null;
}
