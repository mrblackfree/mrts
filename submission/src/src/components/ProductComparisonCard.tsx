import type { RecommendedSouvenirProduct } from "../types/souvenir";

type ProductComparisonCardProps = {
  product: RecommendedSouvenirProduct;
  rank?: number;
};

function commerceBadges(product: RecommendedSouvenirProduct) {
  return [
    product.domesticAvailable ? "국내 구매 후보" : null,
    product.officialPartnerPossible ? "공식 제휴 후보" : null,
    product.commerceReady ? "커머스 연동 후보" : null,
    product.preTripPurchase ? "여행 전 구매" : null,
    product.postTripRepurchase ? "귀국 후 재구매" : null,
  ].filter((badge): badge is string => Boolean(badge));
}

export function ProductComparisonCard({
  product,
  rank = 1,
}: ProductComparisonCardProps) {
  const badges = commerceBadges(product);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[112px_1fr_auto]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          <img
            src={product.thumbnailUrl}
            alt={`${product.productName} 썸네일`}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            {rank}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-700">
            {product.brandName}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            {product.productName}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            용량 {product.packageSize} | {product.estimatedPrice.display}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            평점 {product.rating.value.toFixed(1)} | 리뷰{" "}
            {product.reviewCount.value.toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="h-16 w-16 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-center">
          <div className="text-xl font-bold text-emerald-800">
            {product.matchScore}
          </div>
          <div className="text-[10px] font-medium text-emerald-700">MATCH</div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">
        {product.reviewSummary}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {product.matchedCriteria.map((criterion) => (
          <span
            key={criterion}
            className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
          >
            {criterion}
          </span>
        ))}
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
          >
            {badge}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-700">
        <div>
          <dt className="font-semibold text-slate-950">추천 이유</dt>
          <dd>{product.matchReason}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">구매 팁</dt>
          <dd>{product.purchaseTip}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">주의사항</dt>
          <dd>{product.caution}</dd>
        </div>
      </dl>
    </article>
  );
}
