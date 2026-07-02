import categoryGroups from "@/product-builder/data/souvenir-categories.json";
import { recommendDiverseSouvenirs } from "@/product-builder/lib/recommendSouvenirs";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
  SouvenirSelection,
  TravelSituation,
  TravelType,
} from "@/product-builder/types/souvenir";

export type SouvenirRouteSelection = Required<
  Pick<
    SouvenirSelection,
    "country" | "category" | "giftRecipient" | "criteria" | "travelSituation" | "travelType"
  >
> & {
  limit: number;
};

type CategoryGroup = {
  country: CountryName;
  categories: string[];
};

export const SOUVENIR_SELECTION_STORAGE_KEY = "mrt-souvenir-route-selection-v1";

export const DEFAULT_ROUTE_SELECTION: SouvenirRouteSelection = {
  country: "필리핀",
  category: "바나나칩",
  giftRecipient: "회사 동료",
  criteria: ["가성비", "대량 선물용", "휴대성"],
  travelSituation: "귀국 전날",
  travelType: "출장/비즈니스",
  limit: 5,
};

export const COUNTRY_SLUGS: Record<CountryName, string> = {
  일본: "japan",
  태국: "thailand",
  베트남: "vietnam",
  필리핀: "philippines",
  대만: "taiwan",
  싱가포르: "singapore",
  홍콩: "hongkong",
};

export const COUNTRY_FROM_SLUG: Partial<Record<string, CountryName>> = Object.fromEntries(
  Object.entries(COUNTRY_SLUGS).map(([country, slug]) => [slug, country as CountryName])
) as Partial<Record<string, CountryName>>;

export const COUNTRY_FLAGS: Partial<Record<CountryName, string>> = {
  필리핀: "🇵🇭",
  일본: "🇯🇵",
  대만: "🇹🇼",
  태국: "🇹🇭",
  베트남: "🇻🇳",
  싱가포르: "🇸🇬",
  홍콩: "🇭🇰",
};

const STAGE_SLUGS: Record<TravelSituation, string> = {
  "출국 전 미리 알아보기": "pre-trip",
  "여행 중": "during-trip",
  "귀국 전날": "return-eve",
  "공항 가기 전": "before-airport",
  "귀국 후 다시 찾기": "post-trip",
};

const TRAVEL_TYPE_SLUGS: Record<TravelType, string> = {
  "가족 여행": "family",
  "커플 여행": "couple",
  "친구 여행": "friends",
  "아이 동반 여행": "with-kids",
  "출장/비즈니스": "business",
  "혼자 여행": "solo",
};

const RECIPIENT_SLUGS: Record<GiftRecipient, string> = {
  부모님: "parents",
  "배우자/연인": "partner",
  아이: "child",
  친구: "friends",
  "회사 동료": "coworkers",
  "상사/거래처": "boss-client",
  "가족 전체": "family",
  "나를 위한 기념품": "self",
};

const CRITERION_SLUGS: Record<RecommendationCriterion, string> = {
  가성비: "value",
  고급스러움: "premium",
  휴대성: "portable",
  "현지 대표성": "local",
  "호불호 적음": "low-risk",
  "대량 선물용": "bulk",
  "브랜드 신뢰도": "brand",
  "리뷰 평점": "review",
};

const CATEGORY_SLUGS: Record<string, string> = {
  바나나칩: "banana-chips",
  드라이망고: "dried-mango",
  "우베 과자": "ube",
  "코코넛 스낵": "coconut",
  "필리핀 커피": "kopiko",
  칼라만시: "calamansi",
  도쿄바나나: "tokyo-banana",
  "로이스 초콜릿": "royce-chocolate",
  "말차 과자": "matcha-snacks",
  펑리수: "pineapple-cake",
  누가크래커: "nougat-cracker",
  우롱차: "oolong-tea",
};

