import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const result = await client.from("saved_searches").select("id,name,marketplace_area,filters,alerts_enabled,last_notified_at,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (result.error) throw result.error;
    return NextResponse.json({ rows: result.data || [] });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
export async function POST(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const body = await request.json() as { name?: string; marketplaceArea?: string; filters?: Record<string, unknown>; alertsEnabled?: boolean };
    const name = String(body.name || "").trim().slice(0, 80);
    const area = String(body.marketplaceArea || "vehicles").trim().slice(0, 30);
    if (name.length < 2) return NextResponse.json({ error: "Name this search." }, { status: 400 });
    const count = await client.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count.count || 0) >= 20) return NextResponse.json({ error: "You can save up to 20 searches." }, { status: 400 });
    const result = await client.from("saved_searches").insert({ user_id: user.id, name, marketplace_area: area, filters: body.filters || {}, alerts_enabled: body.alertsEnabled !== false }).select("*").single();
    if (result.error) throw result.error;
    return NextResponse.json({ search: result.data }, { status: 201 });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
export async function DELETE(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const id = new URL(request.url).searchParams.get("id") || "";
    const result = await client.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
    if (result.error) throw result.error;
    return NextResponse.json({ deleted: true });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
