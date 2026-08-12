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
  return (
    <main
      data-loadlink-auth-landing="v285"
      className={`relative min-h-[100svh] overflow-x-hidden ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}
    >
      <div className="mx-auto min-h-[100svh] w-full max-w-[760px] lg:flex lg:max-w-none">
        <section className="relative h-[38svh] min-h-[270px] overflow-hidden bg-[#16110a] sm:h-[44svh] lg:h-screen lg:min-h-screen lg:flex-1">
          <img
            src="/images/loadlink-login-hero.jpg"
            alt="LoadLink logistics made easier"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.10)_55%,rgba(0,0,0,.36))]" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 z-10 p-5 sm:p-7 lg:p-9">
            <Link
              href="/"
              aria-label="LoadLink home"
              className="inline-flex h-10 items-center rounded-full border border-white/18 bg-black/18 px-3 backdrop-blur-xl"
            >
              <img
                src="/images/loadlink-logo-dark.png?v=universal-theme-v1"
                alt="LoadLink"
                className="h-[17px] w-auto max-w-[98px] object-contain"
              />
            </Link>
          </div>
        </section>

        <section
          className={`loadlink-glass relative z-20 -mt-6 rounded-t-[30px] border px-5 pb-[max(1.35rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 lg:mt-0 lg:flex lg:w-[min(45vw,560px)] lg:flex-col lg:justify-center lg:rounded-none lg:border-l lg:border-t-0 lg:px-11 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          <div className="mx-auto w-full max-w-[390px]">
            <div className="text-center">
              <h1 className="text-[28px] font-black tracking-[-.04em] sm:text-[32px]">{title}</h1>
              <p className={`mt-1.5 text-sm font-semibold ${darkMode ? "text-white/58" : "text-black/55"}`}>{subtitle}</p>
            </div>
            <div className="mt-5">{children}</div>
            {footer ? <div className={`mt-5 text-center text-sm font-semibold ${darkMode ? "text-white/68" : "text-black/64"}`}>{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
