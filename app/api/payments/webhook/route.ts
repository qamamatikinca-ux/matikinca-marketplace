import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceSupabase, safeApiError } from "@/lib/server/supabase";

function validSignature(raw: string, supplied: string, secret: string) {
  if (!secret || !supplied) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(supplied.replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const secret = process.env.LOADLINK_PAYMENT_WEBHOOK_SECRET || "";
    const raw = await request.text();
    if (!validSignature(raw, request.headers.get("x-loadlink-signature") || "", secret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    const event = JSON.parse(raw) as { id?: string; type?: string; provider?: string; reference?: string; userId?: string; amountCents?: number; currency?: string };
    if (!event.id || !event.type) return NextResponse.json({ error: "Invalid payment event." }, { status: 400 });
    const client = serviceSupabase();
    const insert = await client.from("payment_events").upsert({ provider: event.provider || "configured-provider", provider_event_id: event.id, event_type: event.type, payment_reference: event.reference || null, user_id: event.userId || null, amount_cents: event.amountCents || null, currency: event.currency || "ZAR", signature_verified: true, payload: event }, { onConflict: "provider,provider_event_id", ignoreDuplicates: false }).select("id,processed_at").single();
    if (insert.error) throw insert.error;
    if (!insert.data.processed_at) {
      const applied = await client.rpc("loadlink_apply_verified_payment_event", { p_payment_event_id: insert.data.id });
      if (applied.error) throw applied.error;
    }
    return NextResponse.json({ received: true });
  } catch (error) { const safe = safeApiError(error, "Payment event processing failed."); return NextResponse.json({ error: safe.message }, { status: 500 }); }
}
