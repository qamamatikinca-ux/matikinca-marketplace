"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import AuthLandingShell from "@/components/AuthLandingShell";
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
    if (params.get("reset") === "success") setMessage("Password updated. Sign in with your new password.");
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
    router.replace(await destinationAfterMfa(getNextPath()));
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

  const input = `h-11 w-full rounded-[14px] border px-4 text-[14px] font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.035] text-white placeholder:text-white/30" : "border-black/10 bg-white/[.42] text-black placeholder:text-black/35"}`;
  const socialButton = `flex h-11 w-full items-center justify-center gap-3 rounded-[14px] border px-4 text-sm font-black active:scale-[.99] disabled:opacity-50 ${darkMode ? "border-white/14 bg-white/[.035] text-white" : "border-black/10 bg-white/[.42] text-black"}`;

  return (
    <AuthLandingShell
      darkMode={darkMode}
      title="Welcome to LoadLink"
      subtitle="Logistics made easier"
      footer={<>New here? <Link href="/signup" className="font-black text-[#a87a00]">Create an account</Link></>}
    >
      {signedInEmail ? (
        <div className="loadlink-glass mb-4 rounded-[16px] border p-3">
          <p className="truncate text-xs font-bold">Signed in as {signedInEmail}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => void finishSignIn()} className="h-9 flex-1 bg-[#f6b800] px-3 text-[10px] font-black text-black">Continue</button>
            <button type="button" onClick={() => void handleSignOut()} disabled={busy} className="h-9 flex-1 border border-current/15 px-3 text-[10px] font-bold disabled:opacity-50">Sign out</button>
          </div>
        </div>
      ) : null}

      <button type="button" onClick={() => void handleGoogleSignIn()} disabled={busy} className={socialButton}><GoogleLogo />Continue with Google</button>

      <div className={`my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.05em] ${darkMode ? "text-white/35" : "text-black/35"}`}><span className="h-px flex-1 bg-current opacity-25" />or<span className="h-px flex-1 bg-current opacity-25" /></div>

      <form onSubmit={handleLogin} className="grid gap-3" noValidate>
        <label className="grid gap-1.5"><span className="text-[11px] font-bold">Email</span><input className={input} type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required /></label>
        <label className="grid gap-1.5">
          <span className="flex items-center justify-between gap-3 text-[11px] font-bold"><span>Password</span><Link href="/forgot-password" className="text-[10px] opacity-55">Forgot password?</Link></span>
          <span className="relative block"><input className={`${input} pr-16`} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" maxLength={128} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 px-2.5 text-[9px] font-black opacity-55">{showPassword ? "Hide" : "Show"}</button></span>
        </label>

        <TurnstileChallenge onToken={setCaptchaToken} resetKey={captchaResetKey} darkMode={darkMode} />

        <button type="submit" disabled={busy || !email.trim() || !password} className="h-11 bg-[#f6b800] px-5 text-sm font-black text-black active:scale-[.99] disabled:opacity-45">{busy ? "Signing in…" : "Sign in"}</button>
      </form>

      {message ? <p role="status" aria-live="polite" className={`mt-3 text-center text-[11px] font-semibold leading-5 ${darkMode ? "text-white/68" : "text-black/65"}`}>{message}</p> : null}
    </AuthLandingShell>
  );
}

function GoogleLogo() {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48" className="shrink-0"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.1-8.1 19.1-19.5 0-1.3-.1-2.7-.4-4Z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4c-7.7 0-14.3 4.3-17.7 10.7Z"/><path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5l-6-5.1A11.9 11.9 0 0 1 12.9 28.5l-6.5 5A20 20 0 0 0 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.3 5.9l6 5.1c-.4.4 6.1-4.5 6.1-14.5 0-1.3-.1-2.7-.4-4Z"/></svg>;
}
