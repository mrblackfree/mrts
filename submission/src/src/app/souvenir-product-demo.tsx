"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import categoryGroups from "@/product-builder/data/souvenir-categories.json";
import {
  recommendDiverseSouvenirs,
} from "@/product-builder/lib/recommendSouvenirs";
import {
  buildPassportEntry,
  readStoredPassportBook,
  writeStoredPassportBook,
} from "./souvenir-passport";
import {
  buildSelectionUrl,
  COUNTRY_SLUGS,
  readRouteSelection,
  souvenirSavedSlugFor,
  writeRouteSelection,
  type SouvenirRouteSelection,
} from "./souvenir-session";
import {
  BeachScene,
  CountryFlag,
  MrtServiceHeader,
  PersistentSidebar,
  SidebarIcon,
} from "./service-ui";
import {
  categoryArtUrl,
  getCategoryVisual,
} from "./category-visuals";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
  TravelSituation,
  TravelType,
} from "@/product-builder/types/souvenir";

type CategoryGroup = {
  country: CountryName;
  categories: string[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function rankClass(index: number) {
  if (index === 0) return "bg-amber-400 text-white";
  if (index === 1) return "bg-slate-400 text-white";
  if (index === 2) return "bg-amber-800 text-white";
  return "bg-slate-500 text-white";
}

function ProductSummaryTable({
  products,
}: {
  products: RecommendedSouvenirProduct[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[980px] border-collapse text-xs">
        <thead className="bg-slate-50 text-left text-xs font-black text-slate-500">
          <tr>
            <th className="px-3 py-2.5 text-center">제품</th>
            <th className="px-3 py-2.5">브랜드</th>
            <th className="px-3 py-2.5">용량</th>
            <th className="px-3 py-2.5">예상 가격</th>
            <th className="px-3 py-2.5">평점</th>
            <th className="px-3 py-2.5">리뷰 수</th>
            <th className="px-3 py-2.5">추천 대상</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product, index) => (
            <tr key={product.productId} className="bg-white">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                      rankClass(index)
                    )}
                  >
                    {index + 1}
                  </span>
                  <img
                    src={product.thumbnailUrl}
                    alt={`${product.productName} 썸네일`}
                    className="h-9 w-9 rounded-md border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-bold text-slate-900">
                    {product.productName}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-slate-600">{product.brandName}</td>
              <td className="px-3 py-2.5 text-slate-600">{product.packageSize}</td>
              <td className="px-3 py-2.5 font-black text-slate-800">
                {product.estimatedPrice.display}
              </td>
              <td className="px-3 py-2.5 text-slate-700">
                <span className="text-amber-500">★</span>{" "}
                {product.rating.value.toFixed(1)}
              </td>
              <td className="px-3 py-2.5 text-slate-600">
                {product.reviewCount.value.toLocaleString("ko-KR")}
              </td>
              <td className="px-3 py-2.5 text-slate-600">
                {product.bestFor.join(", ")}
              </td>
              <td className="px-3 py-2.5 text-right text-slate-400">
                <span className="text-lg">›</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationCard({
  product,
  index,
}: {
  product: RecommendedSouvenirProduct;
  index: number;
}) {
  const visual = getCategoryVisual(product.category);

  return (
    <article className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_14px_34px_-30px_rgba(30,64,175,0.45)] transition hover:-translate-y-0.5 hover:border-blue-200">
      <div className="absolute left-2.5 top-2.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-slate-500 text-[11px] font-black text-white">
        {index + 1}
      </div>
      <button
        type="button"
        aria-label={`${product.productName} 저장`}
        className="absolute right-2.5 top-2.5 z-[1] rounded-full bg-white/85 p-1 text-slate-400 transition hover:text-blue-600"
      >
        <SidebarIcon name="heart" className="h-4 w-4" />
      </button>

      <div className="mx-auto flex h-20 items-center justify-center">
        <img
          src={product.thumbnailUrl}
          alt={`${product.productName} 썸네일`}
          className="max-h-[76px] max-w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="mt-2">
        <span className="rounded bg-orange-50 px-2 py-1 text-[11px] font-black text-orange-600">
          {visual.badgeLabel}
        </span>
        <h3 className="mt-1.5 min-h-8 text-[13px] font-black leading-4 text-slate-950">
          {product.productName}
        </h3>
        <p className="line-clamp-1 text-[11px] font-medium leading-[18px] text-slate-500">
          {product.reviewSummary}
        </p>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-[13px] font-black text-slate-950">
              {product.estimatedPrice.display}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              <span className="text-amber-500">★</span> {product.rating.value.toFixed(1)} ·{" "}
              {product.reviewCount.value.toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-center">
            <p className="text-base font-black text-emerald-700">{product.matchScore}</p>
            <p className="text-[9px] font-black text-emerald-700">MATCH</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {product.matchedCriteria.slice(0, 2).map((criterion) => (
            <span
              key={criterion}
              className="rounded bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700"
            >
              {criterion}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function CategorySelector({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}) {
  const display = ["전체", ...categories, "초콜릿/사탕", "뷰티/헬스"];

  return (
    <div className="relative z-[1] mt-9 flex gap-3 overflow-x-auto pb-1">
      {display.map((category) => {
        const active = category === "전체" ? true : activeCategory === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => category !== "전체" && onSelect(category)}
            className={cx(
              "grid h-[148px] min-w-[154px] grid-rows-[106px_1fr] overflow-hidden rounded-xl border bg-white text-center shadow-[0_16px_34px_-28px_rgba(15,23,42,0.72)] transition hover:-translate-y-0.5 hover:border-blue-200 active:translate-y-[1px]",
              active ? "border-blue-200" : "border-slate-200"
            )}
          >
            <span className="relative flex items-end justify-center bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.95),rgba(219,234,254,0.46)_48%,transparent_72%)] p-2">
              <img
                src={categoryArtUrl(category)}
                alt={`${category} 이미지`}
                className="h-[96px] w-[130px] object-contain drop-shadow-[0_18px_20px_rgba(15,23,42,0.16)]"
                referrerPolicy="no-referrer"
              />
            </span>
            <span className="flex items-center justify-center px-2 text-[15px] font-black text-slate-950">
              {category}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CategoryRecommendationStrip({
  categories,
  onSelect,
}: {
  categories: string[];
  onSelect: (category: string) => void;
}) {
  return (
    <section
      id="category-recommendations"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-40px_rgba(30,64,175,0.38)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <SidebarIcon name="gift" className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-black tracking-normal text-slate-950">
            카테고리별 추천 기념품
          </h2>
        </div>
        <button type="button" className="flex items-center gap-1 text-sm font-black text-blue-600">
          전체 보기 <span className="text-xl leading-none">›</span>
        </button>
      </div>
      <div className="mt-4 grid auto-cols-[224px] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.slice(0, 6).map((category) => {
          const visual = getCategoryVisual(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className={cx(
                "group relative min-h-[292px] overflow-hidden rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_46px_-34px_rgba(15,23,42,0.75)] active:translate-y-[1px]",
                visual.cardClass
              )}
            >
              <div className="relative z-[1]">
                <div className="flex items-start gap-2">
                  <span
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.78)]",
                      visual.iconClass
                    )}
                  >
                    <img
                      src={categoryArtUrl(category)}
                      alt=""
                      className="h-8 w-8 object-contain"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <p className="text-lg font-black text-slate-950">{category}</p>
                    <p className="mt-0.5 text-sm font-black text-current">{visual.countLabel}</p>
                  </div>
                </div>
                <div className={cx("mt-4 h-1 w-8 rounded-full opacity-70", visual.accentClass)} />
                <p className="mt-4 line-clamp-3 min-h-[72px] text-sm font-bold leading-6 text-slate-700">
                  {visual.summary}
                </p>
                <div className="mt-3 flex h-32 items-end justify-center">
                  <img
                    src={categoryArtUrl(category)}
                    alt={`${category} 대표 이미지`}
                    className="max-h-32 w-full object-contain drop-shadow-[0_22px_18px_rgba(15,23,42,0.18)] transition group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 opacity-70">
                <div className="absolute bottom-0 right-6 h-36 w-36 rounded-full bg-white/55 blur-2xl" />
                <div className="absolute bottom-10 right-3 h-28 w-28 rounded-full border border-current/10 opacity-30" />
              </div>
              <span className="absolute bottom-5 right-4 z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-black text-blue-600 shadow-[0_16px_28px_-18px_rgba(15,23,42,0.7)]">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActionCard({
  icon,
  title,
  body,
  onClick,
  testId,
}: {
  icon: "document" | "passport" | "chart" | "bookmark";
  title: string;
  body: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="grid min-h-16 grid-cols-[40px_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 active:translate-y-[1px]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
        <SidebarIcon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{body}</p>
      </div>
    </button>
  );
}

function LoadingPanel() {
  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 xl:grid-cols-5">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="space-y-3">
          <div className="h-32 rounded-md bg-slate-100" />
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function SouvenirProductDemo() {
  const [country, setCountry] = useState<CountryName>("필리핀");
  const [category, setCategory] = useState("바나나칩");
  const [giftRecipient, setGiftRecipient] =
    useState<GiftRecipient>("회사 동료");
  const [criteria, setCriteria] = useState<RecommendationCriterion[]>([
    "가성비",
    "대량 선물용",
    "휴대성",
  ]);
  const [travelSituation, setTravelSituation] =
    useState<TravelSituation>("귀국 전날");
  const [travelType, setTravelType] = useState<TravelType>("출장/비즈니스");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const categoryOptions = useMemo(() => {
    return (
      (categoryGroups as CategoryGroup[]).find((group) => group.country === country)
        ?.categories ?? []
    );
  }, [country]);

  useEffect(() => {
    const nextSelection = readRouteSelection();
    setCountry(nextSelection.country);
    setCategory(nextSelection.category);
    setGiftRecipient(nextSelection.giftRecipient);
    setCriteria(nextSelection.criteria);
    setTravelSituation(nextSelection.travelSituation);
    setTravelType(nextSelection.travelType);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  const routeSelection: SouvenirRouteSelection = useMemo(
    () => ({
      country,
      category,
      giftRecipient,
      criteria,
      travelSituation,
      travelType,
      limit: 5,
    }),
    [country, category, giftRecipient, criteria, travelSituation, travelType]
  );

  const products = useMemo(() => {
    return recommendDiverseSouvenirs(routeSelection);
  }, [routeSelection]);

  const selectedCriteriaLabel = criteria.join(" · ");

  function queueRefresh() {
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
    }
    setIsRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimer.current = null;
    }, 180);
  }

  function selectCountry(nextCountry: CountryName) {
    queueRefresh();
    setCountry(nextCountry);
    const firstCategory =
      (categoryGroups as CategoryGroup[]).find((group) => group.country === nextCountry)
        ?.categories[0] ?? "";
    setCategory(firstCategory);
  }

  function toggleCriterion(criterion: RecommendationCriterion) {
    queueRefresh();
    setCriteria((current) => {
      if (current.includes(criterion)) {
        const next = current.filter((item) => item !== criterion);
        return next.length > 0 ? next : current;
      }

      return [...current, criterion];
    });
  }

  function persistRouteSelection(shouldSavePassport = false) {
    writeRouteSelection(routeSelection);

    if (!shouldSavePassport) {
      return;
    }

    const nextEntry = buildPassportEntry(country, products, criteria);
    if (!nextEntry) {
      return;
    }

    const passportBook = readStoredPassportBook();
    const nextBook = {
      ...passportBook,
      [nextEntry.country]: nextEntry,
    };
    writeStoredPassportBook(nextBook);
  }

  function openServicePage(path: "/guide" | "/passport" | "/compare") {
    persistRouteSelection(path === "/passport");

    if (path === "/passport") {
      const savedSlugs = products
        .slice(0, 5)
        .map((product) => souvenirSavedSlugFor(product.category))
        .join(",");
      const passportUrl = buildSelectionUrl(
        `/passport/${COUNTRY_SLUGS[country]}?saved=${encodeURIComponent(savedSlugs)}`,
        routeSelection,
        { category: "all" }
      );
      window.open(passportUrl, "_blank", "noopener,noreferrer");
      return;
    }

    window.open(
      buildSelectionUrl(path, routeSelection, {
        category: path === "/compare" ? "all" : "selected",
      }),
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f8fc] text-slate-950">
      <MrtServiceHeader active="home" />

      <div className="mrt-service-layout">
        <div className="mrt-service-sidebar">
          <PersistentSidebar
            selection={routeSelection}
            productCount={8}
            reviewCount={112}
            categoryOptions={categoryOptions}
            onCountrySelect={selectCountry}
            onCategorySelect={(nextCategory) => {
              queueRefresh();
              setCategory(nextCategory);
            }}
            onTravelSituationSelect={(nextSituation) => {
              queueRefresh();
              setTravelSituation(nextSituation);
            }}
            onTravelTypeSelect={(nextType) => {
              queueRefresh();
              setTravelType(nextType);
            }}
            onGiftRecipientSelect={(nextRecipient) => {
              queueRefresh();
              setGiftRecipient(nextRecipient);
            }}
            onCriterionToggle={toggleCriterion}
            onRecommendClick={queueRefresh}
          />
        </div>

        <section className="mrt-service-main space-y-3">
          <section className="relative min-h-[348px] overflow-hidden rounded-lg border border-blue-100 bg-white p-6 shadow-[0_18px_46px_-40px_rgba(30,64,175,0.45)]">
            <BeachScene />
            <div className="relative max-w-[840px]">
              <p className="text-sm font-black text-blue-600">
                {country} <span className="mx-2 text-slate-300">›</span> {travelType}{" "}
                <span className="mx-2 text-slate-300">›</span> {giftRecipient}{" "}
                <span className="mx-2 text-slate-300">›</span> {selectedCriteriaLabel}
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-normal text-slate-950 md:text-[42px]">
                오늘의 {country} 기념품 전체 추천{" "}
                <CountryFlag country={country} className="ml-2 inline-flex h-5 w-8 align-[-3px]" />
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
                다양한 카테고리의 인기 기념품을 한눈에 비교하고 당신에게 딱 맞는
                선물을 찾아보세요.
              </p>
            </div>
            <CategorySelector
              categories={categoryOptions}
              activeCategory={category}
              onSelect={(nextCategory) => {
                queueRefresh();
                setCategory(nextCategory);
              }}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_16px_42px_-38px_rgba(30,64,175,0.38)]">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <SidebarIcon name="spark" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    전체 추천 TOP 5 <span className="text-sm font-bold text-slate-500">(모든 카테고리 통합)</span>
                  </h2>
                </div>
              </div>
              <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                가격은 평균가 기준 ({products[0]?.estimatedPrice.currency ?? "PHP"}) · Sample / Estimated
              </p>
            </div>

            {isRefreshing ? (
              <LoadingPanel />
            ) : products.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {products.map((product, index) => (
                  <RecommendationCard
                    key={product.productId}
                    product={product}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-black text-slate-950">
                  추천할 제품 샘플이 없습니다
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  선택한 국가와 카테고리에 제품 데이터를 추가하면 추천 결과가 표시됩니다.
                </p>
              </div>
            )}
          </section>

          <ProductSummaryTable products={products} />

          <CategoryRecommendationStrip
            categories={categoryOptions}
            onSelect={(nextCategory) => {
              queueRefresh();
              setCategory(nextCategory);
            }}
          />

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
            이번 추천은 {travelSituation}, {travelType}, {giftRecipient}, {selectedCriteriaLabel}
            을 기준으로 산정되었습니다.
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              icon="document"
              title="여행가이드 PDF 보기"
              body="선택 조건 기반 Guide"
              testId="open-guide-button"
              onClick={() => openServicePage("/guide")}
            />
            <ActionCard
              icon="passport"
              title="내 기념품 패스포트에 저장"
              body="TOP 5 컬렉션 기록"
              testId="open-passport-button"
              onClick={() => openServicePage("/passport")}
            />
            <ActionCard
              icon="chart"
              title="전체 비교 보기"
              body="카테고리별 비교"
              testId="open-compare-button"
              onClick={() => openServicePage("/compare")}
            />
            <ActionCard
              icon="bookmark"
              title="다른 선물 대상 추천받기"
              body="선물 대상만 다시 선택"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
