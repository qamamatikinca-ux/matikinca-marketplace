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

type DriverProfileState = {
  id: string;
  status: string;
};

type AccountSnapshot = {
  ready: boolean;
  user: User | null;
  profile: AccountProfile;
  dealer: DealerState | null;
  driverProfile: DriverProfileState | null;
};

const EMPTY_PROFILE: AccountProfile = {
  full_name: "",
  avatar_url: "",
  role: "user",
  subscription_plan: "standard",
};

const SERVER_SNAPSHOT: AccountSnapshot = {
  ready: !isSupabaseConfigured,
  user: null,
  profile: EMPTY_PROFILE,
  dealer: null,
  driverProfile: null,
};
let snapshot: AccountSnapshot = SERVER_SNAPSHOT;
let started = false;
let loadSequence = 0;
let lastProfileFetchUserId = "";
let lastProfileFetchAt = 0;
const listeners = new Set<() => void>();

function emit(next: AccountSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function cachedProfile(userId: string): Partial<AccountProfile> | null {
  try {
    const raw = window.sessionStorage.getItem("loadlink-profile-summary:" + userId);
    const value = raw ? JSON.parse(raw) as Partial<AccountProfile> : null;
    return value && typeof value === "object" ? value : null;
  } catch { return null; }
}

async function applyUser(user: User | null, force = false) {
  if (user && !force && snapshot.user?.id === user.id && lastProfileFetchUserId === user.id && Date.now() - lastProfileFetchAt < 30000) {
    // Token refreshes and account-state events must not restart all profile queries.
    if (snapshot.user !== user) emit({ ...snapshot, user, ready: true });
    return;
  }
  const sequence = ++loadSequence;
  if (user) { lastProfileFetchUserId = user.id; lastProfileFetchAt = Date.now(); }
  if (!user) {
    lastProfileFetchUserId = "";
    lastProfileFetchAt = 0;
    emit({ ready: true, user: null, profile: EMPTY_PROFILE, dealer: null, driverProfile: null });
    return;
  }

  const metadata = user.user_metadata || {};
  const previous = snapshot.user?.id === user.id ? snapshot : null;
  const remembered = previous?.profile || cachedProfile(user.id);
  const fallbackProfile: AccountProfile = {
    full_name: String(remembered?.full_name || metadata.full_name || metadata.name || ""),
    avatar_url: String(remembered?.avatar_url || metadata.avatar_url || metadata.picture || ""),
    role: String(remembered?.role || "user"),
    subscription_plan: String(remembered?.subscription_plan || "standard"),
  };
  // Show the last known name and Google portrait without waiting for unrelated
  // dealership and driver lookups. Every subsequent result updates independently.
  emit(previous ? { ...previous, user, ready: true } : {
    ready: true, user, profile: fallbackProfile, dealer: null, driverProfile: null,
  });

  const profileRequest = supabase.from("profiles")
    .select("full_name,avatar_url,role,subscription_plan").eq("id", user.id).maybeSingle()
    .then(({ data, error }) => {
      if (sequence !== loadSequence || error || !data) return;
      const profile: AccountProfile = {
        full_name: String(data.full_name || fallbackProfile.full_name),
        avatar_url: String(data.avatar_url || fallbackProfile.avatar_url),
        role: String(data.role || fallbackProfile.role),
        subscription_plan: String(data.subscription_plan || fallbackProfile.subscription_plan),
      };
      try { window.sessionStorage.setItem("loadlink-profile-summary:" + user.id, JSON.stringify(profile)); } catch {}
      emit({ ...snapshot, user, profile, ready: true });
    });
  const dealerRequest = supabase.from("dealership_profiles")
    .select("verification_status,is_public").eq("owner_user_id", user.id).maybeSingle()
    .then(({ data, error }) => {
      if (sequence !== loadSequence || error) return;
      emit({ ...snapshot, user, dealer: data as DealerState | null });
    });
  const driverRequest = supabase.from("driver_profiles")
    .select("id,status").eq("user_id", user.id).maybeSingle()
    .then(({ data, error }) => {
      if (sequence !== loadSequence || error) return;
      emit({ ...snapshot, user, driverProfile: data as DriverProfileState | null });
    });
  await Promise.allSettled([profileRequest, dealerRequest, driverRequest]);
}

function ensureStarted() {
  if (started || !isSupabaseConfigured || typeof window === "undefined") return;
  started = true;

  // Leave the auth callback before querying; avoid holding the auth lock.
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    window.setTimeout(() => void applyUser(user), 0);
  });

  const refresh = () => void refreshLoadLinkAccount(true);
  const softRefresh = () => void refreshLoadLinkAccount();
  window.addEventListener("loadlink-profile-updated", refresh);
  window.addEventListener("loadlink-driver-profile-updated", refresh);
  window.addEventListener("loadlink-account-state-synced", softRefresh);
}

export function refreshLoadLinkAccount(force = false) {
  if (!isSupabaseConfigured) return Promise.resolve();
  // This is display state; server-authorized operations still verify the user.
  return supabase.auth.getSession().then(({ data, error }) => { if (!error) return applyUser(data.session?.user || null, force); });
}

export function useLoadLinkAccount() {
  ensureStarted();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}
