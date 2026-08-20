"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import LinkBot from "@/components/LinkBot";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const groups = [
  { name: "Getting started", icon: "start", items: [
    ["What is LoadLink?", "LoadLink connects logistics work, contracts, vehicles and mobile units with people who can provide them."],
    ["How do I create an account?", "Open the account button, choose a sign-in method and complete your profile."],
    ["How do I search?", "Choose the relevant portal and search by vehicle, service, location or work type."],
  ]},
  { name: "Posting", icon: "post", items: [
    ["How do I post?", "Use the post action, choose the correct category, then add clear details, a location, rate and photos."],
    ["Why was my post rejected?", "Open My Posts → Review. LoadLink shows the reason and can guide you through correcting it step by step."],
    ["How many photos can I add?", "Standard posts support up to 5 photos. Pro and eligible dealer listings can use higher limits."],
  ]},
  { name: "Messages & deals", icon: "message", items: [
    ["How do I message a poster?", "Open an active listing and choose Message. LoadLink opens a conversation attached to that listing."],
    ["What are Potential Deals?", "New listing enquiries can enter Potential Deals so the poster can review them before accepting the conversation."],
    ["Can I archive a chat?", "Yes. Archived conversations remain available in the Archived folder until restored."],
  ]},
  { name: "Safety & account", icon: "shield", items: [
    ["Are verification documents public?", "No. Identity and verification files are private and are not shown on public listings."],
    ["How do I check account access?", "Open Menu → Activity & access to review recent devices, login activity and account records."],
    ["How do I report suspicious activity?", "Use the report controls and do not send passwords, OTPs, PINs or banking login details."],
  ]},
  { name: "Packages & billing", icon: "card", items: [
    ["What does Pro change?", "Pro unlocks eligible premium listing features such as higher photo limits and analytics where offered."],
    ["Where can I see payments?", "Open Menu → Activity & access to see LoadLink billing records linked to your account."],
  ]},
];

const QUICK = ["Rejected post", "Posting photos", "Messages", "Verification", "Payments"];

export default function HelpPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = useMemo(() => groups.map(group => ({
    ...group,
    items: q ? group.items.filter(([a,b]) => `${a} ${b}`.toLowerCase().includes(q)) : group.items,
  })).filter(group => group.items.length), [q]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  function talkToSupport() {
    window.dispatchEvent(new Event("loadlink:open-agent-support"));
  }

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-5xl px-4 pb-20 pt-7 md:px-7 md:pt-11">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <h1 className="text-4xl font-black tracking-[-.05em] md:text-6xl">Help that gets you moving.</h1>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${muted}`}>Search LoadLink help, use LinkBot, or send a problem directly into the LoadLink Support queue.</p>
            <button type="button" onClick={talkToSupport} className="mt-5 flex min-h-12 w-full max-w-sm items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_10px_26px_rgba(0,0,0,.10)] sm:w-auto">Talk to LoadLink support</button>
            <label className="mt-6 block">
              <span className="sr-only">Search LoadLink help</span>
              <div className={`flex h-14 items-center gap-3 rounded-2xl border px-4 ${card}`}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <input id="help-search" value={query} onChange={(e: ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="Search posting, messages, payments…" />
                {query ? <button type="button" onClick={()=>setQuery("")} className="text-xs font-black">Clear</button> : null}
              </div>
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-loadlink-swipe-dots="true">
              {QUICK.map(item => <button key={item} type="button" onClick={()=>setQuery(item)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>{item}</button>)}
            </div>
          </div>

          <div className={`rounded-[26px] border p-5 ${card}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-[#f6b800]">
                <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </span>
              <div><h2 className="text-lg font-black">Need guided help?</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Describe the problem in your own words.</p></div>
            </div>
            <div className="mt-4"><LinkBot /></div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {results.length ? results.map(group => (
            <section key={group.name} className={`overflow-hidden rounded-[26px] border ${card}`}>
              <div className={`flex items-center gap-3 border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <TopicIcon name={group.icon}/>
                <h2 className="text-xl font-black tracking-[-.02em]">{group.name}</h2>
              </div>
              <div>
                {group.items.map(([question,answer]) => (
                  <details key={question} className={`group border-b last:border-b-0 ${darkMode ? "border-white/8" : "border-black/8"}`}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-black">
                      <span>{question}</span><span className="text-lg font-medium opacity-45 transition group-open:rotate-45">+</span>
                    </summary>
                    <p className={`px-5 pb-5 text-sm font-semibold leading-6 ${muted}`}>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )) : (
            <section className={`rounded-[26px] border p-7 md:col-span-2 ${card}`}>
              <h2 className="text-2xl font-black">No exact match</h2>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Try a shorter search or use LinkBot above.</p>
            </section>
          )}
        </div>

        <div className={`mt-5 flex flex-col gap-3 rounded-[24px] border p-5 sm:flex-row sm:items-center sm:justify-between ${card}`}>
          <div><h2 className="text-lg font-black">Still stuck?</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Send the issue to Support, return to the marketplace, or review your own posts.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={talkToSupport} className="flex h-11 items-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Talk to support</button><Link href="/my-posts" className="flex h-11 items-center rounded-xl border border-current/10 px-4 text-xs font-black">My posts</Link><Link href="/jobs" className="flex h-11 items-center rounded-xl bg-black px-4 text-xs font-black text-white">Browse work</Link></div>
        </div>
      </section>
    </main>
  );
}

function TopicIcon({ name }: { name: string }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-[#f6b800]">
    {name === "post" ? <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16H5V4Zm4 4h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    : name === "message" ? <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
    : name === "shield" ? <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="m12 3 7 3v5c0 4.5-2.8 7.6-7 10-4.2-2.4-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2"/></svg>
    : name === "card" ? <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 10h18" stroke="currentColor" strokeWidth="2"/></svg>
    : <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
  </span>
}
