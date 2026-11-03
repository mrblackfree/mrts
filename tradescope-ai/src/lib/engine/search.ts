/**
 * Local retrieval + intent parser (the "R" of the RAG pipeline).
 * Runs identically on the server (/api/analyze) and in the browser (offline fallback).
 */
import { PRODUCTS } from '@/data/kr-ph-trade-db';
import type { Direction, IntentFocus, QueryIntent, TradeProduct } from '@/lib/types';

const compact = (s: string) => s.toLowerCase().replace(/[\s·\-_/(),.?!~'"’:;]+/g, '');

const FOCUS_KEYWORDS: Record<IntentFocus, string[]> = {
  // ASCII keywords match whole words, so plural / inflected forms are listed explicitly
  tariff: ['관세', '세율', 'fta', '절세', '원산지', '협정', 'duty', 'duties', 'tariff', 'tariffs', 'origin', 'tax', 'taxes'],
  regulation: ['절차', '인증', '통관', '등록', 'fda', '식약처', '규정', '라벨', '할랄', 'cpr', 'lto', 'cpn', '검역', '요건', 'procedure', 'procedures', 'certification', 'certifications', 'customs', 'register', 'registration', 'registrations', 'label', 'labels', 'labeling', 'labelling', 'halal', 'requirement', 'requirements', 'permit', 'permits', 'regulation', 'regulations'],
  partners: ['바이어', '공급사', '셀러', '유통사', '벤더', '매칭', '거래처', '수입사', '추천', '발굴', '파트너', 'buyer', 'buyers', 'supplier', 'suppliers', 'distributor', 'distributors', 'vendor', 'vendors', 'partner', 'partners', 'matching', 'importer', 'importers'],
  logistics: ['물류', '운임', '컨테이너', '해상', '리드타임', '선적', '배송', '항구', '40ft', '20ft', 'lcl', 'freight', 'shipping', 'container', 'containers', 'logistics', 'lead time', 'port', 'ports'],
  market: ['시장', '통계', '규모', '점유율', '수요', '트렌드', '교역', 'market', 'trend', 'share', 'demand', 'statistics', 'size'],
};

const IMPORT_HINTS = ['수입', '소싱', '들여', 'import', 'sourcing', 'source from', '한국에', 'into korea', 'to korea'];
const isAscii = (k: string) => /^[\x20-\x7E]+$/.test(k);
const escapeRe = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** ASCII keywords match on word boundaries ("port" must not hit "import"); Korean keywords match as substrings. */
const hasKeyword = (text: string, k: string) => (isAscii(k) ? new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(text) : text.includes(k));
const EXPORT_HINTS = ['수출', '진출', '판매', '납품', 'export', 'sell to', '필리핀에', 'to the philippines', 'into the philippines', 'to philippines'];

const REGION_PATTERNS: Array<[RegExp, string]> = [
  [/세부|cebu/i, 'Cebu'],
  [/마닐라|manila|metro manila/i, 'Metro Manila'],
  [/다바오|davao|민다나오|mindanao/i, 'Mindanao'],
  [/부산|busan/i, 'Busan'],
  [/인천|incheon/i, 'Incheon'],
];

export function parseAmountUsd(query: string): number | undefined {
  const q = query.replace(/,/g, '');
  // "$50000", "$50k", "USD 1.2m"
  const dollar = q.match(/(?:\$|usd\s?)(\d+(?:\.\d+)?)\s*(k|m|천|만|백만)?/i);
  if (dollar) return scale(parseFloat(dollar[1]), dollar[2]);
  // "5만 달러", "50000달러", "50k dollars", "3천불"
  const kor = q.match(/(\d+(?:\.\d+)?)\s*(k|m|천|만|백만|억)?\s*(?:달러|불|usd|dollars?)/i);
  if (kor) return scale(parseFloat(kor[1]), kor[2]);
  return undefined;
}

function scale(n: number, unit?: string): number {
  switch ((unit ?? '').toLowerCase()) {
    case 'k':
    case '천':
      return n * 1_000;
    case '만':
      return n * 10_000;
    case 'm':
    case '백만':
      return n * 1_000_000;
    case '억':
      return n * 100_000_000;
    default:
      return n;
  }
}

function parseIncoterm(query: string): string | undefined {
  // Only known ports / places are attached to the term (so "CIF is ..." does not become "CIF Is").
  const m = query.match(/\b(EXW|FCA|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b(?:\s+(Busan|Incheon|Manila|Cebu|Davao|Batangas|Seoul|Korea|Philippines)\b)?/i);
  if (!m) return undefined;
  return m[2] ? `${m[1].toUpperCase()} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}` : m[1].toUpperCase();
}

export function parseIntent(query: string): QueryIntent {
  const low = query.toLowerCase();
  const focus = (Object.keys(FOCUS_KEYWORDS) as IntentFocus[]).filter((f) => FOCUS_KEYWORDS[f].some((k) => hasKeyword(low, k)));
  const region = REGION_PATTERNS.find(([re]) => re.test(query))?.[1];
  return {
    focus: focus.length ? focus : ['tariff', 'regulation', 'market', 'partners', 'logistics'],
    amountUsd: parseAmountUsd(query),
    region,
    incoterm: parseIncoterm(query),
    matchedTerms: [],
  };
}

export function inferDirection(query: string): Direction | undefined {
  const low = query.toLowerCase();
  // Ordered country mentions: "필리핀 ... 한국에 수입" => PH_TO_KR
  // "필리핀에서 …" means FROM the Philippines — drop the "-에서" forms before matching "필리핀에" / "한국에".
  const cleaned = low.replace(/(필리핀|한국)에서/g, ' ');
  const imp = IMPORT_HINTS.some((k) => hasKeyword(cleaned, k));
  const exp = EXPORT_HINTS.some((k) => hasKeyword(cleaned, k));
  if (imp && !exp) return 'PH_TO_KR';
  if (exp && !imp) return 'KR_TO_PH';
  return undefined;
}

function hsDigits(query: string): string[] {
  const out: string[] = [];
  const re = /\b(\d{4})(?:[.\s-]?(\d{2}))?(?:[.\s-]?(\d{2,4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query))) {
    const digits = `${m[1]}${m[2] ?? ''}${m[3] ?? ''}`;
    // ignore years like 2023-2026 written alone
    if (!m[2] && /^20[2-3]\d$/.test(m[1])) continue;
    out.push(digits);
  }
  return out;
}

export interface RetrievalResult {
  product: TradeProduct;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchedTerms: string[];
  directionAdjusted: boolean;
}

export function retrieveProduct(query: string, direction: Direction): RetrievalResult {
  const q = compact(query);
  const codes = hsDigits(query);
  const inferred = inferDirection(query);

  const low = query.toLowerCase();
  const scored = PRODUCTS.map((p) => {
    let score = 0;
    const matched: string[] = [];
    for (const alias of p.aliases) {
      const a = compact(alias);
      if (/^\d+$/.test(a)) continue; // HS codes are handled below
      const hit =
        a.length >= 2
          ? q.includes(a)
          : // single-syllable Korean aliases (e.g. "김") must stand alone or carry a particle
            new RegExp(`(^|\\s)${a}(\\s|$|을|를|이|은|는|에|의|과|와|도)`).test(low);
      if (hit) {
        score += 10 + a.length * 2;
        matched.push(alias);
      }
    }
    for (const digits of codes) {
      for (const hs of p.hs) {
        const code = hs.code.replace(/\./g, '');
        const overlap = Math.min(digits.length, code.length);
        if (overlap >= 4 && code.slice(0, overlap) === digits.slice(0, overlap)) {
          score += 15 + overlap * 3;
          matched.push(hs.code);
        }
      }
    }
    if (p.direction === direction) score += 4;
    if (inferred && p.direction === inferred) score += 3;
    return { p, score, matched: Array.from(new Set(matched)) };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const hasRealMatch = best.matched.length > 0;

  if (!hasRealMatch) {
    // No keyword/HS hit: fall back to the flagship scenario for the chosen direction.
    const fallbackId = (inferred ?? direction) === 'PH_TO_KR' ? 'banana-chips' : 'seasoned-laver';
    const product = PRODUCTS.find((p) => p.id === fallbackId)!;
    return { product, score: 0, confidence: 'low', matchedTerms: [], directionAdjusted: product.direction !== direction };
  }

  const confidence = best.score >= 40 ? 'high' : best.score >= 18 ? 'medium' : 'low';
  return {
    product: best.p,
    score: best.score,
    confidence,
    matchedTerms: best.matched,
    directionAdjusted: best.p.direction !== direction,
  };
}
