"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HomeLogoLink from "@/components/HomeLogoLink";
import { syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function finishSignIn() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not connected on this deployment.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = safeNextPath(params.get("next"), "/");
      const oauthError = params.get("error_description") || params.get("error");
      if (oauthError) {
        setError(oauthError);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !/already|verifier|session/i.test(exchangeError.message)) {
          setError(exchangeError.message);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isAuthenticatedUser(user)) {
        await syncAccountState().catch(() => undefined);
        if (active) router.replace(next);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!active || !isAuthenticatedUser(session?.user)) return;
        subscription.unsubscribe();
        await syncAccountState().catch(() => undefined);
        router.replace(next);
      });

      timeout = setTimeout(() => {
        subscription.unsubscribe();
        if (active) setError("Google sign-in took too long. Return to the login page and try again.");
      }, 12_000);
    }

    finishSignIn().catch((callbackError) => {
      if (active) setError(callbackError instanceof Error ? callbackError.message : "Sign-in could not be completed.");
    });

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <section className="w-full max-w-md border border-[#f6b800]/40 bg-[#0b0b0b] p-7 text-center">
        <HomeLogoLink theme="dark" />
        {error ? (
          <>
            <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-red-400 text-xl font-black text-red-400">!</div>
            <h1 className="mt-5 text-2xl font-black">Sign-in could not finish</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">{error}</p>
            <button type="button" onClick={() => router.replace("/login")} className="mt-6 h-12 w-full bg-[#f6b800] text-sm font-black uppercase text-black">Return to sign in</button>
          </>
        ) : (
          <>
            <div className="mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[#f6b800]" />
            <h1 className="mt-5 text-2xl font-black">Completing Google sign-in</h1>
            <p className="mt-3 text-sm text-white/55">Your posts, messages and activity are being connected to your account.</p>
          </>
        )}
      </section>
    </main>
  );
}
