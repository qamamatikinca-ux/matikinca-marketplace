type PublicListingRow = Record<string, unknown> & {
  id?: string;
  status?: string | null;
  moderation_status?: string | null;
  expires_at?: string | null;
  stock_status?: string | null;
};

export const PUBLIC_LISTING_FIELDS = [
  "id",
  "title",
  "city",
  "province",
  "vehicle_group",
  "rate",
  "posted_by",
  "description",
  "photos",
  "created_at",
  "listing_kind",
  "dealership_id",
  "price_amount",
  "price_type",
  "vehicle_type",
  "vehicle_year",
  "brand",
  "model",
  "body_type",
  "transmission",
  "fuel_type",
  "axle_configuration",
  "odometer_km",
  "gvm_kg",
  "payload_kg",
  "condition",
  "service_history",
  "route_start",
  "route_end",
  "route_distance_km",
  "load_type",
  "required_equipment",
  "rate_amount",
  "rate_unit",
  "payment_terms",
  "work_starts_at",
  "work_ends_at",
  "status",
  "moderation_status",
  "expires_at",
  "stock_status",
].join(",");

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url.startsWith("https://") || !key) throw new Error("Marketplace data is temporarily unavailable.");
  return { url, key };
}

function isPublished(row: PublicListingRow) {
  if (row.status && row.status !== "active") return false;
  if (row.moderation_status !== "approved") return false;
  if (row.stock_status === "removed") return false;
  if (row.expires_at) {
    const expiry = new Date(row.expires_at).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

async function requestListing(id: string, attempt = 0): Promise<PublicListingRow | null> {
  const { url, key } = config();
  const endpoint = `${url}/rest/v1/job_listings?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(PUBLIC_LISTING_FIELDS)}&limit=1`;

  try {
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      if (attempt === 0 && response.status >= 500) return requestListing(id, 1);
      return null;
    }
    const rows = (await response.json()) as PublicListingRow[];
    const row = rows[0] || null;
    return row && isPublished(row) ? row : null;
  } catch {
    if (attempt === 0) return requestListing(id, 1);
    return null;
  }
}

export async function getPublicListing(id: string): Promise<PublicListingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return requestListing(id);
}

export function stripPublicationFields(row: PublicListingRow | null) {
  if (!row) return null;
  const { status: _status, moderation_status: _moderation, expires_at: _expires, stock_status: _stock, ...publicRow } = row;
  return publicRow;
}
