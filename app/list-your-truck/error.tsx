"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ListTruckError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("LoadLink list-truck error", error); }, [error]);
  return (
    <main className="min-h-screen bg-black px-5 py-20 text-white">
      <section className="mx-auto max-w-xl rounded-[18px] border border-white/10 bg-white/[.035] p-6 shadow-[0_20px_60px_rgba(0,0,0,.24)] backdrop-blur-xl sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">Listing recovery</p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em]">The listing form did not finish loading.</h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-white/58">Your draft and existing listings were not changed. Retry the guided form, or return to the vehicle marketplace without losing account data.</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={reset} className="min-h-12 rounded-xl border border-[#f6b800] bg-[#f6b800] px-5 text-sm font-black text-black">Retry listing</button>
          <Link href="/list-your-vehicle" className="flex min-h-12 items-center justify-center rounded-xl border border-white/14 bg-white/[.035] px-5 text-sm font-black text-white">Back to vehicles</Link>
        </div>
        <p className="mt-5 text-[10px] font-semibold text-white/28">Reference {error.digest || "LL-LIST-RECOVERY"}</p>
      </section>
    </main>
  );
}
