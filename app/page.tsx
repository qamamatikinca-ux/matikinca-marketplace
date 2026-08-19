const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const marketplace = [
  {
    number: "01",
    title: "Jobs",
    copy: "Transport and logistics opportunities for truck owners and mobile-unit operators.",
  },
  {
    number: "02",
    title: "Contracts",
    copy: "Recurring and longer-term work, organised in one focused marketplace.",
  },
  {
    number: "03",
    title: "Vehicles & units",
    copy: "Commercial trucks, trailers and mobile units for businesses that need to buy, sell or source equipment.",
  },
  {
    number: "04",
    title: "Drivers",
    copy: "Professional driver profiles that make it easier for businesses and drivers to find each other.",
  },
];

const launchFeatures = [
  "Verified profiles",
  "Direct messaging",
  "Listing management",
  "Dealership workspace",
  "Logistics tools",
  "Pro performance insights",
];

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#f6b800] selection:text-black">
      <section id="top" className="relative min-h-[100svh] overflow-hidden border-b border-white/10">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/42" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50" />

        <header className="relative z-20 border-b border-white/15">
          <div className="mx-auto flex h-[78px] w-full max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <a href="#top" aria-label="LoadLink home">
              <img
                src="/images/loadlink-logo-dark.png"
                alt="LoadLink"
                width={1200}
                height={391}
                className="h-auto w-[148px] object-contain sm:w-[164px]"
              />
            </a>

            <nav className="hidden items-center gap-8 text-[12px] font-bold uppercase tracking-[0.08em] text-white/70 md:flex">
              <a href="#marketplace" className="transition hover:text-white">Marketplace</a>
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#network" className="transition hover:text-white">Network</a>
            </nav>

            <a
              href={FREE_TRIAL_EMAIL}
              className="inline-flex min-h-10 items-center gap-2 border border-white/35 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:border-[#f6b800] hover:bg-[#f6b800] hover:text-black"
            >
              Free trial
              <Arrow />
            </a>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-78px)] w-full max-w-[1500px] items-end px-5 pb-10 pt-24 sm:px-8 sm:pb-14 lg:px-12 lg:pb-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1fr_310px] lg:items-end">
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#f6b800]">
                <span className="h-px w-8 bg-[#f6b800]" />
                Coming soon · South Africa
              </div>

              <h1 className="mt-6 max-w-5xl text-[clamp(4.1rem,10vw,9.3rem)] font-black leading-[0.78] tracking-[-0.075em]">
                South Africa moves.
                <br />
                LoadLink connects it.
              </h1>

              <p className="mt-8 max-w-2xl text-base font-semibold leading-7 text-white/74 sm:text-lg sm:leading-8 md:text-xl">
                A new logistics marketplace connecting jobs, contracts, commercial vehicles,
                mobile units, drivers and dealerships — in one place.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href={FREE_TRIAL_EMAIL}
                  className="group inline-flex min-h-13 items-center gap-3 bg-[#f6b800] px-6 py-3.5 text-sm font-black text-black transition hover:bg-[#ffc62b]"
                >
                  Apply for free trial
                  <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
                </a>
                <a
                  href="#marketplace"
                  className="inline-flex min-h-13 items-center border border-white/30 bg-black/20 px-6 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:border-white/60"
                >
                  See what&apos;s coming
                </a>
              </div>
            </div>

            <div className="hidden border-l border-white/25 pl-7 lg:block">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white/45">Built for</p>
              <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">The people and businesses that keep South Africa moving.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="network" className="bg-[#f1efe8] text-black">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
          <div className="grid gap-8 border-b border-black/15 pb-9 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/50">Early dealership network</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-5xl md:text-6xl">
                Already building before launch.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-7 text-black/60 lg:ml-auto md:text-base">
              Commercial dealerships in three provinces have already signed up to be part of the LoadLink network.
            </p>
          </div>

          <div className="grid md:grid-cols-3">
            <article className="border-b border-black/15 py-9 md:border-b-0 md:border-r md:pr-8 md:py-12">
              <p className="text-[clamp(4.3rem,9vw,7.5rem)] font-black leading-none tracking-[-0.07em]">30+</p>
              <p className="mt-5 max-w-xs text-lg font-black leading-6">More than 30 dealerships around Gauteng have signed up.</p>
            </article>
            <article className="border-b border-black/15 py-9 md:border-b-0 md:border-r md:px-8 md:py-12">
              <p className="text-[clamp(4.3rem,9vw,7.5rem)] font-black leading-none tracking-[-0.07em]">60+</p>
              <p className="mt-5 max-w-xs text-lg font-black leading-6">More than 60 dealerships in Mpumalanga have signed up.</p>
            </article>
            <article className="py-9 md:pl-8 md:py-12">
              <p className="text-[clamp(4.3rem,9vw,7.5rem)] font-black leading-none tracking-[-0.07em]">40+</p>
              <p className="mt-5 max-w-xs text-lg font-black leading-6">More than 40 dealerships in the Western Cape have signed up.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="marketplace" className="bg-[#050505] px-5 py-24 sm:px-8 md:py-32 lg:px-12">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6b800]">The marketplace</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-6xl md:text-7xl">
                One link between the people who move the country.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-white/52 lg:ml-auto md:text-lg">
              LoadLink keeps the core of logistics together without turning it into another noisy general marketplace.
            </p>
          </div>

          <div className="mt-16 border-t border-white/15">
            {marketplace.map((item) => (
              <article
                key={item.number}
                className="grid gap-5 border-b border-white/15 py-8 sm:grid-cols-[70px_1fr] md:grid-cols-[90px_1fr_1fr] md:items-center md:py-10"
              >
                <p className="text-xs font-black tracking-[0.14em] text-white/35">{item.number}</p>
                <h3 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">{item.title}</h3>
                <p className="max-w-xl text-sm font-semibold leading-7 text-white/50 md:ml-auto md:text-base">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto grid w-full max-w-[1500px] lg:grid-cols-[1.12fr_.88fr]">
          <div className="relative min-h-[520px] overflow-hidden border-b border-white/10 lg:min-h-[720px] lg:border-b-0 lg:border-r">
            <img
              src="/images/contracts-2.jpg"
              alt="Logistics operation"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 md:p-12">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6b800]">LoadLink platform</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.9] tracking-[-0.055em] sm:text-5xl md:text-6xl">
                Built to get from discovery to business faster.
              </h2>
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-9 md:p-12 lg:p-14">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/38">Prepared for launch</p>
              <div className="mt-8 border-t border-white/15">
                {launchFeatures.map((feature, index) => (
                  <div key={feature} className="flex items-center justify-between gap-6 border-b border-white/15 py-5">
                    <span className="text-lg font-black tracking-[-0.025em] sm:text-xl">{feature}</span>
                    <span className="text-xs font-black text-white/25">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-12 max-w-md text-sm font-semibold leading-7 text-white/45 md:text-base">
              Less jumping between platforms. Less noise. More of the information, communication and tools needed to move a deal forward.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f1efe8] px-5 py-24 text-black sm:px-8 md:py-32 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1500px] gap-12 lg:grid-cols-[1fr_.85fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Trust on the marketplace</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Know more before you deal.
            </h2>
          </div>
          <div className="max-w-xl lg:ml-auto">
            <p className="text-base font-semibold leading-8 text-black/62 md:text-lg">
              LoadLink is being prepared with profile verification, listing moderation, reporting and account controls to help users make better-informed decisions.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-6 border-t border-black/15 text-sm font-black">
              <p className="border-b border-black/15 py-4">Profile verification</p>
              <p className="border-b border-black/15 py-4">Listing moderation</p>
              <p className="border-b border-black/15 py-4">Reporting</p>
              <p className="border-b border-black/15 py-4">Account controls</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[600px] overflow-hidden border-b border-white/10">
        <img
          src="/images/jobs-2.jpg"
          alt="South African logistics"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/58" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-transparent" />
        <div className="relative mx-auto flex min-h-[600px] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6b800]">Early access</p>
            <h2 className="mt-4 text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Get in before the road gets busy.
            </h2>
            <p className="mt-7 max-w-xl text-base font-semibold leading-8 text-white/68 md:text-lg">
              Apply for a free trial. Your email app will open with the LoadLink application already addressed and ready to complete.
            </p>
            <a
              href={FREE_TRIAL_EMAIL}
              className="group mt-9 inline-flex min-h-14 items-center gap-3 bg-[#f6b800] px-7 py-4 text-sm font-black text-black transition hover:bg-[#ffc62b]"
            >
              Apply for free trial
              <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" className="h-auto w-[132px] object-contain" />
            <p className="mt-4 text-xs font-bold text-white/32">Logistics, made easier.</p>
          </div>
          <div className="text-left sm:text-right">
            <a href={FREE_TRIAL_EMAIL} className="text-xs font-black text-white/60 transition hover:text-[#f6b800]">loadlinksouthafrica@gmail.com</a>
            <p className="mt-2 text-[11px] font-bold text-white/25">© {new Date().getFullYear()} LoadLink · Coming soon to South Africa</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
