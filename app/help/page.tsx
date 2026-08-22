"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import LinkBot from "@/components/LinkBot";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type HelpItem = readonly [string, string];
type HelpGroup = { name: string; slug: string; items: HelpItem[] };

const groups: HelpGroup[] = [
  { name: "Getting Started", slug: "getting-started", items: [
    ["What is LoadLink?", "LoadLink is a South African logistics marketplace for transport work, contracts, commercial vehicles, mobile units, professional drivers and dealerships."],
    ["How do I create an account?", "Use the account button, choose an available sign-in method and complete the profile and verification steps shown to you."],
    ["How do I find something?", "Use the homepage search or choose Jobs, Drivers, Contracts, Vehicles & Units or Dealerships. Search results open the exact matching resource."],
  ]},
  { name: "Account & Verification", slug: "account-verification", items: [
    ["Why is my account still pending?", "Verification remains pending until the required identity or business information has been reviewed. LoadLink will show the current status on your account."],
    ["My verification was rejected. What now?", "Open the resubmission path, read the rejection reason, correct only what is required and submit again. Valid existing information should remain in place."],
    ["Are my verification documents public?", "No. Identity, driver and company verification documents are private and must not be exposed on public marketplace pages."],
  ]},
  { name: "Posting", slug: "posting", items: [
    ["How do I post?", "Choose the correct posting action, complete the step-by-step form, review the information and submit. A success state should only appear after the record is accepted by LoadLink."],
    ["Why was my post rejected?", "Open My Posts and view the review reason. Correct the affected information and resubmit without rebuilding the entire post."],
    ["Why did an image not upload?", "Retry the image and keep the form open. If the upload repeatedly fails, use Talk to Support and include which posting flow you were using."],
  ]},
  { name: "Jobs", slug: "jobs", items: [
    ["Who are Jobs for?", "Jobs are logistics opportunities for truck owners and mobile-unit owners looking for work."],
    ["What does Needed on mean?", "Needed on is the date the poster needs the work or service. Use the date rather than a separate Flexible, Normal or Urgent selector."],
    ["How do I contact a job poster?", "Open the exact job and use Message or Call. Message should open the conversation with that poster, not an empty inbox."],
  ]},
  { name: "Contracts", slug: "contracts", items: [
    ["How are Contracts different from Jobs?", "Contracts are longer-term, recurring or project logistics opportunities and remain separate from the ordinary Jobs portal."],
    ["How do I open a contract?", "Use View full details from the contract result. LoadLink should open that exact contract."],
  ]},
  { name: "Vehicles & Mobile Units", slug: "vehicles", items: [
    ["How do I list a vehicle?", "Open Vehicles & Units and choose List vehicle. Complete the listing steps, add the permitted images and submit for review."],
    ["How do I list a mobile unit?", "Choose List mobile unit from the Vehicles & Units portal. It should open the correct dedicated flow."],
    ["Why did View full details open the wrong page?", "It should not. Vehicle full details must open the exact vehicle. If it does not, report the listing through Talk to Support."],
  ]},
  { name: "Drivers", slug: "drivers", items: [
    ["How do I create a driver profile?", "Open the Driver portal, choose the profile option and complete the required experience, licence, availability and document steps."],
    ["Why can I not submit my driver documents?", "Confirm the file meets the shown requirements. If a valid document still fails, keep your form data and contact support rather than repeatedly restarting."],
  ]},
  { name: "Dealerships", slug: "dealerships", items: [
    ["What is a showroom?", "A showroom is the dealership's public LoadLink home with its branding, inventory, updates and buyer contact actions."],
    ["What happens when I Follow a dealership?", "The follow relationship is saved to your account. Active updates from followed dealerships can appear on the homepage discovery row."],
    ["What does the gold ring mean?", "A gold ring means that followed dealership has an active relevant update. No active update means no gold status ring."],
  ]},
  { name: "Messages & Calls", slug: "messages-calls", items: [
    ["How do I message a poster?", "Open the listing and choose Message. LoadLink should create or open the conversation with that exact poster."],
    ["What are Potential Deals?", "New listing enquiries can enter Potential Deals so the poster can review the conversation before treating it as an established deal."],
    ["Can I archive a conversation?", "Yes. Archived conversations stay in the Archived section and can be restored where supported."],
    ["Why did a call not connect?", "LoadLink should end failed connection attempts instead of remaining on Connecting forever. You can retry from the same conversation after checking microphone permission and network access."],
  ]},
  { name: "Packages & Payments", slug: "payments", items: [
    ["What is Manual listing access?", "One Manual listing credit costs R15 and provides one approved Manual listing with a 10-day live period. Bulk purchase creates separate credits rather than one longer listing."],
    ["My payment is pending. What should I do?", "Do not pay again immediately. LoadLink verifies Paystack payments server-side and can complete a valid payment even if the return page was interrupted."],
    ["I was charged but my plan or credits are not active.", "Open Payment history first and then use Talk to Support. Provide the LoadLink payment reference, not card or banking credentials."],
    ["A payment failed or was cancelled.", "A failed or cancelled transaction must not activate a plan or listing credit. You can start a new payment attempt when ready."],
    ["Where can I see payments?", "Open your package/access or account activity area to review LoadLink billing records linked to your account."],
    ["How do I request a refund?", "Use Talk to Support or the refund path described in LoadLink's Refund & Cancellation Policy. Eligibility depends on the transaction and policy terms."],
  ]},
  { name: "Safety & Security", slug: "safety", items: [
    ["How do I report suspicious activity?", "Use the report controls or Talk to Support. Never send passwords, OTPs, PINs or banking login details through LoadLink messages."],
    ["Does LoadLink own listed vehicles or equipment?", "No, unless LoadLink explicitly states otherwise. Verify the person, business, asset and documents before completing a transaction."],
  ]},
  { name: "Account Settings", slug: "settings", items: [
    ["Where do I change my profile or password?", "Open Settings for profile, password, security, notification, appearance and account controls."],
    ["How do I change cookie preferences?", "Use Cookie Preferences in the footer. LoadLink should not ask again on every page after you make a choice."],
  ]},
  { name: "Troubleshooting", slug: "troubleshooting", items: [
    ["A button does nothing.", "Refresh once and retry. If the control still does nothing, use Talk to Support and name the page and button. Important LoadLink controls should never silently fail."],
    ["A page keeps loading.", "LoadLink should provide a recoverable error instead of an endless spinner. Check your connection, retry once and contact support if the issue continues."],
    ["My form reset on mobile.", "Do not rebuild it repeatedly. Report the affected form and device so the draft/recovery path can be checked."],
  ]},
];

