"use client";

import Link from "next/link";
import { DEALER_PLAN_BENEFITS } from "@/lib/dealer/access";

type Props = {
  darkMode: boolean;
  section?: string;
  reason?: "plan" | "permission";
};

export default function DealerAccessPanel({ darkMode, section, reason = "plan" }: Props) {
  const restricted = reason === "permission";
  const surface = darkMode ? "border-white/10 bg-[#111111] text-white" : "border-black/10 bg-white text-[#181818]";
  const muted = darkMode ? "text-white/60" : "text-black/60";
  return (
    <section className={"mx-auto w-full max-w-4xl rounded-[24px] border p-5 shadow-sm sm:p-8 " + surface} aria-label={restricted ? "Dealer tool access" : "Dealer package required"}>
      <div className="h-1 w-14 rounded-full bg-[#f6b800]" aria-hidden="true" />
      <p className={"mt-5 text-[11px] font-bold uppercase tracking-[.12em] " + muted}>{restricted ? "Team permissions" : "LoadLink Dealer plan"}</p>
      <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        {restricted ? "Access to this tool is restricted" : "Get the Dealer plan to access this workspace"}
      </h1>
      <p className={"mt-3 max-w-2xl text-sm leading-6 " + muted}>
        {restricted
          ? "Your dealership is connected, but your team role does not include this tool. Ask the dealership owner to review your permissions."
          : section
            ? "The " + section + " feature is part of LoadLink Dealer. Compare the full benefits and activate the plan to use it."
            : "Your current package does not include the Dealer Control Centre. The tools and benefits below become available with an eligible Dealer subscription."}
      </p>
      {!restricted ? (
        <>
          <div className={"mt-6 rounded-[20px] border p-4 sm:p-5 " + (darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.07] bg-[#fafafa]")}>
            <h2 className="text-sm font-bold">Everything included in Dealer</h2>
            <ul className="mt-4 grid gap-x-7 gap-y-3 sm:grid-cols-2">
              {DEALER_PLAN_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[13px] leading-5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/packages#dealer-package" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-bold text-black">Get Dealer plan</Link>
            <Link href="/packages" className={"inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-sm font-bold " + (darkMode ? "border-white/15" : "border-black/15")}>Compare all packages</Link>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dealer?section=overview" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-bold text-black">Back to overview</Link>
          <Link href="/dealer?section=support" className={"inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-sm font-bold " + (darkMode ? "border-white/15" : "border-black/15")}>Dealership support</Link>
        </div>
      )}
    </section>
  );
}
