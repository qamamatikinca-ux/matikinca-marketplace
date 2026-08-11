"use client";

import { Suspense } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";

export default function LoadLinkSiteHeader({
  darkMode,
  onToggleTheme,
  sticky = true,
  className = "",
}: {
  darkMode: boolean;
  onToggleTheme: () => void;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <header
      data-loadlink-site-header="locked-v277"
      className={`${sticky ? "sticky top-0" : "relative"} z-[80] shrink-0 border-b transition-colors duration-300 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"} ${className}`}
    >
      <div className="grid h-20 w-full grid-cols-[92px_minmax(0,1fr)_60px] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
          </Suspense>
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <AuthStatusButton darkMode={darkMode} />
          </Suspense>
        </div>

        <HomeLogoLink
          theme={darkMode ? "dark" : "light"}
          showGlow={false}
          className="loadlink-header-logo flex min-w-0 items-center justify-center overflow-visible"
          logoClassName="loadlink-logo-dark-fix"
        />

        <LoadLinkThemeToggle darkMode={darkMode} onToggle={onToggleTheme} className="ml-auto" />
      </div>
    </header>
  );
}
