import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";

  try {
    const target = new URL(rawUrl);
    if (!/^https?:$/.test(target.protocol)) throw new Error("Unsupported image URL");

    const response = await fetch(target, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; LoadLinkNewsImage/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 86400 },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) throw new Error("Image unavailable");

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/images/news/logistics-fallback.jpg", request.url));
  }
}
