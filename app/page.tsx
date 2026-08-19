const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-[100svh] overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-8%,rgba(246,184,0,0.16),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(246,184,0,0.07),transparent_28%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_74%)]"
      />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))] sm:px-8 md:px-12 lg:px-16">
        <header className="flex items-center justify-center">
          <img
            src="/images/loadlink-logo-dark.png"
            alt="LoadLink"
            width={1200}
            height={391}
            className="h-auto w-[176px] object-contain sm:w-[205px] md:w-[224px]"
          />
        </header>

        <section className="flex flex-1 items-center justify-center py-14 text-center sm:py-16">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#f6b800]/25 bg-[#f6b800]/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-[0.13em] text-[#f6b800] sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800] shadow-[0_0_14px_rgba(246,184,0,0.9)]" />
              Coming soon
            </div>

            <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(3.35rem,10vw,7.6rem)] font-black leading-[0.88] tracking-[-0.07em] text-white">
              Logistics,
              <br />
              made easier.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-[15px] font-semibold leading-7 text-white/58 sm:text-base md:mt-8 md:text-lg md:leading-8">
              LoadLink is preparing a faster, simpler way to connect logistics
              opportunities, commercial vehicles, mobile units and drivers across
              South Africa.
            </p>

            <div className="mx-auto mt-10 h-px w-16 bg-[#f6b800]/70" />
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/34 sm:text-xs">
              Built for South African logistics
            </p>
          </div>
        </section>

        <footer className="flex flex-col items-center border-t border-white/[0.09] pt-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="hidden text-xs font-bold tracking-[-0.01em] text-white/30 sm:block">
            © {new Date().getFullYear()} LoadLink
          </p>

          <a
            href={FREE_TRIAL_EMAIL}
            className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#f6b800] px-6 text-sm font-black text-black shadow-[0_12px_36px_rgba(246,184,0,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffc31a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050505] active:translate-y-0"
            aria-label="Apply for a free LoadLink trial by email"
          >
            Apply for free trial
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </a>

          <p className="mt-4 text-[11px] font-bold text-white/25 sm:hidden">
            © {new Date().getFullYear()} LoadLink
          </p>
        </footer>
      </div>
    </main>
  );
}
