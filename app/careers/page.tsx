"use client";

import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const paths = [
  {
    title: "Find work",
    description: "Browse logistics careers from verified companies and speak directly to the person hiring.",
    href: "/careers?view=find",
    label: "Explore opportunities",
  },
  {
    title: "Hire people",
    description: "Create logistics vacancies, manage applicants and keep hiring conversations inside LoadLink.",
    href: "/careers?view=hire",
    label: "Post a vacancy",
  },
  {
    title: "My applications",
    description: "Keep applications, recruiter messages, interview progress and outcomes together.",
    href: "/careers?view=applications",
    label: "View applications",
  },
];

const categories = [
  "Drivers",
  "Fleet management",
  "Dispatch",
  "Operations",
  "Warehousing",
  "Diesel mechanics",
  "Freight forwarding",
  "Supply chain",
  "Sales",
  "Learnerships",
];

export default function CareersPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();

  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[520px] overflow-hidden bg-black sm:min-h-[600px] lg:min-h-[680px]">
        <img
          src="/images/loadlink-careers-hero-hd.webp"
          alt="Professionals reviewing documents together in a modern workplace"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/42 to-black/18" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/12" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-end px-5 pb-12 sm:min-h-[600px] sm:px-6 sm:pb-16 lg:min-h-[680px] lg:px-8 lg:pb-20">
          <div className="max-w-3xl text-white">
            <p className="text-xs font-black uppercase tracking-[.16em] text-white/65">LoadLink Careers</p>
            <h1 className="mt-3 text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-7xl">Careers built around logistics.</h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/78 sm:text-lg">
              Find logistics work, hire people and keep applications and conversations in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/careers?view=find" className="inline-flex min-h-12 items-center justify-center bg-[#f6b800] px-6 text-sm font-black text-black transition active:scale-[.985]">
                Find work
              </Link>
              <Link href="/careers?view=hire" className="inline-flex min-h-12 items-center justify-center border border-white/35 bg-black/28 px-6 text-sm font-black text-white backdrop-blur-md transition active:scale-[.985]">
                Hire people
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid gap-3 md:grid-cols-3">
          {paths.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`group min-h-[220px] border p-6 transition active:scale-[.995] ${
                darkMode ? "border-white/12 bg-white/[.035] hover:bg-white/[.055]" : "border-black/10 bg-white hover:border-black/20"
              }`}
            >
              <div className="flex h-full flex-col">
                <h2 className="text-2xl font-black tracking-[-.035em]">{item.title}</h2>
                <p className={`mt-3 text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{item.description}</p>
                <span className="mt-auto pt-8 text-sm font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <section className={`mt-10 border p-6 sm:p-8 ${darkMode ? "border-white/12 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black tracking-[-.04em]">Logistics careers, not a generic job board.</h2>
            <p className={`mt-3 text-sm font-semibold leading-7 sm:text-base ${darkMode ? "text-white/55" : "text-black/55"}`}>
              Careers is structured around the roles that keep transport, freight, fleets, warehouses and supply chains moving.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className={`rounded-full border px-4 py-2 text-xs font-black ${darkMode ? "border-white/12 bg-white/[.035] text-white/72" : "border-black/10 bg-[#f8f5ed] text-black/70"}`}>
                {category}
              </span>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
