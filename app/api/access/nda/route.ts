import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    ""
  ).split(",")[0]?.trim() || "";
}

function auditHash(value: string) {
  if (!value) return null;
  const salt = process.env.LOADLINK_AUDIT_SALT || "";
  return sha256(`${salt}:${value}`);
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    const client = publicSupabase(token || undefined);
    const { data, error } = await client.rpc("loadlink_access_state");
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(safeError(error, "LoadLink could not verify protected access."), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

    const client = publicSupabase(token);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Your sign-in session is invalid." }, { status: 401 });

    const payload = await request.json().catch(() => ({}));
    const action = String(payload?.action || "");
    const metadata = {
      platform: request.headers.get("sec-ch-ua-platform") || null,
      language: request.headers.get("accept-language")?.slice(0, 80) || null,
      source: "loadlink-web",
    };

    if (action === "decline") {
      const { error } = await client.rpc("loadlink_record_nda_decline", {
        p_metadata: metadata,
      });
      if (error) throw error;
      return NextResponse.json({ declined: true });
    }

    if (action !== "accept") return NextResponse.json({ error: "Unsupported access action." }, { status: 400 });

    const acceptedName = String(payload?.acceptedName || "").trim();
    if (acceptedName.length < 2 || acceptedName.length > 160) {
      return NextResponse.json({ error: "Enter your full legal name before accepting." }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    const ip = requestIp(request);
    const { data, error } = await client.rpc("loadlink_accept_current_nda", {
      p_accepted_name: acceptedName,
      p_ip_sha256: auditHash(ip),
      p_user_agent_sha256: auditHash(userAgent),
      p_metadata: metadata,
    });
    if (error) throw error;

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(safeError(error, "The agreement acceptance could not be recorded."), { status: 400 });
  }
}
