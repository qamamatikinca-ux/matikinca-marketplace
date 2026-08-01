"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { createErrorReference } from "@/lib/core";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = useMemo(
    () => error.digest || createErrorReference("LL-ADMIN"),
    [error.digest],
  );

  useEffect(() => {
    console.error(`[LoadLink admin ${reference}]`, error);
  }, [error, reference]);

  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 py-10 text-white">
      <section className="w-full max-w-lg border border-[#f6b800]/45 bg-[#0d0d0d] p-7 text-center sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">
          LoadLink admin recovery
        </p>
        <h1 className="mt-4 text-3xl font-black">The admin page was interrupted.</h1>
        <p className="mt-4 text-sm leading-6 text-white/65">
          No account, listing or review data was changed. Retry the admin page or return to LoadLink.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="bg-[#f6b800] px-5 py-3 font-black text-black"
          >
            Retry admin
          </button>
          <Link href="/" className="border border-white/25 px-5 py-3 font-black">
            Return home
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/40">Reference {reference}</p>
      </section>
    </main>
  );
}
