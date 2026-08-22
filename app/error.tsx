"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { createErrorReference } from "@/lib/core";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = useMemo(() => error.digest || createErrorReference("LL-WEB"), [error.digest]);

  useEffect(() => {
    console.error(`[LoadLink ${reference}]`, error);
  }, [error, reference]);

  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 py-10 text-white">
      <section className="w-full max-w-lg border border-[#f6b800]/40 bg-[#0d0d0d] p-7 text-center sm:p-10">
        <img src="/images/loadlink-logo-dark.png" alt="LoadLink" className="mx-auto h-11 w-auto object-contain" />
        <p className="mt-7 text-[10px] font-black uppercase tracking-[.17em] text-[#f6b800]">LoadLink recovery</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">This page could not finish loading.</h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-white/60">Your account and existing information have not been treated as successfully changed. Retry the page or use Help Centre if this keeps happening.</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={reset} className="min-h-12 bg-[#f6b800] px-4 text-sm font-black text-black">Try again</button>
          <Link href="/" className="flex min-h-12 items-center justify-center border border-white/20 px-4 text-sm font-black">Go home</Link>
          <Link href="/help" className="flex min-h-12 items-center justify-center border border-white/20 px-4 text-sm font-black">Help Centre</Link>
        </div>
        <p className="mt-6 text-[11px] font-semibold text-white/35">Reference {reference}</p>
      </section>
    </main>
  );
}
