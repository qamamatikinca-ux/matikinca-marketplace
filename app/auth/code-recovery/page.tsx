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
type CodeStatus = { enabled?: boolean };

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
  const [message, setMessage] = useState("");

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
        setMessage("This recovery link could not be completed right now.");
        return;
      }
      const status = (data || {}) as CodeStatus;
      const next = nextPath();
      window.history.replaceState({}, "", `/auth/code-recovery?next=${encodeURIComponent(next)}`);
      setSession(nextSession);
      setHasCode(Boolean(status.enabled));
      setChanging(false);
      setState("ready");
    }

    async function prepare() {
      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      if (query.get("error_description") || hash.get("error_description")) {
        setState("invalid");
        setMessage("This recovery link is no longer available.");
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
      setMessage("This recovery link is invalid, expired or already used.");
    }

    void prepare().catch(() => {
      if (!active) return;
      setState("invalid");
      setMessage("This recovery link could not be verified.");
    });
    return () => { active = false; };
  }, []);

  async function continueWithCurrentCode() {
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
    if (!isFourDigitCode(code)) { setMessage("Enter four numbers."); return; }
    if (code !== confirm) { setMessage("The codes do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("loadlink_recover_security_code", { p_code: code });
      if (error) throw error;
      markSecurityCodeVerified(session);
      await syncAccountState().catch(() => undefined);
      router.replace(nextPath());
    } catch {
      setMessage("The new code could not be saved.");
      setBusy(false);
    }
  }

  const input = `h-14 w-full rounded-xl border px-4 text-center text-2xl font-black tracking-[.34em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04] text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

  return (
    <AuthShell
      title={state === "ready" ? "4-digit code recovery" : state === "invalid" ? "Recovery link unavailable" : "Checking recovery link"}
      description={state === "ready" && hasCode ? "Keep your current code or set a new one." : undefined}
    >
      {state === "checking" ? <div className="py-8 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div> : null}

      {state === "ready" && hasCode && !changing ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => void continueWithCurrentCode()} disabled={busy} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-black disabled:opacity-45">{busy ? "Opening…" : "Keep current code"}</button>
          <button type="button" onClick={() => { setChanging(true); setMessage(""); }} disabled={busy} className={`h-12 rounded-xl border text-sm font-semibold ${darkMode ? "border-white/12" : "border-black/12"}`}>Set a new code</button>
        </div>
      ) : null}

      {state === "ready" && !hasCode ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => void continueWithCurrentCode()} disabled={busy} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-black disabled:opacity-45">Continue</button>
          <button type="button" onClick={() => setChanging(true)} disabled={busy} className={`h-12 rounded-xl border text-sm font-semibold ${darkMode ? "border-white/12" : "border-black/12"}`}>Set up a 4-digit code</button>
        </div>
      ) : null}

      {state === "ready" && changing ? (
        <form onSubmit={changeCode} className="grid gap-4">
          <label className="grid gap-2"><span className="text-sm font-semibold">New code</span><input className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
          <label className="grid gap-2"><span className="text-sm font-semibold">Confirm code</span><input className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
          <button disabled={busy || code.length !== 4 || confirm.length !== 4} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-black disabled:opacity-45">{busy ? "Saving…" : "Save and continue"}</button>
          <button type="button" onClick={() => { setChanging(false); setCode(""); setConfirm(""); setMessage(""); }} disabled={busy} className={`h-11 rounded-xl border text-sm font-semibold ${darkMode ? "border-white/12" : "border-black/12"}`}>Back</button>
        </form>
      ) : null}

      {state === "invalid" ? (
        <div>
          <p className={`text-sm font-semibold leading-6 ${darkMode ? "text-white/58" : "text-black/58"}`}>{message}</p>
          <button type="button" onClick={() => router.replace(`/auth/mfa?next=${encodeURIComponent(nextPath())}`)} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-semibold text-black">Back</button>
        </div>
      ) : null}

      {state === "ready" && message ? <p role="status" className="mt-4 text-center text-sm font-semibold text-red-500">{message}</p> : null}
    </AuthShell>
  );
}
