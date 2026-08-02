import { NextResponse } from "next/server";
import { requireAdmin, safeApiError } from "@/lib/server/supabase";
const CONFIG = {
  listings: { table: "job_listings", select: "id,title,listing_kind,city,posted_by,moderation_status,lifecycle_status,status,created_at,user_id", order: "created_at" },
  cases: { table: "marketplace_cases", select: "id,case_number,case_type,entity_type,entity_id,priority,status,reason,assigned_user_id,created_at", order: "created_at" },
  payments: { table: "admin_payments", select: "id,reference,user_id,status,payment_type,package_type,amount_cents,created_at", order: "created_at" },
  tickets: { table: "support_tickets", select: "id,ticket_number,subject,status,priority,requester_user_id,assigned_user_id,created_at", order: "created_at" },
  dealers: { table: "dealership_profiles", select: "id,name,slug,owner_user_id,verification_status,is_public,created_at", order: "created_at" },
  drivers: { table: "driver_profiles", select: "id,user_id,full_name,city,availability_status,verification_level,profile_status,created_at", order: "created_at" },
  users: { table: "profiles", select: "id,full_name,role,verification_status,subscription_plan,created_at", order: "created_at" },
  fraud: { table: "marketplace_fraud_signals", select: "id,entity_type,entity_id,signal_type,risk_score,status,created_at", order: "created_at" },
  reviews: { table: "dealership_reviews", select: "id,dealership_id,reviewer_user_id,rating,review_text,moderation_status,created_at", order: "created_at" },
} as const;
export async function GET(request: Request) {
  try {
    const { client } = await requireAdmin(request);
    const url = new URL(request.url); const type = url.searchParams.get("type") as keyof typeof CONFIG; const config = CONFIG[type];
    if (!config) return NextResponse.json({ error: "Unknown record type." }, { status: 400 });
    const status = url.searchParams.get("status") || ""; const search = (url.searchParams.get("search") || "").slice(0,100);
    let query: any = (client as any).from(config.table).select(config.select, { count: "exact" }).order(config.order, { ascending: false }).limit(100);
    if (status) query = query.eq(type === "listings" || type === "reviews" ? "moderation_status" : type === "users" ? "verification_status" : "status", status);
    const result = await query; if (result.error) throw result.error;
    const rows = ((result.data || []) as Record<string, unknown>[]).filter((row) => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json({ rows, count: search ? rows.length : (result.count || 0) });
  } catch (error) { const safe = safeApiError(error); return NextResponse.json({ error: safe.message }, { status: safe.status }); }
}
