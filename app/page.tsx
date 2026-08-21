const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const MARKETPLACE = [
  "Jobs and transport opportunities",
  "Contracts and recurring work",
  "Commercial vehicles and mobile units",
  "Professional driver profiles",
  "Dealership listings and workspaces",
  "Predictive search and listing discovery",
];

const OPERATIONS = [
  "Direct listing-linked messaging",
  "Images, files and voice notes",
  "Potential-deal conversations",
  "Rate quotes and branded PDF exports",
  "Trip, collection and delivery briefs",
  "Load checklists and driver handovers",
  "ETA, incident and POD updates",
  "Cost breakdowns and payment terms",
  "Truck finance calculator",
];

const BUSINESS = [
  "Optional business and dealership branding",
  "Quote reuse from existing listings",
  "Dealership workspace and listing management",
  "Packages, Pro analytics and performance insights",
  "Profile verification and phone OTP",
  "Identity and document checks",
  "Listing moderation, reporting and account controls",
  "Login and device activity",
  "Simple Mode",
];

function SimpleList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className={`border-t ${dark ? "border-white/14" : "border-black/14"}`}>
      {items.map((item) => (
        <li
          key={item}
          className={`border-b py-3.5 text-sm font-bold leading-6 sm:text-base ${dark ? "border-white/14 text-white/76" : "border-black/14 text-black/70"}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#f6b800] selection:text-black">
      <section className="relative min-h-[100svh] overflow-hidden">
        <img src="/images/truck-1.jpg" alt="Commercial truck on the road" className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center" />
        <div className="absolute inset-0 bg-black/54" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(246,184,0,.13),transparent_24%),linear-gradient(90deg,rgba(0,0,0,.96)_0%,rgba(0,0,0,.70)_45%,rgba(0,0,0,.18)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/58" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[82px] items-center justify-between border-b border-white/14">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[148px] object-contain sm:w-[168px]" />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Private early access</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/42">South Africa</p>
            </div>
          </header>

          <div className="flex flex-1 items-center py-16 sm:py-20">
            <div className="max-w-6xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6b800]">Congratulations</p>
              <h1 className="mt-5 max-w-6xl text-[clamp(3.6rem,8.8vw,8.4rem)] font-black leading-[0.84] tracking-[-0.068em]">
                You&apos;ve been selected
                <br />
                <span className="text-white/58">for a complimentary LoadLink trial.</span>
              </h1>

              <div className="mt-8 max-w-4xl border-t border-white/18 pt-6">
                <p className="max-w-3xl text-base font-semibold leading-7 text-white/72 sm:text-lg sm:leading-8">
                  Your business has been selected for early access to LoadLink — a focused South African logistics marketplace built to help businesses find opportunities, source vehicles and people, manage enquiries and handle practical day-to-day logistics work in one place.
                </p>
                <a href={FREE_TRIAL_EMAIL} className="mt-7 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]">
                  Activate free trial
                </a>
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/14 bg-black/18 backdrop-blur-[2px] sm:grid-cols-3">
            <div className="border-b border-white/12 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
              <p className="text-3xl font-black tracking-[-0.05em]">30+</p>
              <p className="mt-1 text-xs font-bold text-white/48">Gauteng dealerships signed up</p>
            </div>
            <div className="border-b border-white/12 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
              <p className="text-3xl font-black tracking-[-0.05em]">60+</p>
              <p className="mt-1 text-xs font-bold text-white/48">Mpumalanga dealerships signed up</p>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="text-3xl font-black tracking-[-0.05em]">40+</p>
              <p className="mt-1 text-xs font-bold text-white/48">Western Cape dealerships signed up</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f0ede5] text-black">
        <div className="absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-[#f6b800]/8 blur-[120px]" />
        <div className="relative mx-auto grid min-h-[80svh] w-full max-w-[1500px] lg:grid-cols-[0.86fr_1.14fr]">
          <div className="flex flex-col justify-between border-b border-black/12 px-5 py-14 sm:px-8 sm:py-16 lg:border-b-0 lg:border-r lg:px-12 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">What LoadLink changes</p>
              <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                One place to move the deal forward.
              </h2>
            </div>
            <p className="mt-10 max-w-xl text-base font-semibold leading-8 text-black/56 sm:text-lg">
              Instead of splitting work between classifieds, chats, spreadsheets, calculators and documents, LoadLink brings the important commercial logistics steps closer together.
            </p>
          </div>

          <div className="px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="border-t border-black/16 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/38">Find opportunity</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Jobs, contracts and recurring commercial work.</p>
              </div>
              <div className="border-t border-black/16 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/38">Source what you need</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Vehicles, mobile units, drivers and dealerships.</p>
              </div>
              <div className="border-t border-black/16 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/38">Manage the enquiry</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Keep conversations, files and deal context connected to the listing.</p>
              </div>
              <div className="border-t border-black/16 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-black/38">Operate professionally</p>
                <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em]">Quotes, logistics tools, business documents and branded PDFs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] text-white">
        <div className="absolute left-[12%] top-[8%] h-[420px] w-[420px] rounded-full bg-[#f6b800]/7 blur-[130px]" />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-9 border-b border-white/14 pb-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">What your trial gives you access to</p>
              <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">
                A working logistics platform. Not another classifieds page.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-white/55 lg:ml-auto sm:text-lg">
              The platform is designed around the commercial workflow: discover, communicate, document, manage and move.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-white/34">Marketplace</p>
              <SimpleList items={MARKETPLACE} dark />
            </div>
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-white/34">Operations and tools</p>
              <SimpleList items={OPERATIONS} dark />
            </div>
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-white/34">Business and trust</p>
              <SimpleList items={BUSINESS} dark />
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[72svh] overflow-hidden">
        <img src="/images/jobs-2.jpg" alt="Commercial logistics in South Africa" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(246,184,0,.12),transparent_28%),linear-gradient(90deg,rgba(0,0,0,.97),rgba(0,0,0,.67),rgba(0,0,0,.30))]" />

        <div className="relative mx-auto flex min-h-[72svh] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-5xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Your early access starts here</p>
            <h2 className="mt-5 max-w-5xl text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              See where LoadLink fits into your business before the public launch.
            </h2>
            <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/64 sm:text-lg">
              Activate your complimentary trial and explore the marketplace, operational tools and business features selected for early access.
            </p>
            <a href={FREE_TRIAL_EMAIL} className="mt-8 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]">
              Activate free trial
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between">
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[132px] object-contain" />
          <div className="text-sm font-semibold text-white/42 sm:text-right">
            <a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">loadlinksouthafrica@gmail.com</a>
            <p className="mt-1 text-xs text-white/25">Private early access · South Africa</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
