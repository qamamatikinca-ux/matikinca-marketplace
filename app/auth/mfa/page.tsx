"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
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

  async function enterLoadLink() {
    const { data: { session } } = await supabase.auth.getSession();
    markSecurityCodeVerified(session);
    await syncAccountState().catch(() => undefined);
    router.replace(nextPath());
  }

  useEffect(() => {
    let active = true;

    async function load() {
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

      const status = (data || {}) as CodeStatus;
      if (!status.enabled) {
        await enterLoadLink();
        return;
      }

      setMode("verify");
    }

    void load();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !isFourDigitCode(code)) return;
    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("loadlink_verify_security_code", { p_code: code });
      if (error) throw error;
      const result = (data || {}) as VerifyResult;
      if (result.ok || result.needs_setup || result.reason === "setup_required") {
        await enterLoadLink();
        return;
      }

      setCode("");
      if (result.reason === "locked") {
        setMessage("Too many attempts. Try again in 15 minutes or use email recovery.");
      } else if (typeof result.attempts_remaining === "number") {
        setMessage(`Incorrect code. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? "" : "s"} left.`);
      } else {
        setMessage("Incorrect code.");
      }
    } catch {
      setMessage("The code could not be checked right now.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRecovery() {
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

  const input = `h-16 w-full rounded-2xl border px-4 text-center text-3xl font-black tracking-[.38em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04] text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

  return (
    <AuthShell title={mode === "error" ? "Try again" : "Enter 4-digit code"}>
      {mode === "verify" ? (
        <form onSubmit={submit} className="grid gap-4">
          <input
            aria-label="4-digit LoadLink code"
            className={input}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            autoFocus
          />
          <button disabled={busy || code.length !== 4} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-black disabled:opacity-45">{busy ? "Checking…" : "Continue"}</button>
          <button type="button" onClick={() => void sendRecovery()} disabled={busy || !email} className={`h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-45 ${darkMode ? "text-white/58" : "text-black/58"}`}>Forgot code?</button>
        </form>
      ) : null}

      {mode === "checking" ? <div className="py-7 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div> : null}
      {mode === "error" ? <button type="button" onClick={() => window.location.reload()} className="h-12 w-full rounded-xl bg-[#f6b800] text-sm font-semibold text-black">Try again</button> : null}
      {message ? <p role="status" aria-live="polite" className={`mt-4 text-center text-sm font-semibold ${message.includes("sent") ? (darkMode ? "text-white/55" : "text-black/55") : "text-red-500"}`}>{message}</p> : null}
    </AuthShell>
  );
}
