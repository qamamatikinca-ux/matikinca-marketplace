"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import TurnstileChallenge, { loadLinkTurnstileConfigured } from "@/components/TurnstileChallenge";
import { friendlyAuthError } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ForgotPasswordPage() {
  const { darkMode } = useLoadLinkTheme();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) { setMessage("Account recovery is temporarily unavailable."); return; }
    if (loadLinkTurnstileConfigured && !captchaToken) { setMessage("Complete the security check before requesting a reset link."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (error) {
        const safe = friendlyAuthError(error, "reset");
        if (/security check|too many attempts/i.test(safe)) setMessage(safe);
        else setMessage("Password recovery could not be sent right now. Check your connection and try again shortly.");
        return;
      }
      setMessage("If that email belongs to a LoadLink account, a password reset link will arrive shortly. Check spam too.");
    } catch {
      setMessage("Password recovery could not be sent right now. Check your connection and try again shortly.");
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  }

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/30"}`;

  return (
    <AuthShell title="Recover your account" description="Enter your email. For privacy, LoadLink gives the same response whether or not the address is registered." footer={<Link href="/login" className="font-black text-[#b88900]">Return to sign in</Link>}>
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-2"><span className="text-sm font-bold">Email address</span><input className={input} required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" maxLength={254} value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />
        <button disabled={busy || !email.trim()} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Requesting securely…" : "Send reset link"}</button>
      </form>
      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
