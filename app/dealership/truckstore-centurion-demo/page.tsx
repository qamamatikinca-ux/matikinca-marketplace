"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";

type Tab = "inventory" | "updates" | "about";
type Truck = { title: string; year: string; price: string; mileage: string; image: string; description: string };

const OWNER_EMAIL = "loadlinksouthafrica@gmail.com";
const PAGE_SIZE = 7;
const inventory: Truck[] = [
  { title: "Mercedes-Benz Actros 2645", year: "2023", price: "R1 695 000", mileage: "188 000 km", image: "/images/truck-1.jpg", description: "Automatic long-haul tractor with full service history and nationwide delivery support." },
  { title: "Volvo FH 440 Globetrotter", year: "2022", price: "Request a quote", mileage: "247 000 km", image: "/images/truck-2.jpg", description: "Well-maintained sleeper cab configured for regional and long-distance operations." },
  { title: "Scania R-series 460", year: "2021", price: "R1 250 000", mileage: "315 000 km", image: "/images/truck-3.jpg", description: "High-roof tractor unit with strong fleet records and finance assistance available." },
  { title: "MAN TGS 26.440", year: "2020", price: "R985 000", mileage: "402 000 km", image: "/images/jobs/job-card-1.jpg", description: "Reliable heavy-duty workhorse suitable for construction and line-haul applications." },
  { title: "Mercedes-Benz Axor 3340", year: "2019", price: "R875 000", mileage: "466 000 km", image: "/images/jobs/jobs-hero-fleet.jpg", description: "Fleet-ready unit with inspection report, ownership documents and service records." },
  { title: "DAF XF 480", year: "2022", price: "R1 420 000", mileage: "271 000 km", image: "/images/contracts-1.jpg", description: "Comfortable long-haul cab with economical drivetrain and verified roadworthy status." },
  { title: "Isuzu FTR 850 Dropside", year: "2021", price: "R799 000", mileage: "198 500 km", image: "/images/jobs/job-card-2.jpg", description: "Versatile rigid truck for local distribution, construction and general freight." },
  { title: "Hino 700 2841", year: "2020", price: "R925 000", mileage: "338 000 km", image: "/images/jobs/job-card-3.jpg", description: "Heavy-duty chassis prepared for fleet use with nationwide enquiry support." },
  { title: "UD Quon GW26 410", year: "2022", price: "R1 080 000", mileage: "224 000 km", image: "/images/jobs/job-card-4.jpg", description: "Modern automated transmission, clean cab and complete dealership inspection." },
];

const updates = [
  { date: "Today", title: "New long-haul stock added", copy: "Three inspected tractor units have joined the showroom and are ready for nationwide enquiries." },
  { date: "This week", title: "Trade-ins now considered", copy: "Truck owners can submit their current vehicle details for a dealership trade-in assessment." },
  { date: "Dealer support", title: "Finance document guidance", copy: "The sales team can explain the documents generally requested by commercial vehicle finance providers." },
];

