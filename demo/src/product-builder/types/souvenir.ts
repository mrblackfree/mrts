export type CountryName =
  | "일본"
  | "태국"
  | "베트남"
  | "필리핀"
  | "대만"
  | "싱가포르"
  | "홍콩";

export type GiftRecipient =
  | "부모님"
  | "배우자/연인"
  | "아이"
  | "친구"
  | "회사 동료"
  | "상사/거래처"
  | "가족 전체"
  | "나를 위한 기념품";

export type RecommendationCriterion =
  | "가성비"
  | "고급스러움"
  | "휴대성"
  | "현지 대표성"
  | "호불호 적음"
  | "대량 선물용"
  | "브랜드 신뢰도"
  | "리뷰 평점";

export type TravelSituation =
  | "출국 전 미리 알아보기"
  | "여행 중"
  | "귀국 전날"
  | "공항 가기 전"
  | "귀국 후 다시 찾기";

export type TravelType =
  | "가족 여행"
  | "커플 여행"
  | "친구 여행"
  | "아이 동반 여행"
  | "출장/비즈니스"
  | "혼자 여행";

export interface EstimatedPrice {
  display: string;
  amountMin: number;
  amountMax: number;
  currency: string;
  isEstimated: boolean;
}

export interface RatingValue {
  value: number;
  max: number;
  source: "sample" | "mock" | "partner" | "internal";
  needsVerification: boolean;
}

export interface ReviewCount {
  value: number;
  source: "sample" | "mock" | "partner" | "internal";
  needsVerification: boolean;
}

export interface ProductDataQuality {
  price: "estimated" | "verified";
  rating: "mock" | "sample" | "verified";
  review: "sample" | "mock" | "verified";
  needsVerification: boolean;
}

export interface CommerceExpansionFlags {
  domesticAvailable: boolean;
  officialPartnerPossible: boolean;
  commerceReady: boolean;
  postTripRepurchase: boolean;
  preTripPurchase: boolean;
  officialSourceNote: string;
}

export type ThumbnailStatus = "verified" | "manual_required" | "placeholder";

export interface ThumbnailSourceInfo {
  status: ThumbnailStatus;
  remoteImageUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: string;
  lastCheckedAt?: string;
  needsManualThumbnail: boolean;
  notes?: string;
}

export interface SouvenirProduct extends CommerceExpansionFlags {
  productId: string;
  country: CountryName;
  category: string;
  brandName: string;
  productName: string;
  thumbnailUrl: string;
  thumbnailSource?: ThumbnailSourceInfo;
  packageSize: string;
  estimatedPrice: EstimatedPrice;
  rating: RatingValue;
  reviewCount: ReviewCount;
  reviewSummary: string;
  pros: string[];
  cons: string[];
  bestFor: GiftRecipient[];
  caution: string;
  matchScore: number;
  matchReason: string;
  purchaseTip: string;
  criteriaTags: RecommendationCriterion[];
  dataQuality: ProductDataQuality;
}

export interface SouvenirSelection {
  country: CountryName;
  category: string;
  giftRecipient: GiftRecipient;
  criteria: RecommendationCriterion[];
  travelSituation?: TravelSituation;
  travelType?: TravelType;
  limit?: number;
}

export interface MatchScoreResult {
  score: number;
  reason: string;
  matchedCriteria: RecommendationCriterion[];
}

export type RecommendedSouvenirProduct = SouvenirProduct &
  MatchScoreResult & {
    matchScore: number;
    matchReason: string;
  };
