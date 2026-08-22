import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f4efe3] px-5 py-8 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex min-h-[82vh] max-w-4xl items-center justify-center">
        <section className="w-full border-y border-black/10 py-10 text-center dark:border-white/10 sm:py-14">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-12 w-auto object-contain dark:hidden" />
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" className="mx-auto hidden h-12 w-auto object-contain dark:block" />
          <p className="mt-9 text-xs font-black uppercase tracking-[.18em] text-[#bd8b00]">404 · Route not found</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-.055em] sm:text-6xl">That route is not on the map.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 opacity-55">The page may have moved, the address may be incorrect, or the resource may no longer exist. You can return to a working LoadLink route below.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Go home</Link>
            <Link href="/search" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-current/15 px-5 text-sm font-black">Search LoadLink</Link>
            <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-current/15 px-5 text-sm font-black">Help Centre</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
