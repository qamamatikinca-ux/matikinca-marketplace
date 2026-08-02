import { NextResponse } from "next/server";
import { safeInternalHref } from "@/lib/safeNavigation";
import { requireAdmin, safeApiError } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { client } = await requireAdmin(request);
    const body = (await request.json()) as { userId?: string; title?: string; message?: string; actionPath?: string };
    const target = String(body.userId || "").trim();
    const title = String(body.title || "").trim().slice(0, 100);
    const message = String(body.message || "").trim().slice(0, 1000);
    if (!/^[0-9a-f-]{36}$/i.test(target) || title.length < 3 || message.length < 5) {
      return NextResponse.json({ error: "Enter a valid user ID, title and message." }, { status: 400 });
    }
    const actionPath = safeInternalHref(body.actionPath || "/account", "/account");
    const result = await client.rpc("loadlink_send_admin_notification", {
      p_user_id: target,
      p_title: title,
      p_message: message,
      p_action_path: actionPath,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ sent: true, notificationId: result.data });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
