"use client";

import Link from "next/link";
import { useEffect } from "react";
import { setLoadLinkSimpleMode } from "@/components/SimpleModeCoordinator";

export default function SimpleModePage() {
  useEffect(() => { setLoadLinkSimpleMode(true); }, []);
  return <main className="flex min-h-screen items-center justify-center bg-[#f4efe3] px-5 text-black">
    <section className="w-full max-w-md rounded-[28px] border border-black/10 bg-white p-6 text-center">
      <h1 className="text-3xl font-black tracking-[-.04em]">Simple mode is on</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-black/55">LoadLink keeps the normal homepage and page layouts, but reduces motion, removes visual noise and makes controls easier to read.</p>
      <Link href="/" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-black text-sm font-black text-white">Return home</Link>
    </section>
  </main>;
}