export default function DealerDemoPage() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(1824);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Truck | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("loadlink-demo-dealer-following") === "1";
    setFollowing(saved);
    setFollowers(saved ? 1825 : 1824);
  }, []);

  const totalPages = Math.max(1, Math.ceil(inventory.length / PAGE_SIZE));
  const visibleInventory = useMemo(() => inventory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page]);

  function toggleFollow() {
    const next = !following;
    setFollowing(next);
    setFollowers(next ? 1825 : 1824);
    localStorage.setItem("loadlink-demo-dealer-following", next ? "1" : "0");
  }

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#f3f0e8] text-black">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="grid h-20 grid-cols-[56px_1fr_auto] items-center gap-3 px-4 md:grid-cols-[150px_1fr_150px] md:px-7">
          <SiteMenu darkMode={false} className="text-3xl font-black" />
          <HomeLogoLink theme="light" />
          <div className="justify-self-end"><AuthStatusButton darkMode={false} /></div>
        </div>
      </header>

      <section className="relative min-h-[330px] overflow-hidden bg-black text-white md:min-h-[430px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial trucks at a LoadLink dealership showroom" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="relative mx-auto flex min-h-[330px] max-w-7xl items-end px-5 pb-8 md:min-h-[430px] md:px-8 md:pb-12">
          <div className="max-w-3xl">
            <span className="inline-flex border border-[#f6b800]/60 bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[.18em] text-[#f6b800]">Interactive Dealer-package demonstration</span>
            <h1 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-5xl md:text-7xl">LoadLink Test Dealership</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/70 md:text-base">A working example of the Instagram-style public showroom available to approved dealerships. Test account: {OWNER_EMAIL}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border-4 border-[#f6b800] bg-black text-2xl font-black text-[#f6b800] md:h-28 md:w-28 md:text-4xl">LL</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black tracking-[-.04em] md:text-3xl">LoadLink Test Dealership</h2><span className="bg-[#f6b800] px-2 py-1 text-[9px] font-black uppercase">Verified dealer</span></div>
                <p className="mt-2 text-sm font-semibold text-black/55">Centurion, Gauteng · Commercial trucks · Nationwide enquiries</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">Inspected commercial vehicles, direct sales enquiries, dealership updates and organised stock in one professional LoadLink profile.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5 text-center md:min-w-[330px]">
              <Stat value={String(inventory.length)} label="Posts" />
              <Stat value={followers.toLocaleString("en-ZA")} label="Followers" />
              <Stat value="12 min" label="Reply time" />
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
            <button type="button" onClick={toggleFollow} className={`h-11 px-6 text-xs font-black uppercase tracking-[.11em] ${following ? "border border-black/15 bg-white" : "bg-[#f6b800]"}`}>{following ? "Following" : "Follow dealership"}</button>
            <Link href="/messages" className="flex h-11 items-center justify-center border border-black/15 bg-black px-6 text-xs font-black uppercase tracking-[.11em] text-[#f6b800]">Message sales team</Link>
            <a href={`mailto:${OWNER_EMAIL}?subject=LoadLink%20dealership%20enquiry`} className="flex h-11 items-center justify-center border border-black/15 bg-white px-6 text-xs font-black uppercase tracking-[.11em]">Email dealership</a>
            <Link href="/dealer-dashboard" className="flex h-11 items-center justify-center border border-black/15 bg-white px-6 text-xs font-black uppercase tracking-[.11em] md:ml-auto">Open dashboard</Link>
          </div>
        </div>
      </section>

      <nav className="sticky top-20 z-40 border-b border-black/10 bg-white" aria-label="Dealership profile sections">
        <div className="mx-auto grid max-w-7xl grid-cols-3 px-5 md:px-8">
          {(["inventory", "updates", "about"] as Tab[]).map((item) => (
            <button key={item} type="button" onClick={() => changeTab(item)} className={`h-14 border-b-2 text-[10px] font-black uppercase tracking-[.16em] ${tab === item ? "border-black text-black" : "border-transparent text-black/40"}`}>{item}</button>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-5 md:px-8 md:py-10">
        {tab === "inventory" ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-2 sm:px-0">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9d7300]">Dealer inventory</p><h2 className="mt-1 text-3xl font-black tracking-[-.04em]">Available commercial vehicles</h2></div>
              <Link href="/trucks" className="border border-black/15 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[.12em]">View all available trucks</Link>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:gap-3 lg:grid-cols-3">
              {visibleInventory.map((truck) => (
                <button type="button" key={truck.title} onClick={() => setSelected(truck)} className="group relative aspect-square overflow-hidden bg-black text-left">
                  <img src={truck.image} alt={truck.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#f6b800]">{truck.year} · {truck.mileage}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight sm:text-xl">{truck.title}</h3>
                    <p className="mt-1 text-xs font-black sm:text-base">{truck.price}</p>
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 ? <Pagination current={page} total={totalPages} onChange={setPage} /> : null}
          </>
        ) : null}

        {tab === "updates" ? (
          <div className="grid gap-4 md:grid-cols-3">{updates.map((update) => <article key={update.title} className="border border-black/10 bg-white p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#9d7300]">{update.date}</p><h2 className="mt-3 text-2xl font-black">{update.title}</h2><p className="mt-3 text-sm leading-6 text-black/55">{update.copy}</p></article>)}</div>
        ) : null}

        {tab === "about" ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <article className="border border-black/10 bg-white p-6 md:p-8"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9d7300]">About this demonstration</p><h2 className="mt-3 text-3xl font-black">A real working dealership profile preview</h2><p className="mt-4 text-sm leading-7 text-black/60">This page demonstrates the approved LoadLink Dealer package without pretending that an outside business has subscribed. Follow state, profile tabs, inventory browsing, pagination and internal navigation work in this build.</p><p className="mt-4 text-sm leading-7 text-black/60">The owner test email is <strong>{OWNER_EMAIL}</strong>. Actual stock and statistics will come from the authenticated dealership account once its profile is approved and vehicles are posted.</p></article>
            <article className="border border-black/10 bg-black p-6 text-white md:p-8"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Business information</p><dl className="mt-5 space-y-5"><Detail label="Location" value="Centurion, Gauteng" /><Detail label="Sales coverage" value="South Africa" /><Detail label="Contact" value={OWNER_EMAIL} /><Detail label="Showroom status" value="Dealer-package demonstration" /></dl></article>
          </div>
        ) : null}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={selected.title}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <div className="relative aspect-[16/9] bg-black"><img src={selected.image} alt={selected.title} className="h-full w-full object-cover" /><button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center bg-white text-xl font-black" aria-label="Close vehicle details">×</button></div>
            <div className="p-5 md:p-7"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9d7300]">{selected.year} · {selected.mileage}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{selected.title}</h2><p className="mt-3 text-2xl font-black">{selected.price}</p><p className="mt-4 text-sm leading-7 text-black/60">{selected.description}</p><div className="mt-6 grid gap-2 sm:grid-cols-2"><a href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`Vehicle enquiry: ${selected.title}`)}`} className="flex h-12 items-center justify-center bg-[#f6b800] px-5 text-xs font-black uppercase">Enquire by email</a><Link href="/messages" className="flex h-12 items-center justify-center bg-black px-5 text-xs font-black uppercase text-[#f6b800]">Open messages</Link></div></div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><strong className="block text-xl font-black md:text-2xl">{value}</strong><span className="text-[9px] font-black uppercase text-black/40">{label}</span></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[9px] font-black uppercase tracking-[.15em] text-white/40">{label}</dt><dd className="mt-1 text-sm font-bold">{value}</dd></div>;
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  return <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Dealership inventory pages"><button type="button" disabled={current === 1} onClick={() => onChange(current - 1)} className="h-10 border border-black/15 bg-white px-4 text-[10px] font-black uppercase disabled:opacity-35">Previous</button>{Array.from({ length: total }, (_, index) => index + 1).map((item) => <button type="button" key={item} aria-current={item === current ? "page" : undefined} onClick={() => onChange(item)} className={`h-10 min-w-10 border text-xs font-black ${item === current ? "border-black bg-black text-[#f6b800]" : "border-black/15 bg-white"}`}>{item}</button>)}<button type="button" disabled={current === total} onClick={() => onChange(current + 1)} className="h-10 border border-black/15 bg-white px-4 text-[10px] font-black uppercase disabled:opacity-35">Next</button></nav>;
}
