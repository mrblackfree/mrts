"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import categoryGroups from "@/product-builder/data/souvenir-categories.json";
import countries from "@/product-builder/data/countries.json";
import { downloadSouvenirGuidePdf } from "./create-souvenir-guide-pdf";
import {
  buildSouvenirGuidePdfData,
  type GuideNote,
  type GuideProduct,
} from "./SouvenirGuidePdf";
import {
  compareScore,
  DEFAULT_ROUTE_SELECTION,
  getPdfFilename,
  type SouvenirRouteSelection,
} from "./souvenir-session";
import type {
  CountryName,
  GiftRecipient,
  RecommendationCriterion,
  RecommendedSouvenirProduct,
  TravelSituation,
  TravelType,
} from "@/product-builder/types/souvenir";

export const MRT_LOGO_URL =
  "https://dffoxz5he03rp.cloudfront.net/logos/logo_mrt_v2_web.svg";

type GuideData = {
  selection: SouvenirRouteSelection;
  products: RecommendedSouvenirProduct[];
};

type SidebarProps = {
  selection?: SouvenirRouteSelection;
  productCount?: number;
  reviewCount?: number;
  categoryOptions?: string[];
  onCountrySelect?: (country: CountryName) => void;
  onCategorySelect?: (category: string) => void;
  onTravelSituationSelect?: (situation: TravelSituation) => void;
  onTravelTypeSelect?: (travelType: TravelType) => void;
  onGiftRecipientSelect?: (recipient: GiftRecipient) => void;
  onCriterionToggle?: (criterion: RecommendationCriterion) => void;
  onRecommendClick?: () => void;
};

type CategoryGroup = {
  country: CountryName;
  categories: string[];
};

type CountryRecord = {
  nameKo: CountryName;
  displayOrder: number;
};

const SIDEBAR_SITUATIONS: Array<{ label: string; value: TravelSituation }> = [
  { label: "귀국 전날", value: "귀국 전날" },
  { label: "여행 중", value: "여행 중" },
  { label: "여행 준비 중", value: "출국 전 미리 알아보기" },
];

const SIDEBAR_TRAVEL_TYPES: Array<{ label: string; value: TravelType; icon: SidebarIconName }> = [
  { label: "출장/비즈니스", value: "출장/비즈니스", icon: "briefcase" },
  { label: "가족 여행", value: "가족 여행", icon: "group" },
  { label: "커플 여행", value: "커플 여행", icon: "heart" },
  { label: "개인 여행", value: "혼자 여행", icon: "person" },
];

const SIDEBAR_RECIPIENTS: Array<{ label: string; value: GiftRecipient; icon: SidebarIconName }> = [
  { label: "회사 동료", value: "회사 동료", icon: "building" },
  { label: "친구", value: "친구", icon: "group" },
  { label: "가족", value: "가족 전체", icon: "home" },
  { label: "어린이", value: "아이", icon: "child" },
  { label: "연인", value: "배우자/연인", icon: "heart" },
  { label: "거래처/고객", value: "상사/거래처", icon: "briefcase" },
  { label: "나를 위한 선물", value: "나를 위한 기념품", icon: "gift" },
];

const SIDEBAR_CRITERIA: Array<{ label: string; value: RecommendationCriterion; icon: SidebarIconName }> = [
  { label: "가성비", value: "가성비", icon: "tag" },
  { label: "대량 선물용", value: "대량 선물용", icon: "gift" },
  { label: "휴대성", value: "휴대성", icon: "briefcase" },
  { label: "고급스러움", value: "고급스러움", icon: "diamond" },
  { label: "현지 대표성", value: "현지 대표성", icon: "pin" },
  { label: "호불호 적음", value: "호불호 적음", icon: "smile" },
  { label: "브랜드 신뢰도", value: "브랜드 신뢰도", icon: "shield" },
  { label: "리뷰 평점", value: "리뷰 평점", icon: "star" },
];

const SIDEBAR_COUNTRIES = [...(countries as CountryRecord[])].sort(
  (a, b) => a.displayOrder - b.displayOrder
);

