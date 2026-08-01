"use client";

import { useEffect } from "react";

export default function LegacyListYourTruckRoute() {
  useEffect(() => {
    window.location.replace(`/list-your-vehicle${window.location.search}${window.location.hash}`);
  }, []);
  return <main className="flex min-h-screen items-center justify-center bg-black text-sm font-black uppercase tracking-[.16em] text-[#f6b800]">Opening List Your Vehicle…</main>;
}
