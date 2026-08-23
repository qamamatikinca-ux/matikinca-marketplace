type IconName = "market" | "message" | "tools" | "file" | "business" | "shield" | "arrow";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const INSTAGRAM_URL =
  "https://www.instagram.com/loadlinkza?igsi=MW02bms4enA2YXhoMw%3D%3D&utm_source=qr";
const LINKEDIN_URL =
  "https://www.linkedin.com/in/loadlink-sa-102b763a1?utm_source=share_via&utm_content=profile&utm_medium=member_ios";

const platform = [
  {
    icon: "market" as IconName,
    title: "Marketplace",
    copy: "Jobs, contracts, commercial vehicles, mobile units, drivers and dealerships.",
  },
  {
    icon: "message" as IconName,
    title: "Messaging",
    copy: "Listing-linked conversations with files, images, voice notes and deal context.",
  },
  {
    icon: "tools" as IconName,
    title: "Logistics tools",
    copy: "Quotes, trip briefs, checklists, handovers, cost breakdowns and planning tools.",
  },
  {
    icon: "file" as IconName,
    title: "Documents",
    copy: "Professional LoadLink PDF exports with reusable business information.",
  },
  {
    icon: "business" as IconName,
    title: "Business tools",
    copy: "Dealership workspace, listing management, branding and performance insights.",
  },
  {
    icon: "shield" as IconName,
    title: "Trust controls",
    copy: "Verification, moderation, reporting and account activity controls.",
  },
];

