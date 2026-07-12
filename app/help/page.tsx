"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LinkBot from "@/components/LinkBot";

const groups = [
  {
    name: "Getting started",
    items: [
      ["What is LoadLink?", "LoadLink connects people posting logistics work, contracts, vehicles and useful mobile units with people who can provide them."],
      ["How do I create an account?", "Open Login from the account icon, choose a sign-in method and complete the requested details."],
      ["How do I search?", "Describe what you need using a vehicle, service, location or portal, such as side tipper job in Pretoria."],
      ["Why can’t I find a listing?", "Clear filters, check spelling, try a broader location and confirm that you are in the correct Jobs, Contracts or Vehicles portal."],
    ],
  },
  {
    name: "Posting and managing listings",
    items: [
      ["How do I post a job?", "Use the plus button, choose Post a job, then add the work, location, required vehicle or mobile unit, rate and contact details."],
      ["What can I list?", "You can list trucks, trailers, mobile toilets, mobile fridges, food trucks, mobile kitchens and other relevant mobile units."],
      ["Why should I add a rate?", "A clear rate helps users decide quickly. All listing prices are displayed in South African rand by default."],
      ["How do I edit or delete my post?", "Use the owner controls on the device that created the listing."],
      ["How many photos should I add?", "Use clear, recent photos. Put the strongest and most accurate photo first."],
      ["What makes a good title?", "Use the exact service and location, for example 34-ton side tipper needed in Rustenburg."],
    ],
  },
  {
    name: "Verification and trust",
    items: [
      ["How does verification work?", "Confirm your cellphone number, then upload an ID or passport and a clear selfie."],
      ["How long does verification take?", "It usually takes a few minutes when a reviewer is available."],
      ["What does the gold Verified badge mean?", "It means the user completed LoadLink’s required identity checks and was approved."],
      ["Are my identity documents public?", "No. Verification documents are stored privately and are not shown on listings."],
    ],
  },
  {
    name: "Safety, messaging and reports",
    items: [
      ["How do I message a poster?", "Open a listing and choose Message. LoadLink asks you to sign in first, then opens a private conversation linked to your account."],
      ["Will my messages still be there later?", "Yes. Signed-in conversations are stored in Supabase and connected to your account so you can reopen them later."],
      ["How do I report a suspicious listing?", "Tap Report, explain the issue clearly and avoid sending money or sensitive documents."],
      ["Does LoadLink guarantee a job or payment?", "No. Users must confirm identities, terms, routes and payment arrangements before doing business."],
      ["What should I check before accepting work?", "Confirm the company or person, collection and delivery points, cargo, vehicle requirements, dates, rate and payment terms."],
    ],
  },
  {
    name: "Analytics and visibility",
    items: [
      ["Where can I see listing views?", "Open Analytics from your owner notification or listing controls."],
      ["What do unique viewers mean?", "It estimates how many different devices opened your listing without exposing private personal details."],
      ["How can I improve visibility?", "Use an exact title, correct location, clear rate, strong first photo and complete contact information."],
      ["What is Premium visibility?", "It is an optional placement upgrade that can increase prominence where featured space is available."],
    ],
  },
  {
    name: "Accounts and technical help",
    items: [
      ["I forgot my password. What do I do?", "Open Forgot password from Login and follow the reset email."],
      ["Why is a page not opening?", "Refresh once, check your connection, then return home and reopen the portal."],
      ["Why are my friend’s posts missing?", "Make sure you are on the correct portal and filters are cleared. If posts still do not appear, report the issue with the listing title and poster name."],
      ["Does LoadLink work on Android and computers?", "Yes. The interface is responsive for mobile, tablet and desktop browsers. Keep the browser updated for the best experience."],
    ],
  },
];

export default function Help() {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(([question, answer]) =>
            `${question} ${answer}`.toLowerCase().includes(query.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length),
    [query]
  );

  return (
    <main className="min-h-screen bg-[#fff7df] text-black">
      <header className="sticky top-0 z-40 grid h-20 grid-cols-[70px_1fr_70px] items-center border-b border-black/10 bg-white px-4">
        <Link href="/" className="text-2xl font-black" aria-label="Home">←</Link>
        <HomeLogoLink theme="light" />
        <button onClick={() => document.getElementById("help-search")?.focus()} className="text-sm font-black">Search</button>
      </header>

      <section className="bg-black px-5 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#f6b800]">LoadLink support</p>
          <h1 className="mt-3 text-5xl font-black">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-white/60">Search common questions or ask LinkBot for guided LoadLink help.</p>
          <input
            id="help-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts, listings, messaging, verification or safety"
            className="mt-7 h-14 w-full border border-white/20 bg-white px-5 font-semibold text-black outline-none focus:border-[#f6b800]"
          />
          <div className="mt-4"><LinkBot /></div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-10">
        {results.length ? (
          results.map((group) => (
            <div key={group.name} className="mb-10">
              <h2 className="mb-3 text-2xl font-black">{group.name}</h2>
              <div className="border-t border-black/15">
                {group.items.map(([question, answer]) => (
                  <details key={question} className="border-b border-black/15 bg-white">
                    <summary className="cursor-pointer px-4 py-5 text-lg font-black">{question}</summary>
                    <p className="px-4 pb-5 leading-7 text-black/65">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="border border-black/10 bg-white p-8 text-center">
            <h2 className="text-2xl font-black">No exact answer found</h2>
            <p className="mt-3 text-black/55">Use the visible LinkBot button to describe the problem in your own words.</p>
          </div>
        )}
      </section>
    </main>
  );
}
