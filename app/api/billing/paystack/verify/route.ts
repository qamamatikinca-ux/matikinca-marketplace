import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret || !url || !anon || !service) {
      return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const user = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return Response.json({ error: "Sign in to confirm your payment." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const reference = String(body?.reference || "").trim();
    if (!reference) return Response.json({ error: "The payment reference is missing." }, { status: 400 });

    const payment = await admin
      .from("admin_payments")
      .select("id,user_id,amount_cents,currency,status,payment_type,package_type,metadata")
      .eq("reference", reference)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (payment.error) throw payment.error;
    if (!payment.data) return Response.json({ error: "LoadLink could not find this payment on your account." }, { status: 404 });

    if (payment.data.status === "paid") {
      return Response.json({ ok: true, already_processed: true, payment_type: payment.data.payment_type });
    }
    if (["cancelled", "refunded"].includes(String(payment.data.status))) {
      return Response.json({ error: "This payment can no longer be completed." }, { status: 409 });
    }

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok || !verified?.status || verified?.data?.status !== "success") {
      return Response.json({ error: "The payment has not completed yet. You can safely try again." }, { status: 409 });
    }

    const verifiedReference = String(verified.data.reference || "");
    const verifiedAmount = Number(verified.data.amount);
    const verifiedCurrency = String(verified.data.currency || "").toUpperCase();
    const expectedAmount = Number(payment.data.amount_cents);
    const expectedCurrency = String(payment.data.currency || "ZAR").toUpperCase();

    if (verifiedReference !== reference || verifiedAmount !== expectedAmount || verifiedCurrency !== expectedCurrency) {
      return Response.json({ error: "The payment details did not match the approved LoadLink order. Nothing was activated." }, { status: 409 });
    }

    let finalized;
    if (payment.data.payment_type === "manual_listing_credit" && payment.data.package_type === "manual") {
      finalized = await admin.rpc("loadlink_finalize_manual_credit_payment", {
        p_payment_id: payment.data.id,
        p_reference: reference,
        p_provider_transaction_id: String(verified.data.id || ""),
        p_amount_cents: verifiedAmount,
        p_currency: verifiedCurrency,
      });
    } else if (payment.data.payment_type === "subscription" && ["pro", "dealer"].includes(String(payment.data.package_type))) {
      finalized = await admin.rpc("loadlink_finalize_paid_plan", {
        p_payment_id: payment.data.id,
        p_reference: reference,
        p_provider_transaction_id: String(verified.data.id || ""),
        p_amount_cents: verifiedAmount,
        p_currency: verifiedCurrency,
      });
    } else {
      return Response.json({ error: "LoadLink stopped this payment because the purchased product could not be verified." }, { status: 409 });
    }

    if (finalized.error) throw finalized.error;
    return Response.json({ ok: true, payment_type: payment.data.payment_type, result: finalized.data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "LoadLink could not confirm payment." }, { status: 400 });
  }
}