const stats = [
  ["30+", "Gauteng dealerships"],
  ["60+", "Mpumalanga dealerships"],
  ["40+", "Western Cape dealerships"],
] as const;

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "market") {
    return (
      <svg {...common}>
        <path d="M4 6.5h16l-1 4.5H5L4 6.5Z" />
        <path d="M6 11v8h12v-8M9 19v-5h6v5M7 6.5 8.5 3h7L17 6.5" />
      </svg>
    );
  }
  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M8 10h8M8 13h5" />
      </svg>
    );
  }
  if (name === "tools") {
    return (
      <svg {...common}>
        <path d="M14.5 6.5a4 4 0 0 0-5-5l2.1 2.1-2.8 2.8-2.1-2.1a4 4 0 0 0 5 5l-7.4 7.4a2 2 0 1 0 2.8 2.8l7.4-7.4a4 4 0 0 0 5-5l-2.1 2.1-2.8-2.8 2.1-2.1Z" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }
  if (name === "business") {
    return (
      <svg {...common}>
        <path d="M4 21V5h10v16M14 9h6v12" />
        <path d="M7 9h3M7 13h3M7 17h3M17 13h1M17 17h1" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 4.5 6v5.5c0 4.7 3 7.6 7.5 9.5 4.5-1.9 7.5-4.8 7.5-9.5V6L12 3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function GlassLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-semibold text-white/65 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
    >
      {label}
    </a>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070809] text-white selection:bg-[#f6b800] selection:text-black">
      <section id="overview" className="relative min-h-[94svh] overflow-hidden">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-[64%_center] opacity-45 sm:object-center"
        />
        <div className="absolute inset-0 bg-[#050607]/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050607] via-[#050607]/76 to-[#050607]/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-transparent to-[#050607]/35" />

        <div className="relative z-10 mx-auto flex min-h-[94svh] w-full max-w-[1440px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
          <header className="sticky top-4 z-40 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <a href="#overview" aria-label="LoadLink home" className="shrink-0">
                <img
                  src="/images/loadlink-logo-dark.png"
                  alt="LoadLink"
                  width={1200}
                  height={391}
                  className="h-auto w-[142px] object-contain sm:w-[158px]"
                />
              </a>

              <nav className="hidden items-center gap-2 md:flex">
                <GlassLink href="#platform" label="Platform" />
                <GlassLink href="#why" label="Why LoadLink" />
                <GlassLink href="#follow" label="Follow" />
              </nav>

              <a
                href={FREE_TRIAL_EMAIL}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f6b800] px-4 text-xs font-black text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b] sm:px-5 sm:text-sm"
              >
                Free trial
              </a>
            </div>
          </header>

          <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.06fr_.94fr] lg:items-center lg:py-14">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-white/68 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" />
                Selected early access
              </div>

              <h1 className="mt-6 max-w-4xl text-[clamp(3rem,7.6vw,6.8rem)] font-black leading-[0.9] tracking-[-0.06em] text-white">
                Logistics business,
                <br />
                better connected.
              </h1>

              <p className="mt-6 max-w-2xl text-[15px] font-medium leading-7 text-white/66 sm:text-lg sm:leading-8">
                Find opportunities, source capacity, manage enquiries and create the documents needed to keep work moving — from one focused platform.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={FREE_TRIAL_EMAIL}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f6b800] px-6 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b]"
                >
                  Activate free trial
                  <Icon name="arrow" className="h-4 w-4" />
                </a>
                <a
                  href="#platform"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-white/[0.055] px-6 text-sm font-bold text-white/80 backdrop-blur-xl transition hover:border-white/22 hover:bg-white/[0.09] hover:text-white"
                >
                  Explore platform
                </a>
              </div>
            </div>

            <aside className="lg:justify-self-end lg:max-w-[520px]">
              <div className="rounded-[30px] border border-white/12 bg-black/34 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-5">
                <div className="border-b border-white/10 pb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/44">Your invitation</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.035em] sm:text-3xl">
                    Complimentary access before public launch.
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/52">
                    Explore LoadLink with your business and see where it fits before rollout.
                  </p>
                </div>

                <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {stats.map(([value, label]) => (
                    <div key={label} className="py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                      <p className="text-2xl font-black tracking-[-0.04em]">{value}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            <GlassLink href="#platform" label="Platform" />
            <GlassLink href="#why" label="Why LoadLink" />
            <GlassLink href="#follow" label="Follow" />
          </div>
        </div>
      </section>

      <section id="platform" className="relative scroll-mt-24 border-t border-white/8 py-16 sm:py-20">
        <img
          src="/images/jobs-2.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.09]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070809]/95 via-[#070809]/88 to-[#070809]" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-5 border-b border-white/10 pb-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">The platform</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Six useful parts. One clean workflow.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-7 text-white/52 lg:ml-auto sm:text-base">
              No fake dashboard, no feature theatre. LoadLink keeps the marketplace and the practical work around it close together.
            </p>
          </div>

          <div className="grid gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-3">
            {platform.map((item, index) => (
              <a
                key={item.title}
                href={`#feature-${index + 1}`}
                id={`feature-${index + 1}`}
                className="group rounded-[26px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/12 bg-black/25 text-white/82 transition group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </div>
                  <Icon name="arrow" className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-white/52">{item.copy}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Why LoadLink</p>
                <h2 className="mt-3 text-4xl font-black leading-[0.96] tracking-[-0.05em] sm:text-5xl">
                  Less jumping between tools. More time on the work.
                </h2>
                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/52 sm:text-base">
                  LoadLink is designed to reduce the distance between finding an opportunity and actually moving it forward.
                </p>
              </div>

              <div className="divide-y divide-white/10 border-y border-white/10">
                {[
                  ["01", "More visibility", "Put listings and business profiles in front of people already looking for logistics opportunities and capacity."],
                  ["02", "Less admin", "Keep enquiries, operational documents and key logistics information closer to the listing that started the work."],
                  ["03", "Faster decisions", "Use practical tools and clearer business context to move from enquiry to action without unnecessary friction."],
                ].map(([number, title, copy]) => (
                  <div key={number} className="grid gap-3 py-5 sm:grid-cols-[48px_170px_1fr] sm:items-start sm:gap-5">
                    <span className="text-xs font-bold text-white/28">{number}</span>
                    <h3 className="text-base font-black tracking-[-0.02em]">{title}</h3>
                    <p className="text-sm font-medium leading-6 text-white/48">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="follow" className="scroll-mt-24 pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/25 p-5 backdrop-blur-2xl sm:p-8">
            <img
              src="/images/truck-1.jpg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090a0b]/98 via-[#090a0b]/90 to-[#090a0b]/76" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Follow LoadLink</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Stay close to the launch.</h2>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/50">
                  Platform progress, dealership onboarding and launch updates.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-[210px] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <img
                    src="/images/instagram-badge-upscaled.webp"
                    alt="Instagram"
                    className="h-12 w-12 rounded-[14px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">Instagram</p>
                    <p className="truncate text-xs font-medium text-white/42">@loadlinkza</p>
                  </div>
                  <Icon name="arrow" className="h-4 w-4 text-white/34 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                </a>

                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-[210px] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <img
                    src="/images/linkedin-badge-upscaled.webp"
                    alt="LinkedIn"
                    className="h-12 w-12 rounded-[14px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">LinkedIn</p>
                    <p className="truncate text-xs font-medium text-white/42">LoadLink SA</p>
                  </div>
                  <Icon name="arrow" className="h-4 w-4 text-white/34 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">Your complimentary access is ready.</h2>
            <p className="mt-2 text-sm font-medium text-white/45">See how LoadLink fits into the way your business already works.</p>
          </div>
          <a
            href={FREE_TRIAL_EMAIL}
            className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#f6b800] px-6 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b] lg:self-auto"
          >
            Activate free trial
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-black/20">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <img
            src="/images/loadlink-logo-dark.png"
            alt="LoadLink"
            width={1200}
            height={391}
            className="h-auto w-[126px] object-contain"
          />
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-white/35">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="transition hover:text-white">Instagram</a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="transition hover:text-white">LinkedIn</a>
            <a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">Email</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
