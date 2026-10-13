import { findTruckReference, truckReferenceResponse } from "@/lib/truckModelReferences";
import { serverRateLimit } from "@/lib/serverRateLimit";
export async function GET(request: Request) {
  const limited = serverRateLimit(request, "truck-image", 60, 60_000); if (limited) return limited;
  const query = new URL(request.url).searchParams;
  const brand = (query.get("brand") || "").slice(0,80), model = (query.get("model") || "").slice(0,100), year = Number(query.get("year"));
  const row = findTruckReference(brand, model);
  if (!row || !Number.isInteger(year) || year < row.from_year || year > row.to_year) return Response.json({ error: "Choose a listed model and year.", imageUrl: null }, { status: 400 });
  // A versioned snapshot keeps selection immediate even when the catalog database is unavailable.
  return Response.json(truckReferenceResponse(row, year), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
