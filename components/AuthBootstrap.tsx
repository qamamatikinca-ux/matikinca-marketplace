"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { isAuthenticatedUser } from "@/lib/auth";
import { clearActiveAccountState, recordUserActivity, syncAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

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
    }

    bootstrap().catch(() => undefined);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && isAuthenticatedUser(session?.user)) {
        window.setTimeout(() => syncAccountState().catch(() => undefined), 0);
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
