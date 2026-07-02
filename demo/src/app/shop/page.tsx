"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_VISUALS, categoryArtUrl } from "../category-visuals";
import {
  buildProductsForSelection,
  DEFAULT_ROUTE_SELECTION,
  readRouteSelection,
  type SouvenirRouteSelection,
} from "../souvenir-session";
import { CountryFlag, ServiceShell, SidebarIcon } from "../service-ui";
import type { RecommendedSouvenirProduct } from "@/product-builder/types/souvenir";

const SHOP_BENEFITS = [
  {
    title: "정품/공식 판매처 검증 예정",
    body: "향후 공식 총판과 제휴해 신뢰 가능한 기념품 구매 흐름으로 확장할 수 있습니다.",
    icon: "shield" as const,
  },
  {
    title: "여행 전·후 재구매 확장",
    body: "출국 전 미리 보기, 귀국 후 다시 구매하기로 이어지는 커머스 구조를 보여줍니다.",
    icon: "passport" as const,
  },
  {
    title: "선물 패키지 구성 가능",
    body: "회사 동료, 가족, 친구 등 대상별 세트 구성으로 확장 가능한 MVP 샘플입니다.",
    icon: "gift" as const,
  },
  {
    title: "구매 기능은 미구현",
    body: "현재 화면은 데모이며 실제 결제, 배송, 재고, 판매자 연결은 포함하지 않습니다.",
    icon: "info" as const,
  },
];

function ShopHero({ selection }: { selection: SouvenirRouteSelection }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-blue-100 bg-white p-7 shadow-[0_18px_46px_-40px_rgba(30,64,175,0.45)]">
      <img
        src="/hero-philippines-beach.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,89,133,0.84),rgba(0,119,237,0.56)_42%,rgba(255,255,255,0.16)_100%)]" />
      <div className="relative max-w-2xl py-5 text-white">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] backdrop-blur">
          <CountryFlag country={selection.country} className="h-3.5 w-5" />
          {selection.country} Souvenir Shop MVP
        </p>
        <h1 className="mt-6 text-4xl font-black tracking-normal md:text-[48px]">
          {selection.country} 기념품 구매
        </h1>
        <p className="mt-4 max-w-xl text-base font-bold leading-7 text-blue-50">
          추천과 비교에서 고른 기념품을 실제 커머스 카테고리로 확장했을 때의 샘플 화면입니다.
          현재는 sample / estimated 데이터만 사용합니다.
        </p>
      </div>
    </section>
  );
}

function ShopCategoryStrip() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">기념품 카테고리</h2>
        <p className="text-xs font-black text-blue-600">국가별 대표 기념품 샘플</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-9">
        {CATEGORY_VISUALS.map((category) => (
          <article
            key={category.slug}
            className="group rounded-lg border border-slate-200 bg-white p-3 text-center shadow-[0_16px_28px_-24px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:border-blue-200"
          >
            <div className="mx-auto h-24 w-full overflow-hidden rounded-md bg-slate-50">
              <img
                src={categoryArtUrl(category.category)}
                alt={`${category.category} 이미지`}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <h3 className="mt-3 text-[13px] font-black text-slate-950">{category.category}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShopProductCard({
  product,
  index,
}: {
  product: RecommendedSouvenirProduct;
  index: number;
}) {
  return (
    <article className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.32)]">
      <span className="absolute left-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-[#0068ff] text-xs font-black text-white">
        {index + 1}
      </span>
      <div className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-500">
        sample
      </div>
      <div className="mx-auto flex h-40 items-center justify-center overflow-hidden rounded-md bg-slate-50">
        <img
          src={product.thumbnailUrl}
          alt={`${product.productName} 썸네일`}
          className="h-full w-full object-contain p-3"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="mt-4 inline-flex rounded bg-orange-50 px-2 py-1 text-[11px] font-black text-orange-600">
        {product.category}
      </p>
      <h3 className="mt-2 min-h-[44px] text-sm font-black leading-5 text-slate-950">
        {product.productName}
      </h3>
      <p className="mt-1 text-xs font-bold text-slate-500">{product.brandName}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-black text-amber-500">★ {product.rating.value.toFixed(1)}</span>
        <span className="font-bold text-slate-500">리뷰 {product.reviewCount.value}</span>
      </div>
      <p className="mt-3 text-base font-black text-slate-950">{product.estimatedPrice.display}</p>
      <button
        type="button"
        className="mt-4 h-10 w-full rounded-md border border-blue-100 bg-blue-50 text-xs font-black text-blue-700"
        aria-label={`${product.productName} 샘플 상품 안내`}
      >
        구매 기능 준비중
      </button>
    </article>
  );
}

function ShopBenefitBar() {
  return (
    <section className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/80 p-4 md:grid-cols-4">
      {SHOP_BENEFITS.map((benefit) => (
        <div key={benefit.title} className="grid grid-cols-[34px_1fr] gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600">
            <SidebarIcon name={benefit.icon} className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xs font-black text-slate-950">{benefit.title}</h3>
            <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{benefit.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function ShopReferenceScreens() {
  const screens = [
    {
      src: "/shop-reference/mrt-shop-top.png",
      alt: "마이리얼트립 기념품 구매 상단 화면 예시",
    },
    {
      src: "/shop-reference/mrt-shop-bottom.png",
      alt: "마이리얼트립 기념품 구매 하단 화면 예시",
    },
  ];

  return (
    <section className="grid gap-4">
      {screens.map((screen) => (
        <img
          key={screen.src}
          src={screen.src}
          alt={screen.alt}
          className="block w-full rounded-lg border border-slate-200 bg-white shadow-[0_22px_56px_-44px_rgba(15,23,42,0.4)]"
        />
      ))}
    </section>
  );
}

export default function ShopPage() {
  const [selection, setSelection] =
    useState<SouvenirRouteSelection>(DEFAULT_ROUTE_SELECTION);

  useEffect(() => {
    const timer = window.setTimeout(() => setSelection(readRouteSelection()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const products = useMemo(
    () => buildProductsForSelection(selection).slice(0, 5),
    [selection]
  );

  return (
    <ServiceShell
      active="shop"
      selection={selection}
      fullWidthAfter={<ShopReferenceScreens />}
    >
      <div className="grid gap-5">
        <ShopHero selection={selection} />
        <ShopCategoryStrip />
        <ShopBenefitBar />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {selection.country} 추천 상품 TOP 5
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                추천 화면의 여행 맥락을 이어받은 샘플 커머스 카드입니다.
              </p>
            </div>
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              sample / mock / estimated
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {products.map((product, index) => (
              <ShopProductCard
                key={product.productId}
                product={product}
                index={index}
              />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
            <div className="rounded-lg bg-blue-50 p-5">
              <p className="text-xs font-black text-blue-600">해커톤 MVP 범위</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">구매 연결은 향후 확장</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                실제 구매, 결제, 배송, 실시간 재고, 판매자 연결은 구현하지 않았습니다.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-5">
              <p className="text-xs font-black text-amber-700">선물용 추천</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">대상별 세트 가능성</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                회사 동료, 가족, 친구용으로 묶음 패키지를 설계할 수 있는 구조입니다.
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-700">국내 재구매</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">여행 후 반복 커머스</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                귀국 후 다시 찾는 기념품 구매 경험으로 확장할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ServiceShell>
  );
}
