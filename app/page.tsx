import LaunchConfetti from "./launch-confetti";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const INSTAGRAM_URL =
  "https://www.instagram.com/loadlinkza?igsi=MW02bms4enA2YXhoMw%3D%3D&utm_source=qr";
const LINKEDIN_URL =
  "https://www.linkedin.com/in/loadlink-sa-102b763a1?utm_source=share_via&utm_content=profile&utm_medium=member_ios";

type IconName = "market" | "message" | "tools" | "file" | "business" | "shield";

const features: Array<{
  icon: IconName;
  title: string;
  description: string;
  detail: string;
}> = [
  {
    icon: "market",
    title: "Marketplace",
    description: "Jobs, contracts, vehicles, mobile units, drivers and dealerships in one logistics-focused marketplace.",
    detail: "Instead of moving between general classifieds, groups and separate supplier lists, LoadLink keeps commercial logistics discovery in one place so a business can move from opportunity to capacity faster.",
  },
  {
    icon: "message",
    title: "Messaging",
    description: "Keep enquiries attached to the listing or opportunity that started them.",
    detail: "Conversations can carry images, files and voice notes while preserving the context of the job, vehicle, contract or dealership enquiry, making follow-up easier and reducing repeated questions.",
  },
  {
    icon: "tools",
    title: "Logistics tools",
    description: "Operational tools for the work that starts after an enquiry becomes real.",
    detail: "Create rate quotes, trip briefs, load checklists, delivery notes, handovers, ETA updates, cost breakdowns, payment terms and other practical logistics documents from one toolkit.",
  },
  {
    icon: "file",
    title: "Documents",
    description: "Turn information already on LoadLink into clean, reusable business documents.",
    detail: "Export quotes and operational information as professional LoadLink-branded PDFs and reuse vehicle, route or business details instead of entering the same information repeatedly.",
  },
  {
    icon: "business",
    title: "Dealership & business tools",
    description: "Manage commercial stock, listings, enquiries and business visibility from one workspace.",
    detail: "Dealership and Pro tools are designed for businesses that need more than a basic listing page, including structured listing management, business presentation and performance visibility.",
  },
  {
    icon: "shield",
    title: "Trust & controls",
    description: "More context and accountability before users decide to work together.",
    detail: "Profile verification, phone OTP, moderation, reporting, flagging and account activity controls add structure to the marketplace while still requiring normal commercial due diligence.",
  },
];

function PlatformIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };

  if (name === "market") {
    return (
      <svg {...common}>
        <path d="M4 8h16l-1.2 4H5.2L4 8Z" />
        <path d="M6 12v7h12v-7M9 19v-4h6v4M7 8l1.5-4h7L17 8" />
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
  return (
    <svg {...common}>
      <path d="M12 3 4.5 6v5.5c0 4.7 3 7.6 7.5 9.5 4.5-1.9 7.5-4.8 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="currentColor">
      <rect x="4" y="9" width="3.4" height="11" rx=".5" />
      <circle cx="5.7" cy="5.7" r="1.8" />
      <path d="M10 9h3.2v1.5h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.3 4.3 5.4v6h-3.4v-5.3c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V20H10V9Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090a] text-white selection:bg-[#f6b800] selection:text-black">
      <LaunchConfetti />

      <section className="relative min-h-[92svh] overflow-hidden border-b border-white/[0.07]">
        <img src="/images/truck-1.jpg" alt="Commercial truck" className="absolute inset-0 h-full w-full object-cover object-[65%_center] opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090a] via-[#08090a]/85 to-[#08090a]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090a] via-transparent to-black/35" />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-[1280px] flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.09] pb-4">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[138px] sm:w-[154px]" />
            <a href={FREE_TRIAL_EMAIL} className="rounded-full bg-[#f6b800] px-4 py-2.5 text-xs font-medium text-black sm:px-5 sm:text-sm">
              Free trial
            </a>
          </header>

          <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:py-16">
            <div className="max-w-4xl self-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">Selected early access</p>
              <h1 className="mt-5 text-[clamp(3rem,7vw,6rem)] font-medium leading-[0.94] tracking-[-0.055em]">
                Logistics business,
                <br />better connected.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-white/62 sm:text-lg sm:leading-8">
                LoadLink brings marketplace discovery, enquiries, commercial vehicles, drivers, logistics tools and business documents into one focused platform built around the way logistics work actually moves.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={FREE_TRIAL_EMAIL} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-medium text-black sm:w-auto">
                  Activate free trial
                </a>
                <a href="#platform" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 px-6 text-sm text-white/68 transition hover:bg-white/[0.05] hover:text-white sm:w-auto">
                  Explore the platform
                </a>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 lg:max-w-[470px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="text-sm leading-6 text-white/48">Congratulations — your business has been selected for complimentary early access before public launch.</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div><p className="text-2xl font-medium">30+</p><p className="mt-1 text-[11px] text-white/38">Gauteng</p></div>
                <div><p className="text-2xl font-medium">60+</p><p className="mt-1 text-[11px] text-white/38">Mpumalanga</p></div>
                <div><p className="text-2xl font-medium">40+</p><p className="mt-1 text-[11px] text-white/38">Western Cape</p></div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-white/28">Dealerships signed up across the selected trial regions.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative border-b border-white/[0.07] py-16 sm:py-20">
        <img src="/images/jobs-2.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.05]" />
        <div className="absolute inset-0 bg-[#08090a]/95" />
        <div className="relative z-10 mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.17em] text-white/34">Inside LoadLink</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-5xl">What your business can actually use.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
              Six practical parts, each with a clear purpose. No feature theatre and no dashboard clutter.
            </p>
          </div>

          <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {features.map((item) => (
              <div key={item.title} className="grid gap-4 py-7 sm:grid-cols-[54px_0.8fr_1.2fr] sm:items-start sm:gap-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/75">
                  <PlatformIcon name={item.icon} />
                </div>
                <div>
                  <h3 className="text-lg font-medium tracking-[-0.02em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/48">{item.description}</p>
                </div>
                <p className="text-sm leading-7 text-white/58 sm:text-[15px]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.17em] text-white/34">Why it matters</p>
            <h2 className="mt-3 text-3xl font-medium leading-[1.02] tracking-[-0.04em] sm:text-5xl">Useful before, during and after a deal.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div><h3 className="text-base font-medium">Find</h3><p className="mt-2 text-sm leading-6 text-white/48">Discover logistics-specific jobs, contracts, vehicles, units, drivers and dealerships from one environment.</p></div>
            <div><h3 className="text-base font-medium">Discuss</h3><p className="mt-2 text-sm leading-6 text-white/48">Keep messages, files and enquiry context connected to the opportunity that started the conversation.</p></div>
            <div><h3 className="text-base font-medium">Operate</h3><p className="mt-2 text-sm leading-6 text-white/48">Prepare quotes, briefs, checklists and branded operational documents from information already in LoadLink.</p></div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.07] py-12">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.17em] text-white/34">Follow LoadLink</p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">Stay close to the launch.</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Product progress, dealership onboarding and launch updates.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/10 px-5 text-sm text-white/78 transition hover:bg-white/[0.05] hover:text-white">
              <InstagramIcon /> Instagram
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/10 px-5 text-sm text-white/78 transition hover:bg-white/[0.05] hover:text-white">
              <LinkedInIcon /> LinkedIn
            </a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.07] py-16">
        <img src="/images/jobs-2.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.1]" />
        <div className="absolute inset-0 bg-black/84" />
        <div className="relative z-10 mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.17em] text-white/34">Complimentary trial</p>
            <h2 className="mt-3 text-3xl font-medium leading-[1.02] tracking-[-0.04em] sm:text-5xl">Test LoadLink with the way your business already works.</h2>
            <p className="mt-4 text-sm leading-7 text-white/52 sm:text-base">Start with the parts that matter to you — marketplace discovery, dealership tools, messaging, logistics documents or operational planning — and decide where LoadLink adds value before public launch.</p>
            <a href={FREE_TRIAL_EMAIL} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-medium text-black">Activate free trial</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] py-7">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[118px]" />
          <div className="flex flex-wrap gap-5 text-xs text-white/32">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a>
            <a href="mailto:loadlinksouthafrica@gmail.com" className="hover:text-white">Email</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
