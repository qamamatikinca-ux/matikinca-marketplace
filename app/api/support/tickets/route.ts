import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

export async function GET(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const result = await client.from("support_tickets").select("id,ticket_number,subject,status,priority,related_entity_type,related_entity_id,created_at,updated_at").eq("requester_user_id", user.id).order("created_at", { ascending: false });
    if (result.error) throw result.error;
    return NextResponse.json({ rows: result.data || [] });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
export async function POST(request: Request) {
  const limiter = takeRateLimit(`support:${requestIdentity(request)}`, 8, 60 * 60_000);
  try {
    if (!limiter.allowed) return NextResponse.json({ error: "Support request limit reached. Try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
    const { user, client } = await authenticatedUser(request);
    const body = await request.json() as { subject?: string; description?: string; relatedEntityType?: string; relatedEntityId?: string; priority?: string };
    const subject = String(body.subject || "").trim().slice(0, 140);
    const description = String(body.description || "").trim().slice(0, 4000);
    if (subject.length < 4 || description.length < 15) return NextResponse.json({ error: "Add a clear subject and explanation." }, { status: 400 });
    const result = await client.from("support_tickets").insert({ requester_user_id: user.id, subject, description, related_entity_type: body.relatedEntityType || null, related_entity_id: body.relatedEntityId || null, priority: ["low","normal","high"].includes(String(body.priority)) ? body.priority : "normal" }).select("id,ticket_number,status").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ticket: result.data }, { status: 201, headers: rateLimitHeaders(limiter) });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status, headers: rateLimitHeaders(limiter) }); }
}
