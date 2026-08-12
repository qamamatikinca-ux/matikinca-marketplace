"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthLandingShell from "@/components/AuthLandingShell";
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
    if (!loadLinkTurnstileConfigured) { setMessage("Security verification is temporarily unavailable. Refresh and try again."); return; }
    if (!captchaToken) { setMessage("Complete the security check before creating your account."); return; }

    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/complete-profile")}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: redirectTo, captchaToken },
      });
      if (error) {
        if (duplicateEmailSignal(error)) { setMessage("This email is already in use. Sign in or use Forgot password."); return; }
        throw error;
      }
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
    setBusy(true);
    setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/complete-profile")}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setMessage("Google sign-in could not start. Try again.");
    }
  }

  const input = `h-12 w-full rounded-[18px] border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/12 bg-white/[.58] text-black placeholder:text-black/30"}`;
  const socialButton = `flex h-12 w-full items-center justify-center gap-3 rounded-full border px-4 text-sm font-black transition active:scale-[.99] disabled:opacity-50 ${darkMode ? "border-white/14 bg-white/[.04] text-white" : "border-black/12 bg-white/[.58] text-black"}`;

  return (
    <AuthLandingShell
      darkMode={darkMode}
      title="Welcome to LoadLink"
      subtitle="Logistics made easier"
      footer={<>Already have an account? <Link href="/login" className="font-black text-[#b88900]">Login</Link></>}
    >
      <button type="button" onClick={() => void continueWithGoogle()} disabled={busy} className={socialButton}><GoogleLogo />Continue with Google</button>
      <div className={`my-5 flex items-center gap-3 text-xs font-semibold ${darkMode ? "text-white/38" : "text-black/38"}`}><span className="h-px flex-1 bg-current opacity-30" />or use email<span className="h-px flex-1 bg-current opacity-30" /></div>

      {sent ? (
        <div className={`rounded-[20px] border p-5 backdrop-blur-xl ${darkMode ? "border-emerald-500/25 bg-emerald-500/[.06]" : "border-emerald-600/20 bg-emerald-50/70"}`}>
          <p className="text-lg font-black">Check your email</p>
          <p className="mt-2 text-sm font-semibold leading-6 opacity-65">We sent a verification link to <strong>{email.trim().toLowerCase()}</strong>. After confirmation you return to LoadLink to complete your profile.</p>
          <button type="button" onClick={() => setSent(false)} className="mt-4 text-xs font-black underline underline-offset-4">Use a different email</button>
        </div>
      ) : (
        <form onSubmit={createAccount} className="grid gap-3.5">
          <label className="grid gap-1.5"><span className="text-xs font-bold">Email address</span><input className={input} type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
          <div className="grid gap-1.5"><label className="grid gap-1.5"><span className="text-xs font-bold">Create password</span><input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" maxLength={128} required /></label><PasswordStrengthMeter password={password} darkMode={darkMode} /></div>
          <label className="grid gap-1.5"><span className="text-xs font-bold">Confirm password</span><input className={input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" maxLength={128} required />{confirmPassword ? <span className={`text-[11px] font-bold ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>{password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}</span> : null}</label>
          <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />
          <button type="submit" disabled={busy} className="h-12 rounded-full bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Creating securely…" : "Create account"}</button>
        </form>
      )}
      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-[16px] border px-4 py-3 text-sm font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.04] text-white/76" : "border-black/10 bg-white/[.42] text-black/70"}`}>{message}</p> : null}
    </AuthLandingShell>
  );
}

function GoogleLogo() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48" className="shrink-0"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.1-8.1 19.1-19.5 0-1.3-.1-2.7-.4-4Z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4c-7.7 0-14.3 4.3-17.7 10.7Z"/><path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5l-6-5.1A11.9 11.9 0 0 1 12.9 28.5l-6.5 5A20 20 0 0 0 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.3 5.9l6 5.1c-.4.4 6.1-4.5 6.1-14.5 0-1.3-.1-2.7-.4-4Z"/></svg>;
}
