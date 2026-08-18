"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export default function LegalPage({
  eyebrow = "LoadLink legal",
  title,
  summary,
  updated = "18 August 2026",
  sections,
  notice,
}: {
  eyebrow?: string;
  title: string;
  summary: string;
  updated?: string;
  sections: LegalSection[];
  notice?: ReactNode;
}) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-legal-page>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className={`border-b ${darkMode ? "border-white/10" : "border-black/10"}`}>
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-4xl">
            <p className={`text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>{eyebrow}</p>
            <h1 className="mt-3 text-[42px] font-black leading-[.96] tracking-[-.06em] sm:text-[62px]">{title}</h1>
            <p className={`mt-5 max-w-3xl text-sm font-semibold leading-7 sm:text-base ${muted}`}>{summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-black">
              <span className={`rounded-full border px-3 py-2 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>Effective: {updated}</span>
              <Link href="/contact" className="rounded-full border border-current/15 px-3 py-2">Contact LoadLink</Link>
              <Link href="/safety" className="rounded-full border border-current/15 px-3 py-2">Safety Centre</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1180px] gap-5 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className={`rounded-[24px] border p-3 ${surface}`} aria-label={`${title} sections`}>
            <p className={`px-2 pb-2 text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>On this page</p>
            <div className="grid gap-1">
              {sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`} className="rounded-xl px-3 py-2.5 text-[10px] font-black hover:bg-current/[.04]">
                  {index + 1}. {section.title}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <article className="min-w-0">
          {notice ? <div className={`mb-4 rounded-[22px] border p-4 text-[11px] font-semibold leading-6 ${darkMode ? "border-[#f6b800]/25 bg-[#f6b800]/[.06] text-white/70" : "border-[#b88600]/20 bg-[#f6b800]/10 text-black/70"}`}>{notice}</div> : null}
          <div className={`overflow-hidden rounded-[28px] border ${surface}`}>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className={`scroll-mt-24 p-5 sm:p-7 ${index ? "border-t border-current/10" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-[10px] font-black text-black">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black tracking-[-.035em] sm:text-2xl">{section.title}</h2>
                    <div className={`legal-copy mt-4 space-y-3 text-[12px] font-semibold leading-6 sm:text-[13px] sm:leading-7 ${muted}`}>{section.content}</div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className={`mt-5 rounded-[24px] border p-5 ${surface}`}>
            <p className="text-[11px] font-black">Related LoadLink policies</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PolicyLink href="/terms">Terms</PolicyLink>
              <PolicyLink href="/privacy">Privacy</PolicyLink>
              <PolicyLink href="/cookies">Cookies</PolicyLink>
              <PolicyLink href="/marketplace-rules">Marketplace Rules</PolicyLink>
              <PolicyLink href="/safety">Safety Centre</PolicyLink>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function LegalNote({ children }: { children: ReactNode }) {
  return <div className="rounded-[16px] border border-current/10 bg-current/[.025] p-4">{children}</div>;
}

function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black">{children}</Link>;
}
