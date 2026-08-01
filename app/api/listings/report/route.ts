import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

const ALLOWED_REASONS = new Set(["fraud", "duplicate", "incorrect", "unsafe", "sold", "spam", "other"]);
const ALLOWED_ENTITY_TYPES = new Set(["listing", "driver", "dealership", "message", "user"]);

export async function POST(request: Request) {
  const limiter = takeRateLimit(`report:${requestIdentity(request)}`, 8, 60 * 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "You have submitted too many reports. Try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });

  try {
    const { user, client } = await authenticatedUser(request);
    const body = await request.json().catch(() => ({}));
    const entityType = String(body.entityType || "listing").toLowerCase();
    const entityId = String(body.entityId || body.listingId || "");
    const reasonCode = String(body.reasonCode || "other").toLowerCase();
    const explanation = String(body.explanation || "").trim().slice(0, 1200);
    if (!ALLOWED_ENTITY_TYPES.has(entityType)) return NextResponse.json({ error: "Choose a valid report type." }, { status: 400 });
    if (!/^[0-9a-f-]{20,}$/i.test(entityId)) return NextResponse.json({ error: "Choose a valid item to report." }, { status: 400 });
    if (!ALLOWED_REASONS.has(reasonCode) || explanation.length < 10) {
      return NextResponse.json({ error: "Choose a reason and add at least 10 characters of detail." }, { status: 400 });
    }

    const reason = `${reasonCode}: ${explanation}`;
    const { data, error } = await client.rpc("loadlink_create_moderation_case", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_reason: reason,
      p_case_type: `${entityType}_report`,
      p_evidence: [{ reasonCode }],
    });
    if (error) {
      const fallback = await client.from("marketplace_cases").insert({
        reporter_user_id: user.id,
        case_type: `${entityType}_report`,
        entity_type: entityType,
        entity_id: entityId,
        reason,
        evidence: [{ reasonCode }],
        status: "open",
      }).select("id,case_number,status").single();
      if (fallback.error) throw fallback.error;
      return NextResponse.json({ case: fallback.data }, { status: 201, headers: rateLimitHeaders(limiter) });
    }
    return NextResponse.json({ case: data }, { status: 201, headers: rateLimitHeaders(limiter) });
  } catch (error) {
    const safe = safeApiError(error, "The report could not be submitted.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: rateLimitHeaders(limiter) });
  }
}
