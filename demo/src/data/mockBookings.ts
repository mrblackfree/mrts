import {
  buildCompareUrl,
  buildGuideUrl,
  buildPassportUrl,
} from "@/config/webApp";

export type MockBookingType = "flight" | "hotel" | "tour";

export type MockBooking = {
  id: string;
  type: MockBookingType;
  typeLabel: string;
  title: string;
  description: string;
  inferredCountry: string;
  inferredCity: string;
  tags: string[];
};

export type AutoRecommendedProduct = {
  rank: number;
  productName: string;
  category: string;
  imageUrl: string;
  recipients: string[];
  reason: string;
  contextReason: string;
  estimatedPrice: string;
  caution: string;
  matchScore: number;
};

export type AutoGiftSet = {
  title: string;
  items: string[];
  features: string[];
  luggageLoad: string;
  note: string;
};

export const mockUserTrip = {
  userName: "김민준",
  tripPurpose: ["가족 여행", "회사 동료 선물 준비"],
  tripDates: {
    start: "2026-07-11",
    end: "2026-07-18",
    display: "2026.07.11 ~ 2026.07.18",
  },
  currentStage: "return-eve",
  currentStageLabel: "귀국 전날",
  destination: {
    countryKo: "필리핀",
    countryEn: "Philippines",
    city: "보홀 / 팡라오",
    airport: "Bohol-Panglao International Airport",
  },
  giftRecipients: ["회사 동료", "부모님", "아이"],
  criteria: ["가성비", "휴대성", "대량 선물용", "현지 대표성"],
  bookings: [
    {
      id: "flight-bohol",
      type: "flight",
      typeLabel: "항공",
      title: "인천 ↔ 보홀 왕복 항공",
      description: "도착 공항: Bohol-Panglao International Airport",
      inferredCountry: "필리핀",
      inferredCity: "보홀 / 팡라오",
      tags: ["국가 추정", "도시 추정", "예약 기반", "mock data"],
    },
    {
      id: "hotel-panglao",
      type: "hotel",
      typeLabel: "숙소",
      title: "Panglao Island Resort",
      description: "Hennan Resort, Panglao, Bohol, Philippines",
      inferredCountry: "필리핀",
      inferredCity: "팡라오, 보홀",
      tags: ["도시 추정", "예약 기반", "mock data"],
    },
    {
      id: "tour-bohol",
      type: "tour",
      typeLabel: "투어",
      title: "Bohol Island Hopping Tour",
      description: "Chocolate Hills & Tarsier Tour, Bohol, Philippines",
      inferredCountry: "필리핀",
      inferredCity: "보홀",
      tags: ["국가 추정", "도시 추정", "예약 기반", "mock data"],
    },
  ] satisfies MockBooking[],
  inferredContext: {
    country: "필리핀",
    city: "보홀 / 팡라오",
    stage: "귀국 전날",
    travelType: "가족 여행",
    priority: "가볍고, 나눠주기 쉽고, 가격 부담이 낮은 기념품",
    primaryRecipient: "회사 동료",
    secondaryRecipients: ["부모님", "아이"],
  },
  recommendedProducts: [
    {
      rank: 1,
      productName: "OwlTree Banana Chips Original 60g",
      category: "바나나칩 / 스낵",
      imageUrl: "/category-art/banana-chips.png",
      recipients: ["회사 동료", "가족 전체"],
      reason: "가볍고 대량 선물에 적합하며 필리핀 대표 기념품입니다.",
      contextReason: "귀국 전날에도 구매 부담이 적고 캐리어 부담이 낮습니다.",
      estimatedPrice: "120~180 PHP",
      caution: "봉지 부피가 늘 수 있어 수량을 먼저 정하는 것이 좋습니다.",
      matchScore: 100,
    },
    {
      rank: 2,
      productName: "Cebu / 7D Dried Mango",
      category: "드라이망고",
      imageUrl: "/category-art/dried-mango.png",
      recipients: ["부모님", "친구", "가족"],
      reason: "필리핀 대표 건과일로 호불호가 적어 가족 선물에 무난합니다.",
      contextReason: "보홀 여행 후 귀국 직전에도 현지 마트에서 찾기 쉽습니다.",
      estimatedPrice: "150~240 PHP",
      caution: "당 함량과 유통기한을 확인하세요.",
      matchScore: 97,
    },
    {
      rank: 3,
      productName: "Kopiko Brown Coffee Mix",
      category: "필리핀 커피",
      imageUrl: "/category-art/philippine-coffee.png",
      recipients: ["회사 동료", "상사"],
      reason: "사무실에서 나눠주기 좋은 실용 선물입니다.",
      contextReason: "출장/비즈니스 맥락에서 부담 없이 전달하기 좋습니다.",
      estimatedPrice: "100~160 PHP",
      caution: "카페인에 민감한 대상에게는 소량 패키지를 권장합니다.",
      matchScore: 94,
    },
    {
      rank: 4,
      productName: "Ube Polvoron",
      category: "우베 과자",
      imageUrl: "/category-art/ube-snacks.png",
      recipients: ["아이", "친구"],
      reason: "필리핀 현지 디저트 느낌이 강한 특색 있는 간식입니다.",
      contextReason: "가벼운 간식이라 귀국 전날 추가 구매해도 부담이 적습니다.",
      estimatedPrice: "120~200 PHP",
      caution: "부서지기 쉬운 제품은 캐리어 안쪽에 넣는 것이 좋습니다.",
      matchScore: 92,
    },
    {
      rank: 5,
      productName: "Coconut Chips Premium",
      category: "코코넛 스낵",
      imageUrl: "/category-art/coconut-snack.png",
      recipients: ["가족", "회사 동료"],
      reason: "고소하고 가벼운 건강 간식 느낌으로 나눠주기 쉽습니다.",
      contextReason: "가볍고 납작한 패키지가 많아 캐리어 부담이 낮습니다.",
      estimatedPrice: "90~150 PHP",
      caution: "기름짐과 파손 여부를 확인하세요.",
      matchScore: 90,
    },
  ] satisfies AutoRecommendedProduct[],
  giftSets: [
    {
      title: "회사 동료용 세트",
      items: ["오울트리 바나나칩 10개", "커피믹스 5개", "코코넛칩 5개"],
      features: ["가성비", "대량 선물", "휴대성"],
      luggageLoad: "낮음",
      note: "여러 명에게 같은 기준으로 나눠주기 쉬운 구성입니다.",
    },
    {
      title: "부모님용 세트",
      items: ["드라이망고 2개", "필리핀 커피 2개", "코코넛 스낵 2개"],
      features: ["무난함", "건강 간식 느낌", "현지 대표성"],
      luggageLoad: "낮음~중간",
      note: "단맛과 실용성을 함께 담은 가족용 선물 구성입니다.",
    },
    {
      title: "아이용 세트",
      items: ["우베 과자", "바나나칩", "코코넛 스낵"],
      features: ["달콤한 간식", "재미있는 현지 디저트"],
      luggageLoad: "낮음",
      note: "색감과 맛의 특징이 있어 여행지 느낌을 전달하기 좋습니다.",
    },
  ] satisfies AutoGiftSet[],
  checklist: [
    "회사 동료용 기념품 추천 완료",
    "부모님용 선물 후보 추천 완료",
    "아이용 간식 후보 추천 완료",
    "캐리어 부담 낮은 상품 우선 추천",
    "공항보다 현지 마트 가격 확인 권장",
    "유통기한 확인 필요",
  ],
  pluginSteps: [
    "예약 데이터에서 국가와 도시를 추정",
    "여행 단계가 귀국 전날임을 반영",
    "선물 대상별 추천 기준 적용",
    "가볍고 대량 선물에 적합한 상품 우선 정렬",
    "PDF, 패스포트, 비교 페이지로 연결",
  ],
  actionLinks: {
    guide: buildGuideUrl(),
    passport: buildPassportUrl(),
    compare: buildCompareUrl(),
  },
};

export function getMockTripFromQuery(params: URLSearchParams) {
  const user = params.get("user");
  const trip = params.get("trip");

  // Future API integration can replace this mock resolver with a booking-context API lookup.
  if ((!user || user === "demo") && (!trip || trip === "philippines-bohol")) {
    return mockUserTrip;
  }

  return mockUserTrip;
}
