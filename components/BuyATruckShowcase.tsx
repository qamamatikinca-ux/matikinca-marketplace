"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { formatListingRate } from "@/lib/formatCurrency";

type TruckListing = {
  id: string;
  title?: string | null;
  city?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  photos?: string[] | null;
  package_type?: string | null;
  listing_kind?: string | null;
  dealership_id?: string | null;
  boost_expires_at?: string | null;
  sponsored?: boolean | null;
  created_at?: string | null;
};

const fallback: TruckListing[] = [
  { id: "demo-1", title: "2023 Mercedes-Benz Actros 2645", city: "Centurion", rate: "R1 695 000", posted_by: "LoadLink Dealer Demo", photos: ["/images/truck-1.jpg"], package_type: "dealer" },
  { id: "demo-2", title: "2022 Volvo FH 440", city: "Gauteng", rate: "Request a quote", posted_by: "Verified dealership", photos: ["/images/truck-2.jpg"], package_type: "pro" },
  { id: "demo-3", title: "2021 Scania R-series", city: "Johannesburg", rate: "R1 250 000", posted_by: "Private seller", photos: ["/images/truck-3.jpg"], package_type: "standard" },
];

function rank(item: TruckListing) {
  if (item.package_type === "dealer") return 4;
  if (item.package_type === "pro") return 3;
  if (item.sponsored || (item.boost_expires_at && new Date(item.boost_expires_at) > new Date())) return 2;
  return 1;
}

export default function BuyATruckShowcase({ darkMode = false }: { darkMode?: boolean }) {
  const [rows, setRows] = useState<TruckListing[]>(fallback);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    async function load() {
      const primaryResult = await supabase
        .from("job_listings")
        .select("id,title,city,rate,posted_by,photos,package_type,listing_kind,dealership_id,boost_expires_at,sponsored,created_at")
        .or("listing_kind.eq.truck_sale,description.ilike.%Seller type:%")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(24);

      let listings: TruckListing[] = [];

      if (!primaryResult.error && primaryResult.data) {
        listings = primaryResult.data as unknown as TruckListing[];
      } else if (primaryResult.error && /column|schema cache/i.test(primaryResult.error.message)) {
        const fallbackResult = await supabase
          .from("job_listings")
          .select("id,title,city,rate,posted_by,photos,package_type,sponsored,created_at")
          .order("created_at", { ascending: false })
          .limit(24);

        if (!fallbackResult.error && fallbackResult.data) {
          listings = fallbackResult.data as unknown as TruckListing[];
        }
      }

      if (!active || listings.length === 0) return;
      setRows(listings);
    }
    void load();
    return () => { active = false; };
  }, []);

  const ordered = useMemo(() => [...rows].sort((a, b) => rank(b) - rank(a)).slice(0, 9), [rows]);

  return (
    <section className={`border-y px-4 py-10 md:px-6 md:py-14 ${darkMode ? "border-white/10 bg-[#050505] text-white" : "border-black/10 bg-white text-black"}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b88900]">LoadLink vehicle market</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.045em] md:text-5xl">Buy a truck</h2>
            <p className={`mt-3 max-w-2xl text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Available trucks are ranked by package: Dealer showrooms first, then Pro listings, paid boosts and standard listings.</p>
          </div>
          <Link href="/jobs?portal=asset&search=truck" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#9d7300]">View all trucks</Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((item) => {
            const tier = rank(item);
            const label = tier === 4 ? "Dealer showroom" : tier === 3 ? "Pro listing" : tier === 2 ? "Boosted" : "Standard";
            return (
              <article key={item.id} className={`overflow-hidden rounded-[24px] border ${darkMode ? "border-white/10 bg-[#0e0e0e]" : "border-black/10 bg-[#fafafa]"}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                  <img src={item.photos?.[0] || "/images/truck-1.jpg"} alt={item.title || "Truck for sale"} className="h-full w-full object-cover" />
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${tier >= 3 ? "bg-[#f6b800] text-black" : "bg-black/80 text-white"}`}>{label}</span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-12 text-lg font-black tracking-[-0.025em]">{item.title || "Commercial truck"}</h3>
                  <p className={`mt-1 text-xs font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.city || "South Africa"} · {item.posted_by || "LoadLink seller"}</p>
                  <p className="mt-4 text-xl font-black text-[#a87900]">{formatListingRate(item.rate)}</p>
                  <Link href={`/jobs?portal=asset#job-${item.id}`} className="mt-4 flex h-11 items-center justify-center rounded-xl bg-black text-xs font-black uppercase tracking-[0.12em] text-[#f6b800]">View vehicle</Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
