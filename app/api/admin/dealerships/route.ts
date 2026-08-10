import type { NextRequest } from "next/server";
import { apiError, dealerServerClient } from "@/lib/dealer/server";

async function requireAdmin(client: ReturnType<typeof dealerServerClient>) {
  const { data, error } = await client.rpc("loadlink_dealer_admin_allowed");
  if (error) throw error; if (!data) throw new Error("Admin permission required.");
}

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireAdmin(client);
    const path = request.nextUrl.searchParams.get("document");
    if (path) {
      if (!path.startsWith("")) throw new Error("Invalid document path.");
      const { data, error } = await client.storage.from("dealership-documents").createSignedUrl(path, 120);
      if (error) throw error; return Response.json({ url: data.signedUrl });
    }
    const status = request.nextUrl.searchParams.get("status") || "all";
    const { data, error } = await client.rpc("loadlink_admin_dealer_queue", { p_status: status, p_limit: 80, p_offset: 0 });
    if (error) throw error; return Response.json({ items: data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireAdmin(client); const body = await request.json();
    const { data, error } = await client.rpc("loadlink_admin_dealer_review", { p_dealership_id: body.dealership_id, p_action: String(body.action || ""), p_reason: body.reason || null, p_document_type: body.document_type || null });
    if (error) throw error; return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
