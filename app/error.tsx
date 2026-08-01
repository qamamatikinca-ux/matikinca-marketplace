"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { createErrorReference } from "@/lib/core";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = useMemo(
    () => error.digest || createErrorReference("LL-WEB"),
    [error.digest],
  );

  useEffect(() => {
    console.error(`[LoadLink ${reference}]`, error);
  }, [error, reference]);

  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 py-10 text-white">
      <section className="w-full max-w-lg border border-[#f6b800]/45 bg-[#0d0d0d] p-7 text-center sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">
          LoadLink recovery
        </p>
        <h1 className="mt-4 text-3xl font-black">This page could not finish loading.</h1>
        <p className="mt-4 text-sm leading-6 text-white/65">
          Your account and existing information have not been changed. Retry the page or return home.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="bg-[#f6b800] px-5 py-3 font-black text-black"
          >
            Try again
          </button>
          <Link href="/" className="border border-white/25 px-5 py-3 font-black">
            Go home
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/40">Reference {reference}</p>
      </section>
    </main>
  );
}
