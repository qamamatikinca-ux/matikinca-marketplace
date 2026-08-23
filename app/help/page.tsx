"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useMemo, useState } from "react";
import LinkBot from "@/components/LinkBot";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Article = { q: string; a: string };
type Category = { id: string; label: string; description: string; articles: Article[] };

const categories: Category[] = [
  { id: "account", label: "Account & verification", description: "Sign-in, profile, verification and account access.", articles: [
    { q: "Why is my verification pending?", a: "Verification stays pending until the required identity or business information has been reviewed. Your account should always show the current state." },
    { q: "My verification was rejected. What now?", a: "Open the resubmission path, read the reason, correct the affected information and resubmit. Valid information should remain in place." },
    { q: "Are verification documents public?", a: "No. Identity, driver and company verification documents are private." },
  ]},
  { id: "marketplace", label: "Jobs, contracts & vehicles", description: "Posting, searching and opening the correct marketplace item.", articles: [
    { q: "How are Contracts different from Jobs?", a: "Jobs are individual logistics opportunities. Contracts are recurring, project or longer-term opportunities and stay in their own marketplace." },
    { q: "How do I list a vehicle or mobile unit?", a: "Open Vehicles & Units, choose the correct listing route, complete the step-by-step form and submit it for review." },
    { q: "Why did full details open the wrong page?", a: "It should not. Full details must open the exact job, contract or vehicle. Use Talk to an Agent if a specific listing routes incorrectly." },
  ]},
  { id: "dealers", label: "Dealerships", description: "Showrooms, following, updates and Dealer tools.", articles: [
    { q: "What happens when I follow a dealership?", a: "The follow is saved to your account. Active updates can appear in the dealership status rail and relevant dealership conversations." },
    { q: "What does the status ring mean?", a: "A highlighted ring means the dealership has an active update. Seen updates use a quieter treatment and a dealer without an active update should not get a status ring." },
    { q: "Where is my dealership centre?", a: "Dealer-plan accounts can open the dealership centre for stock, leads, showroom, analytics, team and business actions." },
  ]},
  { id: "messages", label: "Messages & calls", description: "Private conversations, call history and connection help.", articles: [
    { q: "How do I message a poster?", a: "Open the listing and choose Message. LoadLink should open the conversation with that exact poster." },
    { q: "Why did a call not connect?", a: "Check microphone permission and network access, then retry from the same conversation. A failed call should end cleanly and appear in the chat history instead of covering messages." },
    { q: "Can I archive a conversation?", a: "Yes. Archived conversations remain available in Archived and can be restored where supported." },
  ]},
  { id: "payments", label: "Packages & payments", description: "Manual credits, Pro, Dealer, payment verification and refunds.", articles: [
    { q: "What is Manual listing access?", a: "One Manual listing credit costs R15 and gives one approved Manual listing a 10-day live period. Bulk purchases create separate credits." },
    { q: "I was charged but my plan or credits are not active.", a: "Do not pay again immediately. Keep the LoadLink payment reference and use Talk to an Agent so the server-side Paystack verification can be checked." },
    { q: "A payment failed or was cancelled.", a: "A failed or cancelled payment must not activate a plan or listing credit. You can start a new payment when ready." },
  ]},
  { id: "safety", label: "Safety & troubleshooting", description: "Reports, suspicious activity, broken controls and technical recovery.", articles: [
    { q: "How do I report suspicious activity?", a: "Use the LoadLink report sheet or Talk to an Agent. Never send OTPs, passwords, banking PINs or identity documents to another user." },
    { q: "A button or page is not working.", a: "Retry once. If it still fails, tell support the exact page, action and device so the specific flow can be investigated." },
    { q: "My form reset on mobile.", a: "Do not repeatedly rebuild it. Report the affected form and device so draft recovery can be checked." },
  ]},
];

export default function HelpPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("marketplace");
  const q = query.trim().toLowerCase();
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const glass = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/72";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  const results = useMemo(() => {
    if (!q) return categories.find((item) => item.id === selected)?.articles || [];
    return categories.flatMap((category) => category.articles.map((article) => ({ ...article, category: category.label }))).filter((article) => `${article.q} ${article.a} ${article.category}`.toLowerCase().includes(q));
  }, [q, selected]);

  function talkToSupport() { window.dispatchEvent(new Event("loadlink:open-agent-support")); }

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-help-centre="major-20260823">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 md:pt-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-black tracking-[-.055em] md:text-6xl">How can we help?</h1>
          <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Search the problem or choose one area. LoadLink keeps the answer focused instead of showing the whole help library at once.</p>
        </div>

        <div className={`mt-6 rounded-[22px] border p-2.5 backdrop-blur-xl ${glass}`}>
          <div className="flex h-12 items-center gap-3 rounded-[15px] border border-current/10 px-3">
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none" placeholder="Search payments, listings, calls, verification…" />
            {query ? <button type="button" onClick={() => setQuery("")} className="text-[10px] font-black opacity-50">Clear</button> : null}
          </div>
        </div>

        {!q ? (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Help categories">
            {categories.map((category) => (
              <button key={category.id} type="button" onClick={() => setSelected(category.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-bold transition ${selected === category.id ? "border-[#f6b800]/55 bg-[#f6b800]/10" : darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-white/60"}`}>{category.label}</button>
            ))}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className={`overflow-hidden rounded-[24px] border backdrop-blur-xl ${glass}`}>
            <div className="border-b border-current/10 px-5 py-4">
              <h2 className="text-lg font-black">{q ? `Search results${results.length ? ` · ${results.length}` : ""}` : categories.find((item) => item.id === selected)?.label}</h2>
              {!q ? <p className={`mt-1 text-[11px] font-semibold ${muted}`}>{categories.find((item) => item.id === selected)?.description}</p> : null}
            </div>
            {results.length ? results.map((article) => (
              <details key={article.q} className="group border-b border-current/10 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-black"><span>{article.q}</span><span className="text-lg opacity-35 transition group-open:rotate-45">+</span></summary>
                <p className={`px-5 pb-5 text-sm font-semibold leading-6 ${muted}`}>{article.a}</p>
              </details>
            )) : <div className="p-6"><p className="text-lg font-black">No exact answer found</p><p className={`mt-2 text-sm font-semibold ${muted}`}>Try fewer words or ask LinkBot. You can hand the issue to a LoadLink agent at any time.</p></div>}
          </section>

          <aside className={`rounded-[24px] border p-4 backdrop-blur-xl ${glass}`}>
            <h2 className="text-base font-black">Need a direct answer?</h2>
            <p className={`mt-1 text-[11px] font-semibold leading-5 ${muted}`}>LinkBot uses the page you are on and LoadLink product rules to guide you. It will not invent your account or payment status.</p>
            <div className="mt-4"><LinkBot /></div>
            <button id="contact-support" type="button" onClick={talkToSupport} className="mt-3 min-h-11 w-full rounded-full bg-[#f6b800] px-4 text-xs font-black text-black">Talk to an Agent</button>
          </aside>
        </div>

        <div className="mt-6 flex flex-wrap gap-2"><Link href="/my-posts" className="rounded-full border border-current/10 px-4 py-2.5 text-xs font-black">My posts</Link><Link href="/packages" className="rounded-full border border-current/10 px-4 py-2.5 text-xs font-black">Packages</Link><Link href="/" className="rounded-full border border-current/10 px-4 py-2.5 text-xs font-black">Home</Link></div>
      </section>
    </main>
  );
}

function SearchIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="1.8"/><path d="m15 15 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
