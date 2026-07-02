"use client";

import type {
  CountryName,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
} from "@/product-builder/types/souvenir";

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

const STORAGE_KEY = "mrt-souvenir-passport-demo-v2";
const LEGACY_STORAGE_KEY = "mrt-souvenir-passport-demo";

const PASSPORT_PAGE_IMAGES: Record<
  PassportCountry,
  {
    src: string;
    alt: string;
  }
> = {
  필리핀: {
    src: "/passport-pages/philippines-passport.png",
    alt: "필리핀 기념품 패스포트 페이지",
  },
  일본: {
    src: "/passport-pages/japan-passport.png",
    alt: "일본 기념품 패스포트 페이지",
  },
  대만: {
    src: "/passport-pages/taiwan-passport.png",
    alt: "대만 기념품 패스포트 페이지",
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

const SAVED_SOUVENIR_QUERY_VALUES: Record<string, string> = {
  "banana-chips": "바나나칩",
  "owltree-banana-chips": "바나나칩",
  "jovys-banana-chips": "바나나칩",
  banana: "바나나칩",
  "dried-mango": "드라이망고",
  mango: "드라이망고",
  kopiko: "필리핀 커피",
  coffee: "필리핀 커피",
  ube: "우베 과자",
  "ube-polvoron": "우베 과자",
  "ube-snacks": "우베 과자",
  coconut: "코코넛 스낵",
  "coconut-chips": "코코넛 스낵",
  "coconut-snack": "코코넛 스낵",
  "tokyo-banana": "도쿄바나나",
  "royce-chocolate": "로이스 초콜릿",
  matcha: "말차 과자",
  "matcha-snacks": "말차 과자",
  kitkat: "지역 한정 키캣",
  "shiroi-koibito": "시로이코이비토",
  "pineapple-cake": "펑리수",
  "nougat-cracker": "누가크래커",
  "oolong-tea": "우롱차",
  "mango-jelly": "망고젤리",
  "taro-snack": "타로 과자",
};

function normalizeSavedToken(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

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

export function buildPassportEntryFromSavedQuery(
  country: PassportCountry,
  savedQuery: string | null | undefined
): PassportEntry | null {
  if (!savedQuery) {
    return null;
  }

  const souvenirs = Array.from(
    new Set(
      savedQuery
        .split(",")
        .map((token) => SAVED_SOUVENIR_QUERY_VALUES[normalizeSavedToken(token)])
        .filter(Boolean)
    )
  );

  if (souvenirs.length === 0) {
    return null;
  }

  const collection = PASSPORT_COLLECTIONS[country];
  const normalizedSouvenirs = [
    ...souvenirs.filter((souvenir) => collection.includes(souvenir as never)),
    ...collection.filter((souvenir) => !souvenirs.includes(souvenir)),
  ].slice(0, 5);

  return {
    country,
    savedAt: new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    souvenirs: normalizedSouvenirs,
    badges: ["Fair Price Guide", "Bulk Gift", "Easy to Carry", "MRT Recommended"],
    message: "여행의 마지막 선택이 내 기념품 패스포트에 기록되었습니다.",
  };
}

export function SouvenirPassport({
  book,
  activeCountry,
  latestEntry,
}: {
  book: PassportBook;
  activeCountry: PassportCountry;
  latestEntry: PassportEntry | null;
}) {
  const entry = book[activeCountry] ?? null;
  const activeEntry =
    latestEntry?.country === activeCountry ? latestEntry : entry;
  const passportImage = PASSPORT_PAGE_IMAGES[activeCountry];

  return (
    <section
      data-testid="souvenir-passport-panel"
      className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_24px_70px_-50px_rgba(0,80,180,0.55)]"
    >
      {activeEntry && (
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
          <p>{activeEntry.message}</p>
          <p className="mt-1">
            {activeEntry.country} 기념품 패스포트에 {activeEntry.souvenirs.length}
            개의 스탬프가 찍혔습니다.
          </p>
        </div>
      )}

      <div className="bg-[#f6f8fb] p-3 sm:p-5">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.65)]">
          <img
            src={passportImage.src}
            alt={passportImage.alt}
            className="block h-auto min-w-[760px] max-w-none md:min-w-0 md:w-full"
            data-testid="passport-page-image"
          />
        </div>
      </div>
    </section>
  );
}
