"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { securityCodeVerifiedForSession } from "@/lib/securityCode";
import { supabase } from "@/lib/supabaseClient";

const AUTH_FLOW_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/"];

export default function AuthMfaGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || AUTH_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    let active = true;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session || !isAuthenticatedUser(session.user)) return;
      if (securityCodeVerifiedForSession(session)) return;
      const next = safeNextPath(`${window.location.pathname}${window.location.search}${window.location.hash}`, "/");
      router.replace(`/auth/mfa?next=${encodeURIComponent(next)}`);
    }

    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session || !isAuthenticatedUser(session.user) || securityCodeVerifiedForSession(session)) return;
      const next = safeNextPath(`${window.location.pathname}${window.location.search}${window.location.hash}`, "/");
      router.replace(`/auth/mfa?next=${encodeURIComponent(next)}`);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
