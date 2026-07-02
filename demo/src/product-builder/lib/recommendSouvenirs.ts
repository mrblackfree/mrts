import sampleProducts from "../data/sample-products.json";
import thumbnailSources from "../data/thumbnail-sources.json";
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
    thumbnailUrl:
      thumbnailSource.status === "verified"
        ? `/api/product-thumbnails/${encodeURIComponent(product.productId)}`
        : product.thumbnailUrl,
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

export function recommendDiverseSouvenirs(
  selection: SouvenirSelection,
  catalog: SouvenirProduct[] = sampleProducts as SouvenirProduct[]
): RecommendedSouvenirProduct[] {
  const limit = selection.limit ?? DEFAULT_LIMIT;
  const ranked = catalog
    .filter((product) => product.country === selection.country)
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
    });

  const seenCategories = new Set<string>();
  const diverse: RecommendedSouvenirProduct[] = [];

  for (const product of ranked) {
    if (seenCategories.has(product.category)) {
      continue;
    }

    seenCategories.add(product.category);
    diverse.push(product);

    if (diverse.length >= limit) {
      return diverse;
    }
  }

  for (const product of ranked) {
    if (diverse.some((item) => item.productId === product.productId)) {
      continue;
    }

    diverse.push(product);

    if (diverse.length >= limit) {
      break;
    }
  }

  return diverse;
}

export function buildRecommendationTitle(selection: SouvenirSelection): string {
  return `${selection.country} / ${selection.category} / ${
    selection.giftRecipient
  } 기준 ${selection.criteria.join("·")} 추천 비교`;
}
