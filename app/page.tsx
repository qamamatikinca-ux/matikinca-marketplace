import LaunchConfetti from "./launch-confetti";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const INSTAGRAM_URL =
  "https://www.instagram.com/loadlinkza?igsi=MW02bms4enA2YXhoMw%3D%3D&utm_source=qr";
const LINKEDIN_URL =
  "https://www.linkedin.com/in/loadlink-sa-102b763a1?utm_source=share_via&utm_content=profile&utm_medium=member_ios";

const platform = [
  {
    number: "01",
    title: "Marketplace",
    intro:
      "Find transport work, recurring contracts, commercial vehicles, mobile units, drivers and dealerships without jumping between unrelated classifieds and groups.",
    detail:
      "LoadLink is structured around commercial logistics rather than general classifieds. Jobs and contracts sit beside the vehicles, units, drivers and businesses that may be needed to complete them. Search and discovery are designed to help users move from an opportunity to the right capacity or supplier with less friction.",
    benefit:
      "A more relevant starting point for commercial logistics discovery, with less time spent searching across disconnected platforms.",
  },
  {
    number: "02",
    title: "Messaging",
    intro:
      "Keep the conversation connected to the listing, job or opportunity that started it.",
    detail:
      "A user can move from a listing into a dedicated conversation instead of starting a separate chat with no context. Images, files and voice notes stay with the enquiry, while potential-deal conversations and archived threads help keep serious opportunities easier to manage.",
    benefit:
      "Clearer deal context, fewer repeated questions and an easier way to follow an enquiry from first contact to decision.",
  },
  {
    number: "03",
    title: "Logistics tools",
    intro:
      "Use practical tools for the work that happens once an enquiry starts becoming a real job.",
    detail:
      "LoadLink includes rate quotes, trip briefs, collection and delivery briefs, load checklists, driver handovers, ETA updates, incident updates, POD requests, cost breakdowns, payment terms and a truck-finance calculator. The tools are meant to support real operational tasks rather than act as decorative dashboard widgets.",
    benefit:
      "Move from discussion to a usable operational document or calculation without rebuilding the same information every time.",
  },
  {
    number: "04",
    title: "Documents",
    intro:
      "Turn information already entered on LoadLink into professional documents you can use outside the platform.",
    detail:
      "Quotes and operational information can be exported as clean LoadLink-branded PDFs, with business or dealership branding where available. Reusable listing information can be carried into documents so vehicle, route or business details do not have to be typed repeatedly.",
    benefit:
      "Less duplicated admin and a more professional way to present quotes and operational information to clients or partners.",
  },
  {
    number: "05",
    title: "Dealership & business tools",
    intro:
      "Give commercial businesses a workspace that does more than simply display a listing.",
    detail:
      "Dealerships can manage stock, listings and enquiries from one area while business-facing tools support branding and performance visibility. Pro and dealership features are designed for teams that need to manage commercial activity, while Simple Mode keeps essential tasks easier to use when a lighter interface is preferred.",
    benefit:
      "A cleaner workflow for sales teams, dealerships and businesses that need more structure than a basic classifieds page.",
  },
  {
    number: "06",
    title: "Trust & controls",
    intro:
      "Give users more context and platform accountability before they decide to work with someone.",
    detail:
      "LoadLink combines profile verification, phone OTP, identity or document checks where required, listing moderation, reporting, flagging and login activity controls. These controls do not replace normal commercial due diligence, but they add more structure and accountability than an open listing board.",
    benefit:
      "More information before a deal moves forward, stronger moderation and better control over account and platform activity.",
  },
];

