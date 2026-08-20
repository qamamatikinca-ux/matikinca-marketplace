"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type RequestResult = { ok?: boolean; ticket_number?: string; status?: string; duplicate?: boolean };

export default function AccountClosureRequestPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ticket, setTicket] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        if (active) { setMessage("Account requests are temporarily unavailable. Please try again later."); setReady(true); }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(data.user)) {
        window.location.replace(loginHref("/account/closure-request"));
        return;
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, []);

  async function submitRequest() {
    if (busy || ticket) return;
    const confirmed = window.confirm("Send this account closure request to LoadLink? Your account stays active while the request is reviewed.");
    if (!confirmed) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.rpc("loadlink_request_account_deletion");
      if (error) throw error;
      const result = (data || {}) as RequestResult;
      if (!result.ok || !result.ticket_number) throw new Error("Request not confirmed");
      setTicket(result.ticket_number);
      setMessage(result.duplicate
        ? `Your existing account closure request ${result.ticket_number} is already being reviewed.`
        : `Request ${result.ticket_number} has been sent to LoadLink support. Your account is still active while it is reviewed.`);
      window.dispatchEvent(new Event("loadlink-notifications-updated"));
    } catch {
      setMessage("LoadLink could not send the account request right now. Nothing changed on your account. Please try again.");
    } finally { setBusy(false); }
  }

  if (!ready) return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}><LoadLinkLoading /></main>;

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return <main className={`min-h-screen ${page}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <Link href="/account/settings" className={`text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${muted}`}>Back to settings</Link>
      <div className={`mt-5 rounded-[28px] border p-6 sm:p-8 ${surface}`}>
        <p className="text-[10px] font-black uppercase tracking-[.15em] text-red-500">Account request</p>
        <h1 className="mt-3 text-[40px] font-black leading-[1] tracking-[-.055em] sm:text-[52px]">Request account closure.</h1>
        <p className={`mt-4 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>This does not immediately remove your account. LoadLink support first reviews active listings, conversations, payments, marketplace investigations and records that may need to be retained for safety or legal reasons.</p>
        <div className={`mt-6 rounded-2xl border p-4 text-sm font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/8 bg-black/[.025]"}`}>
          <strong className="block font-black">What happens next</strong>
          <p className={`mt-2 ${muted}`}>You receive a support reference, the request enters the protected Control Centre queue, and LoadLink notifies you when its status changes. Until then, your account remains available.</p>
        </div>
        {message ? <div role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${ticket ? "border-emerald-500/35 bg-emerald-500/10" : "border-red-500/35 bg-red-500/10"}`}>{message}</div> : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => void submitRequest()} disabled={busy || Boolean(ticket)} className="min-h-12 rounded-xl bg-red-600 px-5 text-sm font-black text-white disabled:opacity-45">{ticket ? "Request received" : busy ? "Sending request…" : "Send account request"}</button>
          <Link href="/account/settings" className={`flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>Keep my account</Link>
        </div>
      </div>
    </section>
  </main>;
}
