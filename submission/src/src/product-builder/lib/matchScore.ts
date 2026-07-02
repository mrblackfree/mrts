import type {
  GiftRecipient,
  MatchScoreResult,
  RecommendationCriterion,
  SouvenirProduct,
} from "../types/souvenir";

const RECIPIENT_CRITERIA_HINTS: Record<
  GiftRecipient,
  RecommendationCriterion[]
> = {
  부모님: ["고급스러움", "호불호 적음", "현지 대표성", "브랜드 신뢰도"],
  "배우자/연인": ["고급스러움", "현지 대표성", "브랜드 신뢰도", "리뷰 평점"],
  아이: ["호불호 적음", "휴대성", "가성비"],
  친구: ["가성비", "휴대성", "현지 대표성"],
  "회사 동료": ["가성비", "대량 선물용", "호불호 적음", "휴대성"],
  "상사/거래처": ["고급스러움", "브랜드 신뢰도", "리뷰 평점", "현지 대표성"],
  "가족 전체": ["호불호 적음", "현지 대표성", "가성비"],
  "나를 위한 기념품": ["현지 대표성", "리뷰 평점", "브랜드 신뢰도"],
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function uniqueCriteria(
  criteria: RecommendationCriterion[]
): RecommendationCriterion[] {
  return [...new Set(criteria)];
}

export function calculateMatchScore(
  product: SouvenirProduct,
  giftRecipient: GiftRecipient,
  criteria: RecommendationCriterion[]
): MatchScoreResult {
  const selectedCriteria = uniqueCriteria(criteria);
  const matchedCriteria = selectedCriteria.filter((criterion) =>
    product.criteriaTags.includes(criterion)
  );
  const recipientHints = RECIPIENT_CRITERIA_HINTS[giftRecipient] ?? [];
  const recipientHintMatches = recipientHints.filter((criterion) =>
    product.criteriaTags.includes(criterion)
  );

  let score = 38;

  if (product.bestFor.includes(giftRecipient)) {
    score += 22;
  } else if (
    product.bestFor.some((target) => target === "가족 전체" || target === "친구")
  ) {
    score += 8;
  }

  score += matchedCriteria.length * 10;
  score += recipientHintMatches.length * 4;
  score += Math.min(10, Math.max(0, product.rating.value - 3.5) * 7);
  score += Math.min(4, product.reviewCount.value / 60);

  if (product.criteriaTags.includes("브랜드 신뢰도")) {
    score += 3;
  }

  if (product.commerceReady) {
    score += 3;
  }

  if (product.dataQuality.needsVerification) {
    score -= 3;
  }

  const finalScore = clampScore(score);
  const matchedText =
    matchedCriteria.length > 0
      ? matchedCriteria.join(", ")
      : "직접 일치하는 기준은 적지만 선물 적합도가 있습니다";
  const verificationText = product.dataQuality.needsVerification
    ? "가격, 평점, 리뷰는 sample/mock/estimated 데이터라 실제 서비스 연결 전 검증이 필요합니다"
    : "검증된 데이터 기준입니다";

  return {
    score: finalScore,
    matchedCriteria,
    reason: `${giftRecipient} 대상에 ${matchedText} 기준이 잘 맞습니다. ${verificationText}.`,
  };
}
