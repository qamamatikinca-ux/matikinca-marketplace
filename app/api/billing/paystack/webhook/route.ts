import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function obj(value: unknown): Record<string, any> {
  if (value && typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
}

function planFromCode(code: string) {
  if (code && code === process.env.PAYSTACK_DEALER_PLAN_CODE) return "dealer";
  if (code && code === process.env.PAYSTACK_PRO_PLAN_CODE) return "pro";
  return "";
}

function codeFrom(data: any) {
  return String(data?.plan?.plan_code || data?.plan_code || obj(data?.metadata)?.paystack_plan_code || "");
}

function eventKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !service) {
    return Response.json({ error: "Payment service is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const supplied = request.headers.get("x-paystack-signature") || "";
  if (!supplied || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const data = event?.data || {};
  const key = eventKey(raw);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    if (event.event === "charge.success") {
      const reference = String(data.reference || "");
      if (!reference) return Response.json({ ok: true });

      const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const verified = await verifyResponse.json();
      if (!verifyResponse.ok || !verified?.status || verified?.data?.status !== "success") {
        return Response.json({ error: "Payment could not be verified." }, { status: 400 });
      }
      if (String(verified?.data?.reference || "") !== reference) {
        return Response.json({ error: "Payment reference did not match." }, { status: 409 });
      }

      let payment = await admin
        .from("admin_payments")
        .select("id,user_id,package_type,payment_type,status,amount_cents,currency,reference,metadata")
        .eq("reference", reference)
        .maybeSingle();
      if (payment.error) throw payment.error;

      if (!payment.data) {
        // Only genuine Paystack recurring Pro/Dealer charges may be reconstructed.
        // Manual credits must always have a server-created LoadLink order first.
        const verifiedData = verified.data || {};
        const metadata = obj(verifiedData.metadata);
        let userId = String(metadata.loadlink_user_id || "");
        let plan = String(metadata.loadlink_plan || "");
        if (!plan) plan = planFromCode(codeFrom(verifiedData));
        const email = String(verifiedData?.customer?.email || "");

        if (!userId && email) {
          const profile = await admin.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
          if (profile.error) throw profile.error;
          userId = String(profile.data?.id || "");
        }
        if (!userId || !["pro", "dealer"].includes(plan) || !codeFrom(verifiedData)) {
          return Response.json({ ok: true });
        }

        const expectedPlan = await admin
          .from("subscription_plans")
          .select("price_cents,currency")
          .eq("code", plan)
          .eq("is_active", true)
          .maybeSingle();
        if (expectedPlan.error) throw expectedPlan.error;
        if (!expectedPlan.data) return Response.json({ ok: true });

        if (
          Number(verifiedData.amount) !== Number(expectedPlan.data.price_cents) ||
          String(verifiedData.currency || "").toUpperCase() !== String(expectedPlan.data.currency || "ZAR").toUpperCase()
        ) {
          return Response.json({ error: "Recurring payment amount did not match the LoadLink plan." }, { status: 409 });
        }

        const inserted = await admin
          .from("admin_payments")
          .insert({
            user_id: userId,
            amount_cents: Number(verifiedData.amount),
            currency: String(verifiedData.currency || "ZAR").toUpperCase(),
            status: "pending",
            provider: "paystack",
            reference,
            external_reference: reference,
            provider_transaction_id: String(verifiedData.id || ""),
            payer_email: email || null,
            payment_type: "subscription",
            package_type: plan,
            description: `LoadLink ${plan} subscription renewal`,
            metadata: { recurring: true, paystack_plan_code: codeFrom(verifiedData) || null },
          })
          .select("id,user_id,package_type,payment_type,status,amount_cents,currency,reference,metadata")
          .single();

        if (inserted.error) {
          if (inserted.error.code !== "23505") throw inserted.error;
          payment = await admin
            .from("admin_payments")
            .select("id,user_id,package_type,payment_type,status,amount_cents,currency,reference,metadata")
            .eq("reference", reference)
            .maybeSingle();
          if (payment.error) throw payment.error;
        } else {
          payment = { data: inserted.data, error: null } as typeof payment;
        }
      }

      if (!payment.data) throw new Error("Verified payment could not be matched to a LoadLink payment record.");
      if (
        Number(verified.data.amount) !== Number(payment.data.amount_cents) ||
        String(verified.data.currency || "").toUpperCase() !== String(payment.data.currency || "ZAR").toUpperCase()
      ) {
        return Response.json({ error: "Payment details did not match the approved LoadLink order." }, { status: 409 });
      }

      let finalized;
      if (payment.data.payment_type === "manual_listing_credit" && payment.data.package_type === "manual") {
        finalized = await admin.rpc("loadlink_finalize_manual_credit_payment", {
          p_payment_id: payment.data.id,
          p_reference: reference,
          p_provider_transaction_id: String(verified.data.id || ""),
          p_amount_cents: Number(verified.data.amount),
          p_currency: String(verified.data.currency || "ZAR").toUpperCase(),
        });
      } else if (payment.data.payment_type === "subscription" && ["pro", "dealer"].includes(String(payment.data.package_type))) {
        finalized = await admin.rpc("loadlink_finalize_paid_plan", {
          p_payment_id: payment.data.id,
          p_reference: reference,
          p_provider_transaction_id: String(verified.data.id || ""),
          p_amount_cents: Number(verified.data.amount),
          p_currency: String(verified.data.currency || "ZAR").toUpperCase(),
        });
      } else {
        return Response.json({ error: "Verified payment did not map to a supported LoadLink entitlement." }, { status: 409 });
      }
      if (finalized.error) throw finalized.error;
      return Response.json({ ok: true });
    }

    if (event.event === "subscription.create") {
      const subscriptionCode = String(data.subscription_code || "");
      const planCode = codeFrom(data);
      const plan = planFromCode(planCode);
      const email = String(data?.customer?.email || "");
      if (!subscriptionCode || !plan || !email) return Response.json({ ok: true });

      const profile = await admin.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
      if (profile.error) throw profile.error;
      const userId = String(profile.data?.id || "");
      if (!userId) throw new Error("Paystack subscription customer is not linked to a LoadLink account yet.");

      const applied = await admin.rpc("loadlink_apply_paystack_subscription_event", {
        p_event_key: key,
        p_event_type: event.event,
        p_subscription_code: subscriptionCode,
        p_plan_code: plan,
        p_user_id: userId,
        p_customer_code: String(data?.customer?.customer_code || "") || null,
        p_next_payment_date: data.next_payment_date || null,
      });
      if (applied.error) throw applied.error;
      return Response.json({ ok: true });
    }

    if (
      event.event === "invoice.payment_failed" ||
      event.event === "subscription.not_renew" ||
      event.event === "subscription.disable"
    ) {
      const subscriptionCode = String(data?.subscription?.subscription_code || data?.subscription_code || "");
      if (!subscriptionCode) return Response.json({ ok: true });

      const applied = await admin.rpc("loadlink_apply_paystack_subscription_event", {
        p_event_key: key,
        p_event_type: event.event,
        p_subscription_code: subscriptionCode,
        p_plan_code: null,
        p_user_id: null,
        p_customer_code: null,
        p_next_payment_date: null,
      });
      if (applied.error) throw applied.error;
      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("LoadLink Paystack webhook error", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
