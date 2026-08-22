import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  FileText,
  Gauge,
  MessageSquareText,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const benefits = [
  {
    icon: BriefcaseBusiness,
    title: "Find more work",
    copy: "See transport jobs, contracts and recurring commercial opportunities in one logistics-focused marketplace.",
    tools: "Jobs · Contracts · Search",
  },
  {
    icon: Truck,
    title: "Source faster",
    copy: "Find the vehicles, mobile units, drivers and dealerships you need without moving between unrelated platforms.",
    tools: "Vehicles · Units · Drivers · Dealers",
  },
  {
    icon: MessageSquareText,
    title: "Move deals forward",
    copy: "Keep serious enquiries connected to the listing with direct messaging, files, voice notes and notifications.",
    tools: "Messages · Files · Voice notes",
  },
  {
    icon: FileText,
    title: "Work professionally",
    copy: "Create quotes and logistics documents, export branded PDFs and reuse information instead of rebuilding it.",
    tools: "Quotes · PDFs · Business branding",
  },
];

const featureSections = [
  {
    icon: Search,
    title: "Marketplace",
    intro: "Find work, equipment and people.",
    items: [
      "Jobs and transport opportunities",
      "Contracts and recurring work",
      "Commercial vehicles and mobile units",
      "Professional driver profiles",
      "Dealership listings and workspaces",
      "Predictive listing search",
    ],
  },
  {
    icon: MessageSquareText,
    title: "Messaging",
    intro: "Keep the deal connected to the listing.",
    items: [
      "Listing-linked conversations",
      "Images, files and voice notes",
      "Potential-deal conversations",
      "Unread counts and notifications",
      "Conversation archive",
      "Activity status and response time",
    ],
  },
  {
    icon: Wrench,
    title: "Logistics tools",
    intro: "Handle the work before, during and after movement.",
    items: [
      "Rate quotes and cost breakdowns",
      "Trip, collection and delivery briefs",
      "Load checklists and driver handovers",
      "ETA and incident updates",
      "POD and document requests",
      "Payment terms and truck finance calculator",
    ],
  },
  {
    icon: Building2,
    title: "Business tools",
    intro: "Run listings and dealership activity with more control.",
    items: [
      "Dealership workspace",
      "Listing management",
      "Packages and Pro features",
      "Performance insights",
      "Optional business branding",
      "Simple Mode",
    ],
  },
  {
    icon: FileText,
    title: "Documents",
    intro: "Turn working information into something ready to send.",
    items: [
      "LoadLink-branded PDF exports",
      "Optional business or dealership logo",
      "Professional rate quotes",
      "Reusable listing information",
      "Shareable operational documents",
      "Build information once and reuse it",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Trust controls",
    intro: "More context before deciding who to work with.",
    items: [
      "Profile verification",
      "Phone OTP",
      "Identity and document checks",
      "Listing moderation",
      "Reporting and flagging",
      "Login, device and account controls",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#f6b800] selection:text-black">
      <section className="relative min-h-[100svh] overflow-hidden">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(246,184,0,.11),transparent_23%),linear-gradient(90deg,rgba(0,0,0,.98)_0%,rgba(0,0,0,.78)_46%,rgba(0,0,0,.24)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/55" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[82px] items-center justify-between border-b border-white/12">
            <img
              src="/images/loadlink-logo-dark.png"
              alt="LoadLink"
              width={1200}
              height={391}
              className="h-auto w-[148px] object-contain sm:w-[168px]"
            />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Private early access</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">South Africa</p>
            </div>
          </header>

          <div className="flex flex-1 items-center py-16 sm:py-20">
            <div className="max-w-6xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6b800]">Congratulations</p>
              <h1 className="mt-5 max-w-6xl text-[clamp(3.4rem,8.7vw,8.2rem)] font-black leading-[0.84] tracking-[-0.07em]">
                You&apos;ve been selected
                <br />
                <span className="text-white/56">for a complimentary LoadLink trial.</span>
              </h1>

              <div className="mt-8 max-w-4xl border-t border-white/16 pt-6">
                <p className="max-w-3xl text-base font-semibold leading-7 text-white/70 sm:text-lg sm:leading-8">
                  Find work. Source what you need. Manage the enquiry. Create the paperwork. LoadLink brings the important parts of commercial logistics closer together.
                </p>
                <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href={FREE_TRIAL_EMAIL}
                    className="inline-flex min-h-12 w-fit items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
                  >
                    Activate free trial
                  </a>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/42">
                    <BadgeCheck size={16} className="text-[#f6b800]" />
                    Selected business early access
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/12 bg-black/18 backdrop-blur-[2px] sm:grid-cols-3">
            {[
              ["30+", "Gauteng dealerships"],
              ["60+", "Mpumalanga dealerships"],
              ["40+", "Western Cape dealerships"],
            ].map(([number, label]) => (
              <div key={label} className="border-b border-white/10 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5">
                <p className="text-3xl font-black tracking-[-0.05em]">{number}</p>
                <p className="mt-1 text-xs font-bold text-white/46">{label} signed up</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f1eee7] text-black">
        <div className="absolute -right-40 top-0 h-[560px] w-[560px] rounded-full bg-[#f6b800]/7 blur-[130px]" />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-8 border-b border-black/12 pb-10 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.17em] text-black/40">What your business gains</p>
              <h2 className="mt-5 max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl md:text-7xl">
                Less friction between opportunity and action.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-black/56 lg:ml-auto sm:text-lg">
              LoadLink reduces the jumping between classifieds, chats, calculators and documents by keeping more of the commercial workflow in one place.
            </p>
          </div>

          <div className="divide-y divide-black/12">
            {benefits.map(({ icon: Icon, title, copy, tools }, index) => (
              <article key={title} className="grid gap-5 py-8 md:grid-cols-[70px_.75fr_1.2fr_.8fr] md:items-center md:gap-8">
                <div className="flex h-11 w-11 items-center justify-center border border-[#b78600]/25 bg-[#f6b800]/10">
                  <Icon size={21} strokeWidth={1.7} className="text-[#a97800]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-[0.15em] text-black/28">0{index + 1}</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-3xl">{title}</h3>
                </div>
                <p className="max-w-xl text-sm font-semibold leading-7 text-black/56 sm:text-base">{copy}</p>
                <p className="text-xs font-black uppercase leading-6 tracking-[0.08em] text-black/38 md:text-right">{tools}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] text-white">
        <div className="absolute left-[10%] top-[8%] h-[430px] w-[430px] rounded-full bg-[#f6b800]/5 blur-[140px]" />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-8 border-b border-white/12 pb-10 lg:grid-cols-[1.06fr_.94fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.17em] text-[#f6b800]">Inside LoadLink</p>
              <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl md:text-7xl">
                Six parts. One working platform.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-white/52 lg:ml-auto sm:text-lg">
              The feature set is organised around what a logistics business actually needs to do: discover, communicate, operate, document, manage and verify.
            </p>
          </div>

          <div className="mt-4 divide-y divide-white/10">
            {featureSections.map(({ icon: Icon, title, intro, items }) => (
              <article key={title} className="grid gap-6 py-8 lg:grid-cols-[72px_.78fr_1.55fr] lg:items-start lg:gap-8">
                <div className="flex h-11 w-11 items-center justify-center border border-[#f6b800]/22 bg-[#f6b800]/7">
                  <Icon size={20} strokeWidth={1.7} className="text-[#f6b800]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">{title}</h3>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/42">{intro}</p>
                </div>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <div key={item} className="flex gap-3 border-t border-white/10 pt-3 text-sm font-semibold leading-6 text-white/64 sm:text-[15px]">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#f6b800]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f1eee7] text-black">
        <div className="absolute right-[8%] top-[12%] h-[380px] w-[380px] rounded-full bg-[#f6b800]/7 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-[1500px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-black/40">Designed for business use</p>
            <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl">
              Useful after you leave the listing page.
            </h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-2">
            <div className="border-t border-black/14 pt-5">
              <FileText size={22} strokeWidth={1.7} className="text-[#a97800]" />
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Branded documents</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">Turn quotes and operational information into clean LoadLink PDFs with optional business branding.</p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <Gauge size={22} strokeWidth={1.7} className="text-[#a97800]" />
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Performance insight</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">Pro and dealership tools give businesses more visibility into listings and performance.</p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <Building2 size={22} strokeWidth={1.7} className="text-[#a97800]" />
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">Dealership workspace</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">Manage listings and dealership activity from a workspace built for commercial vehicle businesses.</p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <ShieldCheck size={22} strokeWidth={1.7} className="text-[#a97800]" />
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">More context before the deal</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">Verification, moderation and account controls support better-informed business decisions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[70svh] overflow-hidden">
        <img
          src="/images/jobs-2.jpg"
          alt="Commercial logistics in South Africa"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/74" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_50%,rgba(246,184,0,.11),transparent_28%),linear-gradient(90deg,rgba(0,0,0,.98),rgba(0,0,0,.69),rgba(0,0,0,.32))]" />

        <div className="relative mx-auto flex min-h-[70svh] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-5xl">
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-[#f6b800]">Your early access starts here</p>
            <h2 className="mt-5 max-w-5xl text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Put LoadLink to work inside your business.
            </h2>
            <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/62 sm:text-lg">
              Explore the marketplace, messaging, logistics tools, documents, dealership features and trust controls before the public launch.
            </p>
            <a
              href={FREE_TRIAL_EMAIL}
              className="mt-8 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
            >
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
