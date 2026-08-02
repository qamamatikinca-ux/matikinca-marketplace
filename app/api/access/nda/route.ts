import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

export const dynamic = "force-dynamic";

const FALLBACK_NDA_VERSION = "2026-08-02.1";

type GuardState = {
  authenticated?: boolean;
  allowed?: boolean;
  isAdmin?: boolean;
  status?: string;
  reason?: string | null;
  suspendedUntil?: string | null;
};

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

function asBoolean(value: unknown) {
  return value === true || value === "true";
}

function compatibilityState(raw: GuardState | null | undefined, authenticatedHint = false) {
  const authenticated = asBoolean(raw?.authenticated) || authenticatedHint;
  const status = String(raw?.status || (authenticated ? "active" : "guest"));
  const isAdmin = asBoolean(raw?.isAdmin);
  const restricted = status === "blocked" || status === "suspended";

  return {
    authenticated,
    allowed: isAdmin && !restricted,
    isAdmin,
    status,
    reason: raw?.reason || null,
    suspendedUntil: raw?.suspendedUntil || null,
    requiresAcceptance: !isAdmin && !restricted,
    ndaAccepted: isAdmin && !restricted,
    nda: null,
    compatibilityMode: true,
  };
}

function legacyCapabilitiesState(raw: Record<string, unknown> | null | undefined, authenticatedHint = false) {
  const status = String(raw?.status || (authenticatedHint ? "active" : "guest"));
  return compatibilityState(
    {
      authenticated: authenticatedHint,
      status,
      allowed: asBoolean(raw?.canBrowse),
    },
    authenticatedHint,
  );
}

async function resolveGuard(client: SupabaseClient, authenticatedHint: boolean) {
  const guard = await client.rpc("loadlink_access_guard_state");
  if (!guard.error && guard.data) return compatibilityState(guard.data as GuardState, authenticatedHint);

  const primary = await client.rpc("loadlink_access_state");
  if (!primary.error && primary.data) return primary.data as Record<string, unknown>;

  const legacy = await client.rpc("loadlink_marketplace_capabilities");
  if (!legacy.error && legacy.data) {
    return legacyCapabilitiesState(legacy.data as Record<string, unknown>, authenticatedHint);
  }

  console.error("[LoadLink access guard unavailable]", {
    guard: guard.error?.message,
    primary: primary.error?.message,
    legacy: legacy.error?.message,
  });
  throw new Error("ACCESS_GUARD_UNAVAILABLE");
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    const client = publicSupabase(token || undefined);

    const primary = await client.rpc("loadlink_access_state");
    if (!primary.error && primary.data) {
      return NextResponse.json(primary.data, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    try {
      const fallback = await resolveGuard(client, Boolean(token));
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    } catch {
      if (!token) {
        return NextResponse.json(compatibilityState(null, false), {
          headers: { "Cache-Control": "no-store, max-age=0" },
        });
      }

      const { data: userData, error: userError } = await client.auth.getUser(token);
      if (userError || !userData.user) {
        return NextResponse.json({ error: "Your sign-in session is invalid." }, { status: 401 });
      }
      throw new Error("ACCESS_GUARD_UNAVAILABLE");
    }
  } catch (error) {
    return NextResponse.json(
      {
        ...safeError(error, "LoadLink access protection is temporarily unavailable."),
        code: "ACCESS_GUARD_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

    const client = publicSupabase(token);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Your sign-in session is invalid." }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const action = String(payload?.action || "");
    const guardState = await resolveGuard(client, true);
    const status = String(guardState?.status || "active");

    if (status === "blocked" || status === "suspended") {
      return NextResponse.json(
        {
          ...guardState,
          allowed: false,
          requiresAcceptance: false,
          ndaAccepted: false,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const metadata = {
      platform: request.headers.get("sec-ch-ua-platform") || null,
      language: request.headers.get("accept-language")?.slice(0, 80) || null,
      source: "loadlink-web-simple-gate",
    };

    if (action === "decline") {
      try {
        await client.rpc("loadlink_record_nda_decline", { p_metadata: metadata });
      } catch {
        // Declining still prevents local entry when the optional audit RPC is unavailable.
      }
      return NextResponse.json({ declined: true });
    }

    if (action !== "accept") {
      return NextResponse.json({ error: "Unsupported access action." }, { status: 400 });
    }

    const metadataName = String(
      userData.user.user_metadata?.full_name ||
      userData.user.user_metadata?.name ||
      "",
    ).trim();
    const emailName = String(userData.user.email || "").split("@")[0]?.trim() || "";
    const acceptedName = String(payload?.acceptedName || metadataName || emailName || "LoadLink user").trim().slice(0, 160);

    const userAgent = request.headers.get("user-agent") || "";
    const ip = requestIp(request);
    const primary = await client.rpc("loadlink_accept_current_nda", {
      p_accepted_name: acceptedName,
      p_ip_sha256: auditHash(ip),
      p_user_agent_sha256: auditHash(userAgent),
      p_metadata: metadata,
    });

    if (!primary.error && primary.data) {
      return NextResponse.json(primary.data, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const compatibilityAcceptance = await client.rpc("loadlink_record_click_acceptance", {
      p_version: FALLBACK_NDA_VERSION,
      p_metadata: metadata,
    });

    if (compatibilityAcceptance.error) {
      console.error("[LoadLink compatibility acceptance not recorded]", {
        primary: primary.error?.message,
        compatibility: compatibilityAcceptance.error.message,
      });
    }

    return NextResponse.json(
      {
        ...guardState,
        authenticated: true,
        allowed: true,
        ndaAccepted: true,
        requiresAcceptance: false,
        nda: null,
        acceptanceRecorded: !compatibilityAcceptance.error,
        compatibilityMode: true,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const unavailable = error instanceof Error && error.message === "ACCESS_GUARD_UNAVAILABLE";
    return NextResponse.json(
      {
        ...safeError(
          error,
          unavailable
            ? "LoadLink access protection is temporarily unavailable."
            : "The agreement acceptance could not be recorded.",
        ),
        code: unavailable ? "ACCESS_GUARD_UNAVAILABLE" : "ACCEPTANCE_FAILED",
      },
      { status: unavailable ? 503 : 400 },
    );
  }
}
