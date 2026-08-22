"use client";

import Link from "next/link";

const socialLinks = [
  { label: "TikTok", href: process.env.NEXT_PUBLIC_LOADLINK_TIKTOK_URL || "", icon: "tiktok" },
  { label: "Instagram", href: process.env.NEXT_PUBLIC_LOADLINK_INSTAGRAM_URL || "", icon: "instagram" },
  { label: "LinkedIn", href: process.env.NEXT_PUBLIC_LOADLINK_LINKEDIN_URL || "", icon: "linkedin" },
] as const;

export default function LoadLinkSiteFooter20260822({ darkMode }: { darkMode: boolean }) {
  const text = darkMode ? "text-white" : "text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const playUrl = process.env.NEXT_PUBLIC_LOADLINK_PLAY_STORE_URL || "";

  function openCookiePreferences() {
    window.dispatchEvent(new Event("loadlink:open-cookie-preferences"));
  }

  return (
    <footer className={`${darkMode ? "bg-black" : "bg-white"} ${text} border-t ${border} px-5 py-12 md:px-10`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <div>
            <Link href="/" aria-label="LoadLink home" className="inline-block">
              <img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-auto w-[190px] max-w-full object-contain" />
            </Link>
            <p className={`mt-4 max-w-sm text-sm font-semibold leading-6 ${muted}`}>South Africa's logistics marketplace for work, vehicles, drivers, dealerships and direct business communication.</p>
          </div>

          <FooterGroup title="Marketplace" links={[
            ["Jobs", "/jobs?portal=job"],
            ["Drivers", "/driver-portal"],
            ["Contracts", "/contracts"],
            ["Vehicles & Units", "/list-your-vehicle?view=marketplace#vehicle-marketplace"],
            ["Dealerships", "/search?scope=dealer"],
          ]} muted={muted} />

          <FooterGroup title="Support" links={[
            ["Help Centre", "/help"],
            ["Contact Support", "/help#contact-support"],
            ["Safety", "/legal#marketplace-safety-policy"],
            ["Report a problem", "/help?topic=troubleshooting"],
          ]} muted={muted} />

          <FooterGroup title="Company" links={[
            ["About LoadLink", "/about"],
            ["Packages", "/packages"],
          ]} muted={muted} />

          <div>
            <h2 className="text-sm font-black">Legal</h2>
            <div className={`mt-4 grid gap-3 text-sm font-semibold ${muted}`}>
              <Link href="/legal#terms-of-use">Terms</Link>
              <Link href="/legal#privacy-policy">Privacy</Link>
              <Link href="/legal#marketplace-safety-policy">Marketplace Policy</Link>
              <Link href="/legal#refund-cancellation-policy">Refunds</Link>
              <button type="button" onClick={openCookiePreferences} className="w-fit text-left">Cookie Preferences</button>
            </div>
          </div>
        </div>

        <div className={`mt-10 grid gap-7 border-t pt-8 ${border} md:grid-cols-[1fr_auto] md:items-end`}>
          <div>
            <p className="text-sm font-black">Follow LoadLink</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {socialLinks.map((item) => item.href ? (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={`LoadLink on ${item.label}`} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black transition active:scale-[.98] ${border}`}>
                  <SocialIcon name={item.icon} /> {item.label}
                </a>
              ) : (
                <span key={item.label} aria-label={`${item.label} coming soon`} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black opacity-50 ${border}`}>
                  <SocialIcon name={item.icon} /> {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            <p className="text-sm font-black">Get LoadLink</p>
            {playUrl ? (
              <a href={playUrl} target="_blank" rel="noreferrer" aria-label="Get LoadLink on Google Play" className="mt-3 inline-block">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-[54px] w-auto object-contain" />
              </a>
            ) : (
              <div className="mt-3 inline-flex flex-col items-start md:items-end">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Google Play" className="h-[54px] w-auto object-contain opacity-55" />
                <span className={`mt-1 text-[11px] font-bold ${muted}`}>Android app coming soon</span>
              </div>
            )}
          </div>
        </div>

        <div className={`mt-8 flex flex-col gap-2 border-t pt-6 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between ${border} ${muted}`}>
          <p>© 2026 LoadLink. All rights reserved. · South Africa</p>
          <p>Trade with confidence. Verify the person, business, vehicle and documents before completing a transaction.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links, muted }: { title: string; links: readonly (readonly [string, string])[]; muted: string }) {
  return <div><h2 className="text-sm font-black">{title}</h2><div className={`mt-4 grid gap-3 text-sm font-semibold ${muted}`}>{links.map(([label, href]) => <Link key={`${label}-${href}`} href={href}>{label}</Link>)}</div></div>;
}

function SocialIcon({ name }: { name: "tiktok" | "instagram" | "linkedin" }) {
  if (name === "instagram") return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor"/></svg>;
  if (name === "linkedin") return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 3.8A2.2 2.2 0 1 0 5.2 8.2 2.2 2.2 0 0 0 5.2 3.8ZM3.3 9.5h3.8V21H3.3V9.5Zm6.1 0H13v1.6h.1c.5-.9 1.7-2 3.6-2 3.9 0 4.6 2.5 4.6 5.8V21h-3.8v-5.4c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9.4V9.5Z"/></svg>;
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14.7 3c.4 2.7 2 4.4 4.8 4.6v3.2a8.7 8.7 0 0 1-4.7-1.4v5.9a6.3 6.3 0 1 1-5.5-6.2v3.3a3.1 3.1 0 1 0 2.2 3V3h3.2Z" fill="currentColor"/></svg>;
}
