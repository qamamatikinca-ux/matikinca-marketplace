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
  const cleanSubtitle = subtitle.trim();
  const showSubtitle = Boolean(cleanSubtitle) && cleanSubtitle.toLowerCase() !== "logistics made easier";

  return (
    <main
      data-loadlink-auth-landing="v287"
      className={`relative min-h-[100svh] overflow-x-hidden ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}
    >
      <div className="mx-auto min-h-[100svh] w-full max-w-[760px] lg:flex lg:max-w-none">
        <section className={`loadlink-auth-hero relative h-[54svh] min-h-[390px] overflow-hidden sm:h-[59svh] sm:min-h-[455px] lg:h-screen lg:min-h-screen lg:flex-1 ${darkMode ? "bg-[#110905]" : "bg-[#d56d1d]"}`}>
          <img
            src="/images/loadlink-login-hero-hd.webp"
            alt="LoadLink logistics made easier"
            className="loadlink-auth-hero-image absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 z-[1] bg-black/[.05]" aria-hidden="true" />
          <div
            className={`absolute inset-x-0 bottom-0 z-[2] h-[34%] ${darkMode ? "bg-gradient-to-b from-transparent via-black/30 to-black" : "bg-gradient-to-b from-transparent via-[#f4efe3]/20 to-[#f4efe3]"}`}
            aria-hidden="true"
          />
          <div
            className={`absolute inset-y-0 right-0 z-[2] hidden w-[28%] lg:block ${darkMode ? "bg-gradient-to-r from-transparent to-black" : "bg-gradient-to-r from-transparent to-[#f4efe3]"}`}
            aria-hidden="true"
          />
          <div className="loadlink-auth-hero-vignette absolute inset-0 z-[3]" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 z-10 p-5 sm:p-7 lg:p-9">
            <Link
              href="/"
              aria-label="LoadLink home"
              className="inline-flex h-10 items-center rounded-full border border-white/20 bg-black/22 px-3 shadow-sm backdrop-blur-xl"
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
          className={`loadlink-glass loadlink-auth-panel relative z-20 -mt-8 rounded-t-[30px] border px-5 pb-[max(1.35rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-16px_40px_rgba(0,0,0,.08)] sm:px-8 sm:pt-8 lg:mt-0 lg:flex lg:w-[min(45vw,560px)] lg:flex-col lg:justify-center lg:rounded-none lg:border-l lg:border-t-0 lg:px-11 lg:shadow-[-18px_0_46px_rgba(0,0,0,.08)] ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          <div className="mx-auto w-full max-w-[390px]">
            <div className="text-center">
              <h1 className="text-[28px] font-black tracking-[-.04em] sm:text-[32px]">{title}</h1>
              {showSubtitle ? <p className={`mt-1.5 text-sm font-semibold ${darkMode ? "text-white/58" : "text-black/55"}`}>{cleanSubtitle}</p> : null}
            </div>
            <div className="mt-5">{children}</div>
            {footer ? <div className={`mt-5 text-center text-sm font-semibold ${darkMode ? "text-white/68" : "text-black/64"}`}>{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