const COUNTRY_QUERY_VALUES: Record<string, CountryName> = {
  ...Object.fromEntries(
    Object.entries(COUNTRY_SLUGS).map(([country, slug]) => [slug, country as CountryName])
  ),
  필리핀: "필리핀",
  일본: "일본",
  태국: "태국",
  베트남: "베트남",
  대만: "대만",
  싱가포르: "싱가포르",
  홍콩: "홍콩",
};

const STAGE_QUERY_VALUES: Record<string, TravelSituation> = {
  ...Object.fromEntries(
    Object.entries(STAGE_SLUGS).map(([stage, slug]) => [slug, stage as TravelSituation])
  ),
  return: "귀국 전날",
  "return-eve": "귀국 전날",
  "pretrip": "출국 전 미리 알아보기",
  "pre-trip": "출국 전 미리 알아보기",
  travel: "여행 중",
  "during-trip": "여행 중",
  airport: "공항 가기 전",
  "before-airport": "공항 가기 전",
  "post-trip": "귀국 후 다시 찾기",
  "출국-전-미리-알아보기": "출국 전 미리 알아보기",
  "여행-중": "여행 중",
  "귀국-전날": "귀국 전날",
  "공항-가기-전": "공항 가기 전",
  "귀국-후-다시-찾기": "귀국 후 다시 찾기",
};

const TRAVEL_TYPE_QUERY_VALUES: Record<string, TravelType> = {
  ...Object.fromEntries(
    Object.entries(TRAVEL_TYPE_SLUGS).map(([type, slug]) => [slug, type as TravelType])
  ),
  biz: "출장/비즈니스",
  business: "출장/비즈니스",
  "business-trip": "출장/비즈니스",
  "with-kids": "아이 동반 여행",
  "family-trip": "가족 여행",
  "couple-trip": "커플 여행",
  "friend-trip": "친구 여행",
  "solo-trip": "혼자 여행",
  "출장/비즈니스": "출장/비즈니스",
  "가족-여행": "가족 여행",
  "커플-여행": "커플 여행",
  "친구-여행": "친구 여행",
  "아이-동반-여행": "아이 동반 여행",
  "혼자-여행": "혼자 여행",
};

const RECIPIENT_QUERY_VALUES: Record<string, GiftRecipient> = {
  ...Object.fromEntries(
    Object.entries(RECIPIENT_SLUGS).map(([recipient, slug]) => [
      slug,
      recipient as GiftRecipient,
    ])
  ),
  coworker: "회사 동료",
  coworkers: "회사 동료",
  colleague: "회사 동료",
  colleagues: "회사 동료",
  boss: "상사/거래처",
  client: "상사/거래처",
  "boss-client": "상사/거래처",
  partner: "배우자/연인",
  parents: "부모님",
  child: "아이",
  kids: "아이",
  friends: "친구",
  family: "가족 전체",
  self: "나를 위한 기념품",
  "회사-동료": "회사 동료",
  "상사/거래처": "상사/거래처",
  "배우자/연인": "배우자/연인",
  "가족-전체": "가족 전체",
  "나를-위한-기념품": "나를 위한 기념품",
};

const CRITERION_QUERY_VALUES: Record<string, RecommendationCriterion> = {
  ...Object.fromEntries(
    Object.entries(CRITERION_SLUGS).map(([criterion, slug]) => [
      slug,
      criterion as RecommendationCriterion,
    ])
  ),
  value: "가성비",
  price: "가성비",
  premium: "고급스러움",
  luxury: "고급스러움",
  portable: "휴대성",
  portability: "휴대성",
  local: "현지 대표성",
  representative: "현지 대표성",
  safe: "호불호 적음",
  "low-risk": "호불호 적음",
  "low-risk-gift": "호불호 적음",
  bulk: "대량 선물용",
  "bulk-gift": "대량 선물용",
  brand: "브랜드 신뢰도",
  review: "리뷰 평점",
  "가성비": "가성비",
  "고급스러움": "고급스러움",
  "휴대성": "휴대성",
  "현지-대표성": "현지 대표성",
  "호불호-적음": "호불호 적음",
  "대량-선물용": "대량 선물용",
  "브랜드-신뢰도": "브랜드 신뢰도",
  "리뷰-평점": "리뷰 평점",
};

