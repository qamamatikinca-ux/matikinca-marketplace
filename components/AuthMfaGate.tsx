"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { securityCodeVerifiedForSession } from "@/lib/securityCode";
import { supabase } from "@/lib/supabaseClient";

const AUTH_FLOW_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/"];

type CodeStatus = { enabled?: boolean };

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

      const { data, error } = await supabase.rpc("loadlink_security_code_status");
      if (!active || error) return;
      const status = (data || {}) as CodeStatus;

      // The 4-digit code is optional. Only accounts that deliberately enabled it are gated.
      if (!status.enabled) return;

      const next = safeNextPath(`${window.location.pathname}${window.location.search}${window.location.hash}`, "/");
      router.replace(`/auth/mfa?next=${encodeURIComponent(next)}`);
    }

    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!active) return;
      void check();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
