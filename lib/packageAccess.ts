import { supabase } from "@/lib/supabaseClient";
import { packageLimits, safePositiveInteger } from "@/lib/core";

export type LoadLinkPlan = "manual" | "pro" | "dealer";

export type PackageAccess = {
  allowed: boolean;
  plan: LoadLinkPlan | null;
  source: "subscription" | "manual_access" | "manual_credit" | null;
  subscriptionStatus?: string | null;
  expiresAt?: string | null;
  accessPeriodId?: string | null;
  manualCreditId?: string | null;
  manualCreditBalance: number;
  durationDays?: number | null;
  activeListingLimit: number | null;
  activeManualListings: number;
  photoLimit: number;
  dailyMessageLimit: number | null;
  analyticsEnabled: boolean;
  featuredEnabled: boolean;
  schemaReady: boolean;
};

export type ManualListingProduct = {
  code: "manual_listing_credit";
  name: string;
  unit_price_cents: number;
  currency: "ZAR";
  duration_days: number;
  max_quantity: number;
};

export type ManualCreditBalance = {
  available: number;
  reserved: number;
  consumed: number;
};

const lockedAccess: PackageAccess = {
  allowed: false,
  plan: null,
  source: null,
  manualCreditBalance: 0,
  activeListingLimit: 0,
  activeManualListings: 0,
  photoLimit: 0,
  dailyMessageLimit: 0,
  analyticsEnabled: false,
  featuredEnabled: false,
  schemaReady: true,
};

export async function getVehicleListingAccess(): Promise<PackageAccess> {
  const { data, error } = await supabase.rpc("loadlink_get_vehicle_listing_access");
  if (error) {
    if (/does not exist|schema cache|function/i.test(error.message)) {
      return { ...lockedAccess, schemaReady: false };
    }
    throw error;
  }

  const value = (data || {}) as Record<string, unknown>;
  const plan = value.plan === "dealer" || value.plan === "pro" || value.plan === "manual" ? value.plan : null;
  const defaults = plan ? packageLimits[plan] : null;
  const source =
    value.source === "subscription" || value.source === "manual_access" || value.source === "manual_credit"
      ? value.source
      : value.source === "manual"
        ? "manual_access"
        : null;

  return {
    allowed: Boolean(value.allowed),
    plan,
    source,
    subscriptionStatus: typeof value.subscription_status === "string" ? value.subscription_status : null,
    expiresAt: typeof value.expires_at === "string" ? value.expires_at : null,
    accessPeriodId: typeof value.access_period_id === "string" ? value.access_period_id : null,
    manualCreditId: typeof value.manual_credit_id === "string" ? value.manual_credit_id : null,
    manualCreditBalance: Number(value.manual_credit_balance ?? 0),
    durationDays: value.duration_days === undefined || value.duration_days === null ? null : Number(value.duration_days),
    activeListingLimit: value.manual_listing_limit === undefined ? (defaults?.activeListingLimit ?? null) : Number(value.manual_listing_limit),
    activeManualListings: Number(value.active_manual_listings ?? 0),
    photoLimit: Number(value.photo_limit ?? defaults?.photoLimit ?? 0),
    dailyMessageLimit: value.daily_message_limit === undefined ? (defaults?.dailyMessageLimit ?? 0) : value.daily_message_limit === null ? null : Number(value.daily_message_limit),
    analyticsEnabled: value.analytics_enabled === undefined ? Boolean(defaults?.analyticsEnabled) : Boolean(value.analytics_enabled),
    featuredEnabled: value.featured_enabled === undefined ? Boolean(defaults?.featuredEnabled) : Boolean(value.featured_enabled),
    schemaReady: true,
  };
}

export async function getManualListingProduct(): Promise<ManualListingProduct> {
  const { data, error } = await supabase.rpc("loadlink_get_manual_listing_product");
  if (error) throw error;
  const value = (data || {}) as Record<string, unknown>;
  const unitPrice = Number(value.unit_price_cents);
  const durationDays = Number(value.duration_days);
  const maxQuantity = Number(value.max_quantity || 100);
  if (value.code !== "manual_listing_credit" || unitPrice !== 1500 || durationDays !== 10 || String(value.currency).toUpperCase() !== "ZAR") {
    throw new Error("Manual listing pricing is not configured correctly.");
  }
  return {
    code: "manual_listing_credit",
    name: String(value.name || "Manual listing credit"),
    unit_price_cents: unitPrice,
    currency: "ZAR",
    duration_days: durationDays,
    max_quantity: Math.max(1, Math.min(100, maxQuantity || 100)),
  };
}

export async function getManualCreditBalance(): Promise<ManualCreditBalance> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { available: 0, reserved: 0, consumed: 0 };
  const { data, error } = await supabase.rpc("loadlink_get_manual_credit_balance");
  if (error) throw error;
  const value = (data || {}) as Record<string, unknown>;
  return {
    available: Number(value.available ?? 0),
    reserved: Number(value.reserved ?? 0),
    consumed: Number(value.consumed ?? 0),
  };
}

export async function startManualListingPayment(quantity: number) {
  const safeQuantity = Math.max(1, Math.min(100, safePositiveInteger(quantity)));
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to continue.");

  const response = await fetch("/api/billing/paystack/manual/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ quantity: safeQuantity }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.error || "LoadLink could not start Manual payment."));
  return body as {
    authorization_url: string;
    reference: string;
    quantity: number;
    unit_price_cents: number;
    duration_days: number;
    amount_cents: number;
    currency: "ZAR";
    reused?: boolean;
  };
}

/** Legacy day-based Manual payment request retained only for existing historical flows. */
export async function requestManualListingPayment(days: number) {
  const safeDays = safePositiveInteger(days);
  const { data, error } = await supabase.rpc("loadlink_request_manual_listing_payment", { p_days: safeDays });
  if (error) throw error;
  return data as { payment_id: string; reference: string; days: number; amount_cents: number; status: string };
}

export async function requestSubscription(plan: "pro" | "dealer") {
  const { data, error } = await supabase.rpc("loadlink_request_subscription", { p_plan_code: plan });
  if (error) throw error;
  return data as { payment_id: string; reference: string; plan: string; amount_cents: number; status: string };
}

export async function requestListingRenewal(listingId: string, days: number) {
  const safeDays = safePositiveInteger(days);
  const { data, error } = await supabase.rpc("loadlink_request_listing_renewal", { p_listing_id: listingId, p_days: safeDays });
  if (error) throw error;
  return data as { payment_id: string; reference: string; listing_id: string; days: number; amount_cents: number; status: string };
}
