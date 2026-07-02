"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import {
  getMockTripFromQuery,
  mockUserTrip,
  type AutoGiftSet,
  type AutoRecommendedProduct,
  type MockBooking,
} from "@/data/mockBookings";
import { getPluginPlaceLabel } from "@/config/webApp";
import { DEFAULT_ROUTE_SELECTION } from "../souvenir-session";
import { CountryFlag, ServiceShell, SidebarIcon } from "../service-ui";

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BookingIcon({ type }: { type: MockBooking["type"] }) {
  const iconName = type === "flight" ? "plane" : type === "hotel" ? "home" : "pin";

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
      <SidebarIcon name={iconName} className="h-7 w-7" />
    </div>
  );
}

function BookingCard({ booking }: { booking: MockBooking }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
      <div className="flex items-start gap-4">
        <BookingIcon type={booking.type} />
        <div className="min-w-0">
          <p className="text-xs font-black text-blue-600">{booking.typeLabel} 예약</p>
          <h3 className="mt-1 text-lg font-black tracking-normal text-slate-950">
            {booking.title}
          </h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {booking.description}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-bold text-slate-700">
          추정 국가: <span className="font-black text-slate-950">{booking.inferredCountry}</span>
        </p>
        <p className="font-bold text-slate-700">
          추정 도시: <span className="font-black text-slate-950">{booking.inferredCity}</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {booking.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function ProductCard({ product }: { product: AutoRecommendedProduct }) {
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)] transition hover:-translate-y-0.5 hover:border-blue-200">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
          {product.rank}
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          MATCH {product.matchScore}
        </span>
      </div>
      <div className="mt-4 flex justify-center rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 p-4">
        <img
          src={product.imageUrl}
          alt={`${product.productName} 이미지`}
          className="h-28 w-28 object-contain transition group-hover:scale-105"
        />
      </div>
      <p className="mt-4 text-xs font-black text-orange-500">{product.category}</p>
      <h3 className="mt-1 min-h-12 text-base font-black leading-6 tracking-normal text-slate-950">
        {product.productName}
      </h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {product.recipients.map((recipient) => (
          <span
            key={recipient}
            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
          >
            {recipient}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{product.reason}</p>
      <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-800">
        {product.contextReason}
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-slate-500">예상 가격대</dt>
          <dd className="font-black text-slate-950">{product.estimatedPrice}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">주의사항</dt>
          <dd className="mt-1 font-medium leading-6 text-slate-600">{product.caution}</dd>
        </div>
      </dl>
    </article>
  );
}

function GiftSetCard({ giftSet }: { giftSet: AutoGiftSet }) {
  return (
    <article className="rounded-xl border border-blue-100 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-normal text-slate-950">{giftSet.title}</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          캐리어 부담 {giftSet.luggageLoad}
        </span>
      </div>
      <ul className="mt-4 grid gap-2">
        {giftSet.items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
              <SidebarIcon name="check" className="h-3 w-3" />
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {giftSet.features.map((feature) => (
          <span
            key={feature}
            className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
          >
            {feature}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{giftSet.note}</p>
    </article>
  );
}

export default function AutoRecommendPage() {
  const [trip, setTrip] = useState(mockUserTrip);
  const [isPluginSource, setIsPluginSource] = useState(false);
  const [pluginPlaceLabel, setPluginPlaceLabel] = useState("필리핀 보홀");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTrip(getMockTripFromQuery(params));
    setIsPluginSource(params.get("source") === "plugin");
    setPluginPlaceLabel(getPluginPlaceLabel(params));
  }, []);

  return (
    <ServiceShell active="auto" selection={DEFAULT_ROUTE_SELECTION}>
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-white p-6 shadow-[0_20px_60px_-46px_rgba(30,64,175,0.5)] md:p-8">
          <div className="absolute inset-0 opacity-95">
            <img
              src="/hero-philippines-beach.png"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/25" />
          </div>
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-sm font-black text-blue-700">
              <CountryFlag country={DEFAULT_ROUTE_SELECTION.country} className="h-4 w-6" />
              예약 기반 자동 추천 데모
            </div>
            {isPluginSource && (
              <div
                data-testid="plugin-source-banner"
                className="mt-4 max-w-xl rounded-xl border border-blue-200 bg-white/95 p-4 shadow-[0_16px_40px_-34px_rgba(0,104,255,0.75)]"
              >
                <span className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                  플러그인 연동 추천
                </span>
                <p className="mt-3 text-sm font-black leading-6 text-slate-950">
                  플러그인 추천 결과에서 이동했습니다.
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                  예약 맥락을 기준으로 {pluginPlaceLabel} 여행 기념품을 자동 추천합니다.
                </p>
              </div>
            )}
            <h1 className="mt-5 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
              이번 여행지 기준으로 기념품을 자동 추천했어요 🇵🇭
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              예약된 항공, 숙소, 투어 정보를 분석해 필리핀 보홀 여행으로 추정했습니다.
            </p>
            <div className="mt-6 grid gap-3 rounded-xl border border-blue-100 bg-white/90 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black text-blue-600">사용자</p>
                <p className="mt-1 text-sm font-black text-slate-950">{trip.userName}</p>
              </div>
              <div>
                <p className="text-xs font-black text-blue-600">여행 기간</p>
                <p className="mt-1 text-sm font-black text-slate-950">{trip.tripDates.display}</p>
              </div>
              <div>
                <p className="text-xs font-black text-blue-600">현재 상황</p>
                <p className="mt-1 text-sm font-black text-slate-950">{trip.currentStageLabel}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId("auto-results")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0068ff] px-5 text-sm font-black text-white shadow-[0_18px_30px_-18px_rgba(0,104,255,0.8)] transition hover:bg-[#005be0]"
              >
                자동 추천 결과 보기
                <SidebarIcon name="spark" className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="auto-guide-action"
                onClick={() => openInNewTab(trip.actionLinks.guide)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              >
                여행가이드 PDF 보기
                <SidebarIcon name="document" className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="auto-passport-action"
                onClick={() => openInNewTab(trip.actionLinks.passport)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              >
                기념품 패스포트에 저장
                <SidebarIcon name="passport" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {trip.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-xl border border-blue-100 bg-white p-6 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <SidebarIcon name="clipboard" className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-600">Booking Context</p>
                <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                  플러그인이 추정한 여행 맥락
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["여행 국가", trip.inferredContext.country],
                ["여행 도시", trip.inferredContext.city],
                ["여행 단계", trip.inferredContext.stage],
                ["여행 유형", trip.inferredContext.travelType],
                ["추천 대상", trip.giftRecipients.join(", ")],
                ["추천 기준", trip.criteria.join(", ")],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-blue-600">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-lg bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-900">
              실제 서비스에서는 마이리얼트립의 투어티켓, 숙소, 항공 예약 데이터와
              연동해 자동 추정할 수 있습니다. 현재는 MVP 데모를 위한 mock data입니다.
            </p>
          </article>

          <article className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <SidebarIcon name="spark" className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-700">Plugin Automation</p>
                <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                  플러그인이 자동으로 처리한 일
                </h2>
              </div>
            </div>
            <ol className="mt-5 grid gap-3">
              {trip.pluginSteps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 rounded-lg bg-white/80 p-3 text-sm font-bold text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section id="auto-results" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-blue-600">Auto Recommendation</p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                필리핀 보홀 여행 기준 자동 추천 TOP 5
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                회사 동료를 우선으로, 부모님과 아이 선물까지 함께 고려했습니다.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              sample / mock / estimated
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {trip.recommendedProducts.map((product) => (
              <ProductCard key={product.productName} product={product} />
            ))}
          </div>
        </section>

        <section id="gift-sets" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <SidebarIcon name="gift" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-blue-600">Gift Set Split</p>
              <h2 className="text-2xl font-black tracking-normal text-slate-950">
                누구에게 줄지 고민하지 않도록 자동으로 나눠봤어요
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {trip.giftSets.map((giftSet) => (
              <GiftSetCard key={giftSet.title} giftSet={giftSet} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <SidebarIcon name="calendar" className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black tracking-normal text-slate-950">
                귀국 전날 기념품 체크리스트
              </h2>
            </div>
            <ul className="mt-5 grid gap-3">
              {trip.checklist.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <SidebarIcon name="check" className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
              귀국 전날에는 무겁거나 깨지기 쉬운 상품보다 가볍고 나눠주기 쉬운
              기념품을 우선 추천합니다.
            </p>
          </article>

          <article className="rounded-xl border border-blue-100 bg-white p-6 shadow-[0_18px_45px_-38px_rgba(30,64,175,0.45)]">
            <p className="text-sm font-black text-blue-600">Next Action</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
              추천 결과에서 바로 이어지는 서비스 화면
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              추천 판단은 플러그인이 담당하고, 상세 Guide / Passport / Compare는
              Vercel 웹앱에서 실제 서비스 화면처럼 확인합니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-testid="auto-bottom-guide-action"
                onClick={() => openInNewTab(trip.actionLinks.guide)}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100/70"
              >
                <SidebarIcon name="document" className="h-7 w-7 shrink-0 text-blue-600" />
                <span>
                  <span className="block text-sm font-black text-slate-950">여행가이드 PDF 보기</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">보홀 조건 기반 Guide</span>
                </span>
              </button>
              <button
                type="button"
                data-testid="auto-bottom-passport-action"
                onClick={() => openInNewTab(trip.actionLinks.passport)}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100/70"
              >
                <SidebarIcon name="passport" className="h-7 w-7 shrink-0 text-blue-600" />
                <span>
                  <span className="block text-sm font-black text-slate-950">기념품 패스포트에 저장</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">TOP 5 스탬프 저장</span>
                </span>
              </button>
              <button
                type="button"
                data-testid="auto-compare-action"
                onClick={() => openInNewTab(trip.actionLinks.compare)}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100/70"
              >
                <SidebarIcon name="chart" className="h-7 w-7 shrink-0 text-blue-600" />
                <span>
                  <span className="block text-sm font-black text-slate-950">전체 비교 보기</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">가격, 휴대성, 추천도 비교</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => scrollToId("gift-sets")}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <SidebarIcon name="group" className="h-7 w-7 shrink-0 text-blue-600" />
                <span>
                  <span className="block text-sm font-black text-slate-950">다른 선물 대상 추천</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">대상별 자동 세트 보기</span>
                </span>
              </button>
            </div>
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
              마이리얼트립은 이미 사용자의 여행 예약 정보를 가지고 있기 때문에,
              사용자가 국가를 다시 입력하지 않아도 여행지 기반 기념품 추천을
              자동으로 시작할 수 있습니다.
            </p>
          </article>
        </section>
      </div>
    </ServiceShell>
  );
}
