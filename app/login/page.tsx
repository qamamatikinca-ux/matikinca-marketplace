"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import AuthLandingShell from "@/components/AuthLandingShell";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import TurnstileChallenge, { loadLinkTurnstileConfigured } from "@/components/TurnstileChallenge";
import { clearActiveAccountState, syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { destinationAfterMfa, friendlyAuthError } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function LoginPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") setMessage("Password updated. Sign in again with your new password.");
    if (!isSupabaseConfigured) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (isAuthenticatedUser(data.user)) setSignedInEmail(data.user.email || "LoadLink account");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(isAuthenticatedUser(session?.user) ? session?.user.email || "LoadLink account" : "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const getNextPath = useCallback(() => {
    if (typeof window === "undefined") return "/";
    return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
  }, []);

  async function finishSignIn() {
    await syncAccountState().catch(() => undefined);
    const destination = await destinationAfterMfa(getNextPath());
    router.replace(destination);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) { setMessage("Secure sign-in is temporarily unavailable."); return; }
    if (loadLinkTurnstileConfigured && !captchaToken) { setMessage("Complete the security check before signing in."); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (error) throw error;
      setMessage("Signed in. Opening LoadLink…");
      await finishSignIn();
    } catch (error) {
      setMessage(friendlyAuthError(error, "login"));
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  }

  async function handleGoogleSignIn() {
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) { setMessage("Secure sign-in is temporarily unavailable."); return; }
    setBusy(true);
    const next = getNextPath();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setMessage("Google sign-in could not start. Try again.");
    }
  }

  async function handleSignOut() {
    setBusy(true);
    await supabase.auth.signOut();
    clearActiveAccountState();
    setSignedInEmail("");
    setBusy(false);
    setMessage("Signed out.");
  }

  const input = `h-12 w-full rounded-[16px] border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.035] text-white placeholder:text-white/28" : "border-black/12 bg-white text-black placeholder:text-black/30"}`;
  const socialButton = `flex h-12 w-full items-center justify-center gap-3 rounded-full border px-4 text-sm font-black transition active:scale-[.99] disabled:opacity-50 ${darkMode ? "border-white/14 bg-white/[.035] text-white" : "border-black/12 bg-white text-black"}`;

  return (
    <AuthLandingShell
      darkMode={darkMode}
      title="Welcome to LoadLink"
      subtitle="Logistics made easier"
      footer={<>New to LoadLink? <Link href="/signup" className="font-black text-[#b88900]">Create an account</Link></>}
    >
      {signedInEmail ? (
        <div className={`mb-5 rounded-[18px] border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6b800] text-black"><LoadLinkIcon name="check" size={20} strokeWidth={2.2} /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-black">Already signed in</p><p className="mt-0.5 truncate text-xs opacity-50">{signedInEmail}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void finishSignIn()} className="h-10 rounded-xl bg-[#f6b800] text-xs font-black text-black">Continue</button>
            <button type="button" onClick={() => void handleSignOut()} disabled={busy} className="h-10 rounded-xl border border-current/15 text-xs font-bold disabled:opacity-50">Sign out</button>
          </div>
        </div>
      ) : null}

      <button type="button" onClick={() => void handleGoogleSignIn()} disabled={busy} className={socialButton}><GoogleLogo />Continue with Google</button>

      <div className={`my-5 flex items-center gap-3 text-xs font-semibold ${darkMode ? "text-white/35" : "text-black/35"}`}><span className="h-px flex-1 bg-current opacity-30" />or sign in with email<span className="h-px flex-1 bg-current opacity-30" /></div>

      <form onSubmit={handleLogin} className="grid gap-3.5" noValidate>
        <label className="grid gap-1.5"><span className="text-xs font-bold">Email address</span><input className={input} type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required /></label>
        <label className="grid gap-1.5">
          <span className="flex items-center justify-between gap-3 text-xs font-bold"><span>Password</span><Link href="/forgot-password" className="text-[11px] font-bold opacity-55 underline-offset-4 hover:underline">Forgot password?</Link></span>
          <span className="relative block"><input className={`${input} pr-16`} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" maxLength={128} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-[10px] font-black opacity-50">{showPassword ? "Hide" : "Show"}</button></span>
        </label>

        <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />

        <button type="submit" disabled={busy || !email.trim() || !password} className="h-12 rounded-full bg-[#f6b800] px-5 text-sm font-black text-black transition active:scale-[.99] disabled:opacity-45">{busy ? "Checking securely…" : "Sign in"}</button>
      </form>

      {message ? <p role="status" aria-live="polite" className={`mt-4 rounded-[16px] border px-4 py-3 text-sm font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthLandingShell>
  );
}

function GoogleLogo() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48" className="shrink-0"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.1-8.1 19.1-19.5 0-1.3-.1-2.7-.4-4Z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4c-7.7 0-14.3 4.3-17.7 10.7Z"/><path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5l-6-5.1A11.9 11.9 0 0 1 12.9 28.5l-6.5 5A20 20 0 0 0 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.3 5.9l6 5.1c-.4.4 6.1-4.5 6.1-14.5 0-1.3-.1-2.7-.4-4Z"/></svg>;
}
