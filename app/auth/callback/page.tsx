"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { destinationAfterMfa } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import Link from "next/link";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { darkMode, toggleTheme } = useLoadLinkTheme();

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
        if (exchangeError && !/already|verifier|session/i.test(exchangeError.message)) { setError("The sign-in link expired or could not be verified. Try signing in again."); return; }
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

  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="relative mx-auto flex h-[76px] max-w-6xl items-center px-4 sm:px-6">
          <Link href="/login" className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-black ${darkMode ? "border-white/10 bg-white/[.035] text-white" : "border-black/10 bg-black/[.02] text-black"}`} aria-label="Back to sign in">←</Link>
          <HomeLogoLink theme="auto" showGlow={false} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[138px] sm:w-[154px]" />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className={`w-full max-w-2xl overflow-hidden rounded-[30px] border shadow-[0_18px_60px_rgba(0,0,0,.08)] ${card}`}>
          <div className="p-6 text-center sm:p-8 md:p-10">
            <div className="mx-auto mb-4 flex justify-center">
              <HomeLogoLink theme="auto" showGlow={false} className="pointer-events-none" logoClassName="w-[144px] sm:w-[162px]" />
            </div>
            <h1 className="text-4xl font-black tracking-[-.045em] sm:text-[46px]">{error ? "Sign-in could not finish" : "Opening your account"}</h1>
            <p className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{error ? "Nothing was changed on your account." : "Finishing your secure sign-in and preparing your LoadLink session."}</p>

            {error ? (
              <>
                <p role="alert" className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/[.07] px-4 py-4 text-sm font-semibold text-red-500">{error}</p>
                <button type="button" onClick={() => router.replace("/login")} className="mt-5 h-13 w-full rounded-2xl bg-[#f6b800] text-sm font-black text-black">Return to sign in</button>
              </>
            ) : (
              <div className="py-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-current/10 bg-current/[.03]">
                  <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-current/10 border-t-[#f6b800]" />
                </div>
                <p className={`mt-6 text-sm font-semibold ${muted}`}>Verifying provider and account…</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
