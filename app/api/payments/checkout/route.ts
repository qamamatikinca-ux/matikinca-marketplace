import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";
import { PLAN_RULES } from "@/lib/marketplace/plans";

export async function POST(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const body = await request.json() as { plan?: string; listingId?: string; days?: number };
    const plan = String(body.plan || "standard").toLowerCase();
    if (!(plan in PLAN_RULES)) return NextResponse.json({ error: "Invalid package." }, { status: 400 });
    const reference = `LL-${Date.now().toString(36).toUpperCase()}-${user.id.slice(0,6).toUpperCase()}`;
    const requestRow = await client.from("admin_payments").insert({ user_id: user.id, reference, status: "pending", payment_type: "package", package_type: plan, listing_id: body.listingId || null, metadata: { days: body.days || null } }).select("id,reference,status").single();
    if (requestRow.error) throw requestRow.error;
    const providerUrl = process.env.LOADLINK_PAYMENT_CHECKOUT_URL;
    return NextResponse.json({ payment: requestRow.data, checkoutUrl: providerUrl ? `${providerUrl}?reference=${encodeURIComponent(reference)}` : null, message: providerUrl ? "Continue to secure payment." : "Payment request created. Activation happens only after LoadLink verifies the payment event." }, { status: 201 });
  } catch (error) { const safe = safeApiError(error, "Payment request could not be created."); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
