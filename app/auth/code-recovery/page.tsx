"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { syncAccountState } from "@/lib/accountState";
import { safeNextPath } from "@/lib/auth";
import { isFourDigitCode, markSecurityCodeVerified } from "@/lib/securityCode";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import type { Session } from "@supabase/supabase-js";

type RecoveryState = "checking" | "ready" | "invalid";
type CodeStatus = { has_code?: boolean };

export default function CodeRecoveryPage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [state, setState] = useState<RecoveryState>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [hasCode, setHasCode] = useState(false);
  const [changing, setChanging] = useState(false);
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Verifying your recovery email…");

  function nextPath() {
    return safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
  }

  useEffect(() => {
    let active = true;

    async function acceptRecovery(nextSession: Session) {
      if (!active) return;
      const { data, error } = await supabase.rpc("loadlink_security_code_status");
      if (error) {
        setState("invalid");
        setMessage("Your email was verified, but LoadLink's 4-digit code service is not ready. Run the V2.6.9 SQL and try again.");
        return;
      }
      const status = (data || {}) as CodeStatus;
      const next = nextPath();
      window.history.replaceState({}, "", `/auth/code-recovery?next=${encodeURIComponent(next)}`);
      setSession(nextSession);
      setHasCode(Boolean(status.has_code));
      setChanging(!status.has_code);
      setState("ready");
      setMessage("");
    }

    async function prepare() {
      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      const providerError = query.get("error_description") || hash.get("error_description");
      if (providerError) {
        setState("invalid");
        setMessage("This recovery email could not be verified. Request a fresh link from the 4-digit code screen.");
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error && data.session) { await acceptRecovery(data.session); return; }
      }

      const codeParam = query.get("code");
      if (codeParam) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(codeParam);
        if (!error && data.session) { await acceptRecovery(data.session); return; }
      }

      const tokenHash = query.get("token_hash");
      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
        if (!error && data.session) { await acceptRecovery(data.session); return; }
      }

      setState("invalid");
      setMessage("This recovery link is invalid, expired or has already been used. Request a new one from the 4-digit code screen.");
    }

    void prepare().catch(() => {
      if (!active) return;
      setState("invalid");
      setMessage("This recovery link could not be verified. Request a fresh one and try again.");
    });
    return () => { active = false; };
  }, []);

  async function completeWithCurrentCode() {
    if (!session || busy) return;
    setBusy(true);
    markSecurityCodeVerified(session);
    await syncAccountState().catch(() => undefined);
    router.replace(nextPath());
  }

  async function changeCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    setMessage("");
    if (!isFourDigitCode(code)) { setMessage("Enter exactly four numbers."); return; }
    if (code !== confirm) { setMessage("The two 4-digit codes do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("loadlink_recover_security_code", { p_code: code });
      if (error) throw error;
      markSecurityCodeVerified(session);
      await syncAccountState().catch(() => undefined);
      router.replace(nextPath());
    } catch {
      setMessage("The new code could not be saved. Try again.");
      setBusy(false);
    }
  }

  const input = `h-15 w-full rounded-2xl border px-4 text-center text-3xl font-black tracking-[.38em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

  return (
    <AuthShell title={state === "ready" ? "Recover your 4-digit code" : state === "invalid" ? "Recovery link unavailable" : "Checking your recovery link"} description={state === "ready" ? "Your account email has been verified. Keep the code already on your account or replace it with a new 4-digit code." : "LoadLink is confirming that this secure email belongs to your account."} status="Email-confirmed recovery">
      {state === "checking" ? <div className="py-8 text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><p className="mt-4 text-sm font-semibold opacity-50">{message}</p></div> : null}

      {state === "ready" ? (
        <div>
          <div className={`rounded-2xl border p-4 ${darkMode ? "border-emerald-500/20 bg-emerald-500/[.07]" : "border-emerald-600/20 bg-emerald-500/[.06]"}`}>
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 font-black text-emerald-500">✓</span><div><p className="text-sm font-black">Recovery email confirmed</p><p className={`mt-1 text-xs font-semibold leading-5 ${darkMode ? "text-white/50" : "text-black/50"}`}>{hasCode ? "Your existing 4-digit code is still active. For security, LoadLink does not reveal the actual digits." : "This account does not have a 4-digit code yet. Create one now to continue."}</p></div></div>
          </div>

          {hasCode && !changing ? (
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => void completeWithCurrentCode()} disabled={busy} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Opening securely…" : "Keep current code & enter LoadLink"}</button>
              <button type="button" onClick={() => { setChanging(true); setMessage(""); }} disabled={busy} className={`h-12 rounded-2xl border text-sm font-black ${darkMode ? "border-white/12 text-white/72" : "border-black/12 text-black/72"}`}>Choose a new code instead</button>
            </div>
          ) : null}

          {changing ? (
            <form onSubmit={changeCode} className="mt-5 grid gap-4">
              <label className="grid gap-2"><span className="text-sm font-black">New 4-digit code</span><input aria-label="New 4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
              <label className="grid gap-2"><span className="text-sm font-black">Confirm new code</span><input aria-label="Confirm new 4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
              <button disabled={busy || code.length !== 4 || confirm.length !== 4} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy ? "Saving securely…" : "Save new code & continue"}</button>
              {hasCode ? <button type="button" onClick={() => { setChanging(false); setCode(""); setConfirm(""); setMessage(""); }} disabled={busy} className={`h-11 rounded-2xl border text-sm font-black ${darkMode ? "border-white/12" : "border-black/12"}`}>Back</button> : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {state === "invalid" ? <div className="py-3"><div className={`rounded-2xl border p-4 text-sm font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.03] text-white/65" : "border-black/10 bg-black/[.02] text-black/65"}`}>{message}</div><button type="button" onClick={() => router.replace(`/auth/mfa?next=${encodeURIComponent(nextPath())}`)} className="mt-4 h-12 w-full rounded-2xl bg-[#f6b800] text-sm font-black text-black">Return to 4-digit code</button></div> : null}

      {state === "ready" && message ? <p role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
    </AuthShell>
  );
}
