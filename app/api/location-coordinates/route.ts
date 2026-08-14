import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "location-coordinates", 30, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const place = String(searchParams.get("place") || "").trim().slice(0, 120);
  if (!place) return NextResponse.json({ error: "A location is required." }, { status: 400 });

  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", `${place}, South Africa`);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "za");
  endpoint.searchParams.set("addressdetails", "0");

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LoadLink marketplace distance helper/1.0 (loadlinksouthafrica@gmail.com)",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) throw new Error(`Location service returned ${response.status}`);
    const result = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const match = result[0];
    const lat = Number(match?.lat);
    const lon = Number(match?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: "Location not found." }, { status: 404 });
    return NextResponse.json(
      { lat, lon, displayName: match?.display_name || place },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ error: "Distance location lookup is temporarily unavailable." }, { status: 503 });
  }
}
