import { NextResponse } from "next/server";
import { requireAdmin, safeApiError } from "@/lib/server/supabase";
export async function POST(request: Request) {
  try {
    const { client } = await requireAdmin(request);
    const body = await request.json() as { listingId?: string; decision?: string; reason?: string };
    if (!body.listingId || !["approved","rejected"].includes(String(body.decision))) return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
    const result = await client.rpc("loadlink_review_listing", { p_listing_id: body.listingId, p_decision: body.decision, p_reason: body.reason || null });
    if (result.error) throw result.error;
    return NextResponse.json({ updated: result.data === true });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
