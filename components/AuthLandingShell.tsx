"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import LoadLinkIcon from "@/components/LoadLinkIcon";

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
      data-loadlink-auth-landing="v282"
      className={`relative min-h-[100svh] overflow-x-hidden ${darkMode ? "bg-black text-white" : "bg-[#f5f1e7] text-black"}`}
    >
      <div className="mx-auto min-h-[100svh] w-full max-w-[760px] lg:flex lg:max-w-none">
        <section className="relative h-[43svh] min-h-[300px] overflow-hidden bg-[#16110a] sm:h-[47svh] lg:h-screen lg:min-h-screen lg:flex-1">
          <img
            src="/images/loadlink-auth-hero.svg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.16)_52%,rgba(0,0,0,.44))]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(246,184,0,.12),transparent_24%)]" aria-hidden="true" />

          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-7 lg:p-9">
            <Link
              href="/"
              aria-label="LoadLink home"
              className="inline-flex h-10 items-center rounded-full border border-white/18 bg-black/20 px-3 shadow-sm backdrop-blur-xl"
            >
              <img
                src="/images/loadlink-logo-dark.png?v=universal-theme-v1"
                alt="LoadLink"
                className="h-[17px] w-auto max-w-[98px] object-contain drop-shadow"
              />
            </Link>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-black/20 text-white/90 shadow-sm backdrop-blur-xl"
              aria-hidden="true"
            >
              <LoadLinkIcon name="user" size={18} strokeWidth={1.8} />
            </span>
          </div>
        </section>

        <section
          className={`relative z-20 -mt-8 rounded-t-[34px] border-t px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-18px_55px_rgba(0,0,0,.15)] backdrop-blur-3xl backdrop-saturate-150 sm:px-8 sm:pt-9 lg:mt-0 lg:flex lg:w-[min(46vw,600px)] lg:flex-col lg:justify-center lg:rounded-none lg:border-l lg:border-t-0 lg:px-12 ${
            darkMode
              ? "border-white/14 bg-black/[.66] text-white"
              : "border-white/80 bg-white/[.74] text-black"
          }`}
        >
          <div className="mx-auto w-full max-w-[420px]">
            <div className="text-center">
              <h1 className="text-[29px] font-black tracking-[-.045em] sm:text-[34px]">{title}</h1>
              <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-white/64" : "text-black/58"}`}>{subtitle}</p>
            </div>
            <div className="mt-6">{children}</div>
            {footer ? <div className={`mt-6 text-center text-sm font-semibold ${darkMode ? "text-white/74" : "text-black/68"}`}>{footer}</div> : null}
            <p className={`mt-5 text-center text-[10px] font-semibold leading-5 ${darkMode ? "text-white/42" : "text-black/44"}`}>
              Never share your password, PIN or OTP in a LoadLink message, listing or quote.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
