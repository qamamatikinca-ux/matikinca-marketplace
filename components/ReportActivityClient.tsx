"use client";

import Link from "next/link";
import { useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkSiteFooter20260822 from "@/components/LoadLinkSiteFooter20260822";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ReportActivityClient() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [listingUrl, setListingUrl] = useState("");
  const [description, setDescription] = useState("");
  const muted = darkMode ? "text-white/58" : "text-black/60";
  const panel = darkMode ? "border-white/12 bg-[#121414]" : "border-black/10 bg-white";
  const subject = "LoadLink suspicious activity report";
  const body = [
    "Please review this concern reported through LoadLink.",
    "", "Listing or profile link: " + (listingUrl.trim() || "Not available"),
    "What happened: " + (description.trim() || "I will describe the concern below"),
    "", "I can provide further evidence if needed.",
  ].join("\n");
  const email = `mailto:loadlinkmarketing@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <main className={`min-h-screen ${darkMode ? "bg-[#080909] text-white" : "bg-[#f7f7f5] text-[#151819]"}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="mx-auto max-w-[760px] px-5 pb-14 pt-9">
        <Link href="/" className={`text-xs font-semibold underline underline-offset-4 ${muted}`}>Back to LoadLink</Link>
        <h1 className="mt-6 text-[clamp(30px,6vw,42px)] font-bold tracking-[-.04em]">Report suspicious activity</h1>
        <p className={`mt-3 max-w-2xl text-sm leading-7 ${muted}`}>If a listing, message or user seems suspicious, here is the safest way to report it. Do not send payment, passwords or identity documents to an unverified contact.</p>

        <section aria-label="Reporting steps" className="mt-7 space-y-3">
          {[
            ["1", "Stop the transaction", "Do not pay or share sensitive details while the concern is unresolved."],
            ["2", "Keep the evidence", "Save the listing link, screenshots, messages and dates. Do not edit the evidence."],
            ["3", "Send your report", "Use Report on the specific listing to submit a moderation case, or email the details below if you cannot access it."],
            ["4", "Keep your reference", "If the listing report produces a case number, save it. The LoadLink team can review what you submitted and request more detail."],
          ].map(([n, title, detail]) => (
            <div key={n} className={`flex gap-4 rounded-2xl border p-4 sm:p-5 ${panel}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-sm font-bold text-black">{n}</span>
              <div><h2 className="text-base font-semibold">{title}</h2><p className={`mt-1 text-sm leading-6 ${muted}`}>{detail}</p></div>
            </div>
          ))}
        </section>

        <section className={`mt-8 rounded-[20px] border p-5 sm:p-6 ${panel}`}>
          <h2 className="text-xl font-semibold">Report a concern</h2>
          <p className={`mt-1 text-sm leading-6 ${muted}`}>For a listing that is still online, open it and select <strong>Report</strong> for a direct moderation case. Otherwise, prepare an email to LoadLink.</p>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold">Listing or profile link (optional)
              <input type="url" value={listingUrl} onChange={e=>setListingUrl(e.target.value.slice(0,500))} placeholder="https://..." className={`mt-2 h-12 w-full rounded-xl border px-3 text-base font-medium outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`}/>
            </label>
            <label className="text-xs font-semibold">What happened?
              <textarea value={description} onChange={e=>setDescription(e.target.value.slice(0,1200))} rows={4} placeholder="Describe what you noticed, including dates and the account involved." className={`mt-2 w-full resize-y rounded-xl border p-3 text-base font-medium outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={email} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-black">Open email report</a>
            <Link href="/jobs?portal=job" className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-semibold ${darkMode ? "border-white/20" : "border-black/15"}`}>Find a listing</Link>
          </div>
          <p className={`mt-3 text-xs leading-5 ${muted}`}>Opening email does not submit a case. Send the message from your email app. Direct in-listing reports are submitted to LoadLink moderation when you are signed in.</p>
        </section>
        <p className={`mt-5 text-xs leading-6 ${muted}`}>If someone is in immediate danger or a crime is in progress, contact local emergency services or the appropriate authorities.</p>
      </div>
      <LoadLinkSiteFooter20260822 darkMode={darkMode} />
    </main>
  );
}
