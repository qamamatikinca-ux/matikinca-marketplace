import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

async function sendInviteEmail(origin: string, result: Record<string, unknown>) {
  const token = String(result.token || "");
  const email = String(result.invited_email || "");
  if (!token || !email) return { delivered: false, invite_url: "" };
  const inviteUrl = `${origin}/dealer/invite?token=${encodeURIComponent(token)}`;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LOADLINK_EMAIL_FROM;
  if (!apiKey || !from) return { delivered: false, invite_url: inviteUrl };
  const dealership = String(result.dealership_name || "a LoadLink dealership");
  const role = String(result.role || "staff").replaceAll("_", " ");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${dealership} invited you to LoadLink Dealer`,
      html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:auto"><div style="font-size:22px;font-weight:900;margin-bottom:28px">LOADLINK</div><h1 style="font-size:24px">Dealer team invitation</h1><p>${dealership} invited you as ${role}.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;text-decoration:none;font-weight:800">Accept invitation</a></p><p style="color:#666;font-size:13px">This invitation expires in 7 days and only works for ${email}.</p></div>`,
    }),
  });
  if (!response.ok) return { delivered: false, invite_url: inviteUrl };
  return { delivered: true, invite_url: inviteUrl };
}

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireDealerContext(client);
    const { data, error } = await client.rpc("loadlink_dealer_team"); if (error) throw error;
    return Response.json(data || { staff: [], invitations: [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireDealerContext(client); const body = await request.json();
    const action = String(body.action || "");
    if (action === "invite") {
      const { data, error } = await client.rpc("loadlink_dealer_create_invitation", { p_email: String(body.email || ""), p_role: String(body.role || "sales_agent") });
      if (error) throw error;
      const delivery = await sendInviteEmail(request.nextUrl.origin, (data || {}) as Record<string, unknown>);
      return Response.json({ ...(data || {}), ...delivery, token: undefined });
    }
    const { data, error } = await client.rpc("loadlink_dealer_team_action", { p_action: action, p_payload: body }); if (error) throw error;
    if (action === "resend") {
      const delivery = await sendInviteEmail(request.nextUrl.origin, (data || {}) as Record<string, unknown>);
      return Response.json({ ...(data || {}), ...delivery, token: undefined });
    }
    return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
