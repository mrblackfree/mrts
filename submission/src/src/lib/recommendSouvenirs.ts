import sampleProducts from "../../data/sample-products.json";
import thumbnailSources from "../../data/thumbnail-sources.json";
import { calculateMatchScore } from "./matchScore";
import type {
  RecommendedSouvenirProduct,
  SouvenirProduct,
  SouvenirSelection,
  ThumbnailSourceInfo,
} from "../types/souvenir";

const DEFAULT_LIMIT = 5;

type ThumbnailSourceRecord = ThumbnailSourceInfo & { productId: string };

const thumbnailSourceByProductId = new Map(
  (thumbnailSources as ThumbnailSourceRecord[]).map((source) => [
    source.productId,
    source,
  ])
);

function fallbackThumbnailSource(): ThumbnailSourceInfo {
  return {
    status: "placeholder",
    sourceLabel: "Sample placeholder",
    sourceType: "placeholder",
    needsManualThumbnail: true,
    notes: "정확한 제품 썸네일이 아직 등록되지 않은 MVP placeholder입니다.",
  };
}

function applyThumbnailSource(product: SouvenirProduct): SouvenirProduct {
  const thumbnailSource =
    thumbnailSourceByProductId.get(product.productId) ??
    fallbackThumbnailSource();

  return {
    ...product,
    thumbnailSource,
  };
}

export function recommendSouvenirs(
  selection: SouvenirSelection,
  catalog: SouvenirProduct[] = sampleProducts as SouvenirProduct[]
): RecommendedSouvenirProduct[] {
  const limit = selection.limit ?? DEFAULT_LIMIT;

  return catalog
    .filter((product) => product.country === selection.country)
    .filter((product) => product.category === selection.category)
    .map((product) => {
      const productWithThumbnail = applyThumbnailSource(product);
      const match = calculateMatchScore(
        productWithThumbnail,
        selection.giftRecipient,
        selection.criteria
      );

      return {
        ...productWithThumbnail,
        ...match,
        matchScore: match.score,
        matchReason: match.reason,
      };
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      if (b.rating.value !== a.rating.value) {
        return b.rating.value - a.rating.value;
      }

      return b.reviewCount.value - a.reviewCount.value;
    })
    .slice(0, limit);
}

export function buildRecommendationTitle(selection: SouvenirSelection): string {
  const situation = selection.travelSituation
    ? `${selection.travelSituation} `
    : "";

  return `이번 ${selection.country} 여행 기준, ${situation}${selection.giftRecipient}에게 맞는 ${selection.category} 제품 TOP 5`;
}
