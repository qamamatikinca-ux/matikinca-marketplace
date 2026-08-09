import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FIELDS = [
  "id","title","city","vehicle_group","rate","posted_by","contact_number","whatsapp_number","poster_photo","description","photos","sponsored","package_type","created_at","view_count","last_viewed_at","user_id","listing_kind","status","moderation_status","expires_at","stock_status","dealership_id",
].join(",");

function toPublicRow(row: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_FIELDS.split(",").map((field) => [field, row[field] ?? null]));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(url: string, key: string, path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    next: { revalidate: 10 },
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "public-listings", 180, 60_000);
  if (limited) return limited;
  const { url, key } = getSupabaseConfig();
  if (!url.startsWith("https://") || !key) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  let response = await supabaseRequest(url, key, `job_listings?select=${encodeURIComponent(PUBLIC_FIELDS)}&order=created_at.desc.nullslast&limit=500`);
  if (!response.ok) response = await supabaseRequest(url, key, "rpc/get_public_job_listings", { method: "POST", body: "{}" });
  if (!response.ok) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const rows = (await response.json()) as unknown;
  const now = Date.now();
  const visibleRows = Array.isArray(rows)
    ? (rows as Array<Record<string, unknown> & { status?: string | null; moderation_status?: string | null; expires_at?: string | null; stock_status?: string | null }>).filter((row) => {
        const active = !row.status || row.status === "active";
        const approved = row.moderation_status === undefined || row.moderation_status === "approved";
        const expiry = row.expires_at ? new Date(row.expires_at).getTime() : 0;
        const current = !expiry || !Number.isFinite(expiry) || expiry > now;
        const inStock = !row.stock_status || row.stock_status !== "removed";
        return active && approved && current && inStock;
      }).map(toPublicRow)
    : [];
  return NextResponse.json({ rows: visibleRows }, { headers: { "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30" } });
}
