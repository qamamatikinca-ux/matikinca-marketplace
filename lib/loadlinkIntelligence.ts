"use client";

import { supabase } from "@/lib/supabaseClient";

export type LoadLinkPlan = "standard" | "pro" | "dealer";
export type LoadLinkPlanState =
  | "standard" | "under_review" | "approved_for_payment" | "payment_pending"
  | "payment_failed" | "payment_syncing" | "rejected" | "active" | "trialing"
  | "grace_period" | "cancelled" | "past_due" | "expired";

export type LoadLinkIntelligenceState = {
  authenticated: boolean;
  user_id?: string | null;
  email?: string | null;
  role?: string | null;
  account_status: "active" | "blocked" | "suspended" | string;
  account_reason?: string | null;
  plan: LoadLinkPlan;
  plan_state: LoadLinkPlanState | string;
  current_period_end?: string | null;
  plan_request_id?: string | null;
  plan_request_plan?: LoadLinkPlan | null;
  plan_request_status?: string | null;
  plan_request_state?: LoadLinkPlanState | string | null;
  plan_request_reason?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  verification_status?: string | null;
  dealer_status?: string | null;
  dealer_profile_id?: string | null;
  dealer_ready?: boolean;
  driver_status?: string | null;
  capabilities: {
    can_post_vehicle: boolean;
    analytics: boolean;
    dealer_tools: boolean;
    image_limit: number;
    daily_message_limit: number | null;
  };
  next_action?: string | null;
};

export const signedOutIntelligence: LoadLinkIntelligenceState = {
  authenticated: false,
  account_status: "active",
  plan: "standard",
  plan_state: "standard",
  capabilities: { can_post_vehicle: false, analytics: false, dealer_tools: false, image_limit: 5, daily_message_limit: 50 },
};

export function loadLinkHumanError(error: unknown, fallback = "LoadLink could not finish that action right now.") {
  const raw = error instanceof Error ? error.message : String((error as any)?.message || error || "");
  if (/fetch|network|offline|load failed|timeout|connection/i.test(raw))
    return "The connection was interrupted. Your page is still here — try again when your signal settles.";
  if (/jwt|unauthorized|401|session/i.test(raw))
    return "Your sign-in session needs to be refreshed. Sign in again and LoadLink will keep your account state.";
  if (/duplicate key|unique constraint|23505|row level security|postgres|pgrst|supabase|schema cache|permission denied/i.test(raw)) return fallback;
  return raw.trim() || fallback;
}

export async function getLoadLinkIntelligence(): Promise<LoadLinkIntelligenceState> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return signedOutIntelligence;
  const res = await fetch("/api/account/intelligence", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(loadLinkHumanError(body?.error, "LoadLink could not read your account status right now."));
  return body as LoadLinkIntelligenceState;
}

export async function requestLoadLinkPlan(plan: "pro" | "dealer") {
  const { data, error } = await supabase.rpc("loadlink_request_plan", { p_plan_code: plan });
  if (error) throw new Error(loadLinkHumanError(error, "LoadLink could not submit that plan request."));
  window.dispatchEvent(new Event("loadlink-account-state-changed"));
  return data;
}

export async function startLoadLinkPayment(planRequestId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to continue.");
  const res = await fetch("/api/billing/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ plan_request_id: planRequestId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(loadLinkHumanError(body?.error, "LoadLink could not start payment."));
  return body as { authorization_url: string; reference: string; reused?: boolean };
}

export async function verifyReturnedLoadLinkPayment(reference: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to confirm your payment.");
  const res = await fetch("/api/billing/paystack/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ reference }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(loadLinkHumanError(body?.error, "LoadLink is still confirming your payment."));
  window.dispatchEvent(new Event("loadlink-account-state-changed"));
  return body;
}

export async function getPaystackManagementLink() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to manage your plan.");
  const res = await fetch("/api/billing/paystack/manage", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(loadLinkHumanError(body?.error, "Plan management is not available right now."));
  return body as { link: string };
}
