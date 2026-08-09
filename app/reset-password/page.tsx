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
  const [message, setMessage] = useState("Checking your secure reset link…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    function acceptRecovery() {
      if (!active) return;
      window.history.replaceState({}, "", "/reset-password");
      setState("ready");
      setMessage("");
    }

    function rejectRecovery(copy = "This reset link is invalid, expired or has already been used.") {
      if (!active) return;
      setState("invalid");
      setMessage(copy);
    }

    async function prepare() {
      if (!isSupabaseConfigured) { rejectRecovery("Password recovery is temporarily unavailable."); return; }
      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      if (query.get("error_description") || hash.get("error_description")) { rejectRecovery("This reset link could not be verified. Request a new one."); return; }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashType = hash.get("type");
      if (accessToken && refreshToken && (!hashType || hashType === "recovery")) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error) { acceptRecovery(); return; }
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { acceptRecovery(); return; }
      }

      const tokenHash = query.get("token_hash");
      if (tokenHash && query.get("type") === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (!error) { acceptRecovery(); return; }
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
    } finally { setBusy(false); }
  }

  const input = `h-13 w-full rounded-xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/12 bg-[#fffdf8] text-black"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <AuthShell title={state === "invalid" ? "Reset link unavailable" : "Reset your password"}>
      {state === "ready" ? (
        <form onSubmit={update} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-black">New password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <PasswordStrengthMeter password={password} darkMode={darkMode} />
          <label className="grid gap-2"><span className="text-sm font-black">Confirm new password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />{confirmPassword ? <span className={`text-[11px] font-black ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>{password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}</span> : null}</label>
          <button type="submit" disabled={busy} className="h-13 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.17)] disabled:opacity-45">{busy ? "Updating…" : "Set new password"}</button>
        </form>
      ) : null}

      {state === "checking" ? <div className="py-8 text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><p className={`mt-4 text-sm font-semibold ${muted}`}>{message}</p></div> : null}

      {state === "invalid" ? <div><p className={`text-sm font-semibold leading-6 ${muted}`}>{message}</p><Link href="/forgot-password" className="mt-5 flex h-13 w-full items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Send a fresh reset link</Link><Link href="/login" className={`mt-3 flex h-12 w-full items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/12 text-white/72" : "border-black/12 text-black/72"}`}>Return to sign in</Link></div> : null}

      {state === "ready" && message ? <p role="alert" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
