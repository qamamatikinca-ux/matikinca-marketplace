"use client";

import { useEffect } from "react";

export default function ListTruckError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("LoadLink list-truck error", error); }, [error]);
  return (
    <main className="min-h-screen bg-black px-5 py-24 text-white">
      <section className="mx-auto max-w-xl border border-[#f6b800]/45 bg-[#0b0b0b] p-7 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">LoadLink listing recovery</p>
        <h1 className="mt-4 text-3xl font-black">The truck form could not finish loading</h1>
        <p className="mt-4 text-sm leading-6 text-white/60">Your account and existing listings were not changed. Retry this page. If the database migration is still being applied, wait a moment and retry.</p>
        <button type="button" onClick={reset} className="mt-7 h-12 bg-[#f6b800] px-8 font-black text-black">Try again</button>
        <p className="mt-5 text-xs text-white/30">Reference {error.digest || "LL-LIST-RECOVERY"}</p>
      </section>
    </main>
  );
}
