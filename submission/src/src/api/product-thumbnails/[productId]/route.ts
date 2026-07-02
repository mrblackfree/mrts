import sampleProducts from "../../../../data/sample-products.json";
import thumbnailSources from "../../../../data/thumbnail-sources.json";
import type {
  SouvenirProduct,
  ThumbnailSourceInfo,
} from "../../../types/souvenir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThumbnailSourceRecord = ThumbnailSourceInfo & { productId: string };

const REQUEST_TIMEOUT_MS = 4500;

const thumbnailSourceByProductId = new Map(
  (thumbnailSources as ThumbnailSourceRecord[]).map((source) => [
    source.productId,
    source,
  ])
);

const productByProductId = new Map(
  (sampleProducts as SouvenirProduct[]).map((product) => [
    product.productId,
    product,
  ])
);

function placeholderUrl(request: Request, productId: string) {
  const product = productByProductId.get(productId);
  const fallbackPath =
    product?.thumbnailUrl ?? "/placeholders/manual-thumbnail-required.png";

  return new URL(fallbackPath, request.url);
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; MRT-Souvenir-Thumbnail/1.0)",
      },
      cache: "force-cache",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const source = thumbnailSourceByProductId.get(productId);

  if (!source || source.status !== "verified" || !source.remoteImageUrl) {
    return Response.redirect(placeholderUrl(request, productId), 302);
  }

  try {
    const imageResponse = await fetchWithTimeout(source.remoteImageUrl);
    const contentType = imageResponse.headers.get("content-type") ?? "";

    if (!imageResponse.ok || !contentType.startsWith("image/")) {
      return Response.redirect(placeholderUrl(request, productId), 302);
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "content-type": contentType,
        "x-thumbnail-source": source.status,
      },
    });
  } catch {
    return Response.redirect(placeholderUrl(request, productId), 302);
  }
}
