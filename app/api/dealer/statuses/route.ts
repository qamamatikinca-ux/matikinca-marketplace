import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
import { checkedBuffer, videoDurationSeconds } from "@/lib/dealer/media";

const STATUS_MEDIA = ["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/quicktime"] as const;
const MAX_STATUS_BYTES = 60 * 1024 * 1024;

function ownedPath(path: string, dealershipId: string) {
  return Boolean(path) && path.startsWith(`${dealershipId}/`) && !path.includes("..") && path.length < 500;
}

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireDealerContext(client);
    const { data, error } = await client.rpc("loadlink_dealer_status_list");
    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  let uploadedPath = "";
  try {
    const client = dealerServerClient(request);
    const context = await requireDealerContext(client);
    const body = await request.json();
    const action = String(body.action || "");
    if (["remove", "repost", "publish"].includes(action)) {
      const { data, error } = await client.rpc("loadlink_dealer_status_action", { p_action: action, p_status_id: String(body.status_id || "") });
      if (error) throw error;
      return Response.json(data || { ok: true });
    }

    const contentType = String(body.content_type || "");
    let mediaUrl: string | null = null;
    let mediaType: "image" | "video" | null = null;
    let duration: number | null = null;

    if (contentType === "photo" || contentType === "video") {
      if (body.storage_path) {
        uploadedPath = String(body.storage_path);
        if (!ownedPath(uploadedPath, context.dealership_id)) throw new Error("Invalid Dealer media path.");
        const download = await client.storage.from("dealership-status-media").download(uploadedPath);
        if (download.error || !download.data) throw download.error || new Error("Status media could not be verified.");
        const bytes = Buffer.from(await download.data.arrayBuffer());
        const checked = checkedBuffer(bytes, String(body.mime || ""), STATUS_MEDIA, MAX_STATUS_BYTES);
        mediaType = checked.mime.startsWith("video/") ? "video" : "image";
        if ((contentType === "video") !== (mediaType === "video")) throw new Error("The uploaded media does not match this Status type.");
        if (mediaType === "video") {
          const measured = videoDurationSeconds(checked);
          if (!measured || measured > 60.5) throw new Error("Dealer Status videos can be up to 60 seconds and must contain readable duration metadata.");
          duration = measured;
        }
        mediaUrl = client.storage.from("dealership-status-media").getPublicUrl(uploadedPath).data.publicUrl;
      } else if (body.media_library_id) {
        const { data: item, error: mediaError } = await client.from("dealership_media_library").select("id,media_type,url,duration_seconds").eq("id", String(body.media_library_id)).eq("dealership_id", context.dealership_id).maybeSingle();
        if (mediaError) throw mediaError;
        if (!item) throw new Error("Saved Dealer media was not found.");
        mediaType = item.media_type === "video" ? "video" : "image";
        if ((contentType === "video") !== (mediaType === "video")) throw new Error("Choose saved media that matches this Status type.");
        duration = item.duration_seconds ? Number(item.duration_seconds) : null;
        if (mediaType === "video" && (!duration || duration > 60.5)) throw new Error("This saved video does not have a valid duration. Upload it again before using it in Status.");
        mediaUrl = String(item.url || "");
      } else throw new Error("Choose media for this Status.");
    }

    const payload = { ...body, media_url: mediaUrl, video_duration_seconds: duration };
    delete payload.storage_path; delete payload.mime; delete payload.filename; delete payload.media_library_id;
    const { data, error } = await client.rpc("loadlink_create_dealer_status", { p_payload: payload });
    if (error) throw error;

    if (uploadedPath && mediaUrl && mediaType) {
      const library = await client.from("dealership_media_library").insert({
        dealership_id: context.dealership_id,
        uploaded_by: context.user_id,
        media_type: mediaType,
        url: mediaUrl,
        storage_path: uploadedPath,
        source: "status",
        label: body.title || body.filename || null,
        duration_seconds: duration,
      });
      if (library.error) console.warn("Dealer media library insert failed", library.error.message);
    }
    return Response.json(data || { ok: true });
  } catch (error) {
    if (uploadedPath) {
      try { const client = dealerServerClient(request); await client.storage.from("dealership-status-media").remove([uploadedPath]); } catch {}
    }
    return apiError(error);
  }
}
