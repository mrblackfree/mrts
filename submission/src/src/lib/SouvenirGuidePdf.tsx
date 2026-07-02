"use client";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
  TravelSituation,
  TravelType,
} from "../types/souvenir";

export type SouvenirGuidePdfInput = {
  country: CountryName;
  category: string;
  travelSituation: TravelSituation;
  travelType: TravelType;
  giftRecipient: GiftRecipient;
  criteria: RecommendationCriterion[];
  products: RecommendedSouvenirProduct[];
};

type GuideProduct = {
  productName: string;
  brandName: string;
  packageSize: string;
  price: string;
  rating: string;
  matchScore: number;
  matchReason: string;
  purchaseTip: string;
  caution: string;
  badges: string[];
};

type GuideSeed = {
  name: string;
  brand: string;
  packageSize: string;
  price: string;
  tip: string;
  caution: string;
};

Font.register({
  family: "NotoSansKR",
  src: "/fonts/NotoSansKR-Regular.ttf",
});

Font.registerHyphenationCallback((word) => [word]);

const COUNTRY_GUIDE_TOP5: Partial<Record<CountryName, GuideSeed[]>> = {
  필리핀: [
    {
      name: "바나나칩",
      brand: "필리핀 마트 대표 간식",
      packageSize: "소포장/대용량",
      price: "100~240 PHP",
      tip: "여러 명에게 줄 때는 60g 전후 소포장 묶음과 400g 대용량을 함께 비교하세요.",
      caution: "당 함량과 기름짐, 봉지 밀봉 상태를 확인하고 캐리어 안쪽에 넣어 파손을 줄이세요.",
    },
    {
      name: "드라이망고",
      brand: "세부/마닐라 인기 건과일",
      packageSize: "100~200g",
      price: "150~350 PHP",
      tip: "지퍼백 포장과 유통기한을 확인하고, 회사용은 낱개 포장이 쉬운 제품을 고르세요.",
      caution: "말린 과일은 무게가 빨리 늘어나므로 대량 구매 전 캐리어 여유를 확인하세요.",
    },
    {
      name: "우베 과자",
      brand: "로컬 디저트 스낵",
      packageSize: "개별 포장",
      price: "120~280 PHP",
      tip: "우베 향이 강한 제품과 부드러운 제품을 나눠 비교하면 호불호를 줄일 수 있습니다.",
      caution: "보라색 크림류는 더위에 약할 수 있어 귀국 직전 구매가 좋습니다.",
    },
    {
      name: "코코넛 스낵",
      brand: "트로피컬 코코넛 간식",
      packageSize: "80~150g",
      price: "90~220 PHP",
      tip: "가벼운 칩 형태를 고르면 여러 봉지를 사도 휴대성이 좋습니다.",
      caution: "부서지기 쉬우므로 단단한 제품 사이에 끼워 넣지 마세요.",
    },
    {
      name: "필리핀 커피",
      brand: "바라코/로컬 원두",
      packageSize: "100~250g",
      price: "180~500 PHP",
      tip: "분쇄도와 로스팅 날짜를 확인하고, 사무실 공유용은 드립백 형태도 고려하세요.",
      caution: "강한 향이 나는 원두는 밀봉 포장을 한 번 더 확인하세요.",
    },
  ],
  일본: [
    {
      name: "도쿄바나나",
      brand: "도쿄 대표 디저트",
      packageSize: "8~12개입",
      price: "1,000~2,000 JPY",
      tip: "공항 매장에서도 구하기 쉽지만 한정 맛은 도심 매장을 먼저 확인하세요.",
      caution: "유통기한이 짧은 편이라 귀국 직전 구매가 좋습니다.",
    },
    {
      name: "로이스 초콜릿",
      brand: "홋카이도 초콜릿",
      packageSize: "생초콜릿 박스",
      price: "900~1,800 JPY",
      tip: "보냉 포장 가능 여부를 확인하고 이동 시간이 길면 마지막 일정에 구매하세요.",
      caution: "여름철과 장거리 이동에서는 녹을 수 있어 보관 온도에 주의하세요.",
    },
    {
      name: "말차 과자",
      brand: "우지/교토 말차 스낵",
      packageSize: "개별 포장",
      price: "700~1,800 JPY",
      tip: "회사 동료용은 개별 포장과 진한 말차 맛의 균형을 보고 고르세요.",
      caution: "쓴맛이 강한 제품은 호불호가 있으니 설명이 쉬운 제품을 선택하세요.",
    },
    {
      name: "지역 한정 키캣",
      brand: "현지 한정 초콜릿",
      packageSize: "미니팩",
      price: "400~1,200 JPY",
      tip: "지역명이 선명한 패키지를 고르면 여행 기념 느낌이 잘 살아납니다.",
      caution: "초콜릿류는 고온 보관에 약하므로 캐리어 상단은 피하세요.",
    },
    {
      name: "시로이코이비토",
      brand: "홋카이도 쿠키",
      packageSize: "12~24개입",
      price: "900~2,500 JPY",
      tip: "정갈한 선물 느낌이 필요할 때 좋고, 상사/거래처용으로도 무난합니다.",
      caution: "쿠키가 깨지지 않도록 박스 모서리 눌림을 확인하세요.",
    },
  ],
  대만: [
    {
      name: "펑리수",
      brand: "대만 대표 파인애플 케이크",
      packageSize: "6~12개입",
      price: "250~600 TWD",
      tip: "달기와 버터 향이 브랜드마다 달라 시식 가능 매장을 활용하세요.",
      caution: "박스가 무거운 편이라 여러 상자를 살 때 수하물 무게를 확인하세요.",
    },
    {
      name: "누가크래커",
      brand: "야시장/베이커리 인기 간식",
      packageSize: "개별 포장",
      price: "180~450 TWD",
      tip: "파 향이 있는 제품과 부드러운 누가 제품을 구분해서 고르세요.",
      caution: "더운 날에는 누가가 물러질 수 있어 직사광선을 피하세요.",
    },
    {
      name: "우롱차",
      brand: "아리산/동방미인 계열",
      packageSize: "티백/잎차",
      price: "300~1,200 TWD",
      tip: "차를 잘 모르는 대상에게는 티백형, 차를 좋아하는 대상에게는 소포장 잎차가 좋습니다.",
      caution: "고가 차는 산지와 등급 표기를 확인하고 과도한 호객 가격은 피하세요.",
    },
    {
      name: "망고젤리",
      brand: "열대 과일 젤리",
      packageSize: "대용량 봉지",
      price: "120~300 TWD",
      tip: "여러 명에게 나눠 주기 쉬운 개별 포장 제품을 고르세요.",
      caution: "젤리류는 부피가 커질 수 있어 캐리어 빈 공간을 계산하세요.",
    },
    {
      name: "타로 과자",
      brand: "대만식 타로 스낵",
      packageSize: "봉지/박스",
      price: "100~280 TWD",
      tip: "타로 향이 부담스럽지 않은 바삭한 스낵형을 고르면 무난합니다.",
      caution: "부서짐이 쉬운 제품은 단단한 상자 포장을 우선하세요.",
    },
  ],
};

