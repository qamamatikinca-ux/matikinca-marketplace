const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Business%20Free%20Trial%20Application&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20apply%20for%20early%20business%20access%20and%20a%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const marketplaceFeatures = [
  "Jobs and transport opportunities",
  "Contracts and recurring work",
  "Commercial vehicles and mobile units",
  "Professional driver profiles",
  "Dealership listings and workspaces",
  "Predictive search and discovery",
  "Featured and sponsored listings",
  "Recently viewed and listing management",
];

const dealFeatures = [
  "Direct listing-linked messaging",
  "Images, files and voice notes",
  "Potential-deal conversations",
  "Conversation archive",
  "Unread counts and notifications",
  "Activity status and response time",
];

const logisticsTools = [
  "Rate quotes",
  "Trip briefs",
  "Load checklists",
  "Collection briefs",
  "Delivery briefs",
  "Driver handovers",
  "ETA updates",
  "Incident updates",
  "Cost breakdowns",
  "Payment terms",
  "POD requests",
  "Document requests",
  "Truck finance calculator",
];

const trustFeatures = [
  "Profile verification",
  "Phone OTP",
  "Identity and document checks",
  "Listing moderation",
  "Reporting and flagging",
  "Login and device activity",
  "Account controls",
  "Simple Mode",
];

function FeatureLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="border-b border-current/15 py-3.5 text-sm font-bold leading-6 sm:text-base">
      {children}
    </li>
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
        <div className="absolute inset-0 bg-black/46" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/74 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-transparent to-black/58" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[82px] items-center justify-between border-b border-white/15">
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

          <div className="flex flex-1 items-end pb-9 pt-20 sm:pb-12 lg:pb-14">
            <div className="w-full max-w-6xl">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/56">A new commercial logistics marketplace</p>
              <h1 className="mt-5 max-w-6xl text-[clamp(3.8rem,9.3vw,8.9rem)] font-black leading-[0.82] tracking-[-0.072em]">
                Move business.
                <br />
                <span className="text-[#f6b800]">Not admin.</span>
              </h1>

              <div className="mt-8 grid max-w-5xl gap-6 border-t border-white/20 pt-6 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="max-w-3xl text-base font-semibold leading-7 text-white/74 sm:text-lg sm:leading-8">
                    LoadLink brings jobs, contracts, commercial vehicles, mobile units, drivers, dealerships and practical logistics tools into one focused South African marketplace.
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.09em] text-white/40 sm:text-sm">
                    Built for operators, fleet owners, dealerships, mobile-unit businesses and professional drivers.
                  </p>
                </div>
                <a
                  href={FREE_TRIAL_EMAIL}
                  className="inline-flex min-h-12 w-fit items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
                >
                  Apply for free trial
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1efe8] text-black">
        <div className="mx-auto grid min-h-[82svh] w-full max-w-[1500px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between border-b border-black/12 px-5 py-14 sm:px-8 sm:py-16 lg:border-b-0 lg:border-r lg:px-12 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">01 / The business case</p>
              <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                One place to find the opportunity, the equipment and the people behind the job.
              </h2>
            </div>
            <p className="mt-10 max-w-xl text-base font-semibold leading-8 text-black/58 sm:text-lg">
              Logistics work is often split across classifieds, message threads, spreadsheets, calculators and documents. LoadLink is being built to bring the important parts closer together so businesses can discover, communicate and act with less friction.
            </p>
          </div>

          <div className="flex flex-col justify-between px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="border-t border-black/18 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/40">Find work</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Discover jobs and contracts built around commercial logistics.</p>
              </div>
              <div className="border-t border-black/18 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/40">Source faster</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Find vehicles, mobile units, drivers and dealerships without leaving the ecosystem.</p>
              </div>
              <div className="border-t border-black/18 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/40">Deal directly</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Keep communication tied to the listing and move a serious enquiry forward.</p>
              </div>
              <div className="border-t border-black/18 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/40">Work professionally</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Create useful logistics documents and branded PDFs instead of rebuilding them from scratch.</p>
              </div>
            </div>

            <div className="mt-14 border-t border-black/16 pt-7">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-black/40">Early dealership network</p>
              <div className="mt-5 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">30+</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-black/50 sm:text-sm">Gauteng dealerships</p>
                </div>
                <div>
                  <p className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">60+</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-black/50 sm:text-sm">Mpumalanga dealerships</p>
                </div>
                <div>
                  <p className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">40+</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-black/50 sm:text-sm">Western Cape dealerships</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#050505] text-white">
        <div className="mx-auto grid min-h-[86svh] w-full max-w-[1500px] lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative min-h-[460px] overflow-hidden border-b border-white/10 lg:min-h-full lg:border-b-0 lg:border-r">
            <img src="/images/contracts-2.jpg" alt="Logistics operation" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/42" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/12 to-black/18" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-12">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">02 / Marketplace and deal flow</p>
              <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                From discovery to conversation, without losing the context of the deal.
              </h2>
            </div>
          </div>

          <div className="px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <p className="max-w-xl text-base font-semibold leading-8 text-white/58 sm:text-lg">
              LoadLink is not being designed as a general classifieds page. The marketplace is centred on commercial logistics, with communication and listing management built around the work itself.
            </p>

            <div className="mt-10 grid gap-9 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.13em] text-white/34">Marketplace</p>
                <ul className="mt-3 border-t border-white/15 text-white/78">
                  {marketplaceFeatures.map((feature) => <FeatureLine key={feature}>{feature}</FeatureLine>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.13em] text-white/34">Messages and deal flow</p>
                <ul className="mt-3 border-t border-white/15 text-white/78">
                  {dealFeatures.map((feature) => <FeatureLine key={feature}>{feature}</FeatureLine>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1efe8] text-black">
        <div className="mx-auto min-h-[88svh] w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-9 border-b border-black/15 pb-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">03 / Tools that work beyond the listing</p>
              <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                Useful before the load moves. Useful while it moves. Useful after delivery.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-black/58 lg:ml-auto sm:text-lg">
              LoadLink includes practical operating tools for the moments between finding a job and completing it. Build the information once, then copy, share or turn it into a professional document.
            </p>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.13em] text-black/42">Logistics tools</p>
              <div className="mt-4 grid border-t border-black/15 sm:grid-cols-2">
                {logisticsTools.map((tool, index) => (
                  <div key={tool} className={`border-b border-black/15 py-4 ${index % 2 === 0 ? "sm:border-r sm:pr-6" : "sm:pl-6"}`}>
                    <p className="text-base font-black tracking-[-0.02em]">{tool}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-black/15 pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-black/42">Business documents</p>
              <h3 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl">Turn working information into something you can send with your name on it.</h3>
              <p className="mt-6 text-base font-semibold leading-8 text-black/58">
                Rate quotes can become clean LoadLink-branded PDF documents, with an optional business or dealership logo. Existing listing information can be reused to reduce repetitive admin, and operational documents can be shared outside LoadLink when the job requires it.
              </p>
              <div className="mt-8 border-y border-black/15 py-5 text-sm font-black leading-7 text-black/72 sm:text-base">
                LoadLink PDF exports / Optional business branding / Quote reuse / Shareable operational documents / Dealership workspace / Listing management / Packages / Pro analytics and performance insights
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] text-white">
        <div className="mx-auto grid min-h-[78svh] w-full max-w-[1500px] lg:grid-cols-[.9fr_1.1fr]">
          <div className="flex flex-col justify-between border-b border-white/10 px-5 py-14 sm:px-8 sm:py-16 lg:border-b-0 lg:border-r lg:px-12 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">04 / More context before the deal</p>
              <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                Trust should not start after money changes hands.
              </h2>
            </div>
            <p className="mt-10 max-w-xl text-base font-semibold leading-8 text-white/56 sm:text-lg">
              LoadLink is being prepared with verification, moderation and account controls that give users more information before deciding who to work with. These controls support better decisions; they do not replace normal business due diligence.
            </p>
          </div>

          <div className="px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <ul className="border-t border-white/15 text-white/78 sm:grid sm:grid-cols-2">
              {trustFeatures.map((feature, index) => (
                <li key={feature} className={`border-b border-white/15 py-5 text-lg font-black tracking-[-0.025em] ${index % 2 === 0 ? "sm:border-r sm:pr-6" : "sm:pl-6"}`}>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-12 border-t border-white/15 pt-7">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-white/34">Designed for different businesses</p>
              <p className="mt-4 max-w-3xl text-2xl font-black leading-9 tracking-[-0.035em] text-white/82 sm:text-3xl sm:leading-10">
                From a single truck owner looking for the next opportunity to a dealership managing stock, enquiries and performance, LoadLink is being built to scale with the way the business actually works.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[72svh] overflow-hidden border-b border-white/10">
        <img src="/images/jobs-2.jpg" alt="Commercial logistics in South Africa" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/96 via-black/66 to-black/20" />
        <div className="relative mx-auto flex min-h-[72svh] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-5xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Early business access</p>
            <h2 className="mt-5 max-w-5xl text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Get your business in before LoadLink opens to the market.
            </h2>
            <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/66 sm:text-lg">
              Free-trial applications are open for businesses and professionals that want early access to the LoadLink marketplace and tools.
            </p>
            <a href={FREE_TRIAL_EMAIL} className="mt-8 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]">
              Apply for free trial
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[132px] object-contain" />
          <div className="text-sm font-semibold text-white/45 sm:text-right">
            <a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">loadlinksouthafrica@gmail.com</a>
            <p className="mt-1 text-xs text-white/28">South African commercial logistics marketplace. Coming soon.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
