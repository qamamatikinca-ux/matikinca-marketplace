"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const EXEMPT_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/complete-profile",
];

export default function ProfileOnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    let active = true;

    async function check() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active || userError || !isAuthenticatedUser(userData.user)) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!active) return;
      // Fail open during the short deploy -> SQL migration window, so existing
      // LoadLink users are never trapped by a missing column/schema cache.
      if (error && /onboarding_complete|column|schema cache|does not exist/i.test(error.message)) return;
      if (error) return;
      if (data?.onboarding_complete === true) return;

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = safeNextPath(current, "/");
      router.replace(`/complete-profile?next=${encodeURIComponent(next)}`);
    }

    void check();
    return () => { active = false; };
  }, [pathname, router]);

  return null;
}
