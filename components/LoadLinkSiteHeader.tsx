"use client";

// LoadLink V2.7.6: this is the locked customer-facing header used across the site.
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
      data-loadlink-site-header="locked-v276"
      className={`${sticky ? "sticky top-0" : "relative"} z-[80] h-20 shrink-0 border-b transition-colors duration-300 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"} ${className}`}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[1500px] items-center px-5 sm:px-6">
        <div className="relative z-20 flex items-center gap-3">
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
          </Suspense>
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <AuthStatusButton darkMode={darkMode} />
          </Suspense>
        </div>

        <div className="loadlink-header-logo pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto">
            <HomeLogoLink
              theme={darkMode ? "dark" : "light"}
              showGlow={false}
              className="flex items-center justify-center"
              logoClassName="loadlink-logo-dark-fix"
            />
          </div>
        </div>

        <LoadLinkThemeToggle darkMode={darkMode} onToggle={onToggleTheme} className="relative z-20 ml-auto" />
      </div>
    </header>
  );
}