const CATEGORY_QUERY_VALUES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(CATEGORY_SLUGS).map(([category, slug]) => [slug, category])
  ),
  all: "",
  banana: "바나나칩",
  "banana-chips": "바나나칩",
  mango: "드라이망고",
  "dried-mango": "드라이망고",
  ube: "우베 과자",
  coconut: "코코넛 스낵",
  "coconut-snack": "코코넛 스낵",
  coffee: "필리핀 커피",
  kopiko: "필리핀 커피",
  calamansi: "칼라만시",
  "바나나칩": "바나나칩",
  "드라이망고": "드라이망고",
  "우베-과자": "우베 과자",
  "코코넛-스낵": "코코넛 스낵",
  "필리핀-커피": "필리핀 커피",
};

export function getFirstCategory(country: CountryName) {
  return (
    (categoryGroups as CategoryGroup[]).find((group) => group.country === country)
      ?.categories[0] ?? DEFAULT_ROUTE_SELECTION.category
  );
}

export function normalizeSelection(value: Partial<SouvenirRouteSelection>): SouvenirRouteSelection {
  const country = value.country ?? DEFAULT_ROUTE_SELECTION.country;
  const category =
    value.category && value.category.length > 0 ? value.category : getFirstCategory(country);
  const criteria =
    Array.isArray(value.criteria) && value.criteria.length > 0
      ? value.criteria
      : DEFAULT_ROUTE_SELECTION.criteria;

  return {
    country,
    category,
    giftRecipient: value.giftRecipient ?? DEFAULT_ROUTE_SELECTION.giftRecipient,
    criteria,
    travelSituation: value.travelSituation ?? DEFAULT_ROUTE_SELECTION.travelSituation,
    travelType: value.travelType ?? DEFAULT_ROUTE_SELECTION.travelType,
    limit: value.limit ?? DEFAULT_ROUTE_SELECTION.limit,
  };
}

