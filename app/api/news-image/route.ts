import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const revalidate = 86400;

const ALLOWED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "cdn.pixabay.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

export async function GET(request: NextRequest) {
  const limited = serverRateLimit(request, "news-image", 40, 60_000);
  if (limited) return limited;
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  try {
    const target = new URL(rawUrl);
    if (target.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(target.hostname.toLowerCase())) throw new Error("Image host not allowed");
    const response = await fetch(target, {
      headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "User-Agent": "LoadLinkNewsImage/1.1" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    const contentType = response.headers.get("content-type") || "";
    const length = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !contentType.startsWith("image/") || (length && length > 8 * 1024 * 1024)) throw new Error("Image unavailable");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Image too large");
    return new NextResponse(bytes, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.redirect(new URL("/images/news/logistics-fallback.jpg", request.url));
  }
}
