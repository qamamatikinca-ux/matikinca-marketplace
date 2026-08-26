"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function VehicleListingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("LoadLink vehicle listing error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[70dvh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[.035] p-6 shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop-blur-xl sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6b800] text-2xl font-black text-black">↻</div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Vehicle listing recovery</p>
          <h1 className="mt-3 text-[clamp(2.1rem,8vw,3.7rem)] font-black leading-[.96] tracking-[-.055em]">Your vehicle draft is still safe.</h1>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/55">This part of the listing flow hit a temporary problem. Continue here without being taken to the full-site recovery screen.</p>
          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            <button type="button" onClick={() => unstable_retry()} className="min-h-[52px] rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">Continue listing</button>
            <Link href="/list-your-vehicle" className="flex min-h-[52px] items-center justify-center rounded-full border border-white/12 bg-white/[.035] px-5 text-xs font-black text-white">Back to vehicle portal</Link>
          </div>
          {error.digest ? <p className="mt-5 text-[9px] font-bold text-white/24">Reference {error.digest}</p> : null}
        </div>
      </section>
    </main>
  );
}
