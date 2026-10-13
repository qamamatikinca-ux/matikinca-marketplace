import { truckModelReferences } from "@/lib/truckModelReferences";
export const runtime = "nodejs";
const MAX_BYTES = 12 * 1024 * 1024;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = truckModelReferences.find(item => item.id === id);
  if (!row?.photo_url) return new Response(null, { status: 404 });
  if (row.photo_url.startsWith("/images/truck-models/")) return Response.redirect(new URL(row.photo_url, _request.url), 307);
  try {
    // Only the exact curated catalog URL is fetched. No user-supplied URL, credentials or redirects.
    const url = new URL(row.photo_url);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname)) return new Response(null, { status: 404 });
    const options = { redirect: "error" as const, headers: { "User-Agent": "LoadLink/1.0 (commercial vehicle photograph references)", Accept: "image/jpeg,image/png,image/webp" }, signal: AbortSignal.timeout(12_000), next: { revalidate: 86400 } };
    // Wikimedia's same-photo thumbnail avoids fetching multi-megabyte originals.
    const segments = url.pathname.split("/");
    const thumbnail = new URL(url);
    thumbnail.hostname = "thumb.wikimedia.org";
    if (segments[3] !== "thumb" && /\.(jpe?g|png|webp)$/i.test(segments.at(-1) || "")) {
      segments.splice(3, 0, "thumb");
      thumbnail.pathname = `${segments.join("/")}/1280px-${segments.at(-1)}`;
    }
    let response = await fetch(thumbnail, options).catch(() => null);
    if (!response?.ok && thumbnail.href !== url.href) response = await fetch(url, { ...options, signal: AbortSignal.timeout(12_000) });
    if (!response) return new Response(null, { status: 502 });
    const mime = (response.headers.get("Content-Type") || "").split(";")[0];
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(mime) || Number(response.headers.get("Content-Length")) > MAX_BYTES) return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
    const reader = response.body?.getReader(); if (!reader) return new Response(null, { status: 502 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); return new Response(null, { status: 502 }); } chunks.push(next.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
