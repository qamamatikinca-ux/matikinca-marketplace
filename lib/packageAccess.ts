import { supabase } from "@/lib/supabaseClient";

export type LoadLinkPlan = "manual" | "pro" | "dealer";

export type PackageAccess = {
  allowed: boolean;
  plan: LoadLinkPlan | null;
  source: "subscription" | "manual_access" | null;
  subscriptionStatus?: string | null;
  expiresAt?: string | null;
  accessPeriodId?: string | null;
  photoLimit: number;
  dailyMessageLimit: number | null;
  analyticsEnabled: boolean;
  featuredEnabled: boolean;
  schemaReady: boolean;
};

const lockedAccess: PackageAccess = {
  allowed: false,
  plan: null,
  source: null,
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
  return {
    allowed: Boolean(value.allowed),
    plan: value.plan === "dealer" || value.plan === "pro" || value.plan === "manual" ? value.plan : null,
    source: value.source === "subscription" || value.source === "manual_access" ? value.source : null,
    subscriptionStatus: typeof value.subscription_status === "string" ? value.subscription_status : null,
    expiresAt: typeof value.expires_at === "string" ? value.expires_at : null,
    accessPeriodId: typeof value.access_period_id === "string" ? value.access_period_id : null,
    photoLimit: Number(value.photo_limit || 0),
    dailyMessageLimit: value.daily_message_limit === null || value.daily_message_limit === undefined ? null : Number(value.daily_message_limit),
    analyticsEnabled: Boolean(value.analytics_enabled),
    featuredEnabled: Boolean(value.featured_enabled),
    schemaReady: true,
  };
}

export async function requestManualListingPayment(days: number) {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
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
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const { data, error } = await supabase.rpc("loadlink_request_listing_renewal", { p_listing_id: listingId, p_days: safeDays });
  if (error) throw error;
  return data as { payment_id: string; reference: string; listing_id: string; days: number; amount_cents: number; status: string };
}
