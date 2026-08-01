"use client";

import Link from "next/link";

export default function FeaturedDealership({ darkMode }: { darkMode: boolean }) {
  return (
    <section className={`px-5 py-12 md:px-12 md:py-16 ${darkMode ? "bg-[#050505] text-white" : "bg-white text-black"}`}>
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-[#f6b800]/35 bg-black text-white">
        <div className="grid lg:grid-cols-[1.2fr_.8fr]">
          <div className="relative min-h-[340px] overflow-hidden">
            <img src="/images/jobs/jobs-hero-fleet.jpg" alt="LoadLink Commercial Centurion dealership" className="absolute inset-0 h-full w-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
            <div className="relative flex min-h-[340px] flex-col justify-end p-6 md:p-9">
              <span className="w-fit rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-black">Featured dealership</span>
              <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.05em] md:text-6xl">LoadLink Commercial Centurion</h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/70">A complete dealer showroom with stock, updates, direct enquiries and follower notification preferences.</p>
            </div>
          </div>
          <div className="flex flex-col justify-between border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-9">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat value="9" label="Vehicles" />
              <Stat value="1.8k" label="Followers" />
              <Stat value="12 min" label="Reply" />
            </div>
            <div className="mt-8">
              <p className="text-sm leading-7 text-white/60">Open the profile to test inventory browsing, dealer updates, messaging and the follow-notification setup.</p>
              <Link href="/dealership/loadlink-commercial-centurion" className="mt-5 flex h-13 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.13em] text-black">Open dealership profile</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-4"><p className="text-xl font-black text-[#f6b800]">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-white/45">{label}</p></div>;
}
