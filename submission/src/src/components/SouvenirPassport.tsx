"use client";

import type {
  CountryName,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
} from "../types/souvenir";
import { PassportStamp } from "./PassportStamp";

export const PASSPORT_COLLECTIONS = {
  필리핀: ["바나나칩", "드라이망고", "우베 과자", "코코넛 스낵", "필리핀 커피"],
  일본: ["도쿄바나나", "로이스 초콜릿", "말차 과자", "지역 한정 키캣", "시로이코이비토"],
  대만: ["펑리수", "누가크래커", "우롱차", "망고젤리", "타로 과자"],
} as const;

export type PassportCountry = keyof typeof PASSPORT_COLLECTIONS;

export type PassportEntry = {
  country: PassportCountry;
  savedAt: string;
  souvenirs: string[];
  badges: string[];
  message: string;
};

export type PassportBook = Partial<Record<PassportCountry, PassportEntry>>;

export type SouvenirPassportEntry = PassportEntry;
export type SouvenirPassportBook = PassportBook;

const STORAGE_KEY = "mrt-souvenir-passport-demo-v2";
const LEGACY_STORAGE_KEY = "mrt-souvenir-passport-demo";

const PASSPORT_COUNTRIES = Object.keys(PASSPORT_COLLECTIONS) as PassportCountry[];

const COUNTRY_FLAGS: Record<PassportCountry, string> = {
  필리핀: "🇵🇭",
  일본: "🇯🇵",
  대만: "🇹🇼",
};

const PREVIEW_COMPLETION: Record<PassportCountry, number> = {
  필리핀: 5,
  일본: 3,
  대만: 2,
};

const COUNTRY_STYLES: Record<
  PassportCountry,
  {
    cover: string;
    ring: string;
    accentText: string;
    progress: string;
    badge: string;
  }
