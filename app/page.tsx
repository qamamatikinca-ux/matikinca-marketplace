const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const features = [
  {
    number: "01",
    title: "Jobs",
    copy: "Find transport and logistics work built for truck owners and mobile-unit operators.",
    image: "/images/jobs-1.jpg",
  },
  {
    number: "02",
    title: "Contracts",
    copy: "Discover recurring and longer-term opportunities in one focused marketplace.",
    image: "/images/contracts-1.jpg",
  },
  {
    number: "03",
    title: "Vehicles & units",
    copy: "List and discover commercial trucks, trailers and mobile units with clear listing details.",
    image: "/images/truck-1.jpg",
  },
  {
    number: "04",
    title: "Drivers",
    copy: "Build a professional driver profile and connect businesses with available drivers.",
    image: "/images/driver-profile-hero.jpg",
  },
];

const platformTools = [
  ["Verified profiles", "Identity, business and profile checks designed to make marketplace interactions more accountable."],
  ["Direct messaging", "Move from discovery to conversation without leaving the LoadLink platform."],
  ["Dealership tools", "Purpose-built listing, customer and inventory tools for commercial vehicle dealerships."],
  ["Smart listing management", "Manage posts, availability and responses from one simple workspace."],
  ["Logistics tools", "Practical tools designed around everyday transport and logistics workflows."],
  ["Pro insights", "Enhanced visibility and performance insights for businesses that need more from the marketplace."],
];

