"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackageGuideRibbon() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  if (pathname !== "/packages") return null;
  return (
    <div className={darkMode ? "border-b border-white/10 bg-[#080808] text-white" : "border-b border-black/10 bg-[#f4efe3] text-black"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="text-sm font-black">Need help choosing?</p><p className={darkMode ? "mt-1 text-xs font-semibold text-white/50" : "mt-1 text-xs font-semibold text-black/50"}>Plan Guide gives one recommendation or sends a tailored request to Control Centre.</p></div>
        <Link href="/packages/guide" className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Open Plan Guide</Link>
      </div>
    </div>
  );
}
