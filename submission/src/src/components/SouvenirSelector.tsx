"use client";

import { useEffect, useMemo, useState } from "react";
import countries from "../../data/countries.json";
import categoryGroups from "../../data/souvenir-categories.json";
import {
  buildRecommendationTitle,
  recommendSouvenirs,
} from "../lib/recommendSouvenirs";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
} from "../types/souvenir";
import { ProductComparisonCard } from "./ProductComparisonCard";
import { ProductComparisonTable } from "./ProductComparisonTable";
import {
  buildSouvenirPassportEntry,
  isPassportCountry,
  readStoredSouvenirPassportBook,
  SouvenirPassport,
  type PassportCountry,
  type SouvenirPassportBook,
  type SouvenirPassportEntry,
  writeStoredSouvenirPassportBook,
} from "./SouvenirPassport";

const RECIPIENTS: GiftRecipient[] = [
  "부모님",
  "배우자/연인",
  "아이",
  "친구",
  "회사 동료",
  "상사/거래처",
  "가족 전체",
  "나를 위한 기념품",
];

const CRITERIA: RecommendationCriterion[] = [
  "가성비",
  "고급스러움",
  "휴대성",
  "현지 대표성",
  "호불호 적음",
  "대량 선물용",
  "브랜드 신뢰도",
  "리뷰 평점",
];

const COUNTRY_SLUGS: Record<CountryName, string> = {
  일본: "japan",
  태국: "thailand",
  베트남: "vietnam",
  필리핀: "philippines",
  대만: "taiwan",
  싱가포르: "singapore",
  홍콩: "hongkong",
};

type CategoryGroup = {
  country: CountryName;
  categories: string[];
};

export function SouvenirSelector() {
  const [country, setCountry] = useState<CountryName>("필리핀");
  const [category, setCategory] = useState("바나나칩");
  const [giftRecipient, setGiftRecipient] =
    useState<GiftRecipient>("회사 동료");
  const [criteria, setCriteria] = useState<RecommendationCriterion[]>([
    "가성비",
    "대량 선물용",
    "휴대성",
  ]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [passportBook, setPassportBook] = useState<SouvenirPassportBook>({});
  const [latestPassportEntry, setLatestPassportEntry] =
    useState<SouvenirPassportEntry | null>(null);
  const [activePassportCountry, setActivePassportCountry] =
    useState<PassportCountry>("필리핀");

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      const storedBook = readStoredSouvenirPassportBook();
      setPassportBook(storedBook);
      const firstStoredCountry = Object.keys(storedBook).find(isPassportCountry);
      if (firstStoredCountry) {
        setActivePassportCountry(firstStoredCountry);
        setLatestPassportEntry(storedBook[firstStoredCountry] ?? null);
      }
    }, 0);

    return () => window.clearTimeout(storageTimer);
  }, []);

  const categories = useMemo(() => {
    const group = (categoryGroups as CategoryGroup[]).find(
      (item) => item.country === country
    );
    return group ? group.categories : [];
  }, [country]);

  const selection = useMemo(
    () => ({
      country,
      category,
      giftRecipient,
      criteria,
      travelSituation: "귀국 전날" as const,
      travelType: "출장/비즈니스" as const,
      limit: 5,
    }),
    [country, category, giftRecipient, criteria]
  );

  const products = useMemo(() => recommendSouvenirs(selection), [selection]);
  const title = buildRecommendationTitle(selection);

  function handleCountryChange(nextCountry: CountryName) {
    setCountry(nextCountry);
    const nextGroup = (categoryGroups as CategoryGroup[]).find(
      (item) => item.country === nextCountry
    );
    setCategory(nextGroup ? nextGroup.categories[0] : "");
  }

  function toggleCriterion(criterion: RecommendationCriterion) {
    setCriteria((current) => {
      if (current.includes(criterion)) {
        const next = current.filter((item) => item !== criterion);
        return next.length > 0 ? next : [criterion];
      }

      return [...current, criterion];
    });
  }

  async function handleDownloadPdf() {
    setIsDownloadingPdf(true);
    try {
      const { downloadSouvenirGuidePdf } = await import(
        "../lib/createSouvenirGuidePdf"
      );
      await downloadSouvenirGuidePdf(
        {
          ...selection,
          products,
        },
        `${COUNTRY_SLUGS[country]}-souvenir-guide.pdf`
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  function handleSavePassport() {
    const nextEntry = buildSouvenirPassportEntry(country, criteria, products);
    if (!nextEntry) {
      return;
    }

    const nextBook = {
      ...passportBook,
      [nextEntry.country]: nextEntry,
    };
    setPassportBook(nextBook);
    setLatestPassportEntry(nextEntry);
    setActivePassportCountry(nextEntry.country);
    writeStoredSouvenirPassportBook(nextBook);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">
          기념품 제품 비교
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          국가, 카테고리, 선물 대상, 기준을 선택하세요.
        </p>

        <div className="mt-5 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-800">국가</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(countries as Array<{ nameKo: CountryName }>).map((item) => (
                <button
                  key={item.nameKo}
                  type="button"
                  onClick={() => handleCountryChange(item.nameKo)}
                  className={
                    country === item.nameKo
                      ? "rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                      : "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  }
                >
                  {item.nameKo}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">카테고리</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={
                    category === item
                      ? "rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                      : "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <label className="block text-sm font-semibold text-slate-800">
            선물 대상
            <select
              value={giftRecipient}
              onChange={(event) =>
                setGiftRecipient(event.target.value as GiftRecipient)
              }
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {RECIPIENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">추천 기준</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CRITERIA.map((criterion) => (
                <label
                  key={criterion}
                  className={
                    criteria.includes(criterion)
                      ? "flex items-center gap-2 rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                      : "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  }
                >
                  <input
                    type="checkbox"
                    checked={criteria.includes(criterion)}
                    onChange={() => toggleCriterion(criterion)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {criterion}
                </label>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <section className="space-y-5">
        <header>
          <p className="text-sm font-semibold text-blue-700">
            {country} / {category} / {giftRecipient}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            {title}
          </h1>
        </header>
        <ProductComparisonTable products={products} />
        <div className="grid gap-4 xl:grid-cols-3">
          {products.slice(0, 3).map((product, index) => (
            <ProductComparisonCard
              key={product.productId}
              product={product}
              rank={index + 1}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {isDownloadingPdf ? "PDF 생성 중..." : "여행가이드 PDF 다운로드"}
          </button>
          <button
            type="button"
            onClick={handleSavePassport}
            className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700"
          >
            기념품 패스포트에 저장
          </button>
          <p className="w-full text-xs text-blue-700">
            PDF와 패스포트 저장은 MVP 데모 기능이며 실제 계정/DB 저장은 하지 않습니다.
          </p>
        </div>
        {(latestPassportEntry || Object.keys(passportBook).length > 0) && (
          <SouvenirPassport
            book={passportBook}
            activeCountry={activePassportCountry}
            latestEntry={latestPassportEntry}
            onActiveCountryChange={setActivePassportCountry}
          />
        )}
      </section>
    </section>
  );
}
