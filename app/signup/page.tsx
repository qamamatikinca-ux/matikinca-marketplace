"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import PasswordStrengthMeter, { passwordStrength } from "@/components/PasswordStrengthMeter";
import TurnstileChallenge, { loadLinkTurnstileConfigured } from "@/components/TurnstileChallenge";
import { friendlyAuthError, strongPasswordIssue } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

function duplicateEmailSignal(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  const code = String(value.code || "").toLowerCase();
  const message = String(value.message || "").toLowerCase();
  return /user_already_exists|email_exists|identity_already_exists/.test(code) || /already registered|already exists|already in use/.test(message);
}

export default function SignUpPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) { setMessage("Secure account creation is temporarily unavailable."); return; }
    const passwordIssue = strongPasswordIssue(password);
    if (passwordIssue) { setMessage(passwordIssue); return; }
    if (!passwordStrength(password).strong) { setMessage("Your password is not strong enough yet. Complete all five password checks."); return; }
    if (password !== confirmPassword) { setMessage("The two passwords do not match."); return; }
    if (loadLinkTurnstileConfigured && !captchaToken) { setMessage("Complete the security check before creating your account."); return; }

    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/complete-profile")}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: redirectTo, ...(captchaToken ? { captchaToken } : {}) },
      });
      if (error) {
        if (duplicateEmailSignal(error)) { setMessage("This email is already in use. Sign in or use Forgot password."); return; }
        throw error;
      }
      // When email confirmation is enabled Supabase can deliberately obscure
      // whether an email already exists. An empty identity list is one signal
      // we can safely handle without creating a public account-lookup endpoint.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMessage("This email is already in use. Sign in or use Forgot password.");
        return;
      }
      if (data.session) { router.replace("/complete-profile"); return; }
      setSent(true);
      setMessage("Verification email sent. Open the email, confirm your address, then LoadLink will bring you back to finish your profile.");
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
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/complete-profile")}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) { setBusy(false); setMessage("Google sign-in could not start. Try again."); }
  }

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/30"}`;

  return (
    <AuthShell title="Create your account" description="Verify your email first, then finish your LoadLink profile. Your profile setup can be resumed if you are interrupted." footer={<>Already registered? <Link href="/login" className="font-black text-[#b88900]">Sign in</Link></>}>
      <button type="button" onClick={() => void continueWithGoogle()} disabled={busy} className="flex h-13 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-black text-black shadow-sm disabled:opacity-50">Continue with Google</button>
      <div className={`my-6 flex items-center gap-3 text-xs font-semibold ${darkMode ? "text-white/35" : "text-black/35"}`}><span className="h-px flex-1 bg-current opacity-30" />or use email<span className="h-px flex-1 bg-current opacity-30" /></div>
      {sent ? (
        <div className={`rounded-2xl border p-5 ${darkMode ? "border-emerald-500/25 bg-emerald-500/[.06]" : "border-emerald-600/20 bg-emerald-50"}`}><p className="text-lg font-black">Check your email</p><p className="mt-2 text-sm font-semibold leading-6 opacity-65">We sent a verification link to <strong>{email.trim().toLowerCase()}</strong>. After confirmation you return to LoadLink to complete your profile.</p><button type="button" onClick={() => setSent(false)} className="mt-4 text-xs font-black underline underline-offset-4">Use a different email</button></div>
      ) : (
        <form onSubmit={createAccount} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-bold">Email address</span><input className={input} type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
          <div className="grid gap-2"><label className="grid gap-2"><span className="text-sm font-bold">Create password</span><input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" maxLength={128} required /></label><PasswordStrengthMeter password={password} darkMode={darkMode} /></div>
          <label className="grid gap-2"><span className="text-sm font-bold">Confirm password</span><input className={input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" maxLength={128} required />{confirmPassword ? <span className={`text-[11px] font-bold ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>{password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}</span> : null}</label>
          <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />
          <button type="submit" disabled={busy} className="mt-1 h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Creating securely…" : "Create account"}</button>
        </form>
      )}
      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