const QUICK = ["Charged but not active", "Rejected post", "List a vehicle", "Call not connecting", "Verification"];

export default function HelpPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = useMemo(() => groups.map(group => ({
    ...group,
    items: q ? group.items.filter(([question, answer]) => `${group.name} ${question} ${answer}`.toLowerCase().includes(q)) : group.items,
  })).filter(group => group.items.length), [q]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  function talkToSupport() {
    window.dispatchEvent(new Event("loadlink:open-agent-support"));
  }

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-7 md:pt-12">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[.13em] text-[#c89200]">LoadLink Help Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-6xl">How can we help?</h1>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${muted}`}>Search by the problem you are trying to solve. If the answer is not enough, talk directly to LoadLink Support.</p>

            <button id="contact-support" type="button" onClick={talkToSupport} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_10px_26px_rgba(0,0,0,.10)]">Talk to an Agent</button>

            <label className="mt-6 block max-w-3xl">
              <span className="sr-only">Search LoadLink help</span>
              <div className={`flex h-14 items-center gap-3 rounded-2xl border px-4 ${card}`}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <input id="help-search" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="Search payments, listings, calls, verification…" />
                {query ? <button type="button" onClick={() => setQuery("")} className="text-xs font-black">Clear</button> : null}
              </div>
            </label>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK.map(item => <button key={item} type="button" onClick={() => setQuery(item)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>{item}</button>)}
            </div>
          </div>

          <aside className={`rounded-[24px] border p-5 ${card}`}>
            <h2 className="text-lg font-black">Guided help</h2>
            <p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Describe the issue in your own words. LinkBot should help you find the right LoadLink path and hand off to support when needed.</p>
            <div className="mt-4"><LinkBot /></div>
          </aside>
        </div>

        {!q ? (
          <nav aria-label="Help categories" className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-current/10 bg-current/10 sm:grid-cols-3 lg:grid-cols-4">
            {groups.map(group => <a key={group.slug} href={`#${group.slug}`} className={`${darkMode ? "bg-[#0d0d0d]" : "bg-white"} min-h-20 px-4 py-4 text-sm font-black transition hover:bg-[#f6b800] hover:text-black`}>{group.name}</a>)}
          </nav>
        ) : null}

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {results.length ? results.map(group => (
            <section id={group.slug} key={group.slug} className={`scroll-mt-24 overflow-hidden rounded-[24px] border ${card}`}>
              <div className={`border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <h2 className="text-xl font-black tracking-[-.02em]">{group.name}</h2>
                <p className={`mt-1 text-[11px] font-bold ${muted}`}>{group.items.length} {group.items.length === 1 ? "answer" : "answers"}</p>
              </div>
              <div>
                {group.items.map(([question, answer]) => (
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
            <section className={`rounded-[24px] border p-7 md:col-span-2 ${card}`}>
              <h2 className="text-2xl font-black">No exact help article found</h2>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Try a shorter search or talk directly to LoadLink Support.</p>
              <button type="button" onClick={talkToSupport} className="mt-5 rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Talk to an Agent</button>
            </section>
          )}
        </div>

        <div className={`mt-6 flex flex-col gap-3 rounded-[22px] border p-5 sm:flex-row sm:items-center sm:justify-between ${card}`}>
          <div><h2 className="text-lg font-black">Still stuck?</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Support can help with payments, account access, listings, safety reports and technical problems.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={talkToSupport} className="flex h-11 items-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Talk to an Agent</button><Link href="/my-posts" className="flex h-11 items-center rounded-xl border border-current/10 px-4 text-xs font-black">My posts</Link><Link href="/" className="flex h-11 items-center rounded-xl bg-black px-4 text-xs font-black text-white">Go home</Link></div>
        </div>
      </section>
    </main>
  );
}
