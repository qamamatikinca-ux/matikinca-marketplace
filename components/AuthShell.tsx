"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function AuthShell({
  title,
  description,
  children,
  footer,
  status = "Protected account access",
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  status?: string;
}) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="relative mx-auto flex h-[76px] max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-black ${darkMode ? "border-white/10 bg-white/[.035] text-white" : "border-black/10 bg-black/[.02] text-black"}`} aria-label="Back to LoadLink">←</Link>
          <HomeLogoLink theme="auto" showGlow={false} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[138px] sm:w-[154px]" />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-76px)] max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[.86fr_1.14fr] lg:gap-10 lg:py-12">
        <aside className={`hidden min-h-[560px] overflow-hidden rounded-[30px] border p-8 lg:flex lg:flex-col lg:justify-between ${darkMode ? "border-white/10 bg-[#0a0a0a]" : "border-black/10 bg-[#111] text-white"}`}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-3 py-2 text-xs font-bold text-white/72">
              <ShieldIcon /> {status}
            </div>
            <h2 className="mt-8 max-w-sm text-5xl font-black leading-[.98] tracking-[-.055em]">Access LoadLink without the clutter.</h2>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-white/52">A focused sign-in experience for your posts, messages, tools and logistics activity.</p>
          </div>
          <div className="grid gap-3">
            <TrustRow title="Protected sign-in" copy="Bot protection, rate-limit handling and safer recovery flows." />
            <TrustRow title="Private account activity" copy="Authentication events remain separate from public marketplace information." />
            <TrustRow title="Optional two-step verification" copy="Authenticator-app verification is supported for accounts that enable it." />
          </div>
        </aside>

        <div className={`w-full overflow-hidden rounded-[30px] border shadow-[0_18px_60px_rgba(0,0,0,.08)] ${card}`}>
          <div className="p-5 sm:p-7 md:p-9">
            <div className="mb-7">
              <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold ${darkMode ? "border-white/10 bg-white/[.035] text-white/58" : "border-black/10 bg-black/[.02] text-black/58"}`}>
                <ShieldIcon /> Secure LoadLink access
              </div>
              <h1 className="text-4xl font-black tracking-[-.045em] sm:text-[44px]">{title}</h1>
              <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{description}</p>
            </div>
            {children}
            {footer ? <div className={`mt-7 border-t pt-5 text-center text-sm ${darkMode ? "border-white/10 text-white/52" : "border-black/10 text-black/52"}`}>{footer}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustRow({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-white/45">{copy}</p>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M12 3 5.5 5.6v5.6c0 4.3 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.5 6.5-9.8V5.6L12 3Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="m9.2 12 1.8 1.8 3.9-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
