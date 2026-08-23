type IconName =
  | "briefcase"
  | "truck"
  | "message"
  | "tools"
  | "search"
  | "file"
  | "building"
  | "shield"
  | "gauge";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

function LoadLinkIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
          <path d="M3 12h18" />
          <path d="M10 12v2h4v-2" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 6h11v10H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <path d="M8 10h8M8 13h5" />
        </svg>
      );
    case "tools":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5-5l2.2 2.2-2.8 2.8-2.2-2.2a4 4 0 0 0 5 5l-7.6 7.6a2 2 0 1 0 2.8 2.8l7.6-7.6a4 4 0 0 0 5-5l-2.2 2.2-2.8-2.8 2.2-2.2z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 21V5h10v16M14 9h6v12" />
          <path d="M7 8h2M11 8h1M7 12h2M11 12h1M7 16h2M11 16h1M17 12h1M17 16h1" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v5.5c0 4.7 3 7.6 7.5 9.5 4.5-1.9 7.5-4.8 7.5-9.5V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "gauge":
      return (
        <svg {...common}>
          <path d="M4 18a8 8 0 1 1 16 0" />
          <path d="M12 18l4-5" />
          <path d="M7 15h.01M17 15h.01M12 10h.01" />
        </svg>
      );
  }
}

const businessBenefits: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: "briefcase",
    title: "Find work",
    text: "See transport jobs, contracts and recurring opportunities built around commercial logistics.",
  },
  {
    icon: "truck",
    title: "Source faster",
    text: "Find commercial vehicles, mobile units, professional drivers and dealerships in one place.",
  },
  {
    icon: "message",
    title: "Move deals forward",
    text: "Keep messages, files, voice notes and enquiries connected to the listing that started the deal.",
  },
  {
    icon: "tools",
    title: "Run the work",
    text: "Use practical logistics tools and documents before, during and after the load moves.",
  },
];

