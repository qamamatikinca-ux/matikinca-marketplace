import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calculator,
  FileText,
  Gauge,
  MessageSquareText,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

const FREE_TRIAL_EMAIL =
  "mailto:loadlinksouthafrica@gmail.com?subject=LoadLink%20Selected%20Free%20Trial&body=Hi%20LoadLink%20team%2C%0D%0A%0D%0AI%27d%20like%20to%20activate%20my%20selected%20free%20trial.%0D%0A%0D%0AName%3A%0D%0ACompany%20%2F%20business%3A%0D%0APhone%20number%3A%0D%0AProvince%3A%0D%0AWhat%20I%20want%20to%20use%20LoadLink%20for%3A%0D%0A%0D%0AThank%20you.";

const benefits = [
  { icon: BriefcaseBusiness, title: "Find more work", copy: "Discover transport jobs, contracts and recurring commercial opportunities without relying on scattered groups and classifieds." },
  { icon: Truck, title: "Source what the job needs", copy: "Find commercial vehicles, mobile units, professional drivers and dealerships from the same logistics-focused marketplace." },
  { icon: MessageSquareText, title: "Move enquiries faster", copy: "Message directly from a listing, share files and voice notes, and keep the deal connected to the opportunity that started it." },
  { icon: FileText, title: "Send professional documents", copy: "Build rate quotes and operational documents, export branded PDFs and reuse business or listing information instead of starting again." },
  { icon: Wrench, title: "Run the work", copy: "Use trip briefs, load checklists, collection and delivery briefs, driver handovers, ETA updates, POD requests and incident updates." },
  { icon: Gauge, title: "Manage and improve", copy: "Manage listings and dealership activity, track performance with Pro insights and keep important account activity visible." },
];

