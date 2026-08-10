import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
import { checkedBuffer } from "@/lib/dealer/media";

const BRAND_IMAGES = ["image/jpeg","image/png","image/webp"] as const;
function ownedPath(path: string, dealershipId: string) { return Boolean(path) && path.startsWith(`${dealershipId}/`) && !path.includes("..") && path.length < 500; }

export async function POST(request: NextRequest) {
  let uploadedPath = "";
  try {
    const client = dealerServerClient(request);
    const context = await requireDealerContext(client);
    const body = await request.json();
    if (body.action === "media") {
      const kind = body.kind === "cover" ? "cover" : "logo";
      uploadedPath = String(body.storage_path || "");
      if (!ownedPath(uploadedPath, context.dealership_id)) throw new Error("Invalid Dealer branding path.");
      const download = await client.storage.from("dealership-assets").download(uploadedPath);
      if (download.error || !download.data) throw download.error || new Error("Brand image could not be verified.");
      checkedBuffer(Buffer.from(await download.data.arrayBuffer()), String(body.mime || ""), BRAND_IMAGES, 8 * 1024 * 1024);
      const url = client.storage.from("dealership-assets").getPublicUrl(uploadedPath).data.publicUrl;
      const { data, error } = await client.rpc("loadlink_dealer_brand_asset", { p_kind: kind, p_url: url, p_storage_path: uploadedPath });
      if (error) throw error;
      return Response.json({ profile: data });
    }
    if (body.action === "save") {
      const { data, error } = await client.rpc("loadlink_dealer_update_showroom", { p_payload: body });
      if (error) throw error;
      return Response.json({ profile: data });
    }
    throw new Error("Unsupported showroom action.");
  } catch (error) {
    if (uploadedPath) { try { const client=dealerServerClient(request); await client.storage.from("dealership-assets").remove([uploadedPath]); } catch {} }
    return apiError(error);
  }
}
