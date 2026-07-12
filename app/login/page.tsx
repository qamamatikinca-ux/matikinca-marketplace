"use client";

import HomeLogoLink from "@/components/HomeLogoLink";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import AuthStatusButton from "@/components/AuthStatusButton";
import { clearActiveAccountState, syncAccountState } from "@/lib/accountState";

type ThemeMode = "dark" | "light";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [signedInEmail, setSignedInEmail] = useState("");

  const isDark = theme === "dark";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("loadlink-login-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    if (!isSupabaseConfigured) return;

    supabase.auth.getUser().then(({ data }) => {
      if (isAuthenticatedUser(data.user)) setSignedInEmail(data.user.email || "Google account");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(isAuthenticatedUser(session?.user) ? session?.user.email || "Google account" : "");
    });

    return () => subscription.unsubscribe();
  }, []);

  function getNextPath() {
    if (typeof window === "undefined") return "/";
    return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
  }

  function toggleTheme() {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("loadlink-login-theme", nextTheme);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Supabase is not connected yet.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await syncAccountState().catch(() => undefined);
    setMessage("Signed in successfully.");
    router.replace(getNextPath());
  }

  async function handleGoogleOAuth() {
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Supabase is not connected yet.");
      return;
    }

    const next = getNextPath();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) setMessage(error.message);
  }

  async function handleSignOut() {
    await syncAccountState().catch(() => undefined);
    await supabase.auth.signOut();
    clearActiveAccountState();
    setSignedInEmail("");
    setMessage("Signed out.");
  }

  return (
    <main
      className={[
        "min-h-screen transition-colors duration-300",
        isDark ? "bg-[#050505] text-white" : "bg-[#fff3cf] text-[#111111]",
      ].join(" ")}
    >
      <header
        className={[
          "sticky top-0 z-50 border-b transition-colors duration-300",
          isDark ? "border-white/10 bg-black" : "border-black/10 bg-white",
        ].join(" ")}
      >
        <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Return to homepage"
              className={[
                "flex h-10 w-10 items-center justify-center",
                isDark ? "text-white" : "text-black",
              ].join(" ")}
            >
              <MenuIcon />
            </Link>

            <AuthStatusButton darkMode={isDark} />
          </div>

          <HomeLogoLink logoClassName="loadlink-logo-dark-fix" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className={[
              "ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97]",
              isDark
                ? "border-yellow-400/70 bg-yellow-400 text-black shadow-[0_0_18px_rgba(246,184,0,0.22)]"
                : "border-black/10 bg-black text-[#f6b800] shadow-[0_8px_18px_rgba(0,0,0,0.10)]",
            ].join(" ")}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[520px] flex-col justify-center px-5 py-8">
        <header className="mb-7 text-center">
          <p
            className={[
              "text-sm font-medium tracking-wide",
              isDark ? "text-neutral-400" : "text-[#4b3d20]",
            ].join(" ")}
          >
            Sign in to access your logistics portal.
          </p>
        </header>

        <div
          className={[
            "border p-5 transition-colors duration-300",
            isDark
              ? "border-yellow-500/30 bg-[#0b0b0b] shadow-[0_0_45px_rgba(0,0,0,0.55)]"
              : "border-[#d4a532] bg-[#fffaf0] shadow-[0_14px_35px_rgba(0,0,0,0.14)]",
          ].join(" ")}
        >
          <div
            className={[
              "mb-5 border px-4 py-5 text-center",
              isDark
                ? "border-yellow-500/25 bg-black"
                : "border-[#d4a532] bg-[#fff1c2]",
            ].join(" ")}
          >
            <p className={["text-base font-black", isDark ? "text-white" : "text-black"].join(" ")}>
              Logistics made simple.
            </p>
            <p
              className={[
                "mt-2 text-sm leading-6",
                isDark ? "text-neutral-400" : "text-[#5c4a24]",
              ].join(" ")}
            >
              Find trucks, jobs and contracts from one clean portal.
            </p>
          </div>

          {signedInEmail ? (
            <div className="mb-5 border border-[#f6b800] bg-[#f6b800]/10 p-4 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f6b800] text-xl font-black text-black">✓</div>
              <p className={["mt-3 text-sm font-black", isDark ? "text-white" : "text-black"].join(" ")}>Signed in with Google</p>
              <p className={["mt-1 text-xs", isDark ? "text-white/55" : "text-black/55"].join(" ")}>{signedInEmail}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => router.replace(getNextPath())} className="h-10 bg-[#f6b800] text-xs font-black uppercase text-black">Continue</button>
                <button type="button" onClick={handleSignOut} className={["h-10 border text-xs font-black uppercase", isDark ? "border-white/20 text-white" : "border-black/20 text-black"].join(" ")}>Sign out</button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleGoogleOAuth}
              className="flex h-12 w-full items-center justify-center gap-3 border border-neutral-200 bg-white px-4 text-sm font-bold text-black active:scale-[0.99]"
            >
              <GoogleLogo />
              Continue with Google
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Apple sign-in is coming soon"
              className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 border border-neutral-200 bg-white px-4 text-sm font-bold text-black opacity-55"
            >
              <AppleLogo />
              Continue with Apple
              <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-black/45">Coming soon</span>
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className={["h-px flex-1", isDark ? "bg-white/15" : "bg-black/15"].join(" ")} />
            <span className={["text-xs font-medium", isDark ? "text-neutral-500" : "text-[#7a672f]"].join(" ")}>
              or
            </span>
            <div className={["h-px flex-1", isDark ? "bg-white/15" : "bg-black/15"].join(" ")} />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span
                className={[
                  "mb-2 block text-xs font-black uppercase tracking-[0.32em]",
                  isDark ? "text-neutral-500" : "text-[#6f5b2a]",
                ].join(" ")}
              >
                Email
              </span>
              <input
                className={[
                  "h-12 w-full border px-4 text-sm font-semibold outline-none transition placeholder:text-neutral-500 focus:border-yellow-400",
                  isDark
                    ? "border-yellow-500/20 bg-[#fff8b8] text-black"
                    : "border-[#d4a532] bg-white text-black",
                ].join(" ")}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span
                  className={[
                    "block text-xs font-black uppercase tracking-[0.32em]",
                    isDark ? "text-neutral-500" : "text-[#6f5b2a]",
                  ].join(" ")}
                >
                  Password
                </span>

                <Link
                  href="/forgot-password"
                  className={["text-xs font-black", isDark ? "text-yellow-400" : "text-[#9b7600]"].join(" ")}
                >
                  Forgot password?
                </Link>
              </div>

              <input
                className={[
                  "h-12 w-full border px-4 text-sm font-semibold outline-none transition placeholder:text-neutral-500 focus:border-yellow-400",
                  isDark
                    ? "border-yellow-500/20 bg-[#fff8b8] text-black"
                    : "border-[#d4a532] bg-white text-black",
                ].join(" ")}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button
              type="submit"
              className="h-12 w-full border border-yellow-400 bg-yellow-400 text-sm font-black uppercase tracking-wide text-black active:scale-[0.99]"
            >
              Sign in
            </button>
          </form>

          {message ? (
            <p
              className={[
                "mt-4 border px-4 py-3 text-center text-xs",
                isDark
                  ? "border-white/10 bg-black text-neutral-300"
                  : "border-[#d4a532] bg-[#fff1c2] text-[#4b3d20]",
              ].join(" ")}
            >
              {message}
            </p>
          ) : null}

          <p
            className={[
              "mt-6 text-center text-sm",
              isDark ? "text-neutral-400" : "text-[#4b3d20]",
            ].join(" ")}
          >
            New to LoadLink? {" "}
            <Link href="/signup" className={["font-black", isDark ? "text-yellow-400" : "text-[#9b7600]"].join(" ")}>
              Create account
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className={[
              "inline-block text-sm font-bold transition",
              isDark ? "text-neutral-400 hover:text-yellow-400" : "text-[#4b3d20] hover:text-black",
            ].join(" ")}
          >
            Back to LoadLink
          </Link>
        </div>
      </section>
    </main>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      aria-hidden="true"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="black"
      className="shrink-0"
    >
      <path d="M17.05 12.54c-.03-3.06 2.5-4.53 2.61-4.6-1.42-2.08-3.64-2.36-4.43-2.39-1.89-.19-3.68 1.11-4.64 1.11-.96 0-2.44-1.08-4.01-1.05-2.06.03-3.96 1.2-5.02 3.04-2.14 3.71-.55 9.21 1.54 12.22 1.02 1.47 2.23 3.12 3.83 3.06 1.54-.06 2.12-.99 3.98-.99 1.86 0 2.38.99 4.01.96 1.65-.03 2.7-1.5 3.71-2.97 1.17-1.71 1.65-3.37 1.68-3.45-.04-.02-3.23-1.24-3.26-4.94ZM14 3.56c.85-1.03 1.42-2.46 1.26-3.88-1.22.05-2.7.81-3.58 1.84-.79.91-1.48 2.37-1.29 3.76 1.36.11 2.75-.69 3.61-1.72Z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="23" height="23" viewBox="0 0 48 48" className="shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.57-.14-3.08-.41-4.5H24v9h12.62c-.54 2.91-2.18 5.38-4.65 7.04l7.18 5.57C43.35 37.75 46.5 31.9 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.54 28.41c-.48-1.43-.75-2.96-.75-4.54s.27-3.11.75-4.54l-7.98-6.19C.93 16.39 0 20.02 0 23.87s.93 7.48 2.56 10.73l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.18-5.57c-2 1.34-4.56 2.13-8.72 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