type SidebarIconName =
  | "gift"
  | "briefcase"
  | "group"
  | "heart"
  | "person"
  | "check"
  | "spark"
  | "chart"
  | "document"
  | "passport"
  | "bookmark"
  | "grid"
  | "download"
  | "info"
  | "tag"
  | "shield"
  | "plane"
  | "calendar"
  | "pin"
  | "clipboard"
  | "building"
  | "home"
  | "child"
  | "diamond"
  | "smile"
  | "star";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CountryFlag({
  country,
  className,
}: {
  country: CountryName | "마카오";
  className?: string;
}) {
  if (country === "일본") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-white", className)}>
        <span className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
      </span>
    );
  }

  if (country === "대만") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-red-500", className)}>
        <span className="absolute left-0 top-0 h-[58%] w-[56%] bg-blue-800" />
        <span className="absolute left-[18%] top-[18%] h-[20%] w-[20%] rounded-full bg-white" />
      </span>
    );
  }

  if (country === "태국") {
    return (
      <span
        className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200", className)}
        style={{
          background:
            "linear-gradient(180deg,#ef4444 0 18%,#ffffff 18% 34%,#1e3a8a 34% 66%,#ffffff 66% 82%,#ef4444 82% 100%)",
        }}
      />
    );
  }

  if (country === "베트남") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-red-600", className)}>
        <span className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300" />
      </span>
    );
  }

  if (country === "싱가포르") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-white", className)}>
        <span className="absolute inset-x-0 top-0 h-1/2 bg-red-600" />
        <span className="absolute left-[14%] top-[12%] h-[34%] w-[34%] rounded-full border-2 border-white" />
      </span>
    );
  }

  if (country === "홍콩") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-red-600", className)}>
        <span className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </span>
    );
  }

  if (country === "마카오") {
    return (
      <span className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200 bg-emerald-600", className)}>
        <span className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <span
      className={cx("relative inline-block h-4 w-6 overflow-hidden rounded-sm border border-slate-200", className)}
      style={{ background: "linear-gradient(90deg,#1d4ed8 0 50%,#ef4444 50% 100%)" }}
    >
      <span className="absolute left-0 top-0 h-full w-2.5 bg-white [clip-path:polygon(0_0,100%_50%,0_100%)]" />
      <span className="absolute left-[12%] top-1/2 h-[30%] w-[30%] -translate-y-1/2 rounded-full bg-yellow-300" />
    </span>
  );
}

