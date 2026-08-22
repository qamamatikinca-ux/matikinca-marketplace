"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("LoadLink route error", error.digest || error.message);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f4efe3] px-5 py-8 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex min-h-[82vh] max-w-3xl items-center justify-center">
        <section className="w-full border-y border-black/10 py-10 text-center dark:border-white/10 sm:py-14">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-12 w-auto object-contain dark:hidden" />
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" className="mx-auto hidden h-12 w-auto object-contain dark:block" />
          <p className="mt-9 text-xs font-black uppercase tracking-[.18em] text-[#bd8b00]">LoadLink could not finish that request</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-.055em] sm:text-5xl">Something interrupted the route.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 opacity-55">Your account or form should not be assumed lost. Try the request again. If it keeps failing, open the Help Centre so Support can trace the affected route.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Try again</button>
            <button type="button" onClick={() => window.location.assign("/")} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-current/15 px-5 text-sm font-black">Go home</button>
            <button type="button" onClick={() => window.location.assign("/help")} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-current/15 px-5 text-sm font-black">Help Centre</button>
          </div>
        </section>
      </div>
    </main>
  );
}
