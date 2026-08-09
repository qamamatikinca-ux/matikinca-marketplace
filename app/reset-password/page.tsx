"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
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
    if (issue) { setMessage(issue); return; }
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
  const issue = password ? strongPasswordIssue(password) : "";

  return (
    <AuthShell title="Choose a new password" description="A successful reset signs out existing LoadLink sessions so the new password starts clean.">
      {ready ? <form onSubmit={update} className="grid gap-4"><label className="grid gap-2"><span className="text-sm font-bold">New password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><span className={`text-[11px] font-semibold ${issue ? "text-amber-600" : password ? "text-emerald-500" : darkMode ? "text-white/38" : "text-black/38"}`}>{password ? issue || "Strong password format ✓" : "12+ characters with upper/lowercase, a number and a symbol."}</span></label><label className="grid gap-2"><span className="text-sm font-bold">Confirm new password</span><input className={input} type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label><button disabled={busy} className="h-13 rounded-2xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy ? "Updating securely…" : "Update password"}</button></form> : null}
      {message ? <p role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${ready ? "mt-4" : ""} ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