export function SidebarIcon({
  name,
  className,
}: {
  name: SidebarIconName;
  className?: string;
}) {
  if (name === "gift") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 10h16v10H4V10Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v12M3 8h18v2H3V8Z" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8C9.6 7.7 7.8 6.9 7.5 5.5 7.2 4.1 8.2 3.2 9.4 3.5 10.8 3.8 11.6 5.4 12 8ZM12 8c2.4-.3 4.2-1.1 4.5-2.5.3-1.4-.7-2.3-1.9-2-1.4.3-2.2 1.9-2.6 4.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "briefcase") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 7V5h6v2M4 8h16v11H4V8Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 13h16M10 13v2h4v-2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "group") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.5 10.5a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 20c.6-4 2.6-6 5.5-6s4.9 2 5.5 6M14 15c2.6.3 4.2 2 4.8 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M20.4 5.8a5 5 0 0 0-7.1 0L12 7.1l-1.3-1.3a5 5 0 1 0-7.1 7.1L12 21l8.4-8.1a5 5 0 0 0 0-7.1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "person") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20c.9-4.1 3.2-6.2 7-6.2s6.1 2.1 7 6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 20V4M5 20h15M9 16V9M13 16V6M17 16v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "document") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 3v5h5M9 13h6M9 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "passport") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "bookmark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 4h10v16l-5-3-5 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6ZM14 14h6v6h-6v-6Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "tag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 11V5h6l9 9-6 6-9-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 8h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 3 5 6v6c0 4.3 2.8 7.6 7 9 4.2-1.4 7-4.7 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "plane") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M3.5 11.5 20 4l-7.5 16-2.4-7.2-6.6-1.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m10.1 12.8 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M6 5h12v15H6V5ZM6 9h12M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M8 5h8M9 3h6l1 3H8l1-3ZM6 6h12v15H6V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 21V5h10v16M15 10h4v11M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1M4 21h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 11.5 12 5l8 6.5V21H4v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "child") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 20c1-3 2.7-4.5 5-4.5s4 1.5 5 4.5M9.2 9.5h.01M14.8 9.5h.01M10 12c1.1.8 2.9.8 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "diamond") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 4h10l4 6-9 10-9-10 4-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M3 10h18M8 4l4 16 4-16" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "smile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 10h.01M15 10h.01M8.8 14c1.6 1.8 4.8 1.8 6.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "star") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="m12 3 2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 16.6 6.6 19.7l1.2-6.1-4.6-4.2 6.2-.7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v6M12 7.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getCategoryOptions(country: CountryName) {
  return (
    (categoryGroups as CategoryGroup[]).find((group) => group.country === country)
      ?.categories ?? ["바나나칩", "드라이망고", "우베 과자", "코코넛 스낵", "필리핀 커피", "칼라만시"]
  );
}

function CategoryPictogram({ category, className }: { category: string; className?: string }) {
  const palette =
    category === "드라이망고"
      ? { bg: "#fff3cc", ink: "#f59e0b", accent: "#fbbf24" }
      : category === "우베 과자"
        ? { bg: "#f4e8ff", ink: "#7c3aed", accent: "#a855f7" }
        : category === "코코넛 스낵"
          ? { bg: "#fff7ed", ink: "#854d0e", accent: "#d97706" }
          : category === "필리핀 커피"
            ? { bg: "#fff7ed", ink: "#92400e", accent: "#c08457" }
            : category === "칼라만시"
              ? { bg: "#ecfccb", ink: "#65a30d", accent: "#a3e635" }
              : { bg: "#fff7d6", ink: "#d97706", accent: "#fde68a" };

  if (category === "우베 과자") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="30" fill={palette.bg} />
        <ellipse cx="30" cy="34" rx="20" ry="14" fill={palette.ink} opacity="0.9" />
        <path d="M18 36c10-10 22-13 33-8M22 44c8-7 18-10 29-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }

  if (category === "코코넛 스낵") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="30" fill={palette.bg} />
        <circle cx="28" cy="34" r="18" fill={palette.ink} />
        <circle cx="35" cy="29" r="16" fill="#fff" />
        <path d="M17 22c6-7 13-10 22-10" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === "필리핀 커피") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="30" fill={palette.bg} />
        <path d="M18 24h26v16a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10V24Z" fill="#fff" stroke={palette.ink} strokeWidth="3" />
        <path d="M44 29h5a6 6 0 0 1 0 12h-5" stroke={palette.ink} strokeWidth="3" fill="none" />
        <path d="M24 18c-1.5-4 4-5 2-9M32 18c-1.5-4 4-5 2-9" stroke={palette.accent} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === "칼라만시") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="30" fill={palette.bg} />
        <circle cx="28" cy="34" r="15" fill={palette.accent} stroke={palette.ink} strokeWidth="3" />
        <path d="M28 20v28M14 34h28M18 24l20 20M38 24 18 44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="42" cy="25" r="10" fill="#84cc16" opacity="0.95" />
      </svg>
    );
  }

  if (category === "드라이망고") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="30" fill={palette.bg} />
        <path d="M20 44c18-3 29-16 24-29-17 2-29 16-24 29Z" fill={palette.accent} stroke={palette.ink} strokeWidth="3" />
        <path d="M41 15c5-2 8 0 10 4" stroke="#65a30d" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill={palette.bg} />
      <path d="M20 47c15-5 26-17 25-31-12 1-25 13-25 31Z" fill={palette.accent} stroke={palette.ink} strokeWidth="3" />
      <path d="M20 47c9-10 15-17 25-31M24 27c6 2 11 2 16-1M22 37c8 2 14 2 19-1" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function SidebarSectionTitle({
  icon,
  title,
  hint,
}: {
  icon: SidebarIconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <SidebarIcon name={icon} className="h-5 w-5 text-blue-600" />
      <h2 className="text-[12px] font-black leading-none tracking-normal text-slate-950">
        {title}
        {hint && <span className="ml-1.5 align-middle text-[12px] font-bold text-slate-500">{hint}</span>}
      </h2>
    </div>
  );
}

