import { NextResponse } from "next/server";
import { publicSupabase, safeError } from "@/lib/phase2/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 8), 1), 50);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    const city = url.searchParams.get("city");
    const search = url.searchParams.get("search");
    const { data, error } = await publicSupabase().rpc("loadlink_public_driver_profiles", {
      p_limit: limit,
      p_offset: offset,
      p_city: city,
      p_search: search,
    });
    if (error) throw error;
    return NextResponse.json({ drivers: data ?? [], total: data?.[0]?.total_count ?? 0 }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    return NextResponse.json(safeError(error, "Driver profiles are temporarily unavailable."), { status: 500 });
  }
}
