"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { destinationAfterMfa } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timeout: number | null = null;

    async function complete(next: string) {
      await syncAccountState().catch(() => undefined);
      const destination = await destinationAfterMfa(next);
      if (active) router.replace(destination);
    }

    async function finishSignIn() {
      if (!isSupabaseConfigured) { setError("Secure sign-in is temporarily unavailable."); return; }
      const params = new URLSearchParams(window.location.search);
      const next = safeNextPath(params.get("next"), "/");
      if (params.get("error") || params.get("error_description")) { setError("The sign-in provider did not complete the request. Return to sign in and try again."); return; }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !/already|verifier|session/i.test(exchangeError.message)) { setError("The secure sign-in link expired or could not be verified. Try signing in again."); return; }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (isAuthenticatedUser(user)) { await complete(next); return; }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!active || !isAuthenticatedUser(session?.user)) return;
        subscription.unsubscribe();
        await complete(next);
      });

      timeout = window.setTimeout(() => {
        subscription.unsubscribe();
        if (active) setError("Sign-in took too long. Return to the login page and try again.");
      }, 12_000);
    }

    void finishSignIn().catch(() => { if (active) setError("Sign-in could not be completed securely. Try again."); });
    return () => { active = false; if (timeout) window.clearTimeout(timeout); };
  }, [router]);

  return (
    <AuthShell title={error ? "Sign-in could not finish" : "Securing your session"} description={error ? "Nothing was changed on your account." : "LoadLink is verifying the sign-in response before opening your account."}>
      {error ? <><p role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/[.07] px-4 py-4 text-sm font-semibold text-red-500">{error}</p><button type="button" onClick={() => router.replace("/login")} className="mt-4 h-13 w-full rounded-2xl bg-[#f6b800] text-sm font-black text-black">Return to sign in</button></> : <div className="py-7 text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><p className="mt-5 text-sm font-semibold opacity-50">Verifying provider, account and session…</p></div>}
    </AuthShell>
  );
}
