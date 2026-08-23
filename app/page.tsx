import LaunchConfetti from "./launch-confetti";

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
    intro: "Find the opportunity, vehicle, mobile unit, driver or dealership you actually need.",
    detail:
      "LoadLink brings transport jobs, contracts, commercial vehicles, mobile units, driver profiles and dealership listings into one searchable marketplace. Instead of checking unrelated classifieds and separate groups, users can start from a logistics-specific environment.",
    benefit: "Less time searching across disconnected channels and more relevant commercial discovery.",
  },
  {
    icon: "message" as IconName,
    title: "Messaging",
    intro: "Keep the conversation attached to the listing or opportunity that started it.",
    detail:
      "Users can move from a listing into a dedicated conversation, share images and files, send voice notes and keep potential deals separate from ordinary inbox traffic. The aim is to preserve context so important information is not lost in unrelated chats.",
    benefit: "Fewer repeated questions, clearer deal context and easier follow-up.",
  },
  {
    icon: "tools" as IconName,
    title: "Logistics tools",
    intro: "Practical tools for the work that happens after an enquiry becomes real.",
    detail:
      "Create rate quotes, trip briefs, load checklists, collection and delivery briefs, driver handovers, ETA updates, incident updates, POD requests, cost breakdowns, payment terms and truck-finance calculations from one toolkit.",
    benefit: "Move from discussion to a usable operational document without rebuilding information every time.",
  },
  {
    icon: "file" as IconName,
    title: "Documents",
    intro: "Turn information already entered on LoadLink into something presentable outside LoadLink.",
    detail:
      "Quotes and operational information can be exported into clean LoadLink-branded PDFs, with business or dealership branding where available. Reusable information reduces the need to type the same vehicle, route or business details repeatedly.",
    benefit: "More professional communication and less duplicated admin.",
  },
  {
    icon: "business" as IconName,
    title: "Dealership & business tools",
    intro: "A working space for businesses managing commercial stock and enquiries.",
    detail:
      "Dealerships can manage listings, present stock, handle enquiries and use business-facing tools from one workspace. Pro and dealership features add visibility into listing activity and performance, while Simple Mode keeps essential tasks accessible without stripping away the LoadLink experience.",
    benefit: "A clearer workflow for sales teams and businesses that need more than a basic listing page.",
  },
  {
    icon: "shield" as IconName,
    title: "Trust & controls",
    intro: "Give users more context before they decide to work with someone.",
    detail:
      "LoadLink combines profile verification, phone OTP, identity or document checks where required, listing moderation, reporting, flagging and login activity controls. These measures do not replace normal commercial due diligence, but they make the platform more accountable than an open classifieds board.",
    benefit: "More information, stronger moderation and better account control before a deal moves forward.",
  },
];

const stats = [
  ["30+", "dealerships signed up in Gauteng"],
  ["60+", "dealerships signed up in Mpumalanga"],
  ["40+", "dealerships signed up in the Western Cape"],
] as const;

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "market") return <svg {...common}><path d="M4 6.5h16l-1 4.5H5L4 6.5Z"/><path d="M6 11v8h12v-8M9 19v-5h6v5M7 6.5 8.5 3h7L17 6.5"/></svg>;
  if (name === "message") return <svg {...common}><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></svg>;
  if (name === "tools") return <svg {...common}><path d="M14.5 6.5a4 4 0 0 0-5-5l2.1 2.1-2.8 2.8-2.1-2.1a4 4 0 0 0 5 5l-7.4 7.4a2 2 0 1 0 2.8 2.8l7.4-7.4a4 4 0 0 0 5-5l-2.1 2.1-2.8-2.8 2.1-2.1Z"/></svg>;
  if (name === "file") return <svg {...common}><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
  if (name === "business") return <svg {...common}><path d="M4 21V5h10v16M14 9h6v12"/><path d="M7 9h3M7 13h3M7 17h3M17 13h1M17 17h1"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 4.5 6v5.5c0 4.7 3 7.6 7.5 9.5 4.5-1.9 7.5-4.8 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

function GlassLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/65 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
      {label}
    </a>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070809] text-white selection:bg-[#f6b800] selection:text-black">
      <LaunchConfetti />

      <section id="overview" className="relative min-h-[94svh] overflow-hidden">
        <img src="/images/truck-1.jpg" alt="Commercial truck on the road" className="absolute inset-0 h-full w-full object-cover object-[64%_center] opacity-40 sm:object-center" />
        <div className="absolute inset-0 bg-[#050607]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050607] via-[#050607]/76 to-[#050607]/32" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-transparent to-[#050607]/35" />

        <div className="relative z-10 mx-auto flex min-h-[94svh] w-full max-w-[1440px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
          <header className="sticky top-4 z-40 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <a href="#overview" aria-label="LoadLink home" className="shrink-0">
                <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[142px] object-contain sm:w-[158px]" />
              </a>
              <nav className="hidden items-center gap-2 md:flex">
                <GlassLink href="#platform" label="Platform" />
                <GlassLink href="#why" label="For business" />
                <GlassLink href="#follow" label="Follow" />
              </nav>
              <a href={FREE_TRIAL_EMAIL} className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f6b800] px-4 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b] sm:px-5 sm:text-sm">Free trial</a>
            </div>
          </header>

          <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-14">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.13em] text-white/68 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" /> Selected early access
              </div>
              <h1 className="mt-6 max-w-4xl text-[clamp(3rem,7.4vw,6.6rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">Logistics business,<br />better connected.</h1>
              <p className="mt-6 max-w-2xl text-[15px] font-normal leading-7 text-white/68 sm:text-lg sm:leading-8">
                LoadLink is being built around the real steps between finding an opportunity and getting the work done: discovery, enquiries, vehicles, drivers, operational tools and documents.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={FREE_TRIAL_EMAIL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f6b800] px-6 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b]">Activate free trial <Icon name="arrow" className="h-4 w-4" /></a>
                <a href="#platform" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-white/[0.055] px-6 text-sm font-medium text-white/80 backdrop-blur-xl transition hover:border-white/22 hover:bg-white/[0.09] hover:text-white">See how it works</a>
              </div>
            </div>

            <aside className="lg:justify-self-end lg:max-w-[540px]">
              <div className="rounded-[30px] border border-white/12 bg-black/34 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/44">Your invitation</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">Congratulations. Your business has been selected for complimentary early access.</h2>
                <p className="mt-4 text-sm font-normal leading-6 text-white/55">Use the trial to explore the marketplace, test the logistics tools and see whether LoadLink can simplify parts of your existing workflow before public launch.</p>
                <div className="mt-5 grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {stats.map(([value, label]) => (
                    <div key={label} className="py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                      <p className="text-2xl font-semibold tracking-[-0.035em]">{value}</p>
                      <p className="mt-1 text-xs font-normal leading-5 text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            <GlassLink href="#platform" label="Platform" /><GlassLink href="#why" label="For business" /><GlassLink href="#follow" label="Follow" />
          </div>
        </div>
      </section>

      <section id="platform" className="relative scroll-mt-24 border-t border-white/8 py-16 sm:py-20">
        <img src="/images/jobs-2.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070809]/96 via-[#070809]/90 to-[#070809]" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-5 border-b border-white/10 pb-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">Inside LoadLink</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl">Six parts that support one commercial workflow.</h2>
            </div>
            <p className="max-w-xl text-sm font-normal leading-7 text-white/55 lg:ml-auto sm:text-base">Each area has a clear job. Open any section below to see what it does and why it matters to a logistics business.</p>
          </div>

          <div className="divide-y divide-white/10 pt-4">
            {platform.map((item) => (
              <details key={item.title} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-[24px] px-3 py-5 transition hover:bg-white/[0.035] sm:px-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.045] text-white/78 backdrop-blur-xl"><Icon name={item.icon} className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-semibold tracking-[-0.025em]">{item.title}</span>
                    <span className="mt-1 block text-sm font-normal leading-6 text-white/50">{item.intro}</span>
                  </span>
                  <span className="ml-auto text-xl font-light text-white/35 transition group-open:rotate-45 group-open:text-white/70">+</span>
                </summary>
                <div className="grid gap-5 px-3 pb-6 pt-1 sm:px-[74px] lg:grid-cols-[1fr_.72fr]">
                  <p className="text-sm font-normal leading-7 text-white/64 sm:text-[15px]">{item.detail}</p>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-white/35">Business benefit</p>
                    <p className="mt-2 text-sm font-normal leading-6 text-white/62">{item.benefit}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">For business</p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">Useful before, during and after the deal.</h2>
              </div>
              <div className="grid gap-7 sm:grid-cols-3">
                <div><h3 className="text-lg font-semibold">Find the work</h3><p className="mt-2 text-sm font-normal leading-6 text-white/52">Use a logistics-focused marketplace to find jobs, contracts, equipment, drivers and commercial sellers without searching unrelated platforms.</p></div>
                <div><h3 className="text-lg font-semibold">Move the enquiry</h3><p className="mt-2 text-sm font-normal leading-6 text-white/52">Keep messages, files and deal context close to the listing so the conversation is easier to follow and act on.</p></div>
                <div><h3 className="text-lg font-semibold">Run the work</h3><p className="mt-2 text-sm font-normal leading-6 text-white/52">Create quotes, briefs, checklists and branded documents from information already available in the platform.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="follow" className="scroll-mt-24 pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 rounded-[28px] border border-white/10 bg-black/24 p-5 backdrop-blur-2xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">Follow LoadLink</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Stay close to the launch.</h2><p className="mt-2 max-w-xl text-sm font-normal leading-6 text-white/50">Follow product progress, dealership onboarding and launch updates.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex min-w-[210px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"><img src="/images/instagram-badge-upscaled.webp" alt="Instagram" className="h-12 w-12 rounded-[14px] object-cover"/><div><p className="text-sm font-semibold">Instagram</p><p className="mt-0.5 text-xs font-normal text-white/40">@loadlinkza</p></div></a>
              <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="flex min-w-[210px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"><img src="/images/linkedin-badge-upscaled.webp" alt="LinkedIn" className="h-12 w-12 rounded-[14px] object-cover"/><div><p className="text-sm font-semibold">LinkedIn</p><p className="mt-0.5 text-xs font-normal text-white/40">LoadLink SA</p></div></a>
            </div>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-[30px] border border-white/10 p-7 sm:p-9 lg:p-10">
            <img src="/images/jobs-2.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.13]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/80 to-black/62" />
            <div className="relative z-10 max-w-3xl">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">Complimentary trial</p>
              <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">See whether LoadLink fits the way your business already works.</h2>
              <p className="mt-4 max-w-2xl text-sm font-normal leading-7 text-white/58 sm:text-base">There is no need to change your entire workflow on day one. Use early access to test the parts that matter to you — marketplace discovery, dealership tools, messaging, logistics documents or operational planning.</p>
              <a href={FREE_TRIAL_EMAIL} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f6b800] px-6 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b]">Activate free trial <Icon name="arrow" className="h-4 w-4" /></a>
            </div>
          </div>

          <footer className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[126px] object-contain" />
            <div className="flex flex-wrap gap-5 text-xs font-normal text-white/38"><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a><a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a><a href="mailto:loadlinksouthafrica@gmail.com" className="hover:text-white">Email</a></div>
          </footer>
        </div>
      </section>
    </main>
  );
}
