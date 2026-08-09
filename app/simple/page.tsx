"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { setLoadLinkSimpleMode } from "@/components/SimpleModeCoordinator";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const ACTIONS = [
  { href: "/jobs", title: "Find work", copy: "Browse available jobs and logistics opportunities.", icon: "work" },
  { href: "/jobs/list", title: "Post a job", copy: "Create a new opportunity with a simpler posting path.", icon: "post" },
  { href: "/messages", title: "Messages", copy: "Open your LoadLink conversations.", icon: "message" },
  { href: "/my-posts", title: "My posts", copy: "See live, review and completed posts.", icon: "posts" },
  { href: "/tools", title: "Tools", copy: "Quotes, trip briefs, POD and logistics helpers.", icon: "tools" },
  { href: "/help", title: "Help", copy: "Get support and simple guidance.", icon: "help" },
] as const;

export default function SimpleModePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => { setLoadLinkSimpleMode(true); setReady(true); }, []);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-40 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 pb-16 pt-8 md:px-7 md:pt-12">
        <div className="flex flex-col gap-5 rounded-[28px] bg-black px-6 py-7 text-white md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <span className="inline-flex rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase tracking-[.13em] text-black">Simple mode</span>
            <h1 className="mt-4 text-4xl font-black tracking-[-.05em] md:text-5xl">The essentials, made clearer.</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-white/65">Larger actions, fewer choices and the same LoadLink marketplace underneath.</p>
          </div>
          <button type="button" onClick={() => { setLoadLinkSimpleMode(false); window.location.href = "/"; }} className="h-12 shrink-0 rounded-2xl border border-white/20 px-5 text-xs font-black">Return to full mode</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className={`group flex min-h-[150px] items-center gap-5 rounded-[26px] border p-5 transition hover:border-[#f6b800] ${card}`}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-black text-[#f6b800] ring-1 ring-[#f6b800]/35"><SimpleIcon name={action.icon} /></span>
              <span className="min-w-0"><strong className="block text-2xl font-black tracking-[-.035em]">{action.title}</strong><span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>{action.copy}</span></span>
            </Link>
          ))}
        </div>
        {ready ? <p className={`mt-7 text-center text-xs font-semibold ${muted}`}>Simple mode stays on this device until you turn it off.</p> : null}
      </section>
    </main>
  );
}

function SimpleIcon({ name }: { name: string }) {
  const common = { width: 29, height: 29, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (name === "message") return <svg {...common}><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "post") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "posts") return <svg {...common}><path d="M5 4h14v16H5V4Zm4 5h6M9 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "tools") return <svg {...common}><path d="m14 6 4-4 4 4-4 4m-6 1-8 8m3-11 9 9M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "help") return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9a2.6 2.6 0 1 1 4.2 2c-1 .7-1.7 1.2-1.7 2.4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M4 7h16v12H4V7Zm4 0V4h8v3M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}
