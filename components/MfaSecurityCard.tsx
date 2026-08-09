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

  const muted = darkMode ? "text-white/48" : "text-black/48";
  const field = `h-12 w-full rounded-xl border px-4 text-center text-xl font-black tracking-[.28em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-black text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

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
      setMessage(active ? "4-digit code changed." : "4-digit code turned on.");
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
      setMessage("4-digit code turned off.");
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

  return (
    <section className={`border p-5 md:p-7 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">4-digit code</h2>
          <p className={`mt-1 text-sm ${muted}`}>Optional extra sign-in step.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={active ? "Turn off 4-digit code" : "Turn on 4-digit code"}
          disabled={status === null || busy}
          onClick={() => {
            setMessage("");
            resetEditor();
            setMode(active ? "disable" : "setup");
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-40 ${active ? "border-[#f6b800] bg-[#f6b800]" : darkMode ? "border-white/15 bg-white/10" : "border-black/15 bg-black/10"}`}
        >
          <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition ${active ? "left-[25px]" : "left-[3px]"}`} />
        </button>
      </div>

      {active && mode === "closed" ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setMessage(""); resetEditor(); setMode("change"); }} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-semibold">Change code</button>
          <button type="button" onClick={() => void sendRecovery()} disabled={busy} className={`text-xs font-semibold underline underline-offset-4 disabled:opacity-45 ${muted}`}>Forgot code?</button>
        </div>
      ) : null}

      {editingCode ? (
        <div className="mt-5 grid gap-4 border-t border-current/10 pt-5">
          {mode === "change" ? (
            <label className="grid gap-2">
              <span className="text-xs font-semibold">Current code</span>
              <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={currentCode} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold">New code</span>
              <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold">Confirm code</span>
              <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveCode()} disabled={busy || code.length !== 4 || confirm.length !== 4 || (mode === "change" && currentCode.length !== 4)} className="h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-semibold text-black disabled:opacity-45">{busy ? "Saving…" : mode === "setup" ? "Turn on" : "Save"}</button>
            <button type="button" onClick={() => { resetEditor(); setMessage(""); }} disabled={busy} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-semibold disabled:opacity-45">Cancel</button>
          </div>
        </div>
      ) : null}

      {mode === "disable" ? (
        <div className="mt-5 grid gap-4 border-t border-current/10 pt-5">
          <label className="grid gap-2">
            <span className="text-xs font-semibold">Current code</span>
            <input className={field} inputMode="numeric" autoComplete="off" maxLength={4} value={currentCode} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void disableCode()} disabled={busy || currentCode.length !== 4} className="h-10 rounded-xl border border-red-500 px-4 text-xs font-semibold text-red-500 disabled:opacity-45">{busy ? "Turning off…" : "Turn off"}</button>
            <button type="button" onClick={() => { resetEditor(); setMessage(""); }} disabled={busy} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-semibold disabled:opacity-45">Cancel</button>
          </div>
        </div>
      ) : null}

      {message ? <p role="status" className={`mt-4 text-xs font-semibold ${message.includes("incorrect") || message.includes("could not") || message.includes("unavailable") ? "text-red-500" : muted}`}>{message}</p> : null}
    </section>
  );
}