> = {
  필리핀: {
    cover: "from-sky-700 via-blue-700 to-cyan-700",
    ring: "border-sky-200",
    accentText: "text-sky-700",
    progress: "bg-sky-600",
    badge: "border-sky-100 bg-sky-50 text-sky-700",
  },
  일본: {
    cover: "from-slate-900 via-blue-950 to-red-900",
    ring: "border-red-200",
    accentText: "text-red-700",
    progress: "bg-red-700",
    badge: "border-red-100 bg-red-50 text-red-700",
  },
  대만: {
    cover: "from-emerald-800 via-green-700 to-orange-700",
    ring: "border-emerald-200",
    accentText: "text-emerald-700",
    progress: "bg-emerald-700",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
};

const BADGE_BY_CRITERION: Partial<Record<RecommendationCriterion, string>> = {
  가성비: "Fair Price Guide",
  휴대성: "Easy to Carry",
  "대량 선물용": "Bulk Gift",
  "현지 대표성": "Local Favorite",
  고급스러움: "Premium Gift",
  "호불호 적음": "MRT Recommended",
  "브랜드 신뢰도": "MRT Recommended",
  "리뷰 평점": "Local Favorite",
};

const PREVIEW_BADGES: Record<PassportCountry, string[]> = {
  필리핀: ["Fair Price Guide", "Bulk Gift", "Easy to Carry", "MRT Recommended"],
  일본: ["MRT Recommended", "Local Favorite", "Premium Gift"],
  대만: ["Local Favorite", "Fair Price Guide", "Tea Market"],
};

export function isPassportCountry(country: string): country is PassportCountry {
  return country in PASSPORT_COLLECTIONS;
}

export function readStoredPassportBook(): PassportBook {
  if (typeof window === "undefined") {
    return {};
  }

  const savedBook = window.localStorage.getItem(STORAGE_KEY);
  if (savedBook) {
    try {
      return JSON.parse(savedBook) as PassportBook;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    return {};
  }

  try {
    const entry = JSON.parse(legacy) as PassportEntry;
    if (isPassportCountry(entry.country)) {
      return { [entry.country]: entry };
    }
  } catch {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  return {};
}

export function writeStoredPassportBook(book: PassportBook) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
}

export function buildPassportEntry(
  country: CountryName,
  products: RecommendedSouvenirProduct[],
  criteria: RecommendationCriterion[]
): PassportEntry | null {
  if (!isPassportCountry(country)) {
    return null;
  }

  const souvenirs =
    PASSPORT_COLLECTIONS[country].length > 0
      ? [...PASSPORT_COLLECTIONS[country]]
      : products.slice(0, 5).map((product) => product.category);
  const badges = Array.from(
    new Set([
      ...criteria.map((criterion) => BADGE_BY_CRITERION[criterion]).filter(Boolean),
      "MRT Recommended",
    ])
  ).slice(0, 4) as string[];

  return {
    country,
    savedAt: new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    souvenirs: souvenirs.slice(0, 5),
    badges,
    message: "여행의 마지막 선택이 내 기념품 패스포트에 기록되었습니다.",
  };
}

export const buildSouvenirPassportEntry = (
  country: CountryName,
  criteria: RecommendationCriterion[],
  products: RecommendedSouvenirProduct[]
) => buildPassportEntry(country, products, criteria);

export const readStoredSouvenirPassportBook = readStoredPassportBook;
export const writeStoredSouvenirPassportBook = writeStoredPassportBook;

function PassportEmblem() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20 opacity-80" aria-hidden>
      <circle cx="48" cy="48" r="35" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 56c8-15 18-23 31-23 14 0 21 9 31 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M23 64h50M31 72h34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 18v11M48 67v11M18 48h11M67 48h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SouvenirPassport({
  book,
  activeCountry,
  latestEntry,
  onActiveCountryChange,
}: {
  book: PassportBook;
  activeCountry: PassportCountry;
  latestEntry: PassportEntry | null;
  onActiveCountryChange: (country: PassportCountry) => void;
}) {
  const entry = book[activeCountry] ?? null;
  const souvenirs = [...PASSPORT_COLLECTIONS[activeCountry]];
  const collectedCount = entry
    ? entry.souvenirs.length
    : PREVIEW_COMPLETION[activeCountry];
  const collectedSouvenirs = new Set(
    entry ? entry.souvenirs : souvenirs.slice(0, collectedCount)
  );
  const savedAt = entry?.savedAt ?? "샘플 미리보기";
  const badges = entry?.badges ?? PREVIEW_BADGES[activeCountry];
  const completion = `${collectedCount}/5`;
  const progress = `${Math.min(100, (collectedCount / 5) * 100)}%`;
  const styles = COUNTRY_STYLES[activeCountry];
  const passportNumber = `MRT-${PASSPORT_COUNTRIES.indexOf(activeCountry) + 1}${collectedCount}26`;

  return (
    <section
      data-testid="souvenir-passport-panel"
      className="mt-5 overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] shadow-[0_24px_70px_-50px_rgba(0,80,180,0.55)]"
    >
      <div className="border-b border-blue-100 bg-gradient-to-r from-white via-blue-50 to-white p-5">
        {latestEntry && (
          <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <p>{latestEntry.message}</p>
            <p className="mt-1">
              {latestEntry.country} 기념품 패스포트에 {latestEntry.souvenirs.length}
              개의 스탬프가 찍혔습니다.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-blue-600">Souvenir Passport</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              여행의 마지막 선택을 기록하는 기념품 여권
            </h2>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500">
              다른 국가 패스포트 보기
            </p>
            <div className="flex rounded-md border border-slate-200 bg-white p-1">
              {PASSPORT_COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => onActiveCountryChange(country)}
                  className={`h-9 rounded px-3 text-sm font-bold transition active:translate-y-[1px] ${
                    activeCountry === country
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-blue-50"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`relative min-h-[390px] overflow-hidden bg-gradient-to-br ${styles.cover} p-6 text-white`}
        >
          <div className="absolute inset-4 rounded-lg border border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" />
          <div className="absolute inset-7 rounded-md border border-white/15" />
          <div className="absolute left-0 top-0 h-full w-10 bg-black/10" />
          <div className="absolute inset-x-8 top-28 h-px bg-white/25" />
          <div className="absolute inset-x-8 bottom-24 h-px bg-white/20" />
          <div className="relative flex h-full min-h-[340px] flex-col items-center justify-between text-center">
            <div>
              <p className="text-xs font-black tracking-[0.28em]">MRT</p>
              <h3 className="mt-2 text-2xl font-black leading-tight">
                SOUVENIR
                <br />
                PASSPORT
              </h3>
            </div>
            <PassportEmblem />
            <div>
              <div className="text-5xl leading-none">{COUNTRY_FLAGS[activeCountry]}</div>
              <p className="mt-3 text-lg font-black">{activeCountry}</p>
              <p className="mt-1 text-xs font-bold text-white/75">{savedAt}</p>
              <p className="mt-3 rounded-full border border-white/25 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-white/80">
                {passportNumber}
              </p>
            </div>
          </div>
        </aside>

        <div className="relative bg-[#f5efe4] p-4 shadow-[inset_18px_0_34px_-34px_rgba(15,23,42,0.45)] md:p-6">
          <div
            className="relative overflow-hidden rounded-lg border border-amber-100 bg-[#fffaf0] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.6)]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(148,163,184,0.1) 0 1px, transparent 1px), radial-gradient(circle at 18% 18%, rgba(37,99,235,0.06), transparent 26%), radial-gradient(circle at 82% 78%, rgba(245,158,11,0.07), transparent 28%)",
              backgroundSize: "36px 36px, 100% 100%, 100% 100%",
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-slate-300/70 to-transparent xl:block" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-900/5 to-transparent xl:block" />

            <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
              <div className="border-b border-dashed border-amber-200 p-5 xl:border-b-0 xl:border-r">
                <p className={`text-sm font-black ${styles.accentText}`}>
                  {activeCountry} Passport Page
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {entry ? "컬렉션 완성" : "샘플 수집 현황"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  저장 버튼을 누르면 선택한 국가의 TOP 5 기념품이 이 여권
                  페이지에 스탬프로 기록됩니다.
                </p>

                <div className="mt-5 rounded-md border border-amber-200 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-sm font-black text-slate-800">
                    <span>완성률</span>
                    <span>{completion}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${styles.progress}`}
                      style={{ width: progress }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    저장 날짜: {savedAt}
                  </p>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-black text-slate-900">
                    저장된 기념품
                  </h4>
                  <div className="mt-3 grid gap-2">
                    {souvenirs.map((souvenir) => {
                      const collected = collectedSouvenirs.has(souvenir);
                      return (
                        <div
                          key={souvenir}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                            collected
                              ? `${styles.ring} bg-white font-bold text-slate-900`
                              : "border-slate-100 bg-white/45 text-slate-400"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${
                              collected
                                ? `${styles.progress} text-white`
                                : "bg-white text-slate-300"
                            }`}
                          >
                            {collected ? "✓" : ""}
                          </span>
                          {souvenir}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-black text-slate-900">획득 배지</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <span
                        key={badge}
                        className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative p-5">
                <div className="mb-4 flex flex-col gap-2 border-b border-dashed border-amber-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-[0.22em] text-slate-400">
                      VISA STAMP COLLECTION
                    </p>
                    <h4 className="mt-1 text-lg font-black text-slate-950">
                      기념품별 수집 스탬프
                    </h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    sample / estimated / localStorage demo
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-5">
                  {souvenirs.map((souvenir, index) => (
                    <PassportStamp
                      key={souvenir}
                      country={activeCountry}
                      souvenir={souvenir}
                      savedAt={savedAt}
                      index={index}
                      collected={collectedSouvenirs.has(souvenir)}
                    />
                  ))}
                </div>

                <div className="mt-6 rounded-md border border-amber-200 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600">
                  실제 계정/DB 저장 없이 브라우저 localStorage와 React state로
                  구현한 MVP 샘플입니다. 향후 마이리얼트립 계정, 예약 내역,
                  재구매몰과 연결할 수 있습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
