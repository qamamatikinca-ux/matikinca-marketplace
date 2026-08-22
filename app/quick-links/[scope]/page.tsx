"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type QuickScope = "job" | "contract" | "asset" | "driver" | "dealer";

type ScopeConfig = {
  label: string;
  title: string;
  description: string;
  image: string;
  fallback: string;
  browseHref: string;
  placeholder: string;
};

const CONFIG: Record<QuickScope, ScopeConfig> = {
  job: {
    label: "Jobs",
    title: "Find logistics work.",
    description: "Search current transport and logistics jobs posted for trucks, mobile units and operators.",
    image: "/images/loadlink-search-jobs-truck-yard.webp",
    fallback: "/images/jobs-1.jpg",
    browseHref: "/jobs?portal=job",
    placeholder: "Side tipper, delivery, mining…",
  },
  contract: {
    label: "Contracts",
    title: "Find longer-term work.",
    description: "Browse recurring, project and longer-term transport contracts without mixing them into ordinary jobs.",
    image: "/images/loadlink-search-contracts-hd.webp",
    fallback: "/images/contracts-1.jpg",
    browseHref: "/contracts",
    placeholder: "Transport contract, tender, recurring work…",
  },
  asset: {
    label: "Vehicles & units",
    title: "Find the right vehicle or unit.",
    description: "Search commercial trucks, trailers and specialist mobile units listed on LoadLink.",
    image: "/images/loadlink-search-vehicles.webp",
    fallback: "/images/truck-1.jpg",
    browseHref: "/list-your-vehicle?view=marketplace#vehicle-marketplace",
    placeholder: "Truck, trailer, mobile fridge…",
  },
  driver: {
    label: "Drivers",
    title: "Find approved drivers.",
    description: "Search professional drivers by name, location, licence code and vehicle experience.",
    image: "/images/loadlink-search-drivers-hd.webp",
    fallback: "/images/driver-profile-hero.jpg",
    browseHref: "/drivers",
    placeholder: "Driver, Code 14, PrDP…",
  },
  dealer: {
    label: "Dealerships",
    title: "Find LoadLink dealerships.",
    description: "Search approved public dealerships and open the exact showroom you want to browse.",
    image: "/images/loadlink-search-jobs-truck-yard.webp",
    fallback: "/images/truck-2.jpg",
    browseHref: "/search?category=dealer",
    placeholder: "Dealership name or location…",
  },
};

const NAV: Array<{ label: string; value: QuickScope }> = [
  { label: "Jobs", value: "job" },
  { label: "Contracts", value: "contract" },
  { label: "Vehicles", value: "asset" },
  { label: "Drivers", value: "driver" },
  { label: "Dealerships", value: "dealer" },
];

export default function QuickLinkPicturePage() {
  const params = useParams<{ scope: string }>();
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const raw = String(params.scope || "job");
  const scope: QuickScope = raw in CONFIG ? raw as QuickScope : "job";
  const config = CONFIG[scope];
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const searchHref = useMemo(() => {
    const search = new URLSearchParams();
    search.set("category", scope);
    if (query.trim()) search.set("q", query.trim());
    if (location.trim()) search.set("location", location.trim());
    return `/search?${search.toString()}`;
  }, [location, query, scope]);

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(searchHref);
  }

  return (
    <main data-loadlink-quick-links-page="pictures" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f6f2e8] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate min-h-[430px] overflow-hidden bg-black text-white sm:min-h-[500px]">
        <img
          src={imageFailed ? config.fallback : config.image}
          onError={() => setImageFailed(true)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/54 to-black/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col justify-end px-5 pb-8 sm:min-h-[500px] sm:px-7 md:px-10 md:pb-10">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">LoadLink quick search · {config.label}</p>
          <h1 className="mt-3 max-w-[720px] text-[42px] font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{config.title}</h1>
          <p className="mt-4 max-w-[650px] text-sm font-semibold leading-6 text-white/76 sm:text-base">{config.description}</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 pb-14 pt-4 sm:px-5 md:px-8">
        <div className="no-scrollbar overflow-x-auto py-1" aria-label="Quick search categories">
          <div className="flex min-w-max gap-2">
            {NAV.map((item) => (
              <Link key={item.value} href={`/quick-links/${item.value}`} className={`flex h-10 items-center rounded-full border px-4 text-[12px] font-black ${item.value === scope ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-white/[.04] text-white/70" : "border-black/10 bg-white text-black/65"}`}>{item.label}</Link>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className={`mt-4 overflow-visible rounded-[20px] border p-3 shadow-[0_18px_50px_rgba(0,0,0,.08)] ${darkMode ? "border-white/12 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>
          <label className="block">
            <span className="sr-only">Search {config.label}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={config.placeholder} autoComplete="off" className={`h-14 w-full rounded-[15px] border px-4 text-base font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/10 bg-[#171717] text-white placeholder:text-white/35" : "border-black/10 bg-[#fafafa] text-black placeholder:text-black/38"}`} />
          </label>
          <div className="mt-2">
            <SouthAfricaLocationInput id="loadlink-quick-link-location" value={location} onChange={setLocation} darkMode={darkMode} placeholder="City, town or province" ariaLabel={`${config.label} location`} className={`h-14 w-full rounded-[15px] border px-4 text-base font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/10 bg-[#171717] text-white placeholder:text-white/35" : "border-black/10 bg-[#fafafa] text-black placeholder:text-black/38"}`} />
          </div>
          <div className="mt-3 grid grid-cols-[.8fr_1.2fr] gap-2">
            <Link href={config.browseHref} className={`flex h-12 items-center justify-center rounded-[13px] border text-sm font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Browse all</Link>
            <button type="submit" className="h-12 rounded-[13px] bg-[#f6b800] text-sm font-black text-black">Search {config.label}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
