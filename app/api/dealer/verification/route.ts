import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
import { checkedBuffer } from "@/lib/dealer/media";

const DOCUMENT_TYPES = ["application/pdf","image/jpeg","image/png","image/webp"] as const;
const VALID_DOCUMENTS = ["company_registration","tax","business_address","representative_authority"];
function ownedPath(path: string, dealershipId: string) { return Boolean(path) && path.startsWith(`${dealershipId}/`) && !path.includes("..") && path.length < 500; }

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireDealerContext(client);
    const { data, error } = await client.rpc("loadlink_dealer_verification_documents"); if (error) throw error;
    return Response.json({ documents: data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  let uploadedPath="";
  try {
    const client = dealerServerClient(request); const context = await requireDealerContext(client); const body = await request.json();
    if (body.action === "upload") {
      const documentType = String(body.document_type || "");
      if (!VALID_DOCUMENTS.includes(documentType)) throw new Error("Unknown verification document type.");
      uploadedPath = String(body.storage_path || "");
      if (!ownedPath(uploadedPath, context.dealership_id) || !uploadedPath.startsWith(`${context.dealership_id}/${documentType}/`)) throw new Error("Invalid verification document path.");
      const download = await client.storage.from("dealership-documents").download(uploadedPath);
      if (download.error || !download.data) throw download.error || new Error("Verification document could not be verified.");
      const checked = checkedBuffer(Buffer.from(await download.data.arrayBuffer()), String(body.mime || ""), DOCUMENT_TYPES, 10 * 1024 * 1024);
      const { data, error } = await client.rpc("loadlink_dealer_register_verification_document", { p_document_type: documentType, p_storage_path: uploadedPath, p_filename: body.filename || null, p_mime: checked.mime });
      if (error) throw error;
      return Response.json(data || { ok: true });
    }
    const { data, error } = await client.rpc("loadlink_dealer_verification_action", { p_action: String(body.action || "") });
    if (error) throw error;
    return Response.json(data || { ok: true });
  } catch (error) {
    if (uploadedPath) { try { const client=dealerServerClient(request); await client.storage.from("dealership-documents").remove([uploadedPath]); } catch {} }
    return apiError(error);
  }
}
