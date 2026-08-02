"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type AccountProfile = {
  full_name: string;
  avatar_url: string;
  role: string;
  subscription_plan: string;
};

type DealerState = {
  verification_status: string;
  is_public: boolean;
};

type AccountSnapshot = {
  ready: boolean;
  user: User | null;
  profile: AccountProfile;
  dealer: DealerState | null;
};

const EMPTY_PROFILE: AccountProfile = {
  full_name: "",
  avatar_url: "",
  role: "user",
  subscription_plan: "standard",
};

let snapshot: AccountSnapshot = {
  ready: !isSupabaseConfigured,
  user: null,
  profile: EMPTY_PROFILE,
  dealer: null,
};
let started = false;
let loadSequence = 0;
const listeners = new Set<() => void>();

function emit(next: AccountSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

async function applyUser(user: User | null) {
  const sequence = ++loadSequence;
  if (!user) {
    emit({ ready: true, user: null, profile: EMPTY_PROFILE, dealer: null });
    return;
  }

  const metadata = user.user_metadata || {};
  const fallbackProfile: AccountProfile = {
    full_name: String(metadata.full_name || metadata.name || ""),
    avatar_url: String(metadata.avatar_url || metadata.picture || ""),
    role: "user",
    subscription_plan: "standard",
  };

  emit({ ready: false, user, profile: fallbackProfile, dealer: null });

  const [profileResult, dealerResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url,role,subscription_plan")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("dealership_profiles")
      .select("verification_status,is_public")
      .eq("owner_user_id", user.id)
      .maybeSingle(),
  ]);

  if (sequence !== loadSequence) return;
  const profile = profileResult.data as Partial<AccountProfile> | null;
  const dealer = dealerResult.data as DealerState | null;

  emit({
    ready: true,
    user,
    profile: {
      full_name: String(profile?.full_name || fallbackProfile.full_name),
      avatar_url: String(profile?.avatar_url || fallbackProfile.avatar_url),
      role: String(profile?.role || "user"),
      subscription_plan: String(profile?.subscription_plan || "standard"),
    },
    dealer: dealerResult.error ? null : dealer,
  });
}

function ensureStarted() {
  if (started || !isSupabaseConfigured || typeof window === "undefined") return;
  started = true;

  void supabase.auth.getUser().then(({ data }) => applyUser(data.user));
  supabase.auth.onAuthStateChange((_event, session) => void applyUser(session?.user || null));

  const refresh = () => void refreshLoadLinkAccount();
  window.addEventListener("loadlink-profile-updated", refresh);
  window.addEventListener("loadlink-account-state-synced", refresh);
}

export function refreshLoadLinkAccount() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return supabase.auth.getUser().then(({ data }) => applyUser(data.user));
}

export function useLoadLinkAccount() {
  ensureStarted();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}
