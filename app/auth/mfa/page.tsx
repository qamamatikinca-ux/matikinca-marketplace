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

type Mode = "checking" | "setup" | "verify" | "error";
type CodeStatus = { has_code?: boolean; locked_until?: string | null };
type VerifyResult = { ok?: boolean; reason?: string; attempts_remaining?: number; locked_until?: string | null; needs_setup?: boolean };

export default function SecurityCodePage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [mode, setMode] = useState<Mode>("checking");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Checking your LoadLink security code…");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  function nextPath() {
    return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
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
        setMessage("LoadLink security-code setup is not ready on the server yet. Run the V2.6.9 SQL and try again.");
        return;
      }
      const status = (data || {}) as CodeStatus;
      setMode(status.has_code ? "verify" : "setup");
      setMessage("");
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function finish() {
    const { data: { session } } = await supabase.auth.getSession();
    markSecurityCodeVerified(session);
    await syncAccountState().catch(() => undefined);
    router.replace(nextPath());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !isFourDigitCode(code)) return;
    setMessage("");

    if (mode === "setup") {
      if (code !== confirm) { setMessage("The two 4-digit codes do not match."); return; }
      setBusy(true);
      try {
        const { error } = await supabase.rpc("loadlink_set_security_code", { p_code: code });
        if (error) throw error;
        await finish();
      } catch {
        setMessage("Your 4-digit code could not be saved. Try again or contact LoadLink support.");
      } finally { setBusy(false); }
      return;
    }

    if (mode === "verify") {
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc("loadlink_verify_security_code", { p_code: code });
        if (error) throw error;
        const result = (data || {}) as VerifyResult;
        if (result.ok) { await finish(); return; }
        setCode("");
        if (result.reason === "locked") {
          setMessage("Too many incorrect attempts. This code is temporarily locked for 15 minutes. You can also use email recovery.");
        } else if (result.needs_setup || result.reason === "setup_required") {
          setMode("setup");
          setMessage("Create your 4-digit LoadLink code to continue.");
        } else if (typeof result.attempts_remaining === "number") {
          setMessage(`That code is not correct. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? "" : "s"} remaining before a temporary lock.`);
        } else {
          setMessage("That 4-digit code is not correct. Try again.");
        }
      } catch {
        setMessage("The code could not be checked right now. Try again.");
      } finally { setBusy(false); }
    }
  }

  async function sendRecovery() {
    if (busy || !email) return;
    setBusy(true); setMessage("");
    try {
      const redirectTo = `${window.location.origin}/auth/code-recovery?next=${encodeURIComponent(nextPath())}`;
      const { error } = await recoverySupabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage(`Recovery email sent to ${maskEmail(email)}. Open the secure link to keep your current code or choose a new one.`);
    } catch {
      setMessage("The recovery email could not be sent right now. Wait a few minutes and try again.");
    } finally { setBusy(false); }
  }

  const title = mode === "setup" ? "Create your 4-digit code" : mode === "verify" ? "Enter your LoadLink code" : mode === "error" ? "Security setup required" : "Securing your account";
  const description = mode === "setup"
    ? "Choose four numbers yourself. LoadLink will ask for this code after your normal sign-in, before your account opens."
    : mode === "verify"
      ? "Your email/password or Google sign-in is complete. Enter your personal 4-digit code to open LoadLink."
      : "LoadLink is checking the security code attached to this account.";
  const input = `h-16 w-full rounded-2xl border px-4 text-center text-3xl font-black tracking-[.38em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

  return (
    <AuthShell title={title} description={description} status="4-digit account access">
      <div className={`mb-5 rounded-2xl border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.018]"}`}>
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[.12em]">
          <span className="text-emerald-500">Sign-in ✓</span><span className="h-px flex-1 bg-current opacity-15" /><span className="text-[#c18d00] dark:text-[#f6b800]">4-digit code</span><span className="h-px flex-1 bg-current opacity-15" /><span className="opacity-35">LoadLink</span>
        </div>
      </div>

      {mode === "setup" || mode === "verify" ? (
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-black">{mode === "setup" ? "Choose your 4-digit code" : "4-digit code"}</span><input aria-label="4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" autoFocus /></label>
          {mode === "setup" ? <label className="grid gap-2"><span className="text-sm font-black">Confirm your code</span><input aria-label="Confirm 4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label> : null}
          <button disabled={busy || code.length !== 4 || (mode === "setup" && confirm.length !== 4)} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.17)] disabled:opacity-45">{busy ? "Checking securely…" : mode === "setup" ? "Save code & enter LoadLink" : "Enter LoadLink"}</button>
        </form>
      ) : null}

      {mode === "verify" ? <button type="button" onClick={() => void sendRecovery()} disabled={busy || !email} className={`mt-3 h-12 w-full rounded-2xl border text-sm font-black disabled:opacity-45 ${darkMode ? "border-white/12 text-white/72" : "border-black/12 text-black/72"}`}>Forgot your 4-digit code?</button> : null}

      {mode === "checking" ? <div className="py-7 text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div> : null}
      {mode === "error" ? <button type="button" onClick={() => window.location.reload()} className="h-12 w-full rounded-2xl bg-[#f6b800] text-sm font-black text-black">Try again</button> : null}

      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
      <p className={`mt-5 text-center text-[11px] font-semibold leading-5 ${darkMode ? "text-white/38" : "text-black/38"}`}>LoadLink never emails or displays your existing 4-digit code. Recovery only confirms that you own the account email.</p>
    </AuthShell>
  );
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return "your account email";
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
}
