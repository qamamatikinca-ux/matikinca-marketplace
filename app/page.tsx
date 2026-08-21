const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const marketplace = ["Jobs", "Contracts", "Vehicles & units", "Drivers", "Dealerships"];

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
        <div className="absolute inset-0 bg-black/38" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/8" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/55" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[84px] items-center justify-between border-b border-white/15">
            <img
              src="/images/loadlink-logo-dark.png"
              alt="LoadLink"
              width={1200}
              height={391}
              className="h-auto w-[148px] object-contain sm:w-[168px]"
            />

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Coming soon</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">South Africa</p>
            </div>
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
                    One logistics marketplace for work, commercial vehicles, mobile units, drivers and dealerships.
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

      <section className="bg-[#f1efe8] text-black">
        <div className="mx-auto grid w-full max-w-[1500px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative min-h-[420px] overflow-hidden border-b border-black/10 lg:min-h-[660px] lg:border-b-0 lg:border-r">
            <img
              src="/images/contracts-2.jpg"
              alt="South African logistics operation"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-12">
              <p className="max-w-lg text-3xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-4xl">
                Built for the people and businesses that keep the country moving.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between px-5 py-14 sm:px-8 sm:py-16 lg:px-14 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">The platform</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Less searching.
                <br />
                More moving.
              </h2>
              <p className="mt-7 max-w-xl text-base font-semibold leading-8 text-black/58 sm:text-lg">
                LoadLink is being built to bring the important parts of logistics into one focused place — without turning it into another noisy general marketplace.
              </p>
            </div>

            <div className="mt-12 border-t border-black/15">
              {marketplace.map((item) => (
                <div key={item} className="flex items-center justify-between border-b border-black/15 py-4 sm:py-5">
                  <span className="text-xl font-black tracking-[-0.025em] sm:text-2xl">{item}</span>
                  <span className="text-sm font-black text-black/25">↗</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10">
        <img
          src="/images/jobs-2.jpg"
          alt="Commercial logistics in South Africa"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/58 to-transparent" />

        <div className="relative mx-auto flex min-h-[520px] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
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
