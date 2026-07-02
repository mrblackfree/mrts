export type CategoryVisual = {
  category: string;
  slug: string;
  visual: string;
  badgeLabel: string;
  countLabel: string;
  summary: string;
  cardClass: string;
  iconClass: string;
  accentClass: string;
};

export const CATEGORY_VISUALS: CategoryVisual[] = [
  {
    category: "전체",
    slug: "all",
    visual: "gift",
    badgeLabel: "전체",
    countLabel: "전체 보기",
    summary: "여행지 대표 기념품을 한 번에 둘러볼 수 있어요.",
    cardClass: "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50",
    iconClass: "bg-blue-100 text-blue-700",
    accentClass: "bg-blue-200",
  },
  {
    category: "바나나칩",
    slug: "banana-chips",
    visual: "banana",
    badgeLabel: "스낵/과자",
    countLabel: "5개 상품",
    summary: "바삭하고 달콤해 무심한 간식으로 나누기 좋아요.",
    cardClass: "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-yellow-50",
    iconClass: "bg-amber-100 text-amber-700",
    accentClass: "bg-amber-200",
  },
  {
    category: "드라이망고",
    slug: "dried-mango",
    visual: "mango",
    badgeLabel: "스낵/과자",
    countLabel: "5개 상품",
    summary: "식감이 단단하고 선물용으로 무난하다는 리뷰가 많아요.",
    cardClass: "border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50",
    iconClass: "bg-orange-100 text-orange-700",
    accentClass: "bg-orange-200",
  },
  {
    category: "우베 과자",
    slug: "ube-snacks",
    visual: "ube",
    badgeLabel: "전통 과자",
    countLabel: "5개 상품",
    summary: "보라색 비주얼이 뚜렷해 필리핀 감성을 전하기 좋아요.",
    cardClass: "border-purple-100 bg-gradient-to-br from-purple-50 via-white to-violet-50",
    iconClass: "bg-purple-100 text-purple-700",
    accentClass: "bg-purple-200",
  },
  {
    category: "코코넛 스낵",
    slug: "coconut-snack",
    visual: "coconut",
    badgeLabel: "건강 간식",
    countLabel: "5개 상품",
    summary: "열대 과일 느낌과 가벼운 식감이 장점이에요.",
    cardClass: "border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50",
    iconClass: "bg-teal-100 text-teal-700",
    accentClass: "bg-teal-200",
  },
  {
    category: "필리핀 커피",
    slug: "philippine-coffee",
    visual: "coffee",
    badgeLabel: "음료/커피",
    countLabel: "5개 상품",
    summary: "저렴하고 현지 느낌이 강해 커피 선물로 좋아요.",
    cardClass: "border-stone-100 bg-gradient-to-br from-stone-50 via-white to-orange-50",
    iconClass: "bg-stone-200 text-stone-700",
    accentClass: "bg-stone-200",
  },
  {
    category: "칼라만시",
    slug: "calamansi",
    visual: "calamansi",
    badgeLabel: "현지 대표",
    countLabel: "5개 상품",
    summary: "상큼한 필리핀 감성을 가볍게 전하기 좋아요.",
    cardClass: "border-lime-100 bg-gradient-to-br from-lime-50 via-white to-green-50",
    iconClass: "bg-lime-100 text-lime-700",
    accentClass: "bg-lime-200",
  },
  {
    category: "초콜릿/사탕",
    slug: "chocolate-candy",
    visual: "chocolate",
    badgeLabel: "간식",
    countLabel: "4개 상품",
    summary: "호불호가 적고 작은 선물로 나누기 쉬워요.",
    cardClass: "border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50",
    iconClass: "bg-rose-100 text-rose-700",
    accentClass: "bg-rose-200",
  },
  {
    category: "뷰티/헬스",
    slug: "beauty-health",
    visual: "beauty",
    badgeLabel: "뷰티/헬스",
    countLabel: "4개 상품",
    summary: "실용적인 여행 선물로 고르기 좋은 카테고리예요.",
    cardClass: "border-violet-100 bg-gradient-to-br from-violet-50 via-white to-emerald-50",
    iconClass: "bg-violet-100 text-violet-700",
    accentClass: "bg-violet-200",
  },
];

const VISUAL_BY_CATEGORY = new Map(CATEGORY_VISUALS.map((item) => [item.category, item]));
const VISUAL_BY_SLUG = new Map(CATEGORY_VISUALS.map((item) => [item.slug, item]));
const CATEGORY_ALIASES = new Map([["칼라마이", "칼라만시"]]);

export function categoryArtUrl(category: string) {
  return `/category-art/${getCategoryVisual(category).slug}.png`;
}

export function getCategoryVisual(category: string): CategoryVisual {
  const normalizedCategory = CATEGORY_ALIASES.get(category) ?? category;

  return (
    VISUAL_BY_CATEGORY.get(normalizedCategory) ?? {
      category: normalizedCategory,
      slug: "generic",
      visual: "gift",
      badgeLabel: category,
      countLabel: "대표 상품",
      summary: "대표 기념품을 한눈에 비교하고 선물용으로 고르기 좋아요.",
      cardClass: "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50",
      iconClass: "bg-blue-100 text-blue-700",
      accentClass: "bg-blue-200",
    }
  );
}

export function getCategoryVisualBySlug(slug: string): CategoryVisual {
  return VISUAL_BY_SLUG.get(slug) ?? getCategoryVisual("전체");
}
