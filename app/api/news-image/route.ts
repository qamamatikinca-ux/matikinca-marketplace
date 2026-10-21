import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const revalidate = 86400;
export const maxDuration = 30;

import { allowedNewsImage } from "@/lib/logisticsNews";

export async function GET(request: NextRequest) {
  const limited = serverRateLimit(request, "news-image", 40, 60_000);
  if (limited) return limited;
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  try {
    const target = new URL(rawUrl);
    if (!allowedNewsImage(rawUrl)) throw new Error("Image host not allowed");
    const response = await fetch(target, {
      headers: { Accept: "*/*", "User-Agent": "LoadLinkNewsImage/1.1" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    const length = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !/^image\/(jpeg|png|webp|avif|gif)(;|$)/i.test(contentType) || (length && length > 8 * 1024 * 1024)) throw new Error("Image unavailable");
    const reader=response.body?.getReader();if(!reader)throw new Error("Empty image");
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8*1024*1024){await reader.cancel();throw new Error("Image too large");}chunks.push(part.value);}
    const bytes=new ArrayBuffer(size);const view=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){view.set(chunk,offset);offset+=chunk.length;}
    return new NextResponse(bytes, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.warn("[LoadLink news image]", error instanceof Error ? error.message : "Image unavailable");
    return new NextResponse(null,{status:404,headers:{"Cache-Control":"public, max-age=60"}});
  }
}
