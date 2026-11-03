"use client";

import LoadLinkImage from "@/components/LoadLinkImage";
import Link from "next/link";
import RequireAuthLink from "@/components/RequireAuthLink";
import { useEffect, useRef } from "react";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/loadlinksouthafrica?xtok=MWlybmUyamttenEzbg==", logo: "/brands/instagram.svg" },
  { label: "TikTok", href: "https://www.tiktok.com/@loadlinksouthafrica?_r=1&_t=ZS-9B5rC2okOaD", logo: "/brands/tiktok.svg" },
  { label: "Facebook", href: "https://www.facebook.com/share/1FyBiNb57K/", logo: "/brands/facebook.svg" },
  { label: "Email", href: "mailto:loadlinkmarketing@gmail.com", logo: "/brands/gmail.svg" },
] as const;

const PLAY_BADGE = "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";
const APP_BADGE = "https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg";

export default function LoadLinkSiteFooter20260822({ darkMode }: { darkMode: boolean }) {
  const subtle = darkMode ? "text-white/57" : "text-[#575d64]";
  const line = darkMode ? "border-white/12" : "border-[#e6e8ea]";
  const playUrl = process.env.NEXT_PUBLIC_LOADLINK_PLAY_STORE_URL || "";
  const appleUrl = process.env.NEXT_PUBLIC_LOADLINK_APP_STORE_URL || "";
  const footerRef = useRef<HTMLElement>(null);

  // On iOS Safari, the browser bar can show the page's cream theme colour
  // below a white footer. Switch that chrome colour only while the footer
  // is in the viewport; preserve the actual yellow marketplace backgrounds.
  useEffect(() => {
    const footer = footerRef.current;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!footer || !meta || typeof IntersectionObserver === "undefined") return;
    const pageColor = darkMode ? "#050505" : "#f4efe3";
    const footerColor = darkMode ? "#080909" : "#ffffff";
    const observer = new IntersectionObserver(([entry]) => {
      meta.setAttribute("content", entry.isIntersecting ? footerColor : pageColor);
    }, { threshold: 0 });
    observer.observe(footer);
    return () => { observer.disconnect(); meta.setAttribute("content", pageColor); };
  }, [darkMode]);


  function openCookiePreferences() {
    window.dispatchEvent(new Event("loadlink:open-cookie-preferences"));
  }

  return (
    <footer ref={footerRef} data-loadlink-footer="clean-20261103" className={`relative z-10 w-full px-5 pb-[max(36px,env(safe-area-inset-bottom))] pt-11 md:px-12 md:py-14 ${darkMode ? "bg-[#080909] text-white" : "bg-white text-[#151922]"}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label="LoadLink home" className="inline-flex max-w-full justify-center">
            <LoadLinkImage src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-auto w-[min(75vw,250px)] object-contain" />
          </Link>
          <p className={`text-sm font-medium ${subtle}`}>Logistics Made Easier.</p>
        </div>

        <div className={`border-t ${line}`}>
          <FooterDetails title="Company">
            <Link href="/about">About LoadLink</Link>
            <Link href="/help">Help centre</Link>
            <Link href="/#industry-insights">Logistics news</Link>
            <a href="mailto:loadlinkmarketing@gmail.com">Marketing enquiries</a>
          </FooterDetails>
          <FooterDetails title="Marketplace">
            <Link href="/jobs?portal=job">Find jobs</Link>
            <Link href="/contracts">Contracts</Link>
            <Link href="/list-your-vehicle?view=marketplace#vehicle-marketplace">Vehicles & mobile units</Link>
            <Link href="/drivers">Drivers</Link>
            <RequireAuthLink href="/list-your-vehicle">List a vehicle</RequireAuthLink>
          </FooterDetails>
          <FooterDetails title="Services">
            <Link href="/packages">Packages & billing</Link>
            <Link href="/dealer">Dealer centre</Link>
            <Link href="/tools">Logistics tools</Link>
          </FooterDetails>
          <FooterDetails title="Safety & support">
            <Link href="/report-suspicious-activity">Report suspicious activity</Link>
            <Link href="/help#contact-support">Contact support</Link>
            <Link href="/legal#marketplace-safety-policy">Marketplace safety</Link>
          </FooterDetails>
          <FooterDetails title="Legal">
            <Link href="/legal#terms-of-use">Terms</Link>
            <Link href="/legal#privacy-policy">Privacy</Link>
            <Link href="/legal#refund-cancellation-policy">Refunds</Link>
            <button type="button" onClick={openCookiePreferences} className="w-fit text-left">Cookie preferences</button>
          </FooterDetails>
        </div>

        {(playUrl || appleUrl) ? (
          <section className="mt-8" aria-label="Download LoadLink">
            <h2 className="text-base font-semibold">Download the app</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {appleUrl ? <a href={appleUrl} rel="noopener noreferrer" target="_blank" aria-label="Download LoadLink on the App Store"><img src={APP_BADGE} alt="Download on the App Store" width={140} height={42} className="h-[42px] w-auto" /></a> : null}
              {playUrl ? <a href={playUrl} rel="noopener noreferrer" target="_blank" aria-label="Get LoadLink on Google Play"><img src={PLAY_BADGE} alt="Get it on Google Play" width={147} height={42} className="h-[42px] w-auto" /></a> : null}
            </div>
          </section>
        ) : null}

        <section className="mt-9" aria-labelledby="loadlink-social-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="loadlink-social-heading" className="text-base font-semibold">Connect with LoadLink</h2>
              <p className={`mt-1 text-xs ${subtle}`}>Social updates, news and enquiries.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            {socialLinks.map(({ label, href, logo }) => (
              <a key={label} href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" title={label} aria-label={`LoadLink on ${label}`}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#f6b800] ${darkMode ? "border-[#414744] bg-[#171a18]" : "border-[#e7e7e7] bg-white"}`}>
                <img src={logo} width={label === "TikTok" ? 30 : 26} height={label === "TikTok" ? 30 : 26} alt="" className={label === "TikTok" ? "h-[30px] w-[30px] rounded-[8px] bg-black p-[3px] object-contain" : "h-[26px] w-[26px] object-contain"} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </section>
        <div className={`mt-9 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-xs ${line} ${subtle}`}>
          <span>© 2026 LoadLink. All rights reserved.</span>
          <span>South Africa</span>
        </div>
      </div>
    </footer>
  );
}

function FooterDetails({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-current/20 py-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[19px] font-semibold tracking-[-.025em] marker:hidden">
        {title}
        <svg className="h-4 w-4 shrink-0 opacity-55 transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="grid gap-3 pb-3 pt-2 text-sm font-medium text-inherit opacity-75 [&_a:hover]:underline [&_a:focus-visible]:underline">{children}</div>
    </details>
  );
}
