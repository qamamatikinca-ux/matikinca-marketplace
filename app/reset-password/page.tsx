"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordStrengthMeter, { passwordStrength } from "@/components/PasswordStrengthMeter";
import { friendlyAuthError, strongPasswordIssue } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your reset link…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    function acceptRecovery() {
      if (!active) return;
      window.history.replaceState({}, "", "/reset-password");
      setState("ready");
      setMessage("");
    }

    function rejectRecovery(copy = "This reset link is invalid or expired. Request a new one.") {
      if (!active) return;
      setState("invalid");
      setMessage(copy);
    }

    async function prepare() {
      if (!isSupabaseConfigured) {
        rejectRecovery("Account recovery is temporarily unavailable.");
        return;
      }

      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      const providerError = query.get("error_description") || hash.get("error_description");
      if (providerError) {
        rejectRecovery("This reset link could not be verified. Request a new one.");
        return;
      }

      // New V2.6.8 recovery links: access and refresh tokens are returned in
      // the URL fragment. This does not depend on a PKCE verifier from the
      // browser where the reset email was requested.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashType = hash.get("type");
      if (accessToken && refreshToken && (!hashType || hashType === "recovery")) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          acceptRecovery();
          return;
        }
      }

      // Backwards compatibility for earlier PKCE reset emails that are still
      // opened in the same browser that requested them.
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          acceptRecovery();
          return;
        }
      }

      // Also support a token_hash recovery template if LoadLink switches to
      // that Supabase email-template form later.
      const tokenHash = query.get("token_hash");
      const queryType = query.get("type");
      if (tokenHash && queryType === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!error) {
          acceptRecovery();
          return;
        }
      }

      rejectRecovery();
    }

    void prepare().catch(() => rejectRecovery("This reset link could not be verified. Request a new one."));
    return () => { active = false; };
  }, []);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "ready" || busy) return;
    setMessage("");
    const issue = strongPasswordIssue(password);
    if (issue || !passwordStrength(password).strong) { setMessage(issue || "Your password is not strong enough yet."); return; }
    if (password !== confirmPassword) { setMessage("The two passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
      router.replace("/login?reset=success");
    } catch (error) {
      setMessage(friendlyAuthError(error, "reset"));
    } finally {
      setBusy(false);
    }
  }

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/12 bg-[#fffdf8] text-black"}`;

  return (
    <AuthShell title="Choose a new password" description="Create a strong new password. After the reset, LoadLink returns you to sign in with the new password.">
      {state === "ready" ? (
        <form onSubmit={update} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-bold">New password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <PasswordStrengthMeter password={password} darkMode={darkMode} />
          <label className="grid gap-2"><span className="text-sm font-bold">Confirm new password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />{confirmPassword ? <span className={`text-[11px] font-bold ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>{password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}</span> : null}</label>
          <button type="submit" disabled={busy} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Updating securely…" : "Set new password"}</button>
        </form>
      ) : state === "checking" ? (
        <div className="py-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />
          <p className="mt-4 text-sm font-semibold opacity-50">{message}</p>
        </div>
      ) : (
        <div className="py-5 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-xl font-black ${darkMode ? "border-white/10 bg-white/[.035] text-white/65" : "border-black/10 bg-black/[.025] text-black/60"}`}>!</div>
          <p className={`mx-auto mt-4 max-w-sm text-sm font-semibold leading-6 ${darkMode ? "text-white/58" : "text-black/58"}`}>{message}</p>
          <Link href="/forgot-password" className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black">Request a new reset link</Link>
          <Link href="/login" className={`mt-3 flex h-11 w-full items-center justify-center rounded-2xl border px-5 text-sm font-black ${darkMode ? "border-white/10 text-white/70" : "border-black/10 text-black/70"}`}>Return to sign in</Link>
        </div>
      )}
      {state === "ready" && message ? <p role="alert" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
