"use client";

import { Suspense } from "react";
import DealerWorkspace from "@/components/dealer/DealerWorkspace";

export default function DealerPage() {
  return <Suspense fallback={<main className="min-h-screen bg-black text-white"><div className="mx-auto flex min-h-screen items-center justify-center text-sm font-black">Opening Dealer…</div></main>}><DealerWorkspace /></Suspense>;
}
