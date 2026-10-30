"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { driverIdentityRequest } from "@/lib/driverIdentityClient";
import { normalizeDriverPhone, type DriverIdentityState } from "@/lib/driverVerification";
import DriverCameraCheck from "@/components/DriverCameraCheck";
export default function DriverVerificationPanel({ phone, email, disabled, onStatus, onBusy, onEditContacts }: { phone: string; email: string; disabled: boolean; onStatus: (state: DriverIdentityState | null) => void; onBusy: (busy: boolean) => void; onEditContacts: () => void }) {
 const [state, setState] = useState<DriverIdentityState | null>(null), [message, setMessage] = useState("");
 const [otp, setOtp] = useState(""), [sent, setSent] = useState(false), [busy, setBusy] = useState(false);
 const refresh = useCallback(async () => {
  try { const next: DriverIdentityState = await (await driverIdentityRequest({ action: "status" })).json(); setState(next); onStatus(next); setMessage(""); }
  catch (e) { setMessage(e instanceof Error ? e.message : "Verification could not load."); onStatus(null); }
 }, [onStatus]);
 useEffect(() => { void driverIdentityRequest({ action: "status" }).then(response => response.json()).then((next: DriverIdentityState) => { setState(next); onStatus(next); }).catch(e => { setMessage(e instanceof Error ? e.message : "Verification could not load."); onStatus(null); }); const visible = () => { if (document.visibilityState === "visible") void refresh(); }; window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible); return () => { window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); }; }, [refresh, onStatus]);
 async function contactAction(action: "send" | "confirm" | "email") {
  if (busy || disabled) return; setBusy(true); onBusy(true); setMessage("");
  try {
   const { data: { user }, error } = await supabase.auth.getUser();
   if (error || !user || user.is_anonymous) throw new Error("Sign in again to verify your contact details.");
   if (action === "email") {
    if (!state?.accountEmail || state.accountEmail.toLowerCase() !== email.trim().toLowerCase()) throw new Error("Use your signed-in account’s email address on your driver profile.");
    const result = await supabase.auth.resend({ type: "signup", email: state.accountEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fdriver-profile` } });
    if (result.error) throw new Error("The confirmation email could not be sent. Please retry shortly or contact support.");
    setMessage("Check your email for the confirmation link, then return to your driver profile.");
   } else {
    const number = normalizeDriverPhone(phone);
    if (!/^\+[1-9]\d{7,14}$/.test(number)) throw new Error("Add a valid phone number with country code in Personal information.");
    if (action === "send") {
     const result = await supabase.auth.updateUser({ phone: number });
     if (result.error) throw new Error("The SMS code could not be sent. Check the number or contact support if this continues.");
     setSent(true); setMessage("Enter the six-digit code sent to your phone.");
    } else {
     const result = await supabase.auth.verifyOtp({ phone: number, token: otp, type: "phone_change" });
     if (result.error) throw new Error("That code was not accepted. Check the SMS and try again.");
     const after = await supabase.auth.getUser();
     if (after.error || after.data.user?.id !== user.id || !after.data.user?.phone_confirmed_at || normalizeDriverPhone(after.data.user.phone || "") !== number) throw new Error("The phone verification was not confirmed. Refresh and retry.");
     setSent(false); setOtp(""); await refresh();
    }
   }
  } catch (e) { setMessage(e instanceof Error ? e.message : "Contact verification failed. Please retry."); }
  finally { setBusy(false); onBusy(false); }
 }
 const btn = "rounded-full bg-[#f6b800] px-4 py-2 text-sm font-bold text-black disabled:opacity-40";
 return <section className="mt-5 rounded-2xl border border-current/15 p-4" aria-label="Driver verification">
  <h3 className="text-lg font-black">Verify your contact details</h3>
  {state ? <>
   <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
    <div><strong>Email · {state.emailVerified ? "Verified" : "Needs verification"}</strong><p className="mt-1 break-words opacity-70">{email}</p>{!state.emailVerified ? state.accountEmail.toLowerCase() !== email.trim().toLowerCase() ? <p className="mt-2">Use your account email: <strong className="break-all">{state.accountEmail}</strong>. <button type="button" className="underline" disabled={disabled || busy} onClick={onEditContacts}>Edit contact details</button></p> : <button type="button" className={`${btn} mt-2`} disabled={disabled || busy} onClick={() => void contactAction("email")}>Send confirmation email</button> : null}</div>
    <div><strong>Phone · {state.phoneVerified ? "Verified" : "Needs verification"}</strong><p className="mt-1 opacity-70">{phone}</p>{!state.phoneVerified && state.phoneVerificationAvailable === false ? <p className="mt-2 leading-6">Phone verification is temporarily unavailable. You can still complete your ID check and save your details.</p> : !state.phoneVerified ? <div className="mt-2 space-y-3">{sent ? <><label className="block">SMS code<input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-2 block w-full rounded-xl border border-current/20 bg-transparent p-3 text-lg tracking-widest" /></label><button type="button" disabled={disabled || busy || otp.length !== 6} className={btn} onClick={() => void contactAction("confirm")}>Confirm code</button><button type="button" className="ml-3 text-sm underline" disabled={disabled || busy} onClick={() => { setSent(false); setOtp(""); }}>Change number or retry</button></> : <button type="button" disabled={disabled || busy} className={btn} onClick={() => void contactAction("send")}>Send SMS code</button>}</div> : null}</div>
   </div>
   <DriverCameraCheck state={state} disabled={disabled || busy} onSaved={refresh} onBusy={onBusy} />
  </> : <p className="mt-3 text-sm">Loading verification status…</p>}
  {message ? <p role="status" className="mt-3 text-sm leading-6">{message}</p> : null}
 </section>;
}
