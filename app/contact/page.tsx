"use client";

import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const contactEmail = "loadlinksouthafrica@gmail.com";

export default function ContactPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 sm:py-14">
        <p className={`text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>LoadLink support</p>
        <h1 className="mt-3 max-w-3xl text-[42px] font-black leading-[.96] tracking-[-.06em] sm:text-[62px]">Contact LoadLink</h1>
        <p className={`mt-5 max-w-2xl text-sm font-semibold leading-7 sm:text-base ${muted}`}>Choose the route that best matches what you need. Marketplace safety, account and privacy requests should include enough detail for LoadLink to identify the relevant account, listing or report without sending unnecessary sensitive information.</p>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <ContactCard
            darkMode={darkMode}
            title="Help Centre"
            detail="Account, posting, packages, dealership tools, messages and general product support."
            href="/help"
            action="Open Help Centre"
          />
          <ContactCard
            darkMode={darkMode}
            title="Safety concern"
            detail="For suspicious listings, use the Report listing action first so LoadLink receives the listing reference and structured reason."
            href="/safety"
            action="Open Safety Centre"
          />
          <ContactCard
            darkMode={darkMode}
            title="Privacy request"
            detail="Request access, correction, deletion, objection or other POPIA-related assistance. We may verify identity before completing a request."
            href={`mailto:${contactEmail}?subject=${encodeURIComponent("LoadLink privacy request")}`}
            action="Email privacy request"
            external
          />
          <ContactCard
            darkMode={darkMode}
            title="Business contact"
            detail="For dealership, commercial, partnership or formal business correspondence that does not belong in a marketplace conversation."
            href={`mailto:${contactEmail}?subject=${encodeURIComponent("LoadLink business enquiry")}`}
            action={contactEmail}
            external
          />
        </div>

        <section className={`mt-5 rounded-[28px] border p-5 sm:p-7 ${surface}`}>
          <h2 className="text-xl font-black tracking-[-.035em]">When you contact us</h2>
          <div className={`mt-4 grid gap-3 text-[12px] font-semibold leading-6 sm:grid-cols-2 ${muted}`}>
            <div className="rounded-[18px] border border-current/10 p-4"><strong className="block text-current">Include useful references</strong><span className="mt-1 block">Listing ID, report reference, dealership name or account email can help us find the correct case.</span></div>
            <div className="rounded-[18px] border border-current/10 p-4"><strong className="block text-current">Do not send secrets</strong><span className="mt-1 block">Never send passwords, one-time passwords, banking PINs or full card details to LoadLink support.</span></div>
            <div className="rounded-[18px] border border-current/10 p-4"><strong className="block text-current">Privacy verification</strong><span className="mt-1 block">For privacy or account-control requests, we may ask for reasonable information to confirm that the requester is authorised.</span></div>
            <div className="rounded-[18px] border border-current/10 p-4"><strong className="block text-current">Emergencies</strong><span className="mt-1 block">LoadLink is not an emergency service. Immediate threats should be reported to the appropriate emergency or law-enforcement authority.</span></div>
          </div>
        </section>

        <section className={`mt-5 rounded-[28px] border p-5 sm:p-7 ${surface}`}>
          <p className={`text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>Legal and privacy</p>
          <h2 className="mt-2 text-xl font-black">Public policy documents</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <PolicyLink href="/terms">Terms of Use</PolicyLink>
            <PolicyLink href="/privacy">Privacy Policy</PolicyLink>
            <PolicyLink href="/cookies">Cookie Policy</PolicyLink>
            <PolicyLink href="/marketplace-rules">Marketplace Rules</PolicyLink>
            <PolicyLink href="/safety">Safety Centre</PolicyLink>
          </div>
          <p className={`mt-5 text-[11px] font-semibold leading-5 ${muted}`}>LoadLink's final registered-business, physical-address and Information Officer particulars will be added to the legal record before public release once the operating entity particulars are finalised.</p>
        </section>
      </section>
    </main>
  );
}

function ContactCard({ darkMode, title, detail, href, action, external = false }: { darkMode: boolean; title: string; detail: string; href: string; action: string; external?: boolean }) {
  const card = `rounded-[26px] border p-5 sm:p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const body = <><h2 className="text-xl font-black tracking-[-.035em]">{title}</h2><p className={`mt-3 min-h-16 text-[12px] font-semibold leading-6 ${muted}`}>{detail}</p><span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#f6b800] px-4 text-[10px] font-black text-black">{action}</span></>;
  return external ? <a href={href} className={card}>{body}</a> : <Link href={href} className={card}>{body}</Link>;
}

function PolicyLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black">{children}</Link>;
}