const featureGroups = [
  { icon: Search, title: "Marketplace", items: ["Jobs and transport opportunities", "Contracts and recurring work", "Commercial vehicles and mobile units", "Professional driver profiles", "Dealership listings and workspaces", "Predictive search and listing discovery"] },
  { icon: MessageSquareText, title: "Deals and messaging", items: ["Listing-linked conversations", "Images, files and voice notes", "Potential-deal conversations", "Unread counts and notifications", "Conversation archive", "Activity status and response time"] },
  { icon: Wrench, title: "Logistics tools", items: ["Rate quotes", "Trip briefs", "Load checklists", "Collection and delivery briefs", "Driver handovers", "ETA and incident updates", "POD and document requests", "Cost breakdowns and payment terms"] },
  { icon: FileText, title: "Documents", items: ["LoadLink-branded PDF exports", "Optional business or dealership logo", "Reusable listing information", "Shareable operational documents", "Professional rate quotes", "Information built once and reused"] },
  { icon: Building2, title: "Business tools", items: ["Dealership workspace", "Listing management", "Packages and Pro features", "Performance insights", "Truck finance calculator", "Simple Mode"] },
  { icon: ShieldCheck, title: "Trust and control", items: ["Profile verification", "Phone OTP", "Identity and document checks", "Listing moderation", "Reporting and flagging", "Login and device activity", "Account controls"] },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#f6b800] selection:text-black">
      <section className="relative min-h-[100svh] overflow-hidden">
        <img src="/images/truck-1.jpg" alt="Commercial truck on the road" className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center" />
        <div className="absolute inset-0 bg-black/56" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(246,184,0,.13),transparent_24%),linear-gradient(90deg,rgba(0,0,0,.97)_0%,rgba(0,0,0,.72)_48%,rgba(0,0,0,.20)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/58" />
        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-[82px] items-center justify-between border-b border-white/14">
            <img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[148px] object-contain sm:w-[168px]" />
            <div className="text-right"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Private early access</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/42">South Africa</p></div>
          </header>
          <div className="flex flex-1 items-center py-16 sm:py-20">
            <div className="max-w-6xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6b800]">Congratulations</p>
              <h1 className="mt-5 max-w-6xl text-[clamp(3.6rem,8.8vw,8.4rem)] font-black leading-[0.84] tracking-[-0.068em]">You&apos;ve been selected<br /><span className="text-white/58">for a complimentary LoadLink trial.</span></h1>
              <div className="mt-8 max-w-4xl border-t border-white/18 pt-6">
                <p className="max-w-3xl text-base font-semibold leading-7 text-white/72 sm:text-lg sm:leading-8">Use LoadLink to find commercial opportunities, source vehicles and drivers, manage serious enquiries, create professional logistics documents and handle practical work from one focused platform.</p>
                <a href={FREE_TRIAL_EMAIL} className="mt-7 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]">Activate free trial</a>
              </div>
            </div>
          </div>
          <div className="grid border-t border-white/14 bg-black/18 backdrop-blur-[2px] sm:grid-cols-3">
            {[['30+','Gauteng dealerships signed up'],['60+','Mpumalanga dealerships signed up'],['40+','Western Cape dealerships signed up']].map(([n,l]) => <div key={l} className="border-b border-white/12 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5"><p className="text-3xl font-black tracking-[-0.05em]">{n}</p><p className="mt-1 text-xs font-bold text-white/48">{l}</p></div>)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f0ede5] text-black">
        <div className="absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-[#f6b800]/8 blur-[120px]" />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="max-w-5xl"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">What this means for your business</p><h2 className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">Less searching. Less repeated admin. More time moving the deal forward.</h2><p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-black/58 sm:text-lg">LoadLink connects the parts of commercial logistics that are usually spread across different apps, messages and documents. Your business can discover an opportunity, find what it needs, speak to the right people and prepare the paperwork without rebuilding the process every time.</p></div>
          <div className="mt-12 grid border-t border-black/14 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({icon: Icon,title,copy},i) => <article key={title} className={`border-b border-black/14 py-8 md:px-7 ${i%2===0?'md:border-r':''} lg:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(odd)]:border-r`}><Icon size={25} strokeWidth={1.7} className="text-[#b78600]" aria-hidden="true"/><h3 className="mt-5 text-2xl font-black tracking-[-0.035em]">{title}</h3><p className="mt-3 max-w-md text-sm font-semibold leading-7 text-black/56 sm:text-base">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] text-white">
        <div className="absolute left-[12%] top-[8%] h-[420px] w-[420px] rounded-full bg-[#f6b800]/7 blur-[130px]" />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-8 border-b border-white/14 pb-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Features available through LoadLink</p><h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.058em] sm:text-6xl md:text-7xl">Clear tools for real logistics work.</h2></div><p className="max-w-xl text-base font-semibold leading-8 text-white/55 lg:ml-auto sm:text-lg">Every area has a purpose: find business, communicate, operate, document, manage and build trust.</p></div>
          <div className="mt-10 grid gap-px overflow-hidden border border-white/12 bg-white/12 md:grid-cols-2 lg:grid-cols-3">
            {featureGroups.map(({icon:Icon,title,items}) => <article key={title} className="bg-[#0a0a0a] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center border border-[#f6b800]/28 bg-[#f6b800]/7"><Icon size={20} strokeWidth={1.7} className="text-[#f6b800]" aria-hidden="true"/></span><h3 className="text-xl font-black tracking-[-0.03em]">{title}</h3></div><ul className="mt-6 space-y-3">{items.map(item=><li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-white/62"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#f6b800]" />{item}</li>)}</ul></article>)}
          </div>
          <div className="mt-10 grid gap-5 border-t border-white/14 pt-8 md:grid-cols-3"><div className="flex gap-4"><BadgeCheck className="mt-1 shrink-0 text-[#f6b800]" size={22}/><div><p className="font-black">Built around commercial logistics</p><p className="mt-1 text-sm leading-6 text-white/48">Not a general marketplace with logistics added as an afterthought.</p></div></div><div className="flex gap-4"><Calculator className="mt-1 shrink-0 text-[#f6b800]" size={22}/><div><p className="font-black">Useful beyond listings</p><p className="mt-1 text-sm leading-6 text-white/48">Tools and documents remain useful while planning and completing the work.</p></div></div><div className="flex gap-4"><UsersRound className="mt-1 shrink-0 text-[#f6b800]" size={22}/><div><p className="font-black">Built for business relationships</p><p className="mt-1 text-sm leading-6 text-white/48">Keep the opportunity, conversation and business context closer together.</p></div></div></div>
        </div>
      </section>

      <section className="relative min-h-[72svh] overflow-hidden">
        <img src="/images/jobs-2.jpg" alt="Commercial logistics in South Africa" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/72" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(246,184,0,.12),transparent_28%),linear-gradient(90deg,rgba(0,0,0,.97),rgba(0,0,0,.67),rgba(0,0,0,.30))]" />
        <div className="relative mx-auto flex min-h-[72svh] w-full max-w-[1500px] items-center px-5 py-20 sm:px-8 lg:px-12"><div className="max-w-5xl"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6b800]">Your early access starts here</p><h2 className="mt-5 max-w-5xl text-5xl font-black leading-[0.86] tracking-[-0.06em] sm:text-6xl md:text-8xl">Put LoadLink to work inside your business.</h2><p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/64 sm:text-lg">Activate your complimentary trial and see how the marketplace, logistics tools, documents and business controls fit into the way you already work.</p><a href={FREE_TRIAL_EMAIL} className="mt-8 inline-flex min-h-12 items-center bg-[#f6b800] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffc62b]">Activate free trial</a></div></div>
      </section>
      <footer className="bg-[#050505] px-5 sm:px-8 lg:px-12"><div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between"><img src="/images/loadlink-logo-dark.png" alt="LoadLink" width={1200} height={391} className="h-auto w-[132px] object-contain"/><div className="text-sm font-semibold text-white/42 sm:text-right"><a href="mailto:loadlinksouthafrica@gmail.com" className="transition hover:text-white">loadlinksouthafrica@gmail.com</a><p className="mt-1 text-xs text-white/25">Private early access · South Africa</p></div></div></footer>
    </main>
  );
}
