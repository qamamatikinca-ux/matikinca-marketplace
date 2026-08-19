import type { NextRequest } from "next/server";
import { apiError, dealerServerClient } from "@/lib/dealer/server";

async function requireAdmin(client: ReturnType<typeof dealerServerClient>) {
  const { data, error } = await client.rpc("loadlink_dealer_admin_allowed");
  if (error) throw error;
  if (!data) throw new Error("Admin permission required.");
}

function validDocumentPath(value: string) {
  const path = value.trim();
  if (!path || path.length > 512) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(path);
}

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireAdmin(client);
    const rawPath = request.nextUrl.searchParams.get("document");
    if (rawPath) {
      const path = rawPath.trim();
      if (!validDocumentPath(path)) return Response.json({ error: "Invalid document path." }, { status: 400 });
      const { data, error } = await client.storage.from("dealership-documents").createSignedUrl(path, 120);
      if (error) throw error;
      return Response.json({ url: data.signedUrl });
    }
    const status = request.nextUrl.searchParams.get("status") || "all";
    const { data, error } = await client.rpc("loadlink_admin_dealer_queue", { p_status: status, p_limit: 80, p_offset: 0 });
    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireAdmin(client);
    const body = await request.json();
    const { data, error } = await client.rpc("loadlink_admin_dealer_review", {
      p_dealership_id: body.dealership_id,
      p_action: String(body.action || ""),
      p_reason: body.reason || null,
      p_document_type: body.document_type || null,
    });
    if (error) throw error;
    return Response.json(data || { ok: true });
  } catch (error) {
    return apiError(error);
  }
}
