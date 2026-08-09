"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import TurnstileChallenge, { loadLinkTurnstileConfigured } from "@/components/TurnstileChallenge";
import { syncAccountState } from "@/lib/accountState";
import { friendlyAuthError, strongPasswordIssue } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function SignUpPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) { setMessage("Secure account creation is temporarily unavailable."); return; }
    if (fullName.trim().length < 2) { setMessage("Enter your full name."); return; }
    const passwordIssue = strongPasswordIssue(password);
    if (passwordIssue) { setMessage(passwordIssue); return; }
    if (password !== confirmPassword) { setMessage("The two passwords do not match."); return; }
    if (loadLinkTurnstileConfigured && !captchaToken) { setMessage("Complete the security check before creating your account."); return; }

    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/settings")}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: fullName.trim(), name: fullName.trim() },
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) throw error;
      if (data.session) {
        await syncAccountState().catch(() => undefined);
        router.replace("/account/settings");
        return;
      }
      setMessage("Check your email to finish setting up your LoadLink account. If an account already exists, use sign in instead.");
    } catch (error) {
      setMessage(friendlyAuthError(error, "signup"));
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  }

  async function continueWithGoogle() {
    if (!isSupabaseConfigured || busy) return;
    setBusy(true); setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/settings")}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) { setBusy(false); setMessage("Google sign-in could not start. Try again."); }
  }

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/30"}`;
  const issue = password ? strongPasswordIssue(password) : "";

  return (
    <AuthShell title="Create your account" description="One account for LoadLink posts, messages, tools, driver profiles and dealership activity." footer={<>Already registered? <Link href="/login" className="font-black text-[#b88900]">Sign in</Link></>}>
      <button type="button" onClick={() => void continueWithGoogle()} disabled={busy} className="flex h-13 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-black text-black shadow-sm disabled:opacity-50">Continue with Google</button>
      <div className={`my-6 flex items-center gap-3 text-xs font-semibold ${darkMode ? "text-white/35" : "text-black/35"}`}><span className="h-px flex-1 bg-current opacity-30" />or use email<span className="h-px flex-1 bg-current opacity-30" /></div>
      <form onSubmit={createAccount} className="grid gap-4">
        <label className="grid gap-2"><span className="text-sm font-bold">Full name</span><input className={input} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={140} required /></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Email address</span><input className={input} type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Password</span><input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" maxLength={128} required /><span className={`text-[11px] font-semibold leading-5 ${issue ? "text-amber-600" : password ? "text-emerald-500" : darkMode ? "text-white/38" : "text-black/38"}`}>{password ? issue || "Strong password format ✓" : "12+ characters with upper/lowercase, a number and a symbol."}</span></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Confirm password</span><input className={input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" maxLength={128} required /></label>
        <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />
        <button type="submit" disabled={busy} className="mt-1 h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Creating securely…" : "Create account"}</button>
      </form>
      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
