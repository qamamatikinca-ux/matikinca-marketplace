import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function clients(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = request.headers.get("authorization") || "";
  if (!url || !anon || !service) throw new Error("Payments are not configured yet.");
  return {
    user: createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: auth ? { Authorization: auth } : {} },
    }),
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

function exactQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return 0;
  return quantity;
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return Response.json({ error: "Payments are not available yet." }, { status: 503 });

    const { user, admin } = clients(request);
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (!auth.user.email) return Response.json({ error: "Add an email address to your LoadLink account before paying." }, { status: 409 });

    const intelligence = await user.rpc("loadlink_get_my_intelligence_state");
    if (intelligence.error) throw intelligence.error;
    const state = intelligence.data || {};
    if (["blocked", "suspended"].includes(String(state.account_status))) {
      return Response.json({ error: state.account_reason || "This account cannot start a payment right now." }, { status: 403 });
    }
    if (["pro", "dealer"].includes(String(state.plan)) && ["active", "trial", "trialing", "grace_period", "cancelled"].includes(String(state.plan_state))) {
      return Response.json({ error: `Vehicle advertising is already included in your ${String(state.plan) === "dealer" ? "Dealer" : "Pro"} plan.` }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const quantity = exactQuantity(body?.quantity);
    if (!quantity) return Response.json({ error: "Choose between 1 and 100 Manual listing credits." }, { status: 400 });

    const existing = await admin
      .from("admin_payments")
      .select("reference,amount_cents,currency,created_at,metadata")
      .eq("user_id", auth.user.id)
      .eq("payment_type", "manual_listing_credit")
      .eq("package_type", "manual")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);
    if (existing.error) throw existing.error;

    for (const row of existing.data || []) {
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
      const sameQuantity = Number(metadata.quantity) === quantity;
      const authorizationUrl = String(metadata.authorization_url || "");
      const created = new Date(row.created_at || 0).getTime();
      if (sameQuantity && authorizationUrl && Number.isFinite(created) && Date.now() - created < 30 * 60 * 1000) {
        return Response.json({
          authorization_url: authorizationUrl,
          reference: row.reference,
          quantity,
          unit_price_cents: Number(metadata.unit_price_cents || 1500),
          duration_days: Number(metadata.duration_days || 10),
          amount_cents: Number(row.amount_cents),
          currency: String(row.currency || "ZAR").toUpperCase(),
          reused: true,
        });
      }
    }

    const order = await admin.rpc("loadlink_create_manual_credit_order", {
      p_user_id: auth.user.id,
      p_quantity: quantity,
    });
    if (order.error) throw order.error;

    const paymentId = String(order.data?.payment_id || "");
    const reference = String(order.data?.reference || "");
    const amount = Number(order.data?.amount_cents || 0);
    const unitPrice = Number(order.data?.unit_price_cents || 0);
    const durationDays = Number(order.data?.duration_days || 0);
    const currency = String(order.data?.currency || "").toUpperCase();

    if (!paymentId || !reference || amount !== quantity * unitPrice || unitPrice !== 1500 || durationDays !== 10 || currency !== "ZAR") {
      throw new Error("LoadLink stopped this checkout because the Manual listing total did not reconcile.");
    }

    const init = {
      email: auth.user.email,
      amount,
      currency,
      reference,
      callback_url: `${origin(request)}/packages?payment=return`,
      metadata: {
        loadlink_payment_id: paymentId,
        loadlink_user_id: auth.user.id,
        loadlink_product: "manual_listing_credit",
        loadlink_quantity: quantity,
        loadlink_unit_price_cents: unitPrice,
        loadlink_duration_days: durationDays,
        loadlink_expected_amount_cents: amount,
      },
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(init),
    });
    const paystack = await response.json();

    if (!response.ok || !paystack?.status || !paystack?.data?.authorization_url || String(paystack?.data?.reference || "") !== reference) {
      await admin.from("admin_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", paymentId).eq("status", "pending");
      await admin.from("billing_history").update({ status: "failed" }).eq("payment_id", paymentId).eq("status", "pending");
      throw new Error(paystack?.message || "Paystack could not start checkout.");
    }

    const metadata = {
      source: "manual_credit_purchase",
      product_code: "manual_listing_credit",
      quantity,
      unit_price_cents: unitPrice,
      duration_days: durationDays,
      authorization_url: paystack.data.authorization_url,
      access_code: paystack.data.access_code,
    };
    const saved = await admin
      .from("admin_payments")
      .update({ metadata, external_reference: reference, updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("reference", reference)
      .eq("status", "pending");
    if (saved.error) throw saved.error;

    return Response.json({
      authorization_url: paystack.data.authorization_url,
      reference,
      quantity,
      unit_price_cents: unitPrice,
      duration_days: durationDays,
      amount_cents: amount,
      currency,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "LoadLink could not start Manual payment." }, { status: 400 });
  }
}
