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
    ? "border-white/10 bg-[#080808]/96 text-white shadow-[0_-24px_70px_rgba(0,0,0,.48)]"
    : "border-black/8 bg-white/96 text-black shadow-[0_-24px_70px_rgba(0,0,0,.12)]";

  return (
    <main
      data-loadlink-auth-landing="v2714"
      className={`relative min-h-[100svh] overflow-hidden ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}
    >
      <section className="relative min-h-[44svh] overflow-hidden sm:min-h-[50svh] lg:min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.22)),url("/images/loadlink-auth-hero.jpg"),url("/images/find-jobs.jpg")',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 18% 24%, rgba(246,184,0,.24), transparent 24%), radial-gradient(circle at 78% 58%, rgba(246,184,0,.18), transparent 28%), linear-gradient(180deg, transparent 46%, rgba(0,0,0,.24) 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5 sm:p-7 lg:p-9">
          <Link href="/" aria-label="LoadLink home" className="inline-flex items-center">
            <img
              src={darkMode ? "/images/loadlink-logo-dark.png?v=universal-theme-v1" : "/images/loadlink-logo-light.png?v=universal-theme-v1"}
              alt="LoadLink"
              className="h-[18px] w-auto max-w-[92px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,.28)] sm:h-5"
            />
          </Link>
        </div>
        <div className="absolute bottom-0 left-1/2 h-1 w-[76%] max-w-3xl -translate-x-1/2 rounded-full bg-[#f6b800]/90 shadow-[0_0_38px_rgba(246,184,0,.75)]" aria-hidden="true" />
      </section>

      <section
        className={`relative z-20 -mt-8 rounded-t-[34px] border-t px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 backdrop-blur-xl sm:-mt-12 sm:px-7 sm:pt-9 lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:mt-0 lg:flex lg:w-[min(48vw,640px)] lg:flex-col lg:justify-center lg:rounded-none lg:rounded-l-[40px] lg:border-l lg:border-t-0 lg:px-10 xl:px-14 ${panel}`}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="text-center">
            <h1 className="text-[28px] font-black tracking-[-.045em] sm:text-[34px]">{title}</h1>
            <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-white/48" : "text-black/46"}`}>{subtitle}</p>
          </div>
          <div className="mt-6">{children}</div>
          {footer ? <div className={`mt-6 text-center text-sm font-semibold ${darkMode ? "text-white/60" : "text-black/58"}`}>{footer}</div> : null}
          <p className={`mt-5 text-center text-[10px] font-semibold leading-5 ${darkMode ? "text-white/32" : "text-black/34"}`}>
            LoadLink will never ask for your password, PIN or OTP in a message, listing or quote.
          </p>
        </div>
      </section>
    </main>
  );
}
