"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import HomeLogoLink from "@/components/HomeLogoLink";
import { syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { recoverySupabase } from "@/lib/recoverySupabase";
import { isFourDigitCode, markSecurityCodeVerified } from "@/lib/securityCode";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Mode = "checking" | "verify" | "error";
type CodeStatus = { enabled?: boolean };
type VerifyResult = { ok?: boolean; reason?: string; attempts_remaining?: number; needs_setup?: boolean };

export default function SecurityCodePage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [mode, setMode] = useState<Mode>("checking");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  function nextPath() {
    return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
  }

  async function enter() {
    const { data: { session } } = await supabase.auth.getSession();
    markSecurityCodeVerified(session);
    await syncAccountState().catch(() => undefined);
    router.replace(nextPath());
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isAuthenticatedUser(session.user)) {
        router.replace(`/login?next=${encodeURIComponent(nextPath())}`);
        return;
      }
      setEmail(session.user.email || "");
      const { data, error } = await supabase.rpc("loadlink_security_code_status");
      if (!active) return;
      if (error) {
        setMode("error");
        setMessage("This sign-in step is temporarily unavailable.");
        return;
      }
      if (!((data || {}) as CodeStatus).enabled) {
        await enter();
        return;
      }
      setMode("verify");
    })();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !isFourDigitCode(code)) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("loadlink_verify_security_code", { p_code: code });
      if (error) throw error;
      const result = (data || {}) as VerifyResult;
      if (result.ok || result.needs_setup || result.reason === "setup_required") {
        await enter();
        return;
      }
      setCode("");
      setMessage(
        result.reason === "locked"
          ? "Too many attempts. Try again in 15 minutes or use email recovery."
          : typeof result.attempts_remaining === "number"
            ? `Incorrect code. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? "" : "s"} left.`
            : "Incorrect code.",
      );
    } catch {
      setMessage("The code could not be checked right now.");
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    if (busy || !email) return;
    setBusy(true);
    setMessage("");
    try {
      const redirectTo = `${window.location.origin}/auth/code-recovery?next=${encodeURIComponent(nextPath())}`;
      const { error } = await recoverySupabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage("Recovery email sent.");
    } catch {
      setMessage("Recovery email could not be sent right now.");
    } finally {
      setBusy(false);
    }
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-[100dvh] px-4 py-5 sm:px-5 sm:py-8 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-[480px] items-center justify-center sm:min-h-[calc(100dvh-4rem)]">
        <section data-loadlink-mfa-card="v2619" className={`w-full overflow-hidden rounded-[30px] border shadow-[0_26px_80px_rgba(0,0,0,.14)] ${surface}`}>
          <div className={`flex min-h-20 items-center justify-between border-b px-5 py-4 ${darkMode ? "border-white/10 bg-black" : "border-black/8 bg-[#fbfaf6]"}`}>
            <HomeLogoLink theme={darkMode ? "dark" : "light"} showGlow={false} logoClassName="w-[150px] sm:w-[164px]" />
            <div className={`flex h-10 items-center gap-2 rounded-full border px-3 ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/8 bg-white"}`}>
              <span className="h-2 w-2 rounded-full bg-[#f6b800]" />
              <span className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Secure sign-in</span>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f6b800] text-black shadow-[0_10px_28px_rgba(246,184,0,.18)]">
                <CodeIcon />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">Protected sign-in</p>
                <h1 className="mt-1.5 text-[2rem] font-black leading-[1] tracking-[-.05em] sm:text-4xl">Enter your LoadLink code</h1>
              </div>
            </div>

            <p className={`mt-5 text-sm font-semibold leading-6 ${muted}`}>
              Enter the optional 4-digit code linked to this account. This is the final step after your password.
            </p>

            {mode === "verify" ? (
              <form onSubmit={submit} className="mt-6">
                <label className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`} htmlFor="loadlink-security-code">4-digit code</label>
                <div className={`mt-2 rounded-2xl border p-2 transition focus-within:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.035]" : "border-black/10 bg-[#faf8f2]"}`}>
                  <input
                    id="loadlink-security-code"
                    aria-label="4-digit LoadLink code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoFocus
                    placeholder="••••"
                    className={`h-16 w-full bg-transparent px-3 text-center text-3xl font-black tracking-[.48em] outline-none ${darkMode ? "text-white placeholder:text-white/20" : "text-black placeholder:text-black/20"}`}
                  />
                </div>

                <button disabled={busy || code.length !== 4} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.16)] transition active:scale-[.99] disabled:opacity-35">
                  {busy ? "Checking…" : "Continue to LoadLink"}
                </button>

                <button type="button" onClick={() => void recover()} disabled={busy || !email} className={`mt-3 h-11 w-full rounded-xl text-sm font-bold disabled:opacity-35 ${muted}`}>
                  Forgot code? <span className="underline decoration-[#f6b800] decoration-2 underline-offset-4">Recover by email</span>
                </button>
              </form>
            ) : null}

            {mode === "checking" ? (
              <div className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/8 bg-black/[.025]"}`}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />
                <div><p className="text-sm font-black">Checking account security</p><p className={`mt-1 text-xs font-semibold ${muted}`}>This should only take a moment.</p></div>
              </div>
            ) : null}

            {mode === "error" ? (
              <button onClick={() => window.location.reload()} className="mt-6 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black">Try again</button>
            ) : null}

            {message ? (
              <p role="status" className={`mt-4 rounded-xl border px-3 py-3 text-center text-xs font-bold leading-5 ${message.includes("sent") ? darkMode ? "border-white/10 bg-white/[.04] text-white/60" : "border-black/8 bg-black/[.025] text-black/60" : "border-red-500/20 bg-red-500/10 text-red-500"}`}>
                {message}
              </p>
            ) : null}
          </div>

          <div className={`border-t px-5 py-4 text-center ${darkMode ? "border-white/10 bg-black" : "border-black/8 bg-[#fbfaf6]"}`}>
            <p className={`text-[10px] font-semibold leading-5 ${darkMode ? "text-white/36" : "text-black/40"}`}>Never share your password, OTP or LoadLink sign-in code.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function CodeIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="16" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}
