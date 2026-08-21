const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const featureGroups = [
  {
    number: "01",
    title: "Marketplace",
    copy: "Jobs · Contracts · Vehicles & mobile units · Drivers · Dealerships",
  },
  {
    number: "02",
    title: "Deal flow",
    copy: "Direct messaging · Notifications · Listing management · Saved & archived conversations",
  },
  {
    number: "03",
    title: "Logistics tools",
    copy: "Rate quotes · Trip briefs · Load checklists · Collection & delivery briefs · Driver handovers · ETA & incident updates · Cost, payment & POD tools · Truck finance calculator",
  },
  {
    number: "04",
    title: "Documents & trust",
    copy: "LoadLink-branded PDF exports · Optional business branding · Profile verification · Listing moderation · Reporting · Account controls · Packages & Pro insights",
  },
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
      <section className="relative min-h-[100svh] overflow-hidden border-b border-white/10">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/55" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[82px] items-center justify-between border-b border-white/15">
            <img
              src="/images/loadlink-logo-dark.png"
              alt="LoadLink"
              width={1200}
              height={391}
              className="h-auto w-[148px] object-contain sm:w-[168px]"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Coming soon · South Africa</p>
          </header>

          <div className="flex flex-1 items-end pb-8 pt-20 sm:pb-10 lg:pb-12">
            <div className="w-full">
              <div className="max-w-5xl">
                <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
                  <span className="h-px w-8 bg-[#f6b800]" />
                  Logistics, made easier
                </p>

                <h1 className="mt-5 text-[clamp(4rem,10.2vw,9.5rem)] font-black leading-[0.78] tracking-[-0.075em]">
                  South Africa moves.
                  <br />
                  <span className="text-[#f6b800]">LoadLink connects it.</span>
                </h1>

                <div className="mt-8 grid max-w-4xl gap-6 border-t border-white/20 pt-6 md:grid-cols-[1fr_auto] md:items-end">
                  <p className="max-w-2xl text-base font-semibold leading-7 text-white/70 sm:text-lg sm:leading-8">
                    Work, vehicles, drivers, dealerships and practical logistics tools — brought into one focused marketplace.
                  </p>

                  <a
                    href={FREE_TRIAL_EMAIL}
                    className="group inline-flex min-h-12 w-fit items-center gap-3 bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
                  >
                    Apply for free trial
                    <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
                  </a>
                </div>
              </div>

              <div className="mt-10 grid border-y border-white/16 bg-black/20 backdrop-blur-sm sm:grid-cols-3">
                <div className="flex items-baseline gap-3 border-b border-white/14 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                  <span className="text-2xl font-black tracking-[-0.04em]">30+</span>
                  <span className="text-xs font-bold text-white/55">Gauteng dealerships</span>
                </div>
                <div className="flex items-baseline gap-3 border-b border-white/14 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                  <span className="text-2xl font-black tracking-[-0.04em]">60+</span>
                  <span className="text-xs font-bold text-white/55">Mpumalanga dealerships</span>
                </div>
                <div className="flex items-baseline gap-3 px-4 py-4 sm:px-5">
                  <span className="text-2xl font-black tracking-[-0.04em]">40+</span>
                  <span className="text-xs font-bold text-white/55">Western Cape dealerships</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1efe8] px-5 py-16 text-black sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="grid gap-8 border-b border-black/15 pb-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">What is coming</p>
              <h2 className="mt-4 max-w-4xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-6xl md:text-7xl">
                The useful parts of logistics. In one place.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-black/56 lg:ml-auto sm:text-lg">
              LoadLink is being built as a working platform, not a crowded classifieds page. The full product is there — presented simply.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((group, index) => (
              <article
                key={group.number}
                className={`py-8 md:py-10 lg:min-h-[330px] lg:py-12 ${index < featureGroups.length - 1 ? "border-b border-black/15 md:border-b-0 md:border-r" : ""} ${index === 1 ? "md:border-r-0 lg:border-r" : ""} ${index === 2 ? "md:border-t md:border-black/15 lg:border-t-0" : ""}`}
              >
                <div className="md:px-6 lg:px-7 first:pl-0">
                  <p className="text-[10px] font-black tracking-[0.15em] text-black/30">{group.number}</p>
                  <h3 className="mt-5 text-3xl font-black tracking-[-0.04em]">{group.title}</h3>
                  <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-black/55 sm:text-base">{group.copy}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-black/15 pt-7">
            <p className="max-w-4xl text-sm font-bold leading-7 text-black/48 sm:text-base">
              Quotes can become clean LoadLink-branded PDF documents with optional business branding. Operational tools can be copied or shared outside the platform when the job needs to keep moving.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10">
        <img
          src="/images/jobs-2.jpg"
          alt="Commercial logistics in South Africa"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/94 via-black/62 to-transparent" />

        <div className="relative mx-auto flex min-h-[500px] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Early access</p>
            <h2 className="mt-4 text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Be there when LoadLink opens.
            </h2>
            <p className="mt-7 max-w-xl text-base font-semibold leading-8 text-white/64 sm:text-lg">
              Free-trial applications are open before launch.
            </p>
            <a
              href={FREE_TRIAL_EMAIL}
              className="group mt-8 inline-flex min-h-12 items-center gap-3 bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
            >
              Apply for free trial
              <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <img
            src="/images/loadlink-logo-dark.png"
            alt="LoadLink"
            width={1200}
            height={391}
            className="h-auto w-[132px] object-contain"
          />
          <div className="text-sm font-semibold text-white/45 sm:text-right">
            <a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">
              loadlinksouthafrica@gmail.com
            </a>
            <p className="mt-1 text-xs text-white/28">South African logistics marketplace · Coming soon</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
