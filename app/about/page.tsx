import Link from "next/link";

export default function AboutLoadLinkPage() {
  return (
    <main className="min-h-screen bg-[#f4efe3] px-4 py-10 text-black sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-black/10 pb-7">
          <Link href="/" className="text-xs font-black uppercase tracking-[.14em] text-[#9a7000]">LoadLink</Link>
          <h1 className="mt-4 text-5xl font-black tracking-[-.055em] sm:text-6xl">About LoadLink</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-black/60">LoadLink is a South African logistics marketplace built to connect transport work, commercial vehicles, mobile units, professional drivers and verified business participants through one focused platform.</p>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-3">
          <article className="rounded-[22px] border border-black/10 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#9a7000]">Marketplace</p><h2 className="mt-2 text-xl font-black">Find work and equipment</h2><p className="mt-2 text-sm font-semibold leading-6 text-black/55">Browse logistics jobs, contracts, commercial vehicles and mobile units without unnecessary friction.</p></article>
          <article className="rounded-[22px] border border-black/10 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#9a7000]">Trust</p><h2 className="mt-2 text-xl font-black">Operate with clearer signals</h2><p className="mt-2 text-sm font-semibold leading-6 text-black/55">Verification, moderation, reporting and account controls help LoadLink keep marketplace activity traceable and reviewable.</p></article>
          <article className="rounded-[22px] border border-black/10 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#9a7000]">Communication</p><h2 className="mt-2 text-xl font-black">Move deals forward</h2><p className="mt-2 text-sm font-semibold leading-6 text-black/55">Built-in messaging and logistics tools help users exchange the operational information required to move from enquiry to delivery.</p></article>
        </section>

        <section className="rounded-[26px] bg-black p-6 text-white sm:p-8">
          <h2 className="text-3xl font-black tracking-[-.04em]">Built for the logistics market.</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/60">LoadLink provides the digital marketplace and operational infrastructure. Users remain responsible for checking counterparties, vehicles, documents, pricing, insurance and transaction terms before completing business.</p>
          <div className="mt-6 flex flex-wrap gap-2"><Link href="/jobs" className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Browse jobs</Link><Link href="/legal" className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black">Read policies</Link><Link href="/help" className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black">Help centre</Link></div>
        </section>
      </div>
    </main>
  );
}