const dealershipMomentum = [
  { number: "30+", province: "Gauteng", copy: "dealerships signed up" },
  { number: "60+", province: "Mpumalanga", copy: "dealerships signed up" },
  { number: "40+", province: "Western Cape", copy: "dealerships signed up" },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" aria-label="LoadLink home" className="block">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[142px] object-contain sm:w-[160px]" />
          </a>

          <nav className="hidden items-center gap-7 text-[13px] font-bold text-white/60 md:flex">
            <a className="transition hover:text-white" href="#features">Features</a>
            <a className="transition hover:text-white" href="#momentum">Momentum</a>
            <a className="transition hover:text-white" href="#platform">Platform</a>
            <a className="transition hover:text-white" href="#safety">Safety</a>
            <a className="transition hover:text-white" href="#trial">Free trial</a>
          </nav>

          <a href="#trial" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-black text-white transition hover:border-white/25 hover:bg-white/[0.08]">
            Coming soon
          </a>
        </div>
      </header>

      <div id="top" className="relative isolate">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[900px]" style={{ background: "radial-gradient(circle at 50% 2%, rgba(246,184,0,.18), transparent 31%), radial-gradient(circle at 85% 34%, rgba(246,184,0,.07), transparent 22%)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 86%)" }} />

        <section className="mx-auto grid min-h-[calc(100svh-78px)] w-full max-w-[1440px] items-center gap-14 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f6b800]/25 bg-[#f6b800]/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#f6b800]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800] shadow-[0_0_14px_rgba(246,184,0,.95)]" />
              LoadLink is coming soon
            </div>

            <h1 className="mt-7 max-w-4xl text-[clamp(3.8rem,8vw,7.9rem)] font-black leading-[0.86] tracking-[-0.075em]">Logistics,<br />made easier.</h1>
            <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/58 sm:text-lg md:text-xl md:leading-9">
              A focused South African marketplace for logistics opportunities, commercial vehicles, mobile units, drivers and the businesses that keep the industry moving.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#features" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#f6b800] px-6 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#ffc31a]">
                Explore what&apos;s coming
                <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
              </a>
              <a href="#trial" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 px-6 text-sm font-black text-white transition hover:bg-white/[0.05]">Apply for free trial</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-10 -z-10 rounded-full bg-[#f6b800]/[0.06] blur-3xl" />
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0c0c] shadow-[0_35px_100px_rgba(0,0,0,.45)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /></div>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">Platform preview</span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="relative h-[330px] overflow-hidden rounded-[24px] sm:h-[390px]">
                  <img src="/images/truck-1.jpg" alt="Commercial truck" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/5" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <span className="inline-flex rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-black">Vehicle marketplace</span>
                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Find the right vehicle for the work.</h2>
                    <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/65">Commercial trucks, trailers and mobile units in one focused marketplace.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {["Jobs", "Contracts", "Drivers"].map((label) => <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-4 text-center text-xs font-black text-white/72">{label}</div>)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="momentum" className="border-y border-white/[0.08] bg-[#090909] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-9 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">Early dealership momentum</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.045em] sm:text-4xl md:text-5xl">Commercial dealerships are already joining LoadLink.</h2>
            </div>
            <p className="max-w-md text-sm font-semibold leading-7 text-white/48">Dealership sign-ups are already building across key South African provinces ahead of launch.</p>
          </div>

          <div className="grid md:grid-cols-3">
            {dealershipMomentum.map((item, index) => (
              <article key={item.province} className={`py-9 md:px-8 md:py-12 ${index > 0 ? "border-t border-white/[0.08] md:border-l md:border-t-0" : ""}`}>
                <p className="text-[clamp(3rem,7vw,5.6rem)] font-black leading-none tracking-[-0.065em] text-white">{item.number}</p>
                <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-[#f6b800]">{item.province}</h3>
                <p className="mt-1 text-sm font-bold text-white/42">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#080808] px-5 py-24 sm:px-8 md:py-32 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">The marketplace</p>
              <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl md:text-6xl">One place for the work behind the road.</h2>
            </div>
            <p className="max-w-2xl text-base font-semibold leading-8 text-white/52 lg:ml-auto lg:text-lg">LoadLink brings the most important logistics workflows into a single, focused experience — without turning the platform into a cluttered general marketplace.</p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="group relative min-h-[430px] overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#111]">
                <img src={feature.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/38 to-black/5" />
                <div className="relative flex min-h-[430px] flex-col justify-between p-6 sm:p-8">
                  <span className="text-xs font-black tracking-[0.14em] text-white/45">{feature.number}</span>
                  <div><h3 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">{feature.title}</h3><p className="mt-3 max-w-lg text-sm font-semibold leading-7 text-white/68 sm:text-base">{feature.copy}</p></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="px-5 py-24 sm:px-8 md:py-32 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">More than listings</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.05em] sm:text-5xl md:text-6xl">Built to help people actually do business.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-white/52">The platform is being designed around communication, trust, speed and practical logistics workflows — not just posting and scrolling.</p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformTools.map(([title, copy]) => (
              <article key={title} className="min-h-[220px] rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f6b800]/25 bg-[#f6b800]/[0.08] text-[#f6b800]"><CheckIcon /></div>
                <h3 className="mt-8 text-2xl font-black tracking-[-0.035em]">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/48">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="safety" className="px-5 pb-24 sm:px-8 md:pb-32 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1440px] overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#0b0b0b] lg:grid-cols-2">
          <div className="p-7 sm:p-10 md:p-14 lg:p-16">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">Trust & safety</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.96] tracking-[-0.05em] sm:text-5xl">A marketplace should feel accountable.</h2>
            <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-white/52">LoadLink is being built with verification, moderation, reporting and clear marketplace controls so users can make more informed decisions before they deal.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {["Profile verification", "Listing moderation", "Reporting tools", "Account controls"].map((item) => (
                <div key={item} className="flex items-center gap-3 border-t border-white/[0.08] pt-4 text-sm font-black text-white/75"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f6b800] text-black"><CheckIcon /></span>{item}</div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[430px] border-t border-white/[0.08] bg-[#111] lg:border-l lg:border-t-0">
            <div className="absolute inset-0 opacity-35" style={{ background: "radial-gradient(circle at 60% 40%, rgba(246,184,0,.26), transparent 35%)" }} />
            <div className="relative flex h-full min-h-[430px] items-center justify-center p-7 sm:p-10">
              <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-black/55 p-5 shadow-[0_30px_80px_rgba(0,0,0,.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4"><div><p className="text-xs font-black text-white/42">Marketplace status</p><p className="mt-1 text-lg font-black">Designed for safer dealing</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6b800] text-black"><CheckIcon /></span></div>
                <div className="grid gap-3 pt-4">
                  {["Know who you are dealing with", "Keep communication connected", "Report suspicious activity", "Review listing information before dealing"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3 text-sm font-bold text-white/64"><span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" />{item}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#080808] px-5 py-20 sm:px-8 md:py-24 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 md:grid-cols-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-white/32">For operators</p><h3 className="mt-3 text-2xl font-black tracking-[-0.035em]">Find work. List equipment. Stay connected.</h3></div>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-white/32">For businesses</p><h3 className="mt-3 text-2xl font-black tracking-[-0.035em]">Find transport capacity without the marketplace noise.</h3></div>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-white/32">For dealerships</p><h3 className="mt-3 text-2xl font-black tracking-[-0.035em]">A commercial sales workspace built around vehicles.</h3></div>
        </div>
      </section>

      <section id="trial" className="relative isolate px-5 py-24 sm:px-8 md:py-32 lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(circle at 50% 70%, rgba(246,184,0,.13), transparent 28%)" }} />
        <div className="mx-auto max-w-4xl text-center">
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="mx-auto h-auto w-[180px] object-contain sm:w-[210px]" />
          <p className="mt-9 text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">Early access</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-[0.94] tracking-[-0.055em] sm:text-5xl md:text-7xl">Be among the first to use LoadLink.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-8 text-white/52 md:text-lg">Apply for a free trial and tell us how you plan to use LoadLink. Your email app will open with the application already addressed to the LoadLink team.</p>
          <a href={FREE_TRIAL_EMAIL} className="group mx-auto mt-9 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f6b800] px-8 text-sm font-black text-black shadow-[0_16px_50px_rgba(246,184,0,.14)] transition hover:-translate-y-0.5 hover:bg-[#ffc31a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050505]" aria-label="Apply for a free LoadLink trial by email">
            Apply for free trial
            <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
          </a>
          <p className="mt-4 text-xs font-bold text-white/28">loadlinksouthafrica@gmail.com</p>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" className="h-auto w-[118px] object-contain" />
          <p className="text-xs font-bold text-white/28">© {new Date().getFullYear()} LoadLink. Coming soon to South Africa.</p>
        </div>
      </footer>
    </main>
  );
}
