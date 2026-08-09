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
}: {
  title: string;
  description?: string;
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
          <Link
            href="/"
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-black ${darkMode ? "border-white/10 bg-white/[.035] text-white" : "border-black/10 bg-black/[.02] text-black"}`}
            aria-label="Back to LoadLink"
          >
            ←
          </Link>
          <HomeLogoLink
            theme="auto"
            showGlow={false}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            logoClassName="w-[138px] sm:w-[154px]"
          />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-xl items-center px-4 py-8 sm:px-6 md:py-12">
        <div className={`w-full overflow-hidden rounded-[28px] border shadow-[0_18px_55px_rgba(0,0,0,.07)] ${card}`}>
          <div className="p-5 sm:p-7 md:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-black tracking-[-.04em] sm:text-[40px]">{title}</h1>
              {description ? <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{description}</p> : null}
            </div>
            {children}
            {footer ? <div className={`mt-7 border-t pt-5 text-center text-sm ${darkMode ? "border-white/10 text-white/52" : "border-black/10 text-black/52"}`}>{footer}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
