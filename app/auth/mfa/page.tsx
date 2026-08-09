"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/authSecurity";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function MfaPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Checking your security settings…");
  const [busy, setBusy] = useState(false);

  function nextPath() { return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/"); }

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(userData.user)) { router.replace(`/login?next=${encodeURIComponent(nextPath())}`); return; }
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) { if (active) setMessage("Two-step verification could not be checked. Sign in again."); return; }
      if (assurance.data.currentLevel === "aal2" || assurance.data.nextLevel !== "aal2") { router.replace(nextPath()); return; }
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) { if (active) setMessage("Your authenticator could not be loaded. Sign in again."); return; }
      const factor = factors.data.totp.find((item) => item.status === "verified") || factors.data.totp[0];
      if (!factor) { if (active) setMessage("No authenticator factor is available for this account. Contact LoadLink support."); return; }
      if (active) { setFactorId(factor.id); setMessage(""); }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true); setMessage("");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
      if (result.error) throw result.error;
      await syncAccountState().catch(() => undefined);
      router.replace(nextPath());
    } catch (error) {
      setMessage(friendlyAuthError(error, "mfa"));
      setCode("");
    } finally { setBusy(false); }
  }

  const input = `h-14 w-full rounded-2xl border px-4 text-center text-2xl font-black tracking-[.28em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/12 bg-[#fffdf8] text-black"}`;

  return (
    <AuthShell title="Verify it's you" description="Open your authenticator app and enter the current 6-digit LoadLink code." status="Two-step verification">
      {factorId ? <form onSubmit={verify} className="grid gap-4"><input aria-label="Authenticator code" className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus /><button disabled={busy || code.length !== 6} className="h-13 rounded-2xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy ? "Verifying…" : "Verify & continue"}</button></form> : null}
      {message ? <p role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${factorId ? "mt-4" : ""} ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