const platformAreas: Array<{
  icon: IconName;
  title: string;
  summary: string;
  items: string[];
}> = [
  {
    icon: "search",
    title: "Marketplace",
    summary: "Find the opportunity, equipment and people.",
    items: [
      "Jobs and transport opportunities",
      "Contracts and recurring work",
      "Commercial vehicles and mobile units",
      "Professional driver profiles",
      "Dealership listings",
      "Predictive search and discovery",
    ],
  },
  {
    icon: "message",
    title: "Messaging",
    summary: "Keep serious enquiries in context.",
    items: [
      "Listing-linked conversations",
      "Images and files",
      "Voice notes",
      "Potential deals",
      "Unread notifications",
      "Conversation archive",
    ],
  },
  {
    icon: "tools",
    title: "Logistics tools",
    summary: "Practical tools for day-to-day operations.",
    items: [
      "Rate quotes",
      "Trip briefs",
      "Load checklists",
      "Collection and delivery briefs",
      "Driver handovers",
      "ETA and incident updates",
      "POD and document requests",
      "Cost breakdowns and payment terms",
      "Truck finance calculator",
    ],
  },
  {
    icon: "file",
    title: "Documents",
    summary: "Create information once and send it professionally.",
    items: [
      "LoadLink-branded PDF exports",
      "Optional business or dealership logo",
      "Professional rate quotes",
      "Reusable listing information",
      "Shareable operational documents",
    ],
  },
  {
    icon: "building",
    title: "Dealership & business",
    summary: "More control for businesses managing listings and stock.",
    items: [
      "Dealership workspace",
      "Listing management",
      "Packages and Pro features",
      "Performance insights",
      "Business branding",
      "Simple Mode",
    ],
  },
  {
    icon: "shield",
    title: "Trust & account controls",
    summary: "More context before deciding who to work with.",
    items: [
      "Profile verification",
      "Phone OTP",
      "Identity and document checks",
      "Listing moderation",
      "Reporting and flagging",
      "Login and device activity",
      "Account controls",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white selection:bg-[#f6b800] selection:text-black">
      <section className="relative min-h-[92svh] overflow-hidden border-b border-white/10">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-black/58" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/76 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-transparent to-black/34" />

        <div className="relative z-10 mx-auto flex min-h-[92svh] w-full max-w-[1440px] flex-col px-5 sm:px-8 lg:px-10">
          <header className="flex h-[76px] items-center justify-between border-b border-white/12">
            <img
              src="/images/loadlink-logo-dark.png"
              alt="LoadLink"
              width={1200}
              height={391}
              className="h-auto w-[146px] object-contain sm:w-[160px]"
            />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Private early access</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">South Africa</p>
            </div>
          </header>

          <div className="flex flex-1 items-center py-14 sm:py-18">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Congratulations</p>
              <h1 className="mt-4 text-[clamp(3rem,7vw,6.8rem)] font-black leading-[0.9] tracking-[-0.058em]">
                Your business has been selected for complimentary LoadLink access.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-white/68 sm:text-lg sm:leading-8">
                Find work, source what you need, manage enquiries and use practical logistics tools from one focused platform.
              </p>
              <a
                href={FREE_TRIAL_EMAIL}
                className="mt-7 inline-flex min-h-12 items-center justify-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
              >
                Activate free trial
              </a>
            </div>
          </div>

          <div className="grid border-t border-white/12 bg-black/28 sm:grid-cols-3">
            {[
              ["30+", "Gauteng dealerships"],
              ["60+", "Mpumalanga dealerships"],
              ["40+", "Western Cape dealerships"],
            ].map(([number, label]) => (
              <div
                key={label}
                className="border-b border-white/10 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5"
              >
                <p className="text-2xl font-black tracking-[-0.045em] text-white">{number}</p>
                <p className="mt-1 text-xs font-bold text-white/44">{label} signed up</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f4f0] text-black">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-8 border-b border-black/12 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">What LoadLink does for your business</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                One place between finding the opportunity and getting the work done.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-semibold leading-8 text-black/55 lg:ml-auto">
              LoadLink keeps more of the commercial logistics workflow together, reducing the need to jump between classifieds, message threads, calculators and documents.
            </p>
          </div>

          <div className="grid border-b border-black/12 md:grid-cols-2 xl:grid-cols-4">
            {businessBenefits.map(({ icon, title, text }) => (
              <article
                key={title}
                className="border-b border-black/12 py-7 md:border-r md:px-6 md:first:pl-0 md:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0 xl:last:pr-0"
              >
                <LoadLinkIcon name={icon} className="text-[#a87900]" />
                <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/55">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0b0b0b] text-white">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-8 border-b border-white/12 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Inside LoadLink</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                The features your business can actually use.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-semibold leading-8 text-white/48 lg:ml-auto">
              Six focused areas cover discovery, communication, operations, documents, business management and trust.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {platformAreas.map(({ icon, title, summary, items }) => (
              <article key={title} className="grid gap-6 py-8 lg:grid-cols-[230px_1fr] lg:gap-10">
                <div>
                  <div className="flex items-center gap-3">
                    <LoadLinkIcon name={icon} className="shrink-0 text-[#f6b800]" />
                    <h3 className="text-xl font-black tracking-[-0.025em]">{title}</h3>
                  </div>
                  <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-white/42">{summary}</p>
                </div>

                <div className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <div key={item} className="border-t border-white/10 py-3 text-sm font-semibold leading-6 text-white/66">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f4f0] text-black">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/42">Built for business use</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-5xl">
              Useful beyond the listing page.
            </h2>
          </div>

          <div className="grid gap-7 sm:grid-cols-2">
            <div className="border-t border-black/14 pt-5">
              <LoadLinkIcon name="file" className="text-[#a87900]" />
              <h3 className="mt-4 text-lg font-black">Branded documents</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">
                Turn rate quotes and operational information into clean LoadLink PDFs with optional business or dealership branding.
              </p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <LoadLinkIcon name="gauge" className="text-[#a87900]" />
              <h3 className="mt-4 text-lg font-black">Performance insight</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">
                Pro and dealership tools add visibility into listings, activity and performance.
              </p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <LoadLinkIcon name="building" className="text-[#a87900]" />
              <h3 className="mt-4 text-lg font-black">Dealership workspace</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">
                Manage dealership listings and enquiries from a workspace built around commercial stock.
              </p>
            </div>
            <div className="border-t border-black/14 pt-5">
              <LoadLinkIcon name="shield" className="text-[#a87900]" />
              <h3 className="mt-4 text-lg font-black">Trust controls</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-black/54">
                Verification, moderation and account controls provide more context before a business relationship moves forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[58svh] overflow-hidden border-t border-white/10">
        <img
          src="/images/jobs-2.jpg"
          alt="Commercial logistics in South Africa"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/74 to-black/30" />

        <div className="relative mx-auto flex min-h-[58svh] w-full max-w-[1440px] items-center px-5 py-16 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Your access is ready</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              See how LoadLink fits into the way your business already works.
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/58">
              Activate your complimentary trial and explore the marketplace, tools and business features before public launch.
            </p>
            <a
              href={FREE_TRIAL_EMAIL}
              className="mt-7 inline-flex min-h-12 items-center justify-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]"
            >
              Activate free trial
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#080808] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between">
          <img
            src="/images/loadlink-logo-dark.png"
            alt="LoadLink"
            width={1200}
            height={391}
            className="h-auto w-[130px] object-contain"
          />
          <div className="text-sm font-semibold text-white/40 sm:text-right">
            <a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">
              loadlinksouthafrica@gmail.com
            </a>
            <p className="mt-1 text-xs text-white/24">Private early access · South Africa</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
