import { NextRequest, NextResponse } from "next/server";
import {
  buildRecommendationTitle,
  recommendSouvenirs,
} from "@/product-builder/lib/recommendSouvenirs";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
  SouvenirSelection,
} from "@/product-builder/types/souvenir";

const DEFAULT_SELECTION: SouvenirSelection = {
  country: "필리핀",
  category: "바나나칩",
  giftRecipient: "회사 동료",
  criteria: ["가성비", "대량 선물용", "휴대성"],
  travelSituation: "귀국 전날",
  travelType: "출장/비즈니스",
  limit: 5,
};

function parseCriteria(value: string | null): RecommendationCriterion[] {
  if (!value) {
    return DEFAULT_SELECTION.criteria;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as RecommendationCriterion[];
}

function selectionFromSearchParams(
  searchParams: URLSearchParams
): SouvenirSelection {
  const country = searchParams.get("country");
  const category = searchParams.get("category");
  const giftRecipient = searchParams.get("giftRecipient");
  const limit = searchParams.get("limit");

  return {
    ...DEFAULT_SELECTION,
    country: country ? (country as CountryName) : DEFAULT_SELECTION.country,
    category: category ?? DEFAULT_SELECTION.category,
    giftRecipient: giftRecipient
      ? (giftRecipient as GiftRecipient)
      : DEFAULT_SELECTION.giftRecipient,
    criteria: parseCriteria(searchParams.get("criteria")),
    limit: Number(limit ?? DEFAULT_SELECTION.limit),
  };
}

function responsePayload(selection: SouvenirSelection) {
  return {
    title: buildRecommendationTitle(selection),
    selection,
    products: recommendSouvenirs(selection),
    meta: {
      mvpScope: [
        "explore",
        "recommend",
        "compare",
        "matchScore",
        "productCard",
        "comparisonTable",
        "pdfGuideAction",
        "souvenirPassportAction",
      ],
      excluded: ["purchase", "payment", "delivery", "inventory", "sellerConnection"],
      dataNotice:
        "가격, 평점, 리뷰 수, 국내 구매 가능성, 공식 제휴 가능성은 sample/mock/estimated 데이터이며 실제 서비스 연결 전 검증이 필요합니다.",
    },
  };
}

export async function GET(request: NextRequest) {
  const selection = selectionFromSearchParams(request.nextUrl.searchParams);

  return NextResponse.json(responsePayload(selection));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SouvenirSelection>;
  const selection: SouvenirSelection = {
    ...DEFAULT_SELECTION,
    ...body,
    criteria: body.criteria?.length
      ? body.criteria
      : DEFAULT_SELECTION.criteria,
  };

  return NextResponse.json(responsePayload(selection));
}
