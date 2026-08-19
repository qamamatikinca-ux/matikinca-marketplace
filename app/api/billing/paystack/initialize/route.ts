import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function clients(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = request.headers.get("authorization") || "";
  if (!url || !anon || !service) throw new Error("Payments are not configured yet.");
  return {
    user: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: auth ? { Authorization: auth } : {} } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

function origin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return Response.json({ error: "Payments are not available yet." }, { status: 503 });

    const { user, admin } = clients(request);
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

    const st = await user.rpc("loadlink_get_my_intelligence_state");
    if (st.error) throw st.error;
    const state = st.data || {};
    if (["blocked", "suspended"].includes(String(state.account_status))) {
      return Response.json({ error: state.account_reason || "This account cannot start a payment right now." }, { status: 403 });
    }
    if (["active", "trialing", "grace_period", "cancelled"].includes(String(state.plan_state))) {
      return Response.json({ error: "This account already has vehicle-listing access. LoadLink will not charge it for the same plan again." }, { status: 409 });
    }

    const body = await request.json();
    const requestId = String(body?.plan_request_id || "");
    if (!requestId) return Response.json({ error: "Choose an approved plan first." }, { status: 400 });

    const req = await admin
      .from("custom_package_requests")
      .select("id,user_id,recommended_plan,status,final_amount_cents,estimated_amount_cents")
      .eq("id", requestId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (req.error) throw req.error;
    if (!req.data) return Response.json({ error: "That plan request could not be found." }, { status: 404 });
    if (req.data.status !== "approved") {
      return Response.json({ error: req.data.status === "rejected" ? "This plan request was not approved." : "Your plan request is still being reviewed." }, { status: 409 });
    }

    const planCode = String(req.data.recommended_plan || "");
    if (!["pro", "dealer"].includes(planCode)) return Response.json({ error: "This plan cannot be paid online." }, { status: 400 });

    const plan = await admin.from("subscription_plans").select("price_cents,currency").eq("code", planCode).eq("is_active", true).maybeSingle();
    if (plan.error) throw plan.error;
    if (!plan.data) return Response.json({ error: "This plan is unavailable." }, { status: 409 });

    const standardAmount = Number(plan.data.price_cents || 0);
    const amount = Number(req.data.final_amount_cents || req.data.estimated_amount_cents || standardAmount || 0);
    if (!amount || amount < 1) return Response.json({ error: "LoadLink could not determine the approved payment amount." }, { status: 409 });

    const existing = await admin
      .from("admin_payments")
      .select("reference,status,created_at,metadata")
      .eq("user_id", auth.user.id)
      .eq("payment_type", "subscription")
      .eq("package_type", planCode)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.data?.reference && existing.data.metadata && typeof existing.data.metadata === "object") {
      const metadata = existing.data.metadata as Record<string, unknown>;
      const same = String(metadata.plan_request_id || "") === requestId;
      const authorizationUrl = String(metadata.authorization_url || "");
      const created = new Date(existing.data.created_at || 0).getTime();
      if (same && authorizationUrl && Number.isFinite(created) && Date.now() - created < 30 * 60 * 1000) {
        return Response.json({ authorization_url: authorizationUrl, reference: existing.data.reference, reused: true });
      }
    }

    const recurringPlanCode = planCode === "dealer" ? process.env.PAYSTACK_DEALER_PLAN_CODE : process.env.PAYSTACK_PRO_PLAN_CODE;
    const useRecurringPlan = Boolean(recurringPlanCode && amount === standardAmount);
    const init: Record<string, unknown> = {
      email: auth.user.email,
      amount,
      currency: String(plan.data.currency || "ZAR").toUpperCase(),
      callback_url: `${origin(request)}/packages?payment=return`,
      metadata: {
        loadlink_plan_request_id: req.data.id,
        loadlink_user_id: auth.user.id,
        loadlink_plan: planCode,
        loadlink_approved_amount_cents: amount,
        loadlink_custom_price: amount !== standardAmount,
      },
    };
    // Paystack plan codes have a fixed recurring amount. Never attach one to a
    // negotiated amount because that can silently charge the catalogue price.
    if (useRecurringPlan) init.plan = recurringPlanCode;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(init),
    });
    const paystack = await response.json();
    if (!response.ok || !paystack?.status || !paystack?.data?.authorization_url) {
      throw new Error(paystack?.message || "Paystack could not start checkout.");
    }

    const inserted = await admin.from("admin_payments").insert({
      user_id: auth.user.id,
      amount_cents: amount,
      currency: String(plan.data.currency || "ZAR").toUpperCase(),
      status: "pending",
      provider: "paystack",
      reference: paystack.data.reference,
      external_reference: paystack.data.reference,
      payer_email: auth.user.email,
      payment_type: "subscription",
      package_type: planCode,
      description: `LoadLink ${planCode} subscription`,
      metadata: {
        plan_request_id: req.data.id,
        authorization_url: paystack.data.authorization_url,
        access_code: paystack.data.access_code,
        paystack_plan_code: useRecurringPlan ? recurringPlanCode : null,
        custom_price: amount !== standardAmount,
      },
    });
    if (inserted.error) throw inserted.error;

    return Response.json({ authorization_url: paystack.data.authorization_url, reference: paystack.data.reference });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "LoadLink could not start payment." }, { status: 400 });
  }
}
