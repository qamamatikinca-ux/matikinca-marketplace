import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const limiter = takeRateLimit(`job-interest:${requestIdentity(request)}`, 15, 60_000);
  try {
    if (!limiter.allowed) return NextResponse.json({ error: "Too many interest requests. Try again shortly." }, { status: 429, headers: rateLimitHeaders(limiter) });
    const { user, client } = await authenticatedUser(request);
    const body = await request.json() as { listingId?: string; message?: string; proposedRate?: number | null };
    if (!body.listingId || !/^[0-9a-f-]{20,}$/i.test(body.listingId)) return NextResponse.json({ error: "Invalid work listing." }, { status: 400 });
    const message = String(body.message || "").trim().slice(0, 1500);
    if (message.length < 10) return NextResponse.json({ error: "Add a short message explaining your availability and equipment." }, { status: 400 });
    const listing = await client.from("job_listings").select("id,user_id,listing_kind,moderation_status,status").eq("id", body.listingId).maybeSingle();
    if (listing.error) throw listing.error;
    if (!listing.data || !["job", "contract"].includes(String(listing.data.listing_kind || "job"))) return NextResponse.json({ error: "This work opportunity is not available." }, { status: 404 });
    if (listing.data.user_id === user.id) return NextResponse.json({ error: "You cannot express interest in your own post." }, { status: 400 });
    const result = await client.from("job_interests").upsert({ listing_id: body.listingId, applicant_user_id: user.id, message, proposed_rate: body.proposedRate ?? null, status: "submitted", updated_at: new Date().toISOString() }, { onConflict: "listing_id,applicant_user_id" }).select("id,status").single();
    if (result.error) throw result.error;
    if (!result.data) throw new Error("The interest record was not returned after saving.");
    await client.rpc("loadlink_emit_event", { p_event_type: "job.interest_submitted", p_entity_type: "listing", p_entity_id: body.listingId, p_payload: { interest_id: result.data.id } });
    return NextResponse.json({ interest: result.data, message: "Interest sent to the poster." }, { status: 201, headers: rateLimitHeaders(limiter) });
  } catch (error) {
    const safe = safeApiError(error, "Your interest could not be submitted.");
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: rateLimitHeaders(limiter) });
  }
}
