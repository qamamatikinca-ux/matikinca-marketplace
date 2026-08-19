"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { isAuthenticatedUser } from "@/lib/auth";
import { clearActiveAccountState, recordUserActivity, syncAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

function readOwnedListingKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

async function syncOwnedListingMarkers(userId: string) {
  const { data, error } = await supabase
    .from("job_listings")
    .select("id")
    .eq("user_id", userId);
  if (error) return;

  const next = { ...readOwnedListingKeys() };
  const accountMarker = `account:${userId}`;
  let changed = false;

  for (const row of data || []) {
    const id = String(row.id || "");
    if (!id || next[id]) continue;
    next[id] = accountMarker;
    changed = true;
  }

  if (!changed) return;
  localStorage.setItem("loadlink-owned-job-keys", JSON.stringify(next));
  window.dispatchEvent(new Event("loadlink-account-state-synced"));
  window.dispatchEvent(new Event("loadlink-account-state-changed"));
}

export default function AuthBootstrap() {
  const pathname = usePathname();
  const lastLoggedPath = useRef("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !isAuthenticatedUser(user)) return;
      await syncAccountState();
      if (!active) return;
      await syncOwnedListingMarkers(user.id);
    }

    bootstrap().catch(() => undefined);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && isAuthenticatedUser(session?.user)) {
        window.setTimeout(() => {
          syncAccountState()
            .then(() => syncOwnedListingMarkers(session.user.id))
            .catch(() => undefined);
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        clearActiveAccountState();
      }
    });

    const syncFromStorage = () => syncAccountState().catch(() => undefined);
    window.addEventListener("loadlink-account-state-changed", syncFromStorage);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("loadlink-account-state-changed", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname === lastLoggedPath.current) return;
    lastLoggedPath.current = pathname;
    recordUserActivity("page_view", {
      entityType: "page",
      metadata: { path: pathname },
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
