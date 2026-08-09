"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordStrengthMeter, { passwordStrength } from "@/components/PasswordStrengthMeter";
import { friendlyAuthError, strongPasswordIssue } from "@/lib/authSecurity";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your reset link…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function prepare() {
      if (!isSupabaseConfigured) { if (active) setMessage("Account recovery is temporarily unavailable."); return; }
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) { if (active) setMessage("This reset link is incomplete or has already been used. Request a new one."); return; }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { if (active) setMessage("This reset link is invalid or expired. Request a new one."); return; }
      window.history.replaceState({}, "", "/reset-password");
      if (active) { setReady(true); setMessage(""); }
    }
    void prepare();
    return () => { active = false; };
  }, []);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
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

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/12 bg-[#fffdf8] text-black"}`;

  return (
    <AuthShell title="Choose a new password" description="Create a strong new password. After the reset, LoadLink returns you to sign in with the new password.">
      {ready ? (
        <form onSubmit={update} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-bold">New password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <PasswordStrengthMeter password={password} darkMode={darkMode} />
          <label className="grid gap-2"><span className="text-sm font-bold">Confirm new password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />{confirmPassword ? <span className={`text-[11px] font-bold ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>{password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}</span> : null}</label>
          <button type="submit" disabled={busy} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Updating securely…" : "Set new password"}</button>
        </form>
      ) : <div className="py-8 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><p className="mt-4 text-sm font-semibold opacity-50">{message}</p></div>}
      {ready && message ? <p role="alert" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
