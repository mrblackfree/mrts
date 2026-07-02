import type { RecommendedSouvenirProduct } from "../types/souvenir";

type ProductComparisonTableProps = {
  products: RecommendedSouvenirProduct[];
};

export function ProductComparisonTable({
  products,
}: ProductComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <caption className="sr-only">기념품 제품 비교표</caption>
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">제품</th>
            <th scope="col" className="px-4 py-3">브랜드</th>
            <th scope="col" className="px-4 py-3">용량</th>
            <th scope="col" className="px-4 py-3">예상 가격</th>
            <th scope="col" className="px-4 py-3">평점</th>
            <th scope="col" className="px-4 py-3">리뷰 수</th>
            <th scope="col" className="px-4 py-3">추천 대상</th>
            <th scope="col" className="px-4 py-3">매칭</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product, index) => (
            <tr key={product.productId}>
              <td className="px-4 py-3 font-medium text-slate-950">
                {index + 1}. {product.productName}
              </td>
              <td className="px-4 py-3 text-slate-700">{product.brandName}</td>
              <td className="px-4 py-3 text-slate-700">{product.packageSize}</td>
              <td className="px-4 py-3 text-slate-700">
                {product.estimatedPrice.display}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {product.rating.value.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {product.reviewCount.value.toLocaleString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {product.bestFor.join(", ")}
              </td>
              <td className="px-4 py-3 font-semibold text-blue-700">
                {product.matchScore}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
