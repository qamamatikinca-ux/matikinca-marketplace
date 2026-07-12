import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <section className="w-full max-w-md border border-[#f6b800]/40 p-7 text-center">
        <HomeLogoLink />
        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">Page not found</p>
        <h1 className="mt-3 text-4xl font-black">This page is unavailable.</h1>
        <p className="mt-4 text-sm leading-6 text-white/60">Return to the homepage or browse current listings.</p>
        <div className="mt-6 grid gap-3">
          <Link href="/" className="border border-[#f6b800] bg-[#f6b800] px-5 py-3 font-black text-black">Go home</Link>
          <Link href="/jobs" className="border border-white/20 px-5 py-3 font-black">Browse listings</Link>
        </div>
      </section>
    </main>
  );
}