function normalizeQueryToken(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function firstParam(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = params.get(name);
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function hasSelectionQuery(params: URLSearchParams) {
  return [
    "country",
    "stage",
    "travelSituation",
    "travel-situation",
    "situation",
    "type",
    "travelType",
    "travel-type",
    "recipient",
    "giftRecipient",
    "gift-recipient",
    "criteria",
    "criterion",
    "category",
  ].some((name) => params.has(name));
}

function parseCriteria(params: URLSearchParams) {
  const values = [
    ...params.getAll("criteria"),
    ...params.getAll("criterion"),
  ].flatMap((value) => value.split(","));

  const criteria = values
    .map((value) => CRITERION_QUERY_VALUES[normalizeQueryToken(value)])
    .filter(Boolean) as RecommendationCriterion[];

  return Array.from(new Set(criteria));
}

export function readSelectionFromSearchParams(
  params: URLSearchParams
): SouvenirRouteSelection | null {
  if (!hasSelectionQuery(params)) {
    return null;
  }

  const rawCountry = firstParam(params, ["country"]);
  const country = rawCountry
    ? COUNTRY_QUERY_VALUES[normalizeQueryToken(rawCountry)] ?? DEFAULT_ROUTE_SELECTION.country
    : DEFAULT_ROUTE_SELECTION.country;

  const rawCategory = firstParam(params, ["category"]);
  const parsedCategory = rawCategory
    ? CATEGORY_QUERY_VALUES[normalizeQueryToken(rawCategory)] ?? rawCategory
    : undefined;

  const rawStage = firstParam(params, [
    "stage",
    "travelSituation",
    "travel-situation",
    "situation",
  ]);
  const rawType = firstParam(params, ["type", "travelType", "travel-type"]);
  const rawRecipient = firstParam(params, [
    "recipient",
    "giftRecipient",
    "gift-recipient",
  ]);
  const criteria = parseCriteria(params);

  return normalizeSelection({
    country,
    category: parsedCategory,
    travelSituation: rawStage
      ? STAGE_QUERY_VALUES[normalizeQueryToken(rawStage)]
      : undefined,
    travelType: rawType
      ? TRAVEL_TYPE_QUERY_VALUES[normalizeQueryToken(rawType)]
      : undefined,
    giftRecipient: rawRecipient
      ? RECIPIENT_QUERY_VALUES[normalizeQueryToken(rawRecipient)]
      : undefined,
    criteria: criteria.length > 0 ? criteria : undefined,
  });
}

export function readRouteSelection(): SouvenirRouteSelection {
  if (typeof window === "undefined") {
    return DEFAULT_ROUTE_SELECTION;
  }

  const querySelection = readSelectionFromSearchParams(
    new URLSearchParams(window.location.search)
  );
  if (querySelection) {
    writeRouteSelection(querySelection);
    return querySelection;
  }

  const raw = window.localStorage.getItem(SOUVENIR_SELECTION_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_ROUTE_SELECTION;
  }

  try {
    return normalizeSelection(JSON.parse(raw) as Partial<SouvenirRouteSelection>);
  } catch {
    window.localStorage.removeItem(SOUVENIR_SELECTION_STORAGE_KEY);
    return DEFAULT_ROUTE_SELECTION;
  }
}

export function writeRouteSelection(selection: SouvenirRouteSelection) {
  window.localStorage.setItem(
    SOUVENIR_SELECTION_STORAGE_KEY,
    JSON.stringify(normalizeSelection(selection))
  );
}

export function buildProductsForSelection(
  selection: SouvenirRouteSelection
): RecommendedSouvenirProduct[] {
  return recommendDiverseSouvenirs(selection);
}

export function buildCountrySelection(country: CountryName): SouvenirRouteSelection {
  return normalizeSelection({
    ...DEFAULT_ROUTE_SELECTION,
    country,
    category: getFirstCategory(country),
  });
}

export function getPdfFilename(country: CountryName) {
  return `${COUNTRY_SLUGS[country]}-souvenir-guide.pdf`;
}

export function categorySlugFor(category: string) {
  return CATEGORY_SLUGS[category] ?? normalizeQueryToken(category);
}

export function souvenirSavedSlugFor(category: string) {
  if (category === "필리핀 커피") {
    return "kopiko";
  }

  return categorySlugFor(category);
}

export function buildSelectionQuery(
  selection: SouvenirRouteSelection,
  options: { category?: "selected" | "all" | "none" } = {}
) {
  const categoryMode = options.category ?? "selected";
  const params = new URLSearchParams();

  params.set("country", COUNTRY_SLUGS[selection.country]);
  if (categoryMode === "all") {
    params.set("category", "all");
  } else if (categoryMode === "selected") {
    params.set("category", categorySlugFor(selection.category));
  }
  params.set("stage", STAGE_SLUGS[selection.travelSituation]);
  params.set("type", TRAVEL_TYPE_SLUGS[selection.travelType]);
  params.set("recipient", RECIPIENT_SLUGS[selection.giftRecipient]);
  params.set(
    "criteria",
    selection.criteria.map((criterion) => CRITERION_SLUGS[criterion]).join(",")
  );

  return params.toString();
}

export function buildSelectionUrl(
  path: string,
  selection: SouvenirRouteSelection,
  options: { category?: "selected" | "all" | "none" } = {}
) {
  const query = buildSelectionQuery(selection, options);
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

export function compareScore(
  product: RecommendedSouvenirProduct,
  criterion: RecommendationCriterion,
  giftRecipient: GiftRecipient
) {
  if (criterion === "호불호 적음") {
    return product.bestFor.includes(giftRecipient) ? 5 : 4;
  }

  if (product.matchedCriteria.includes(criterion)) {
    return 5;
  }

  if (product.criteriaTags.includes(criterion)) {
    return 4;
  }

  return 3;
}

export function recommendationScore(product: RecommendedSouvenirProduct) {
  return `${Math.max(1, Math.min(5, Math.round(product.matchScore / 20)))}/5`;
}