const stats = [
  ["30+", "Gauteng"],
  ["60+", "Mpumalanga"],
  ["40+", "Western Cape"],
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-normal text-white/58 transition hover:bg-white/[0.06] hover:text-white"
    >
      {label}
    </a>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070809] text-white selection:bg-[#f6b800] selection:text-black">
      <LaunchConfetti />

      <section id="overview" className="relative min-h-[92svh] overflow-hidden">
        <img
          src="/images/truck-1.jpg"
          alt="Commercial truck on the road"
          className="absolute inset-0 h-full w-full object-cover object-[66%_center] opacity-30 sm:object-center"
        />
        <div className="absolute inset-0 bg-[#050607]/64" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050607] via-[#050607]/78 to-[#050607]/38" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-transparent to-[#050607]/35" />

        <div className="relative z-10 mx-auto flex min-h-[92svh] w-full max-w-[1380px] flex-col px-4 pb-7 pt-4 sm:px-7 sm:pt-6 lg:px-10">
          <header className="sticky top-3 z-40 rounded-[20px] border border-white/[0.09] bg-black/28 px-4 py-3 backdrop-blur-2xl sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <a href="#overview" aria-label="LoadLink home" className="shrink-0">
                <img
                  src="/images/loadlink-logo-dark.png"
                  alt="LoadLink"
                  width={1200}
                  height={391}
                  className="h-auto w-[136px] object-contain sm:w-[154px]"
                />
              </a>

              <nav className="hidden items-center gap-1 md:flex">
                <NavLink href="#platform" label="Platform" />
                <NavLink href="#business" label="For business" />
                <NavLink href="#follow" label="Follow" />
              </nav>

              <a
                href={FREE_TRIAL_EMAIL}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f6b800] px-4 text-xs font-medium text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b] sm:px-5 sm:text-sm"
              >
                Free trial
              </a>
            </div>
          </header>

          <div className="grid flex-1 gap-7 py-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-14">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/22 px-3 py-2 text-[10px] font-normal uppercase tracking-[0.12em] text-white/62 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" />
                Selected early access
              </div>

              <h1 className="mt-6 max-w-4xl text-[clamp(2.9rem,7vw,6.2rem)] font-medium leading-[0.93] tracking-[-0.052em] text-white">
                Logistics business,
                <br />
                better connected.
              </h1>

              <p className="mt-6 max-w-2xl text-[15px] font-normal leading-7 text-white/66 sm:text-lg sm:leading-8">
                LoadLink brings the practical parts of commercial logistics closer together: finding work, sourcing vehicles or drivers, handling enquiries, preparing documents and using operational tools when the work starts moving.
              </p>

              <div className="mt-8 max-w-[430px]">
                <a
                  href={FREE_TRIAL_EMAIL}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-medium text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b] sm:w-auto"
                >
                  Activate free trial
                </a>
                <a
                  href="#platform"
                  className="mt-4 block text-center text-sm font-normal text-white/58 underline decoration-white/20 underline-offset-4 transition hover:text-white sm:inline-block sm:pl-5 sm:text-left"
                >
                  See what LoadLink includes
                </a>
              </div>
            </div>

            <aside className="lg:justify-self-end lg:max-w-[510px]">
              <div className="rounded-[26px] border border-white/10 bg-black/28 p-5 backdrop-blur-2xl sm:p-6">
                <p className="text-[10px] font-normal uppercase tracking-[0.13em] text-white/40">Your invitation</p>
                <h2 className="mt-2 max-w-md text-[1.7rem] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[2rem]">
                  Your business has been selected for complimentary early access.
                </h2>
                <p className="mt-3 max-w-md text-sm font-normal leading-6 text-white/52">
                  Use the trial to test the parts that matter to your business before public launch. You do not need to change your entire workflow or commit to a package to understand where LoadLink can help.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                  {stats.map(([value, province]) => (
                    <div key={province} className="min-w-0">
                      <p className="text-[1.55rem] font-medium tracking-[-0.035em]">{value}</p>
                      <p className="mt-1 truncate text-[11px] font-normal text-white/40 sm:whitespace-normal sm:leading-4">
                        {province}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] font-normal leading-5 text-white/30">Dealerships signed up across the selected trial regions.</p>
              </div>
            </aside>
          </div>

          <div className="flex justify-center gap-1 border-t border-white/[0.07] pt-4 md:hidden">
            <NavLink href="#platform" label="Platform" />
            <NavLink href="#business" label="For business" />
            <NavLink href="#follow" label="Follow" />
          </div>
        </div>
      </section>

      <section id="platform" className="relative scroll-mt-24 border-t border-white/[0.07] py-14 sm:py-18">
        <img
          src="/images/jobs-2.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.055]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070809]/97 via-[#070809]/94 to-[#070809]" />

        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl border-b border-white/10 pb-8">
            <p className="text-[10px] font-normal uppercase tracking-[0.13em] text-white/35">Inside LoadLink</p>
            <h2 className="mt-3 text-3xl font-medium leading-[1] tracking-[-0.04em] sm:text-5xl">
              What the platform actually does.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-normal leading-7 text-white/54 sm:text-base">
              The platform is split into six practical areas. Each one has a specific job, so the page below stays easy to scan instead of turning every feature into another card or button.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {platform.map((item) => (
              <details key={item.title} className="group">
                <summary className="flex cursor-pointer list-none items-start gap-4 py-6 sm:items-center sm:gap-6">
                  <span className="w-8 shrink-0 pt-1 text-xs font-normal tabular-nums text-white/28 sm:pt-0">{item.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-medium tracking-[-0.02em] sm:text-xl">{item.title}</span>
                    <span className="mt-1.5 block max-w-3xl text-sm font-normal leading-6 text-white/48">{item.intro}</span>
                  </span>
                  <span className="mt-1 shrink-0 text-xl font-light text-white/30 transition group-open:rotate-45 group-open:text-white/65 sm:mt-0">+</span>
                </summary>

                <div className="grid gap-4 pb-7 pl-12 sm:pl-14 lg:grid-cols-[1fr_.7fr] lg:gap-8">
                  <p className="text-sm font-normal leading-7 text-white/62 sm:text-[15px]">{item.detail}</p>
                  <div className="border-l border-white/10 pl-4 sm:pl-5">
                    <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-white/30">Why it matters</p>
                    <p className="mt-2 text-sm font-normal leading-6 text-white/52">{item.benefit}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="business" className="scroll-mt-24 py-14 sm:py-18">
        <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-8 border-y border-white/10 py-9 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-[0.13em] text-white/35">For business</p>
              <h2 className="mt-3 max-w-md text-3xl font-medium leading-[1.02] tracking-[-0.04em] sm:text-5xl">
                Useful before, during and after a deal.
              </h2>
            </div>

            <div className="grid gap-7 sm:grid-cols-3">
              <div>
                <h3 className="text-base font-medium">Find</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-white/50">Search logistics-specific jobs, contracts, vehicles, units, drivers and dealerships from one environment.</p>
              </div>
              <div>
                <h3 className="text-base font-medium">Discuss</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-white/50">Keep files, images, voice notes and enquiry context attached to the opportunity that started the conversation.</p>
              </div>
              <div>
                <h3 className="text-base font-medium">Operate</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-white/50">Prepare quotes, briefs, checklists and operational documents using information already available in LoadLink.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="follow" className="scroll-mt-24 pb-14 sm:pb-18">
        <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 rounded-[24px] border border-white/[0.09] bg-white/[0.035] p-5 backdrop-blur-2xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[10px] font-normal uppercase tracking-[0.13em] text-white/35">Follow LoadLink</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">Stay close to the launch.</h2>
              <p className="mt-2 text-sm font-normal leading-6 text-white/48">Follow product progress, dealership onboarding and launch updates.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-[200px] items-center gap-3 rounded-[18px] border border-white/[0.08] bg-black/20 p-3 transition hover:bg-white/[0.06]"
              >
                <img src="/images/instagram-badge-upscaled.webp" alt="Instagram" className="h-11 w-11 rounded-[12px] object-cover" />
                <div>
                  <p className="text-sm font-medium">Instagram</p>
                  <p className="mt-0.5 text-xs font-normal text-white/38">@loadlinkza</p>
                </div>
              </a>

              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-[200px] items-center gap-3 rounded-[18px] border border-white/[0.08] bg-black/20 p-3 transition hover:bg-white/[0.06]"
              >
                <img src="/images/linkedin-badge-upscaled.webp" alt="LinkedIn" className="h-11 w-11 rounded-[12px] object-cover" />
                <div>
                  <p className="text-sm font-medium">LinkedIn</p>
                  <p className="mt-0.5 text-xs font-normal text-white/38">LoadLink SA</p>
                </div>
              </a>
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[26px] border border-white/[0.09] p-6 sm:p-8">
            <img src="/images/jobs-2.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.10]" />
            <div className="absolute inset-0 bg-black/80" />
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-normal uppercase tracking-[0.13em] text-white/35">Complimentary trial</p>
              <h2 className="mt-3 text-3xl font-medium leading-[1.02] tracking-[-0.04em] sm:text-4xl">Test the parts that matter to your business.</h2>
              <p className="mt-4 text-sm font-normal leading-7 text-white/54 sm:text-base">Use early access to explore the marketplace, dealership tools, messaging, logistics documents or operational planning before public launch.</p>
              <a href={FREE_TRIAL_EMAIL} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-medium text-black transition hover:-translate-y-0.5 hover:bg-[#ffc62b]">Activate free trial</a>
            </div>
          </div>

          <footer className="mt-7 flex flex-col gap-5 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[120px] object-contain" />
            <div className="flex flex-wrap gap-5 text-xs font-normal text-white/34">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
              <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a>
              <a href="mailto:loadlinksouthafrica@gmail.com" className="hover:text-white">Email</a>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
