"use client";

import { useCallback, useEffect, useState } from "react";
import { clearSecurityCodeMarkers, isFourDigitCode, markSecurityCodeVerified } from "@/lib/securityCode";
import { recoverySupabase } from "@/lib/recoverySupabase";
import { supabase } from "@/lib/supabaseClient";

type CodeStatus = { has_code?: boolean; enabled?: boolean; locked_until?: string | null };
type EditorMode = "closed" | "setup" | "change" | "disable";

export default function MfaSecurityCard({ darkMode }: { darkMode: boolean }) {
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [mode, setMode] = useState<EditorMode>("closed");
  const [currentCode, setCurrentCode] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const muted = darkMode ? "text-white/52" : "text-black/52";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";
  const field = `h-12 w-full rounded-xl border px-4 text-center text-xl font-black tracking-[.3em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-black text-white placeholder:text-white/20" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/20"}`;

  const resetEditor = useCallback(() => {
    setMode("closed");
    setCurrentCode("");
    setCode("");
    setConfirm("");
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("loadlink_security_code_status");
    if (error) {
      setStatus(null);
      setMessage("Security settings are temporarily unavailable.");
      return;
    }
    setStatus((data || {}) as CodeStatus);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveCode() {
    if (busy) return;
    setMessage("");
    const active = Boolean(status?.enabled);
    if (mode === "change" && !isFourDigitCode(currentCode)) {
      setMessage("Enter your current 4-digit code.");
      return;
    }
    if (!isFourDigitCode(code)) {
      setMessage("Enter four numbers.");
      return;
    }
    if (code !== confirm) {
      setMessage("The codes do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("loadlink_set_security_code", {
        p_code: code,
        p_current_code: active ? currentCode : null,
      });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      markSecurityCodeVerified(session);
      resetEditor();
      setMessage(active ? "Your sign-in code was changed." : "Your sign-in code is now on.");
      await load();
    } catch {
      setMessage(active ? "The current code is incorrect or could not be changed." : "The code could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function disableCode() {
    if (busy) return;
    setMessage("");
    if (!isFourDigitCode(currentCode)) {
      setMessage("Enter your current 4-digit code.");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc("loadlink_disable_security_code", { p_current_code: currentCode });
      if (error) throw error;
      clearSecurityCodeMarkers(user?.id);
      resetEditor();
      setMessage("Your sign-in code is now off.");
      await load();
    } catch {
      setMessage("The current code is incorrect or the code could not be turned off.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRecovery() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email");
      const redirectTo = `${window.location.origin}/auth/code-recovery?next=${encodeURIComponent("/account/settings#security")}`;
      const { error } = await recoverySupabase.auth.signInWithOtp({
        email: user.email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage("Recovery email sent.");
    } catch {
      setMessage("Recovery email could not be sent right now.");
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(status?.enabled);
  const editingCode = mode === "setup" || mode === "change";
  const statusLabel = status === null ? "Checking" : active ? "On" : "Off";

  return (
    <section className={`overflow-hidden rounded-[28px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-[#f6b800]" aria-hidden="true">
            <CodeIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-[-.02em]">Sign-in code</h2>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] ${active ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/10 text-white/55" : "bg-black/5 text-black/50"}`}>{statusLabel}</span>
            </div>
            <p className={`mt-1.5 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Add a private 4-digit code after sign-in. It is optional and separate from your password.</p>
          </div>
        </div>

        {mode === "closed" ? (
          <div className={`mt-5 rounded-[20px] border p-3.5 ${soft}`}>
            {active ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setMessage(""); resetEditor(); setMode("change"); }} className="h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Change code</button>
                <button type="button" onClick={() => { setMessage(""); resetEditor(); setMode("disable"); }} className={`h-11 rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/12 text-white/65" : "border-black/10 text-black/65"}`}>Turn off</button>
                <button type="button" onClick={() => void sendRecovery()} disabled={busy} className={`col-span-2 h-10 rounded-xl text-xs font-bold disabled:opacity-45 ${muted}`}>Forgot code? <span className="underline underline-offset-4">Recover by email</span></button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`text-xs font-semibold leading-5 ${muted}`}>No extra code is required on this account.</span>
                <button type="button" onClick={() => { setMessage(""); resetEditor(); setMode("setup"); }} disabled={status === null || busy} className="h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-45">Set up code</button>
              </div>
            )}
          </div>
        ) : null}

        {editingCode ? (
          <div className={`mt-5 rounded-[20px] border p-3.5 md:p-5 ${soft}`}>
            <div className="mb-4">
              <h3 className="text-sm font-black">{mode === "setup" ? "Create your code" : "Change your code"}</h3>
              <p className={`mt-1 text-xs font-semibold ${muted}`}>Use four numbers you can remember. Do not reuse a banking PIN.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mode === "change" ? (
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-xs font-bold">Current code</span>
                  <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={currentCode} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
                </label>
              ) : null}
              <label className="grid gap-2">
                <span className="text-xs font-bold">New code</span>
                <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold">Confirm code</span>
                <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveCode()} disabled={busy || code.length !== 4 || confirm.length !== 4 || (mode === "change" && currentCode.length !== 4)} className="h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-45">{busy ? "Saving…" : mode === "setup" ? "Turn on code" : "Save new code"}</button>
              <button type="button" onClick={() => { resetEditor(); setMessage(""); }} disabled={busy} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-bold disabled:opacity-45">Cancel</button>
            </div>
          </div>
        ) : null}

        {mode === "disable" ? (
          <div className={`mt-5 rounded-[20px] border p-3.5 md:p-5 ${soft}`}>
            <h3 className="text-sm font-black">Turn off sign-in code</h3>
            <p className={`mt-1 text-xs font-semibold ${muted}`}>Enter your current code to confirm.</p>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-bold">Current code</span>
              <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={currentCode} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void disableCode()} disabled={busy || currentCode.length !== 4} className="h-10 rounded-xl border border-red-500 px-4 text-xs font-black text-red-500 disabled:opacity-45">{busy ? "Turning off…" : "Confirm turn off"}</button>
              <button type="button" onClick={() => { resetEditor(); setMessage(""); }} disabled={busy} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-bold disabled:opacity-45">Cancel</button>
            </div>
          </div>
        ) : null}

        {message ? <p role="status" className={`mt-4 text-xs font-bold ${message.includes("incorrect") || message.includes("could not") || message.includes("unavailable") ? "text-red-500" : muted}`}>{message}</p> : null}
      </div>
    </section>
  );
}

function CodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 5.5 6v5.2c0 4.5 2.7 7.7 6.5 9.8 3.8-2.1 6.5-5.3 6.5-9.8V6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" />
      <circle cx="12" cy="11.5" r="1" fill="currentColor" />
      <circle cx="15" cy="11.5" r="1" fill="currentColor" />
    </svg>
  );
}