const badgeByCriterion: Partial<Record<RecommendationCriterion, string>> = {
  가성비: "Fair Price Guide",
  휴대성: "Easy to Carry",
  "대량 선물용": "Bulk Gift",
  "현지 대표성": "Local Favorite",
  고급스러움: "Premium Gift",
  "호불호 적음": "MRT Recommended",
  "브랜드 신뢰도": "Brand Trusted",
  "리뷰 평점": "Review Pick",
};

const styles = StyleSheet.create({
  page: {
    padding: 34,
    paddingBottom: 64,
    fontFamily: "NotoSansKR",
    fontSize: 9.2,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  headerBar: {
    height: 7,
    backgroundColor: "#0077ed",
    margin: -34,
    marginBottom: 28,
  },
  brand: {
    color: "#0077ed",
    fontSize: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    lineHeight: 1.25,
    color: "#07111f",
    marginBottom: 6,
  },
  subtitle: {
    color: "#526074",
    marginBottom: 18,
  },
  contextGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  contextCard: {
    width: "31.8%",
    borderWidth: 1,
    borderColor: "#cfe3ff",
    backgroundColor: "#f4f9ff",
    borderRadius: 7,
    padding: 9,
  },
  contextLabel: {
    color: "#0077ed",
    fontSize: 7,
    marginBottom: 4,
  },
  contextValue: {
    color: "#101827",
    fontSize: 9,
  },
  sectionTitle: {
    color: "#0d2f5f",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 10,
    paddingLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0077ed",
  },
  productCard: {
    borderWidth: 1,
    borderColor: "#d9e5f4",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fbfdff",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  productName: {
    fontSize: 12,
    color: "#0b2d5b",
  },
  scoreBadge: {
    minWidth: 56,
    textAlign: "center",
    color: "#007a52",
    backgroundColor: "#eafaf2",
    borderRadius: 6,
    padding: 4,
    fontSize: 8,
  },
  bodyText: {
    lineHeight: 1.55,
    color: "#334155",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  badge: {
    borderWidth: 1,
    borderColor: "#cfe3ff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: "#0068d8",
    backgroundColor: "#f4f9ff",
    fontSize: 7.5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d9e5f4",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 14,
  },
  comparisonSection: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
  },
  th: {
    backgroundColor: "#f3f7fb",
    color: "#41516a",
    fontSize: 7.4,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#d9e5f4",
  },
  td: {
    color: "#172033",
    fontSize: 7.2,
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: "#e6edf5",
    borderRightWidth: 1,
    borderRightColor: "#e6edf5",
  },
  guideGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  guideBox: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f4f9ff",
    borderWidth: 1,
    borderColor: "#cfe3ff",
  },
  guideTitle: {
    color: "#0b2d5b",
    fontSize: 11,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 22,
    color: "#697386",
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: "#e6edf5",
    paddingTop: 7,
  },
});

