"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import { syncAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";

export default function SignUpPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);


  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (!isSupabaseConfigured) {
      setMessage("Supabase is not connected on this deployment.");
      return;
    }
    if (fullName.trim().length < 2) {
      setMessage("Enter your full name.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/settings")}`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: redirectTo, data: { full_name: fullName.trim(), name: fullName.trim() } },
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session) {
      await syncAccountState().catch(() => undefined);
      router.replace("/account/settings");
      return;
    }
    setMessage("Account created. Check your email and confirm your address, then sign in.");
  }

  async function continueWithGoogle() {
    if (!isSupabaseConfigured || busy) return;
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/settings")}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }


  const page = darkMode ? "bg-black text-white" : "bg-[#fff3cf] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-[#fffaf0]";
  const input = `mt-2 h-12 w-full border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-white text-black" : "border-black/15 bg-white text-black"}`;
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center px-5 py-10">
        <div className={`w-full border p-6 md:p-8 ${surface}`}>
          <h1 className=" text-4xl font-black tracking-[-.05em]">Create your account</h1>
          <p className={`mt-3 text-sm leading-6 ${muted}`}>Sign in is required before posting, messaging or managing a dealership or driver profile.</p>

          <button type="button" onClick={() => void continueWithGoogle()} disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center border border-black/15 bg-white text-sm font-black text-black disabled:opacity-50">Continue with Google</button>
          <div className={`my-6 flex items-center gap-3 text-xs font-black uppercase ${muted}`}><span className="h-px flex-1 bg-current opacity-20" />or use email<span className="h-px flex-1 bg-current opacity-20" /></div>

          <form onSubmit={createAccount} className="grid gap-4">
            <label className="text-xs font-black uppercase tracking-[.1em]">Full name<input className={input} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></label>
            <label className="text-xs font-black uppercase tracking-[.1em]">Email<input className={input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label className="text-xs font-black uppercase tracking-[.1em]">Password<input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <label className="text-xs font-black uppercase tracking-[.1em]">Confirm password<input className={input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <button type="submit" disabled={busy} className="mt-2 h-12 bg-[#f6b800] text-xs font-black uppercase tracking-[.14em] text-black disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
          </form>

          {message ? <p role="status" className="mt-5 border border-[#f6b800]/40 bg-[#f6b800]/10 p-4 text-sm font-bold">{message}</p> : null}
          <p className={`mt-6 text-center text-sm ${muted}`}>Already registered? <Link href="/login" className="font-black text-[#b88900]">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}


