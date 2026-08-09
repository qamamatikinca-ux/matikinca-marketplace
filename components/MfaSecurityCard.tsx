"use client";

import { useCallback, useEffect, useState } from "react";
import { isFourDigitCode, markSecurityCodeVerified } from "@/lib/securityCode";
import { recoverySupabase } from "@/lib/recoverySupabase";
import { supabase } from "@/lib/supabaseClient";

type CodeStatus = { has_code?: boolean; locked_until?: string | null };

export default function MfaSecurityCard({ darkMode }: { darkMode: boolean }) {
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `h-13 w-full rounded-2xl border px-4 text-center text-2xl font-black tracking-[.34em] outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-black text-white placeholder:text-white/22" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/22"}`;

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("loadlink_security_code_status");
    if (error) {
      setMessage("The 4-digit security code service is not ready yet. Run the V2.6.9 SQL, then reload Settings.");
      return;
    }
    setStatus((data || {}) as CodeStatus);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (busy) return;
    setMessage("");
    if (status?.has_code && !isFourDigitCode(currentCode)) { setMessage("Enter your current 4-digit code first."); return; }
    if (!isFourDigitCode(code)) { setMessage("Enter exactly four numbers for the new code."); return; }
    if (code !== confirm) { setMessage("The two 4-digit codes do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("loadlink_set_security_code", { p_code: code, p_current_code: status?.has_code ? currentCode : null });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      markSecurityCodeVerified(session);
      setCurrentCode(""); setCode(""); setConfirm(""); setEditing(false);
      setMessage(status?.has_code ? "Your LoadLink 4-digit code was changed." : "Your LoadLink 4-digit code is active.");
      await load();
    } catch {
      setMessage("The code could not be saved. Check the V2.6.9 security setup and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRecovery() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No account email");
      const next = "/account/settings#security";
      const redirectTo = `${window.location.origin}/auth/code-recovery?next=${encodeURIComponent(next)}`;
      const { error } = await recoverySupabase.auth.signInWithOtp({
        email: user.email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage("Recovery email sent. Open the secure link to keep your current code or choose a new one.");
    } catch {
      setMessage("A recovery email could not be sent right now. Try again in a few minutes.");
    } finally { setBusy(false); }
  }

  const active = Boolean(status?.has_code);

  return (
    <section className={`overflow-hidden border ${darkMode ? "rounded-[24px] border-white/10 bg-[#0b0b0b]" : "rounded-[24px] border-black/10 bg-white"}`}>
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#b98300] dark:text-[#f6b800]">Account security</p>
            <h2 className="mt-2 text-xl font-black tracking-[-.02em]">4-digit LoadLink code</h2>
            <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>A short code you choose yourself. After email/password or Google sign-in, LoadLink asks for it before opening your account.</p>
          </div>
          <span className={`rounded-full border px-3 py-2 text-[10px] font-black ${active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : darkMode ? "border-white/10 text-white/45" : "border-black/10 text-black/45"}`}>{status === null ? "CHECKING" : active ? "ACTIVE" : "SET UP"}</span>
        </div>

        {active && !editing ? (
          <div className={`mt-5 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.015]"}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#f6b800]/35 bg-[#f6b800]/10 text-[#c18d00]">✓</span>
              <div><p className="text-sm font-black">Code protection is on</p><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Your code is stored as a one-way hash and is never displayed back in Settings.</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setEditing(true); setMessage(""); }} className="h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Change 4-digit code</button>
              <button type="button" onClick={() => void sendRecovery()} disabled={busy} className="h-11 rounded-xl border border-current/15 px-5 text-xs font-black disabled:opacity-50">Email recovery link</button>
            </div>
          </div>
        ) : null}

        {status !== null && (!active || editing) ? (
          <div className={`mt-5 rounded-2xl border p-4 sm:p-5 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.015]"}`}>
            <p className="text-sm font-black">{active ? "Choose a new code" : "Create your code"}</p>
            <p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Use four numbers you can remember. Do not use a code someone else knows.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {active ? <label className="grid gap-2 sm:col-span-2"><span className="text-xs font-black">Current 4-digit code</span><input aria-label="Current 4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={currentCode} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label> : null}
              <label className="grid gap-2"><span className="text-xs font-black">{active ? "New 4-digit code" : "4-digit code"}</span><input aria-label="4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
              <label className="grid gap-2"><span className="text-xs font-black">Confirm code</span><input aria-label="Confirm 4-digit LoadLink code" className={input} inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void save()} disabled={busy || code.length !== 4 || confirm.length !== 4 || (active && currentCode.length !== 4)} className="h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black disabled:opacity-45">{busy ? "Saving…" : active ? "Save new code" : "Activate code"}</button>
              {active ? <button type="button" onClick={() => { setEditing(false); setCurrentCode(""); setCode(""); setConfirm(""); setMessage(""); }} disabled={busy} className="h-11 rounded-xl border border-current/15 px-5 text-xs font-black disabled:opacity-50">Cancel</button> : null}
            </div>
          </div>
        ) : null}

        {message ? <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.025] text-white/65" : "border-black/10 bg-black/[.02] text-black/65"}`}>{message}</p> : null}
      </div>
      <div className={`border-t px-5 py-4 text-xs font-semibold leading-5 md:px-7 ${darkMode ? "border-white/10 bg-black text-white/42" : "border-black/10 bg-[#faf8f2] text-black/48"}`}>Forgotten code? Recovery is confirmed through the email already attached to your LoadLink account. The existing code itself is never emailed or revealed.</div>
    </section>
  );
}