function buildGuideProducts(input: SouvenirGuidePdfInput): GuideProduct[] {
  const seeds = COUNTRY_GUIDE_TOP5[input.country];
  const badges = [
    ...input.criteria.map((criterion) => badgeByCriterion[criterion]).filter(Boolean),
    "MRT Recommended",
  ].slice(0, 4) as string[];

  if (seeds) {
    return seeds.map((seed, index) => ({
      productName: seed.name,
      brandName: seed.brand,
      packageSize: seed.packageSize,
      price: seed.price,
      rating: (4.7 - index * 0.1).toFixed(1),
      matchScore: Math.max(88, 100 - index * 3),
      matchReason: `${input.giftRecipient} 대상에 ${input.criteria.join(
        ", "
      )} 기준이 잘 맞는 ${input.country} 대표 기념품입니다.`,
      purchaseTip: seed.tip,
      caution: seed.caution,
      badges,
    }));
  }

  return input.products.slice(0, 5).map((product) => ({
    productName: product.productName,
    brandName: product.brandName,
    packageSize: product.packageSize,
    price: product.estimatedPrice.display,
    rating: product.rating.value.toFixed(1),
    matchScore: product.matchScore,
    matchReason: product.matchReason,
    purchaseTip: product.purchaseTip,
    caution: product.caution,
    badges: product.matchedCriteria.slice(0, 4),
  }));
}

function ContextCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contextCard}>
      <Text style={styles.contextLabel}>{label}</Text>
      <Text style={styles.contextValue}>{value}</Text>
    </View>
  );
}

function ProductBlock({
  product,
  index,
}: {
  product: GuideProduct;
  index: number;
}) {
  return (
    <View style={styles.productCard} wrap={false}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>
          {index + 1}. {product.productName}
        </Text>
        <Text style={styles.scoreBadge}>MATCH {product.matchScore}</Text>
      </View>
      <Text style={styles.bodyText}>추천 이유: {product.matchReason}</Text>
      <Text style={styles.bodyText}>예상 가격대: {product.price}</Text>
      <Text style={styles.bodyText}>구매 팁: {product.purchaseTip}</Text>
      <Text style={styles.bodyText}>주의사항: {product.caution}</Text>
      <View style={styles.badgeRow}>
        {product.badges.map((badge) => (
          <Text key={badge} style={styles.badge}>
            {badge}
          </Text>
        ))}
      </View>
    </View>
  );
}

