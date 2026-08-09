"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyAuthError } from "@/lib/authSecurity";
import { supabase } from "@/lib/supabaseClient";

type Factor = { id: string; status?: string; friendly_name?: string | null };

export default function MfaSecurityCard({ darkMode }: { darkMode: boolean }) {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const muted = darkMode ? "text-white/50" : "text-black/50";

  const load = useCallback(async () => {
    const result = await supabase.auth.mfa.listFactors();
    if (result.error) return;
    const verified = (result.data.totp || []).find((item) => item.status === "verified") || null;
    setFactor(verified);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function start() {
    if (busy || factor) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "LoadLink authenticator" });
    setBusy(false);
    if (error) { setMessage(friendlyAuthError(error, "mfa")); return; }
    setPendingId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function verify() {
    if (!pendingId || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true); setMessage("");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: pendingId });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({ factorId: pendingId, challengeId: challenge.data.id, code });
      if (verified.error) throw verified.error;
      setPendingId(""); setQr(""); setSecret(""); setCode("");
      setMessage("Two-step verification is now enabled.");
      await load();
    } catch (error) {
      setMessage(friendlyAuthError(error, "mfa"));
    } finally { setBusy(false); }
  }

  async function cancelSetup() {
    if (pendingId) await supabase.auth.mfa.unenroll({ factorId: pendingId }).catch(() => undefined);
    setPendingId(""); setQr(""); setSecret(""); setCode(""); setMessage("");
  }

  async function disable() {
    if (!factor || busy) return;
    const confirmed = window.confirm("Turn off two-step verification for this LoadLink account?");
    if (!confirmed) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { setMessage(friendlyAuthError(error, "mfa")); return; }
    setFactor(null); setMessage("Two-step verification was turned off.");
  }

  return (
    <section className={`border p-5 md:p-7 ${darkMode ? "rounded-[24px] border-white/10 bg-[#0b0b0b]" : "rounded-[24px] border-black/10 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Two-step verification</h2>
          <p className={`mt-2 max-w-xl text-sm leading-6 ${muted}`}>Use an authenticator app for an extra verification code after your password or Google sign-in.</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] font-black ${factor ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : darkMode ? "border-white/10 text-white/45" : "border-black/10 text-black/45"}`}>{factor ? "ENABLED" : "OPTIONAL"}</span>
      </div>

      {!factor && !pendingId ? <button type="button" onClick={() => void start()} disabled={busy} className="mt-5 h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-semibold text-black disabled:opacity-50">{busy ? "Starting…" : "Set up authenticator"}</button> : null}

      {!factor && pendingId ? (
        <div className={`mt-5 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.015]"}`}>
          <p className="text-sm font-bold">1. Scan this code in your authenticator app</p>
          {qr ? <div className="mt-4 w-fit rounded-2xl bg-white p-3"><img src={qr} alt="Authenticator setup QR code" className="h-44 w-44" /></div> : null}
          {secret ? <div className="mt-4"><p className={`text-xs font-semibold ${muted}`}>Can’t scan it? Enter this setup key manually:</p><code className={`mt-2 block break-all rounded-xl border p-3 text-xs ${darkMode ? "border-white/10 bg-black text-white/75" : "border-black/10 bg-white text-black/75"}`}>{secret}</code></div> : null}
          <p className="mt-5 text-sm font-bold">2. Enter the current 6-digit code</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={`mt-3 h-12 w-full max-w-xs rounded-xl border px-4 text-lg font-black tracking-[.22em] outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`} placeholder="000000" />
          <div className="mt-4 flex gap-2"><button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6} className="h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-semibold text-black disabled:opacity-50">{busy ? "Checking…" : "Enable"}</button><button type="button" onClick={() => void cancelSetup()} disabled={busy} className="h-11 rounded-xl border border-current/15 px-5 text-xs font-semibold disabled:opacity-50">Cancel</button></div>
        </div>
      ) : null}

      {factor ? <div className="mt-5"><p className={`text-xs font-semibold leading-5 ${muted}`}>This account will be stopped at a verification screen whenever a new AAL1 session needs your authenticator code.</p><button type="button" onClick={() => void disable()} disabled={busy} className="mt-4 h-11 rounded-xl border border-red-500/45 px-5 text-xs font-semibold text-red-500 disabled:opacity-50">{busy ? "Updating…" : "Turn off"}</button></div> : null}
      {message ? <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${darkMode ? "border-white/10 bg-white/[.025] text-white/65" : "border-black/10 bg-black/[.02] text-black/65"}`}>{message}</p> : null}
    </section>
  );
}
