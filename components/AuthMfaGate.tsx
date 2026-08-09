"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const AUTH_FLOW_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/"];

export default function AuthMfaGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || AUTH_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    let active = true;

    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active || !isAuthenticatedUser(userData.user)) return;
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active || error) return;
      if (data.currentLevel === "aal1" && data.nextLevel === "aal2") {
        const next = safeNextPath(`${window.location.pathname}${window.location.search}${window.location.hash}`, "/");
        router.replace(`/auth/mfa?next=${encodeURIComponent(next)}`);
      }
    }

    void check();
    return () => { active = false; };
  }, [pathname, router]);

  return null;
}
