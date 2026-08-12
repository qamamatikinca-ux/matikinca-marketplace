"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLandingShell({
  darkMode,
  children,
  footer,
  title = "Welcome to LoadLink",
  subtitle = "Logistics made easier",
}: {
  darkMode: boolean;
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const panel = darkMode
    ? "border-white/10 bg-[#080808] text-white"
    : "border-black/10 bg-white text-black";

  return (
    <main
      data-loadlink-auth-landing="v281"
      className={`relative min-h-[100svh] ${darkMode ? "bg-black text-white" : "bg-[#f7f5ef] text-black"}`}
    >
      <div className="mx-auto min-h-[100svh] w-full max-w-[760px] lg:flex lg:max-w-none">
        <section className="relative h-[38svh] min-h-[280px] overflow-hidden sm:h-[44svh] lg:h-screen lg:min-h-screen lg:flex-1">
          <div
            className="absolute inset-0 scale-[1.01] bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.24)),url('/images/loadlink-auth-hero.svg')`,
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(246,184,0,.22),transparent_26%),radial-gradient(circle_at_14%_70%,rgba(246,184,0,.14),transparent_28%)]" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-7 lg:p-9">
            <Link href="/" aria-label="LoadLink home" className="inline-flex h-10 items-center rounded-full border border-white/20 bg-black/20 px-3 backdrop-blur-md">
              <img src="/images/loadlink-logo-dark.png?v=universal-theme-v1" alt="LoadLink" className="h-[17px] w-auto max-w-[96px] object-contain drop-shadow" />
            </Link>
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white/85 backdrop-blur-md">South Africa</span>
          </div>

          <div className="absolute bottom-9 left-5 right-5 z-10 sm:bottom-12 sm:left-7 sm:right-7 lg:bottom-12 lg:left-10 lg:max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[.13em] text-white backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#f6b800]" /> Logistics made easier
            </div>
            <div className="mt-3 grid max-w-[310px] grid-cols-3 gap-2" aria-hidden="true">
              {["Jobs", "Vehicles", "Deals"].map((label) => <span key={label} className="rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-center text-[10px] font-bold text-white/80 backdrop-blur-md">{label}</span>)}
            </div>
          </div>
        </section>

        <section className={`relative z-20 -mt-7 rounded-t-[30px] border-t px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-20px_50px_rgba(0,0,0,.16)] sm:px-8 sm:pt-9 lg:mt-0 lg:flex lg:w-[min(47vw,620px)] lg:flex-col lg:justify-center lg:rounded-none lg:border-l lg:border-t-0 lg:px-12 ${panel}`}>
          <div className="mx-auto w-full max-w-[430px]">
            <div className="text-center">
              <h1 className="text-[29px] font-black tracking-[-.045em] sm:text-[34px]">{title}</h1>
              <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-white/46" : "text-black/48"}`}>{subtitle}</p>
            </div>
            <div className="mt-6">{children}</div>
            {footer ? <div className={`mt-6 text-center text-sm font-semibold ${darkMode ? "text-white/62" : "text-black/60"}`}>{footer}</div> : null}
            <p className={`mt-5 text-center text-[10px] font-semibold leading-5 ${darkMode ? "text-white/30" : "text-black/34"}`}>
              Never share your password, PIN or OTP in a LoadLink message, listing or quote.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
