import { NextRequest, NextResponse } from "next/server";
import { validateRemoteImageUrl } from "@/lib/server/networkSafety";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

export const revalidate = 86400;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const limiter = takeRateLimit(`news-image:${requestIdentity(request)}`, 80, 60_000);
  if (!limiter.allowed) return NextResponse.redirect(new URL("/images/news/logistics-fallback.jpg", request.url));

  try {
    const target = validateRemoteImageUrl(request.nextUrl.searchParams.get("url") || "");
    const response = await fetch(target, {
      headers: { Accept: "image/avif,image/webp,image/jpeg,image/png", "User-Agent": "LoadLinkNewsImage/2.0" },
      redirect: "error",
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    const contentType = (response.headers.get("content-type") || "").split(";")[0];
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !["image/avif", "image/webp", "image/jpeg", "image/png"].includes(contentType)) throw new Error("Image unavailable");
    if (contentLength && contentLength > MAX_IMAGE_BYTES) throw new Error("Image too large");
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too large");
    return new NextResponse(body, {
      headers: {
        ...rateLimitHeaders(limiter),
        "Content-Type": contentType,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/images/news/logistics-fallback.jpg", request.url));
  }
}
