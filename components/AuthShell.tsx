"use client";

import type { ReactNode } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
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
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-xl items-center px-4 py-8 sm:px-6 md:py-12">
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
