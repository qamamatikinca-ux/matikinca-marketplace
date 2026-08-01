import { NextResponse } from "next/server";
import { requireAdmin, safeApiError } from "@/lib/server/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

async function safeCount(client: SupabaseClient, table: string, filters: Array<[string, string]> = []) {
  try {
    let query: any = client.from(table).select("*", { count: "exact", head: true });
    for (const [column, value] of filters) query = query.eq(column, value);
    const result = await query;
    return result.error ? 0 : result.count || 0;
  } catch { return 0; }
}
async function safeRows(client: SupabaseClient, table: string, select: string, order = "created_at") {
  try { const result = await client.from(table).select(select).order(order, { ascending: false }).limit(8); return result.error ? [] : result.data || []; }
  catch { return []; }
}

export async function GET(request: Request) {
  try {
    const { client } = await requireAdmin(request);
    const [pendingListings, pendingDealers, pendingDrivers, openCases, activeListings, activeDealers, activeDrivers, failedPayments, openTickets] = await Promise.all([
      safeCount(client, "job_listings", [["moderation_status", "pending"]]),
      safeCount(client, "dealership_verification", [["status", "pending"]]),
      safeCount(client, "driver_profiles", [["status", "pending"]]),
      safeCount(client, "marketplace_cases", [["status", "open"]]),
      safeCount(client, "job_listings", [["status", "active"]]),
      safeCount(client, "dealership_profiles", [["verification_status", "approved"]]),
      safeCount(client, "driver_profiles", [["status", "approved"]]),
      safeCount(client, "admin_payments", [["status", "failed"]]),
      safeCount(client, "support_tickets", [["status", "open"]]),
    ]);
    const [cases, audit, payments, events] = await Promise.all([
      safeRows(client, "marketplace_cases", "id,case_number,case_type,entity_type,entity_id,reason,status,priority,created_at"),
      safeRows(client, "admin_audit_trail", "id,action,entity_type,entity_id,created_at"),
      safeRows(client, "admin_payments", "id,reference,status,amount_cents,created_at"),
      safeRows(client, "marketplace_events", "id,event_type,entity_type,entity_id,created_at"),
    ]);
    return NextResponse.json({ metrics: { pendingListings, pendingDealers, pendingDrivers, openCases, activeListings, activeDealers, activeDrivers, failedPayments, openTickets }, recentCases: cases, recentAudit: audit, recentPayments: payments, recentEvents: events, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const safe = safeApiError(error, "The operations dashboard could not be loaded."); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); }
}