function FilterButton({
  active,
  children,
  className,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "min-h-9 break-keep rounded-lg border px-2 font-bold leading-tight transition active:translate-y-[1px]",
        active
          ? "border-[#2b7cff] bg-[#f2f8ff] text-[#0050c8] shadow-[inset_0_0_0_1px_rgba(0,104,255,0.06)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

export function PersistentSidebar({
  selection = DEFAULT_ROUTE_SELECTION,
  categoryOptions,
  onCountrySelect,
  onCategorySelect,
  onTravelSituationSelect,
  onTravelTypeSelect,
  onGiftRecipientSelect,
  onCriterionToggle,
  onRecommendClick,
}: SidebarProps) {
  const categories = categoryOptions?.length
    ? categoryOptions
    : getCategoryOptions(selection.country);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-42px_rgba(15,23,42,0.42)]">
        <div className="space-y-4">
          <section>
            <SidebarSectionTitle icon="pin" title="국가" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SIDEBAR_COUNTRIES.map((item) => (
                <FilterButton
                  key={item.nameKo}
                  active={selection.country === item.nameKo}
                  onClick={() => onCountrySelect?.(item.nameKo)}
                  className="flex min-h-[38px] items-center justify-center gap-1.5 text-[12px]"
                >
                  <CountryFlag country={item.nameKo} className="h-3.5 w-5 shrink-0" />
                  <span>{item.nameKo}</span>
                </FilterButton>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          <section>
            <SidebarSectionTitle icon="tag" title="카테고리" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.slice(0, 6).map((item) => (
                <FilterButton
                  key={item}
                  active={selection.category === item}
                  onClick={() => onCategorySelect?.(item)}
                  className="flex min-h-[48px] items-center gap-1.5 text-left text-[12px]"
                >
                  <CategoryPictogram category={item} className="h-6 w-6 shrink-0" />
                  <span className="min-w-0 break-keep leading-tight">{item}</span>
                </FilterButton>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 active:translate-y-[1px]"
            >
              <SidebarIcon name="grid" className="h-4 w-4 text-blue-600" />
              전체 보기
            </button>
          </section>

          <div className="h-px bg-slate-100" />

          <section>
            <SidebarSectionTitle icon="briefcase" title="여행 상황" />
            <div className="grid grid-cols-3 gap-2">
              {SIDEBAR_SITUATIONS.map((item) => (
                <FilterButton
                  key={item.label}
                  active={selection.travelSituation === item.value}
                  onClick={() => onTravelSituationSelect?.(item.value)}
                  className="flex min-h-[46px] items-center justify-center gap-1.5 text-center text-[12px]"
                >
                  <SidebarIcon
                    name={
                      item.value === "귀국 전날"
                        ? "calendar"
                        : item.value === "여행 중"
                          ? "pin"
                          : "clipboard"
                    }
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="break-keep leading-tight">{item.label}</span>
                </FilterButton>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          <section>
            <SidebarSectionTitle icon="plane" title="여행 유형" />
            <div className="grid grid-cols-4 gap-2">
              {SIDEBAR_TRAVEL_TYPES.map((item) => (
                <FilterButton
                  key={item.label}
                  active={selection.travelType === item.value}
                  onClick={() => onTravelTypeSelect?.(item.value)}
                  className="flex min-h-[60px] flex-col items-center justify-center gap-1 px-1.5 text-[12px]"
                >
                  <SidebarIcon name={item.icon} className="h-5 w-5" />
                  <span className="break-keep leading-tight">{item.label}</span>
                </FilterButton>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          <section>
            <SidebarSectionTitle icon="gift" title="선물 대상" hint="(복수 선택 가능)" />
            <div className="grid grid-cols-3 gap-2">
              {SIDEBAR_RECIPIENTS.map((item) => (
                <FilterButton
                  key={item.label}
                  active={selection.giftRecipient === item.value}
                  onClick={() => onGiftRecipientSelect?.(item.value)}
                  className="flex min-h-[44px] items-center gap-1.5 text-left text-[12px]"
                >
                  <SidebarIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span className="break-keep leading-tight">{item.label}</span>
                </FilterButton>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          <section>
            <SidebarSectionTitle icon="star" title="추천 기준" hint="(복수 선택 가능)" />
            <div className="grid grid-cols-3 gap-2">
              {SIDEBAR_CRITERIA.map((item) => {
                const active = selection.criteria.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={cx(
                      "relative flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border px-2 pr-7 text-[12px] font-bold leading-tight transition active:translate-y-[1px]",
                      active
                        ? "border-[#2b7cff] bg-[#f2f8ff] text-[#0050c8] shadow-[inset_0_0_0_1px_rgba(0,104,255,0.06)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">
                      <SidebarIcon name={item.icon} className="h-5 w-5" />
                    </span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onCriterionToggle?.(item.value)}
                      className="sr-only"
                    />
                    <span className="break-keep leading-tight">{item.label}</span>
                    {active && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                        <SidebarIcon name="check" className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={onRecommendClick}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0068ff] px-4 text-[12px] font-black text-white shadow-[0_18px_30px_-20px_rgba(0,104,255,0.72)] transition hover:bg-[#005be0] active:translate-y-[1px]"
          >
            기념품 추천 받기
            <SidebarIcon name="spark" className="h-4 w-4" />
          </button>
        </div>
      </section>
    </aside>
  );
}

export function MrtServiceHeader({
  active,
}: {
  active?: "home" | "auto" | "shop" | "guide" | "passport" | "compare";
}) {
  const links = [
    { href: "/auto-recommend", label: "자동추천", key: "auto" },
    { href: "/", label: "추천", key: "home" },
    { href: "/shop", label: "기념품 구매", key: "shop" },
    { href: "/guide", label: "여행가이드", key: "guide" },
    { href: "/passport", label: "패스포트", key: "passport" },
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center">
          <img
            src={MRT_LOGO_URL}
            alt="Myrealtrip"
            className="h-7 w-auto"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(37%) sepia(95%) saturate(3239%) hue-rotate(200deg) brightness(101%) contrast(105%)",
            }}
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-8 text-sm font-black text-slate-800 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "relative py-5 transition hover:text-blue-700",
                active === link.key && "text-blue-700"
              )}
            >
              {link.label}
              {active === link.key && (
                <span className="absolute inset-x-0 bottom-2 h-0.5 rounded-full bg-blue-600" />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function ServiceShell({
  active,
  children,
  selection = DEFAULT_ROUTE_SELECTION,
  fullWidthAfter,
}: {
  active: "home" | "auto" | "shop" | "guide" | "passport" | "compare";
  children: React.ReactNode;
  selection?: SouvenirRouteSelection;
  fullWidthAfter?: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-[#f5f8fc] text-slate-950">
      <MrtServiceHeader active={active} />
      <div className="mrt-service-layout">
        <div className="mrt-service-sidebar">
          <PersistentSidebar selection={selection} />
        </div>
        <div className="mrt-service-main">{children}</div>
      </div>
      {fullWidthAfter && (
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-8">
          {fullWidthAfter}
        </div>
      )}
    </main>
  );
}

export function BeachScene({ className }: { className?: string }) {
  return (
    <div className={cx("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}>
      <img
        src="/hero-philippines-beach.png"
        alt=""
        className="absolute inset-y-0 right-0 h-full w-[72%] object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,0.98)_24%,rgba(255,255,255,0.72)_47%,rgba(255,255,255,0.18)_72%,rgba(255,255,255,0.05)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(0deg,rgba(255,247,237,0.9),rgba(255,247,237,0))]" />
    </div>
  );
}

export function ContextChips({ selection }: { selection: SouvenirRouteSelection }) {
  const chips = [
    { label: "여행 상황", value: selection.travelSituation, icon: "person" as SidebarIconName },
    { label: "여행 유형", value: selection.travelType, icon: "briefcase" as SidebarIconName },
    { label: "선물 대상", value: selection.giftRecipient, icon: "group" as SidebarIconName },
    { label: "추천 기준", value: selection.criteria.join(" · "), icon: "gift" as SidebarIconName },
  ];

  return (
    <div className="relative z-[1] mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="grid min-h-24 grid-cols-[54px_1fr] items-center gap-4 rounded-lg border border-blue-100 bg-white/86 p-4 shadow-[0_14px_40px_-32px_rgba(30,64,175,0.65)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <SidebarIcon name={chip.icon} className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black text-blue-600">{chip.label}</p>
            <p className="mt-1 text-base font-black text-slate-950">{chip.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GuideHero({
  selection,
  title,
  description,
}: {
  selection: SouvenirRouteSelection;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-white p-7 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.45)]">
      <BeachScene />
      <div className="relative max-w-[640px]">
        <p className="text-sm font-black text-[#0068ff]">
          <CountryFlag country={selection.country} className="mr-2 align-[-2px]" />
          {selection.country} / {selection.category}
        </p>
        <h1 className="mt-5 text-4xl font-black tracking-normal text-slate-950 md:text-[44px]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
          {description ??
            "추천 화면에서 선택한 여행 맥락을 기반으로 실제 서비스처럼 상세 Guide, Passport, Compare 페이지를 탐색할 수 있습니다."}
        </p>
      </div>
      <ContextChips selection={selection} />
    </section>
  );
}

export function TopFiveList({ products }: { products: RecommendedSouvenirProduct[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">추천 기념품 TOP 5</h2>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          sample / estimated
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        {products.map((product, index) => (
          <article
            key={product.productId}
            className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[86px_1fr_auto]"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-200 bg-white">
              <img
                src={product.thumbnailUrl}
                alt={`${product.productName} 썸네일`}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-white">
                {index + 1}
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-blue-600">{product.brandName}</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">{product.productName}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{product.matchReason}</p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {product.estimatedPrice.display} · {product.packageSize}
              </p>
            </div>
            <div className="h-fit rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
              <p className="text-xl font-black text-emerald-700">{product.matchScore}</p>
              <p className="text-[10px] font-black text-emerald-700">MATCH</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScoreStars({ score, tone = "blue" }: { score: number; tone?: "blue" | "green" }) {
  const value = Math.max(1, Math.min(5, score));
  return (
    <div className={cx("font-black", tone === "green" ? "text-emerald-600" : "text-blue-600")}>
      {"★".repeat(value)}
      <span className="text-slate-300">{"★".repeat(5 - value)}</span>
      <p className="mt-1 text-xs text-slate-600">{value}/5</p>
    </div>
  );
}

export function ProductCompareTable({
  products,
  selection,
}: {
  products: RecommendedSouvenirProduct[];
  selection: SouvenirRouteSelection;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead className="bg-[#162235] text-left text-xs font-black text-white">
          <tr>
            <th className="px-5 py-4">기념품</th>
            <th className="px-5 py-4 text-center">가격</th>
            <th className="px-5 py-4 text-center">휴대성</th>
            <th className="px-5 py-4 text-center">선물 적합도</th>
            <th className="px-5 py-4 text-center">현지 대표성</th>
            <th className="px-5 py-4 text-center">추천도</th>
            <th className="px-5 py-4">주의사항</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => {
            const portability = compareScore(product, "휴대성", selection.giftRecipient);
            const giftFit = compareScore(product, "호불호 적음", selection.giftRecipient);
            const localFit = compareScore(product, "현지 대표성", selection.giftRecipient);
            const recommend = Math.max(1, Math.min(5, Math.round(product.matchScore / 20)));

            return (
              <tr key={product.productId} className="bg-white align-middle">
                <td className="px-5 py-4">
                  <div className="grid grid-cols-[58px_1fr] items-center gap-3">
                    <img
                      src={product.thumbnailUrl}
                      alt={`${product.productName} 썸네일`}
                      className="h-14 w-14 rounded-md border border-slate-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-black text-slate-950">{product.productName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{product.brandName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-center font-black text-slate-900">
                  {product.estimatedPrice.display}
                </td>
                <td className="px-5 py-4 text-center">
                  <ScoreStars score={portability} />
                </td>
                <td className="px-5 py-4 text-center">
                  <ScoreStars score={giftFit} />
                </td>
                <td className="px-5 py-4 text-center">
                  <ScoreStars score={localFit} />
                </td>
                <td className="px-5 py-4 text-center">
                  <ScoreStars score={recommend} tone="green" />
                </td>
                <td className="px-5 py-4 leading-6 text-slate-600">{product.caution}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GuideInfoCards() {
  const cards = [
    {
      title: "가격 가이드",
      icon: "tag" as SidebarIconName,
      body: "공항보다 현지 마트와 공식 판매처의 가격을 먼저 확인하세요. 가격, 리뷰, 평점은 MVP 검증을 위한 샘플/추정 데이터입니다.",
    },
    {
      title: "주의사항",
      icon: "shield" as SidebarIconName,
      body: "식품류는 유통기한, 알레르기 성분, 포장 밀봉 상태를 확인하고 실제 구매 전 판매처 정보를 재확인하세요.",
    },
    {
      title: "캐리어 참고사항",
      icon: "gift" as SidebarIconName,
      body: "대량 선물은 부피가 빨리 늘어납니다. 과자류는 깨짐을 피하고 액상 제품은 누수 가능성을 확인하세요.",
    },
    {
      title: "기내반입 참고사항",
      icon: "info" as SidebarIconName,
      body: "액상류와 젤류는 기내 반입 제한을 확인하세요. 파손 위험이 있는 제품은 위탁 수하물 안쪽에 넣는 것이 좋습니다.",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <div key={card.title} className="grid grid-cols-[48px_1fr] gap-4 rounded-lg border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600">
            <SidebarIcon name={card.icon} className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function PdfPreviewMetaGrid({ selection }: { selection: SouvenirRouteSelection }) {
  const items = [
    ["여행 상황", selection.travelSituation],
    ["여행 유형", selection.travelType],
    ["선물 대상", selection.giftRecipient],
    ["추천 기준", selection.criteria.join(" · ")],
    ["추천 카테고리", selection.category],
    ["데이터", "sample / estimated"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-black text-blue-600">{label}</p>
          <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

function PdfPreviewPage({
  pageNumber,
  title,
  children,
}: {
  pageNumber: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      data-testid="pdf-preview-page"
      className="mx-auto min-h-[920px] w-[794px] max-w-full rounded-lg border border-slate-200 bg-white p-8 text-slate-950 shadow-[0_30px_70px_-46px_rgba(15,23,42,0.55)] md:p-10"
    >
      <div className="-mx-8 -mt-8 mb-7 h-2 rounded-t-lg bg-[#0077ed] md:-mx-10 md:-mt-10" />
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-black text-blue-600">MyRealTrip Souvenir Assistant</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-3xl font-black tracking-normal text-slate-950">
              {title}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Page {pageNumber} / 3 · 실제 PDF 다운로드 파일과 동일한 데이터 구성
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
            {pageNumber} / 3
          </span>
        </div>
      </header>
      <div className="mt-7">{children}</div>
      <footer className="mt-8 border-t border-slate-200 pt-5 text-xs font-bold text-slate-500">
        실제 구매, 결제, 배송, 실시간 재고, 실제 회원 계정 연동은 MVP에 포함하지 않습니다.
      </footer>
    </article>
  );
}

function PdfPreviewContextGrid({
  contextItems,
}: {
  contextItems: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {contextItems.map((item) => (
        <div key={item.label} className="rounded-md border border-blue-100 bg-blue-50/50 px-4 py-3">
          <p className="text-xs font-black text-blue-600">{item.label}</p>
          <p className="mt-1 text-sm font-black text-slate-950">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function PdfPreviewComparisonTable({ products }: { products: GuideProduct[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black text-slate-600">
          <tr>
            <th className="px-3 py-3">기념품</th>
            <th className="px-3 py-3">브랜드/유형</th>
            <th className="px-3 py-3">가격대</th>
            <th className="px-3 py-3 text-center">평점</th>
            <th className="px-3 py-3 text-center">매칭</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.productName} className="bg-white">
              <td className="px-3 py-3 font-black text-slate-950">{product.productName}</td>
              <td className="px-3 py-3 text-slate-600">{product.brandName}</td>
              <td className="px-3 py-3 font-bold text-slate-700">{product.price}</td>
              <td className="px-3 py-3 text-center font-black text-amber-600">{product.rating}</td>
              <td className="px-3 py-3 text-center font-black text-emerald-600">
                {product.matchScore}/100
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PdfPreviewProductCard({
  product,
  index,
}: {
  product: GuideProduct;
  index: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-black text-slate-950">
          {index + 1}. {product.productName}
        </p>
        <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          MATCH {product.matchScore}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">추천 이유: {product.matchReason}</p>
      <p className="mt-2 text-sm font-bold text-slate-700">예상 가격대: {product.price}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">구매 팁: {product.purchaseTip}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">주의사항: {product.caution}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {product.badges.map((badge) => (
          <span key={badge} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}

function PdfPreviewNote({ note }: { note: GuideNote }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <p className="text-sm font-black text-blue-700">{note.title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{note.body}</p>
    </div>
  );
}

function PdfPreviewDocument({ selection, products }: GuideData) {
  const guideData = buildSouvenirGuidePdfData({
    ...selection,
    products,
  });

  return (
    <div className="grid gap-6">
      <PdfPreviewPage
        pageNumber={1}
        title={`${selection.country} 기념품 여행가이드`}
      >
        <PdfPreviewContextGrid contextItems={guideData.contextItems} />
        <section className="mt-8">
          <h4 className="border-l-4 border-blue-600 pl-3 text-xl font-black text-slate-950">
            추천 기념품 TOP 5 요약
          </h4>
          <div className="mt-4">
            <PdfPreviewComparisonTable products={guideData.products} />
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {guideData.guideNotes.slice(0, 2).map((note) => (
            <PdfPreviewNote key={note.title} note={note} />
          ))}
        </section>
      </PdfPreviewPage>

      <PdfPreviewPage
        pageNumber={2}
        title={`${selection.country} 추천 기념품 TOP 5 상세`}
      >
        <div className="grid gap-3">
          {guideData.products.map((product, index) => (
            <PdfPreviewProductCard
              key={`${product.productName}-${index}`}
              product={product}
              index={index}
            />
          ))}
        </div>
      </PdfPreviewPage>

      <PdfPreviewPage pageNumber={3} title="비교표와 여행 참고사항">
        <section>
          <h4 className="border-l-4 border-blue-600 pl-3 text-xl font-black text-slate-950">
            비교표
          </h4>
          <div className="mt-4">
            <PdfPreviewComparisonTable products={guideData.products} />
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {guideData.guideNotes.map((note) => (
            <PdfPreviewNote key={note.title} note={note} />
          ))}
        </section>
      </PdfPreviewPage>
    </div>
  );
}

export function PdfPreviewPanel({ selection, products }: GuideData) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadSouvenirGuidePdf(
        {
          ...selection,
          products,
        },
        getPdfFilename(selection.country)
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.35)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-[48px_1fr] gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-white">
            <SidebarIcon name="document" className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">PDF 미리보기</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                3페이지 구성
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              아래 1/2/3 페이지 미리보기와 동일한 내용이 PDF 다운로드 파일로 저장됩니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="download-pdf-button"
          onClick={handleDownload}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0068ff] px-5 text-sm font-black text-white shadow-[0_16px_28px_-22px_rgba(0,104,255,0.85)] transition hover:bg-[#005be0] active:translate-y-[1px]"
        >
          <SidebarIcon name="download" className="h-5 w-5" />
          {isDownloading ? "PDF 생성 중..." : "PDF 다운로드"}
        </button>
      </div>

      <div className="mt-5 overflow-auto rounded-lg border border-slate-200 bg-slate-100/80 p-4 md:p-6">
        <PdfPreviewDocument selection={selection} products={products} />
      </div>
    </section>
  );
}
