"use client";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function LiveIdentityCheck() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-lg space-y-5 px-5 py-10">
      <h1 className="text-3xl font-black">Camera check unavailable</h1>
      <p className="text-sm leading-6">We removed the camera check because it was not reliable enough. You can still complete phone and email verification or contact support about identity review.</p>
      <Link href="/verify" className="block rounded-full bg-[#f6b800] px-5 py-3 text-center text-sm font-bold text-black">Back to verification</Link>
      <Link href="/help" className="block text-sm underline">Contact support</Link>
      <Link href="/legal#verification-security" className="block text-sm underline">Security and privacy policy</Link>
    </section>
  </main>;
}