function TableCell({
  children,
  width,
  header = false,
}: {
  children: string;
  width: string;
  header?: boolean;
}) {
  return (
    <Text style={[header ? styles.th : styles.td, { width }]}>{children}</Text>
  );
}

function ComparisonTable({ products }: { products: GuideProduct[] }) {
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.row}>
        <TableCell width="31%" header>
          기념품
        </TableCell>
        <TableCell width="22%" header>
          브랜드/유형
        </TableCell>
        <TableCell width="17%" header>
          가격대
        </TableCell>
        <TableCell width="12%" header>
          평점
        </TableCell>
        <TableCell width="18%" header>
          매칭
        </TableCell>
      </View>
      {products.map((product) => (
        <View key={product.productName} style={styles.row} wrap={false}>
          <TableCell width="31%">{product.productName}</TableCell>
          <TableCell width="22%">{product.brandName}</TableCell>
          <TableCell width="17%">{product.price}</TableCell>
          <TableCell width="12%">{product.rating}</TableCell>
          <TableCell width="18%">{`${product.matchScore}/100`}</TableCell>
        </View>
      ))}
    </View>
  );
}

export function SouvenirGuidePdfDocument({
  input,
}: {
  input: SouvenirGuidePdfInput;
}) {
  const products = buildGuideProducts(input);

  return (
    <Document
      title={`${input.country} 기념품 여행가이드`}
      author="MyRealTrip Souvenir Assistant"
      subject="마이리얼트립 기념품 도우미 MVP 데모"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} fixed />
        <Text style={styles.brand}>MyRealTrip Souvenir Assistant</Text>
        <Text style={styles.title}>{input.country} 기념품 여행가이드</Text>
        <Text style={styles.subtitle}>
          마이리얼트립 기념품 도우미 MVP 데모 · sample / mock / estimated /
          needsVerification 데이터
        </Text>

        <View style={styles.contextGrid}>
          <ContextCard label="여행 상황" value={input.travelSituation} />
          <ContextCard label="여행 유형" value={input.travelType} />
          <ContextCard label="선물 대상" value={input.giftRecipient} />
          <ContextCard label="추천 기준" value={input.criteria.join(", ")} />
          <ContextCard label="추천 카테고리" value={input.category} />
          <ContextCard label="데이터" value="sample / estimated" />
        </View>

        <Text style={styles.sectionTitle}>추천 기념품 TOP 5</Text>
        {products.map((product, index) => (
          <ProductBlock
            key={`${product.productName}-${index}`}
            product={product}
            index={index}
          />
        ))}

        <View style={styles.comparisonSection} wrap={false}>
          <Text style={styles.sectionTitle}>비교표</Text>
          <ComparisonTable products={products} />
        </View>

        <View style={styles.guideGrid} wrap={false}>
          <View style={styles.guideBox}>
            <Text style={styles.guideTitle}>바가지 방지 가격 가이드</Text>
            <Text style={styles.bodyText}>
              공항보다 현지 마트와 공식 판매처의 가격을 먼저 확인하세요. 가격,
              리뷰, 평점은 MVP 검증을 위한 샘플/추정 데이터이며 실제 구매 전
              확인이 필요합니다.
            </Text>
          </View>
          <View style={styles.guideBox}>
            <Text style={styles.guideTitle}>기내/캐리어 참고사항</Text>
            <Text style={styles.bodyText}>
              과자류는 눌림을 피하고, 액상 제품은 기내 반입 제한과 누수
              가능성을 확인하세요. 선물 수량이 많으면 부피와 파손 가능성을 함께
              고려하세요.
            </Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          실제 구매, 결제, 배송, 실시간 재고, 실제 회원 계정 연동은 MVP에
          포함하지 않습니다. Demo: https://mrt-souvenir.vercel.app
        </Text>
      </Page>
    </Document>
  );
}

export async function createSouvenirGuidePdfBlob(input: SouvenirGuidePdfInput) {
  return pdf(<SouvenirGuidePdfDocument input={input} />).toBlob();
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSouvenirGuidePdf(
  input: SouvenirGuidePdfInput,
  filename: string
) {
  const blob = await createSouvenirGuidePdfBlob(input);
  downloadPdfBlob(blob, filename);
}
