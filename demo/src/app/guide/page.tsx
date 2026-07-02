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
  GuideInfoCards,
  PdfPreviewPanel,
  ProductCompareTable,
  ServiceShell,
  TopFiveList,
} from "../service-ui";

export default function GuidePage() {
  const [selection, setSelection] =
    useState<SouvenirRouteSelection>(DEFAULT_ROUTE_SELECTION);
  const [isPluginSource, setIsPluginSource] = useState(false);
  const [pluginPlaceLabel, setPluginPlaceLabel] = useState("필리핀 보홀");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setSelection(readRouteSelection());
      setIsPluginSource(params.get("source") === "plugin");
      setPluginPlaceLabel(getPluginPlaceLabel(params));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const products = useMemo(() => buildProductsForSelection(selection), [selection]);

  return (
    <ServiceShell active="guide" selection={selection}>
      <div className="grid gap-5">
        {isPluginSource && (
          <section
            data-testid="plugin-guide-banner"
            className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900"
          >
            <p className="text-xs font-black text-blue-700">
              플러그인 추천 결과 기반
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {pluginPlaceLabel} 여행가이드
            </p>
            <p className="mt-1 text-sm font-medium text-blue-900">
              플러그인 추천 결과를 기반으로 생성된 가이드입니다.
            </p>
          </section>
        )}
        <GuideHero
          selection={selection}
          title={
            isPluginSource
              ? `${pluginPlaceLabel} 여행가이드`
              : `${selection.country} 기념품 여행가이드`
          }
          description={
            isPluginSource
              ? "플러그인 추천 결과를 기반으로 생성된 가이드입니다."
              : "추천 화면에서 선택한 여행 맥락을 기반으로 제작된 맞춤형 기념품 여행가이드 PDF입니다."
          }
        />
        <PdfPreviewPanel selection={selection} products={products} />
        <TopFiveList products={products} />
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-slate-950">비교표</h2>
          <div className="mt-4">
            <ProductCompareTable products={products} selection={selection} />
          </div>
        </section>
        <GuideInfoCards />
      </div>
    </ServiceShell>
  );
}
