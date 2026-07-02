"use client";

import { useEffect, useMemo, useState } from "react";
import { getPluginPlaceLabel } from "@/config/webApp";
import {
  buildProductsForSelection,
  DEFAULT_ROUTE_SELECTION,
  readRouteSelection,
  type SouvenirRouteSelection,
} from "../souvenir-session";
import {
  GuideHero,
  ProductCompareTable,
  ServiceShell,
} from "../service-ui";

export default function ComparePage() {
  const [selection, setSelection] =
    useState<SouvenirRouteSelection>(DEFAULT_ROUTE_SELECTION);
  const [isPluginSource, setIsPluginSource] = useState(false);
  const [pluginPlaceLabel, setPluginPlaceLabel] = useState("필리핀 보홀");
  const [pluginRecipientLabel, setPluginRecipientLabel] = useState("회사 동료");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setSelection(readRouteSelection());
      setIsPluginSource(params.get("source") === "plugin");
      setPluginPlaceLabel(getPluginPlaceLabel(params));
      setPluginRecipientLabel(
        params.get("recipient") === "coworkers" ? "회사 동료" : "선택한 선물 대상"
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const products = useMemo(() => buildProductsForSelection(selection), [selection]);

  return (
    <ServiceShell active="compare" selection={selection}>
      <div className="grid gap-5">
        {isPluginSource && (
          <section
            data-testid="plugin-compare-banner"
            className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900"
          >
            <p className="text-xs font-black text-blue-700">
              플러그인 추천 결과 기반
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {pluginPlaceLabel} 기념품 비교
            </p>
            <p className="mt-1 text-sm font-medium text-blue-900">
              {pluginRecipientLabel} 선물 기준으로 비교합니다.
            </p>
          </section>
        )}
        <GuideHero
          selection={selection}
          title={
            isPluginSource
              ? `${pluginPlaceLabel} 기념품 비교`
              : `${selection.country} 기념품 전체 비교`
          }
          description={
            isPluginSource
              ? `${pluginRecipientLabel} 선물 기준으로 비교합니다.`
              : "추천 화면에서 선택한 여행 맥락을 기반으로 가격, 휴대성, 선물 적합도, 현지 대표성, 추천도를 한눈에 비교합니다."
          }
        />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.35)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">전체 비교 보기</h2>
              <p className="mt-1 text-sm text-slate-500">
                가격, 휴대성, 선물 적합도, 현지 대표성, 추천도, 주의사항을 한눈에 비교합니다.
              </p>
            </div>
            <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              Data: sample / mock / estimated / needsVerification
            </p>
          </div>
          <div className="mt-5">
            <ProductCompareTable products={products} selection={selection} />
          </div>
        </section>
        <div className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-800 md:grid-cols-[1fr_1fr]">
          <p>TIP: 현지 공항 면세점보다 시내 마트나 로컬 상점이 더 저렴한 경우가 많아요.</p>
          <p>모든 비교 정보는 샘플 데이터로, 실제 구매 전 현지 가격과 품질을 꼭 확인하세요.</p>
        </div>
      </div>
    </ServiceShell>
  );
}
