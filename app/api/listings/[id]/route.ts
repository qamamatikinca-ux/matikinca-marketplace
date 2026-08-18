import type { NextRequest } from "next/server";
import { getPublicListing, stripPublicationFields } from "@/lib/marketplace/publicListingServer";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = serverRateLimit(request, "public-listing-detail", 180, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const listing = stripPublicationFields(await getPublicListing(String(id || "")));
  if (!listing) {
    return Response.json({ error: "Listing unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(
    { listing },
    { headers: { "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=60" } },
  );
}
