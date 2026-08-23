"use client";

import Link from "next/link";
import RequireAuthLink from "@/components/RequireAuthLink";

const socialLinks = [
  { label: "TikTok", href: process.env.NEXT_PUBLIC_LOADLINK_TIKTOK_URL || "", icon: "tiktok" },
  { label: "Instagram", href: process.env.NEXT_PUBLIC_LOADLINK_INSTAGRAM_URL || "", icon: "instagram" },
  { label: "LinkedIn", href: process.env.NEXT_PUBLIC_LOADLINK_LINKEDIN_URL || "", icon: "linkedin" },
] as const;

const PLAY_BADGE = "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";

export default function LoadLinkSiteFooter20260822({ darkMode }: { darkMode: boolean }) {
  const border = darkMode ? "border-white/10" : "border-black/10";
  const playUrl = process.env.NEXT_PUBLIC_LOADLINK_PLAY_STORE_URL || "";

  function openCookiePreferences() {
    window.dispatchEvent(new Event("loadlink:open-cookie-preferences"));
  }

  return (
    <footer className={`px-5 py-10 transition-colors duration-300 md:px-12 md:py-14 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`} data-loadlink-footer="compact-20260823">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="LoadLink home" className="block max-w-full outline-none">
            <img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-auto w-[min(68vw,320px)] object-contain" />
          </Link>
        </div>

        <div className={`divide-y border-y ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>
          <FooterDetails title="Company" darkMode={darkMode}>
            <Link href="/about">About LoadLink</Link>
            <a href="mailto:loadlinksouthafrica@gmail.com">Contact support</a>
            <Link href="/help">Help & FAQ</Link>
            <Link href="/#industry-insights">Industry insights</Link>
          </FooterDetails>

          <FooterDetails title="Logistics" darkMode={darkMode}>
            <Link href="/jobs?portal=job">Find jobs</Link>
            <Link href="/contracts">Find contracts</Link>
            <RequireAuthLink href="/list-your-vehicle">List your vehicle</RequireAuthLink>
            <Link href="/list-your-vehicle?view=marketplace#vehicle-marketplace">Vehicles & units</Link>
            <Link href="/drivers">Drivers</Link>
          </FooterDetails>

          <FooterDetails title="Services" darkMode={darkMode}>
            <Link href="/packages">Packages & plans</Link>
            <Link href="/dealer">Dealership tools</Link>
            <Link href="/help#contact-support">Business support</Link>
          </FooterDetails>

          <FooterDetails title="Customers" darkMode={darkMode}>
            <Link href="/legal#marketplace-safety-policy">Safety centre</Link>
            <Link href="/help?topic=troubleshooting">Report a problem</Link>
            <Link href="/help">Help centre</Link>
            <Link href="/legal#privacy-policy">Privacy & account safety</Link>
          </FooterDetails>

          <FooterDetails title="Legal" darkMode={darkMode}>
            <Link href="/legal#terms-of-use">Terms of Use</Link>
            <Link href="/legal#privacy-policy">Privacy Policy</Link>
            <Link href="/legal#marketplace-safety-policy">Marketplace & Safety Policy</Link>
            <Link href="/legal#refund-cancellation-policy">Refund & Cancellation Policy</Link>
            <Link href="/legal#cookie-policy">Cookie Policy</Link>
            <button type="button" onClick={openCookiePreferences} className="w-fit text-left">Cookie Preferences</button>
          </FooterDetails>
        </div>

        <section className={`mt-7 grid gap-6 border-b pb-7 ${border} md:grid-cols-[minmax(0,1fr)_auto] md:items-end`}>
          <div className="max-w-3xl">
            <p className="text-xl font-black tracking-[-.03em]">Trade with confidence.</p>
            <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${darkMode ? "text-white/58" : "text-black/58"}`}>
              Verify people, businesses, vehicles and documents before completing a transaction. LoadLink provides marketplace and safety tools; transactions remain between users unless stated otherwise.
            </p>
            <Link href="/help" className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-xs font-black ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>Report suspicious activity</Link>
          </div>

          <div className="md:text-right">
            <p className="text-sm font-black">Get LoadLink</p>
            {playUrl ? (
              <a href={playUrl} target="_blank" rel="noreferrer" aria-label="Get LoadLink on Google Play" className="mt-2 inline-block">
                <img src={PLAY_BADGE} alt="Get it on Google Play" className="h-[50px] w-auto object-contain" />
              </a>
            ) : (
              <div className="mt-2 inline-flex flex-col items-start md:items-end">
                <img src={PLAY_BADGE} alt="Google Play" className="h-[50px] w-auto object-contain opacity-70 grayscale-[.15]" />
                <span className={`mt-1 text-[10px] font-bold ${darkMode ? "text-white/42" : "text-black/45"}`}>Android release coming soon</span>
              </div>
            )}
          </div>
        </section>

        <section className={`mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-center`}>
          <div>
            <p className="text-sm font-black">Follow LoadLink</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {socialLinks.map((item) => item.href ? (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={`LoadLink on ${item.label}`} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black ${border}`}>
                  <SocialIcon name={item.icon} /> {item.label}
                </a>
              ) : null)}
            </div>
          </div>
          <div className={`flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold ${darkMode ? "text-white/55" : "text-black/55"}`}>
            <Link href="/legal#terms-of-use">Terms</Link>
            <Link href="/legal#privacy-policy">Privacy</Link>
            <Link href="/legal#marketplace-safety-policy">Safety</Link>
            <Link href="/legal#refund-cancellation-policy">Refunds</Link>
            <button type="button" onClick={openCookiePreferences}>Cookies</button>
          </div>
        </section>

        <p className={`mt-6 border-t pt-5 text-xs font-semibold ${border} ${darkMode ? "text-white/45" : "text-black/50"}`}>© 2026 LoadLink. All rights reserved. · South Africa</p>
      </div>
    </footer>
  );
}

function FooterDetails({ title, darkMode, children }: { title: string; darkMode: boolean; children: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-black">
        {title}
        <span aria-hidden="true" className={`text-sm opacity-35 transition group-open:rotate-180 ${darkMode ? "text-white" : "text-black"}`}>⌄</span>
      </summary>
      <div className={`mt-4 grid gap-3 text-sm font-semibold ${darkMode ? "text-white/70" : "text-black/70"}`}>{children}</div>
    </details>
  );
}

function SocialIcon({ name }: { name: "tiktok" | "instagram" | "linkedin" }) {
  if (name === "instagram") return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor"/></svg>;
  if (name === "linkedin") return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 3.8A2.2 2.2 0 1 0 5.2 8.2 2.2 2.2 0 0 0 5.2 3.8ZM3.3 9.5h3.8V21H3.3V9.5Zm6.1 0H13v1.6h.1c.5-.9 1.7-2 3.6-2 3.9 0 4.6 2.5 4.6 5.8V21h-3.8v-5.4c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9.4V9.5Z"/></svg>;
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14.7 3c.4 2.7 2 4.4 4.8 4.6v3.2a8.7 8.7 0 0 1-4.7-1.4v5.9a6.3 6.3 0 1 1-5.5-6.2v3.3a3.1 3.1 0 1 0 2.2 3V3h3.2Z" fill="currentColor"/></svg>;
}
