"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Portal = "job" | "contract" | "asset";
type SortMode = "newest" | "needed_soon" | "oldest";

type Listing = {
  id: string;
  title: string;
  city?: string | null;
  province?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  poster_photo?: string | null;
  description?: string | null;
  photos?: string[] | null;
  sponsored?: boolean | null;
  package_type?: string | null;
  created_at?: string | null;
  view_count?: number | null;
  listing_kind?: string | null;
  dealership_id?: string | null;
  verification_level?: string | null;
  vehicle_type?: string | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
  body_type?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  odometer_km?: number | null;
  condition?: string | null;
  route_start?: string | null;
  route_end?: string | null;
  route_distance_km?: number | null;
  load_type?: string | null;
  required_equipment?: string[] | null;
  rate_amount?: number | null;
  rate_unit?: string | null;
  payment_terms?: string | null;
  work_starts_at?: string | null;
  work_ends_at?: string | null;
};

type Payload = {
  rows?: Listing[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

const PAGE_SIZE = 7;
const groups = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];

const copy: Record<Portal, { eyebrow: string; title: string; detail: string; empty: string; postLabel: string; postHref: string }> = {
  job: {
    eyebrow: "Logistics jobs",
    title: "Find paid logistics work.",
    detail: "Search approved transport and logistics opportunities by location, equipment and date.",
    empty: "No jobs match these filters yet.",
    postLabel: "Post job",
    postHref: "/jobs/list",
  },
  contract: {
    eyebrow: "Logistics contracts",
    title: "Find longer-term contracts.",
    detail: "Browse recurring transport, mining, farming, construction and delivery opportunities.",
    empty: "No contracts match these filters yet.",
    postLabel: "Post contract",
    postHref: "/jobs/list?mode=contract",
  },
  asset: {
    eyebrow: "Vehicles & units",
    title: "Find commercial equipment.",
    detail: "Browse approved commercial vehicles and mobile units currently available on LoadLink.",
    empty: "No vehicles or units match these filters yet.",
    postLabel: "List vehicle",
    postHref: "/list-your-vehicle?entry=vehicle",
  },
};

export default function MarketplaceListingsExperience({ initialPortal = "job" }: { initialPortal?: Portal }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingPortal = params.get("portal");
    if (incomingPortal === "job" || incomingPortal === "contract" || incomingPortal === "asset") setPortal(incomingPortal);
    setQuery(params.get("search") || "");
    setLocation(params.get("city") || "");
    const category = params.get("group") || "";
    if (groups.includes(category)) setGroup(category);
    try {
      const ids = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      setSaved(new Set(Array.isArray(ids) ? ids.map((item) => String(item?.id || "")).filter(Boolean) : []));
    } catch {
      setSaved(new Set());
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      kind: portal,
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    });
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("city", location.trim());
    if (group) params.set("group", group);

    try {
      const response = await fetch(`/api/job-listings?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as Payload;
      if (!response.ok) throw new Error(payload.error || "Listings could not load.");
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setTotal(Number(payload.total || 0));
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Listings could not load.");
    } finally {
      setLoading(false);
    }
  }, [group, location, page, portal, query, sort]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [portal, query, location, group, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentCopy = copy[portal];
  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  function choosePortal(next: Portal) {
    setPortal(next);
    const url = next === "contract" ? "/contracts" : next === "asset" ? "/list-your-vehicle#vehicle-marketplace" : "/jobs";
    if (next === "asset") {
      window.location.assign(url);
      return;
    }
    window.history.replaceState({}, "", url);
  }

  function toggleSaved(listing: Listing) {
    try {
      const current = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      const list = Array.isArray(current) ? current : [];
      const exists = list.some((item) => String(item?.id || "") === listing.id);
      const item = {
        id: listing.id,
        title: listing.title,
        href: `/listing/${listing.id}`,
        category: portal === "contract" ? "Contract" : "Job",
        type: listing.vehicle_group || listing.vehicle_type || "Logistics",
        image: listing.photos?.[0] || "/images/jobs/job-card-1.jpg",
        meta: [listing.city, displayRate(listing)].filter(Boolean).join(" · "),
        savedAt: Date.now(),
      };
      const next = exists ? list.filter((entry) => String(entry?.id || "") !== listing.id) : [item, ...list].slice(0, 30);
      localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
      setSaved(new Set(next.map((entry) => String(entry?.id || "")).filter(Boolean)));
      window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
    } catch {
      // Saving is convenience state; marketplace browsing remains available.
    }
  }

  async function share(listing: Listing) {
    const url = `${window.location.origin}/listing/${listing.id}`;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: `${listing.title} on LoadLink`, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // Native share may be cancelled by the user.
    }
  }

  return (
    <main className={`min-h-screen ${pageClass}`} data-loadlink-marketplace-listings="v2">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className={`border-b ${darkMode ? "border-white/10 bg-[#070707]" : "border-black/10 bg-white"}`}>
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-wrap gap-2">
            <PortalButton active={portal === "job"} onClick={() => choosePortal("job")}>Jobs</PortalButton>
            <PortalButton active={portal === "contract"} onClick={() => choosePortal("contract")}>Contracts</PortalButton>
            <PortalButton active={false} onClick={() => choosePortal("asset")}>Vehicles</PortalButton>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>{currentCopy.eyebrow}</p>
              <h1 className="mt-2 max-w-3xl text-[40px] font-black leading-[.96] tracking-[-.06em] sm:text-[58px]">{currentCopy.title}</h1>
              <p className={`mt-4 max-w-2xl text-sm font-semibold leading-6 sm:text-base ${muted}`}>{currentCopy.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={currentCopy.postHref} className="flex min-h-12 items-center rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">{currentCopy.postLabel}</Link>
              <Link href="/my-posts" className="flex min-h-12 items-center rounded-full border border-current/15 px-5 text-[11px] font-black">My posts</Link>
            </div>
          </div>

          <div className={`mt-8 grid gap-3 rounded-[24px] border p-3 md:grid-cols-[1.35fr_1fr_.8fr_auto] ${surface}`}>
            <label className="block">
              <span className={`mb-1.5 block px-1 text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={portal === "contract" ? "Contract, route, equipment" : "Side tipper, delivery, truck"} className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none ${darkMode ? "border-white/10 bg-black text-white placeholder:text-white/28" : "border-black/10 bg-[#f8f7f3] text-black placeholder:text-black/30"}`} />
            </label>
            <label className="block">
              <span className={`mb-1.5 block px-1 text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Location</span>
              <SouthAfricaLocationInput value={location} onChange={setLocation} darkMode={darkMode} placeholder="City or province" ariaLabel="Filter marketplace listings by location" className="h-12 w-full rounded-xl" />
            </label>
            <label className="block">
              <span className={`mb-1.5 block px-1 text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Equipment</span>
              <select value={group} onChange={(event) => setGroup(event.target.value)} className={`h-12 w-full rounded-xl border px-3 text-sm font-semibold outline-none ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-[#f8f7f3] text-black"}`}>
                <option value="">All equipment</option>
                {groups.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={`mb-1.5 block px-1 text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className={`h-12 min-w-[150px] rounded-xl border px-3 text-sm font-semibold outline-none ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-[#f8f7f3] text-black"}`}>
                <option value="newest">Newest first</option>
                <option value="needed_soon">Needed soonest</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-[-.04em]">{loading ? "Loading listings" : `${total.toLocaleString("en-ZA")} ${total === 1 ? "listing" : "listings"}`}</h2>
            <p className={`mt-1 text-[10px] font-semibold ${muted}`}>Public results never include private account IDs or direct contact numbers.</p>
          </div>
          <button type="button" onClick={() => void load()} className="min-h-10 rounded-full border border-current/15 px-4 text-[10px] font-black">Refresh</button>
        </div>

        {error ? <div className="mb-4 rounded-[20px] border border-red-500/30 bg-red-500/[.06] p-4 text-sm font-semibold text-red-500">{error}</div> : null}

        {loading ? (
          <div className="grid gap-3">{[0, 1, 2].map((item) => <ListingSkeleton key={item} darkMode={darkMode} />)}</div>
        ) : rows.length ? (
          <div className="grid gap-3">
            {rows.map((listing) => (
              <ListingCard key={listing.id} listing={listing} portal={portal} darkMode={darkMode} saved={saved.has(listing.id)} onSave={() => toggleSaved(listing)} onShare={() => void share(listing)} />
            ))}
          </div>
        ) : (
          <div className={`rounded-[26px] border p-8 text-center sm:p-12 ${surface}`}>
            <h3 className="text-2xl font-black">{currentCopy.empty}</h3>
            <p className={`mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Try a broader location or equipment filter. New approved opportunities appear here after marketplace review.</p>
            <button type="button" onClick={() => { setQuery(""); setLocation(""); setGroup(""); }} className="mt-5 min-h-11 rounded-full border border-current/15 px-5 text-[11px] font-black">Clear filters</button>
          </div>
        )}

        {!loading && totalPages > 1 ? <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label={`${portal} listing pages`} /> : null}
      </section>
    </main>
  );
}

function PortalButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-full border px-4 text-[10px] font-black ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/15"}`}>{children}</button>;
}

function ListingCard({ listing, portal, darkMode, saved, onSave, onShare }: { listing: Listing; portal: Portal; darkMode: boolean; saved: boolean; onSave: () => void; onShare: () => void }) {
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";
  const image = listing.photos?.find(Boolean) || "/images/jobs/job-card-1.jpg";
  const verified = Boolean(listing.verification_level && !/none|unverified|pending/i.test(listing.verification_level));
  const facts = cardFacts(listing, portal);

  return (
    <article className={`overflow-hidden rounded-[26px] border ${surface}`}>
      <div className="grid md:grid-cols-[260px_1fr]">
        <Link href={`/listing/${listing.id}`} className="relative block min-h-[210px] overflow-hidden bg-black md:min-h-full">
          <img src={image} alt={listing.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          {listing.sponsored ? <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-black">Promoted</span> : null}
        </Link>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${darkMode ? "bg-white/[.07]" : "bg-black/[.05]"}`}>{portal === "contract" ? "Contract" : "Job"}</span>
                {verified ? <span className="rounded-full bg-[#f6b800]/15 px-2.5 py-1 text-[9px] font-black text-[#b88600]">Verified profile</span> : null}
              </div>
              <Link href={`/listing/${listing.id}`} className="mt-3 block text-[25px] font-black leading-[1.02] tracking-[-.045em] hover:underline">{listing.title}</Link>
              <p className={`mt-2 text-[11px] font-semibold ${muted}`}>{[listing.city, listing.province, listing.vehicle_group].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-black tracking-[-.035em] text-[#b88600]">{displayRate(listing)}</div>
              <div className={`mt-1 text-[9px] font-semibold ${muted}`}>{postedAge(listing.created_at)}</div>
            </div>
          </div>

          {facts.length ? <div className="mt-4 flex flex-wrap gap-2">{facts.map((fact) => <span key={fact} className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/[.07] bg-[#f8f7f3]"}`}>{fact}</span>)}</div> : null}

          <p className={`mt-4 line-clamp-2 text-[12px] font-semibold leading-5 ${muted}`}>{cleanDescription(listing.description || "Open the listing for full details, requirements and contact options.")}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link href={`/listing/${listing.id}`} className="flex min-h-11 items-center rounded-full bg-[#f6b800] px-5 text-[10px] font-black text-black">View details</Link>
            <button type="button" onClick={onSave} className={`min-h-11 rounded-full border px-4 text-[10px] font-black ${saved ? "border-[#f6b800] text-[#b88600]" : "border-current/15"}`}>{saved ? "Saved" : "Save"}</button>
            <button type="button" onClick={onShare} className="min-h-11 rounded-full border border-current/15 px-4 text-[10px] font-black">Share</button>
            <span className={`ml-auto hidden text-[9px] font-semibold sm:inline ${muted}`}>Posted by {listing.posted_by || "LoadLink member"}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ListingSkeleton({ darkMode }: { darkMode: boolean }) {
  return <div className={`grid min-h-[220px] animate-pulse overflow-hidden rounded-[26px] border md:grid-cols-[260px_1fr] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><div className={darkMode ? "bg-white/[.06]" : "bg-black/[.06]"} /><div className="space-y-3 p-6"><div className={`h-5 w-3/5 rounded ${darkMode ? "bg-white/[.08]" : "bg-black/[.07]"}`} /><div className={`h-4 w-2/5 rounded ${darkMode ? "bg-white/[.06]" : "bg-black/[.05]"}`} /><div className={`h-16 w-full rounded ${darkMode ? "bg-white/[.05]" : "bg-black/[.04]"}`} /></div></div>;
}

function displayRate(listing: Listing) {
  if (listing.rate_amount != null) return `R${Number(listing.rate_amount).toLocaleString("en-ZA")}${listing.rate_unit ? ` / ${listing.rate_unit}` : ""}`;
  return listing.rate?.trim() || "POA";
}

function cardFacts(listing: Listing, portal: Portal) {
  const facts: string[] = [];
  if (portal === "contract" || portal === "job") {
    if (listing.route_start || listing.route_end) facts.push([listing.route_start, listing.route_end].filter(Boolean).join(" → "));
    if (listing.load_type) facts.push(listing.load_type);
    if (listing.work_starts_at) facts.push(`Starts ${new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(new Date(listing.work_starts_at))}`);
    if (listing.payment_terms) facts.push(listing.payment_terms);
  } else {
    if (listing.vehicle_year) facts.push(String(listing.vehicle_year));
    if (listing.brand || listing.model) facts.push([listing.brand, listing.model].filter(Boolean).join(" "));
    if (listing.odometer_km != null) facts.push(`${Number(listing.odometer_km).toLocaleString("en-ZA")} km`);
  }
  return facts.filter(Boolean).slice(0, 4);
}

function postedAge(value?: string | null) {
  if (!value) return "Posted recently";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Posted recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function cleanDescription(value: string) {
  return value
    .replace(/^Listing type:\s*[^\n]+\n?/gim, "")
    .replace(/^Vehicle needed:\s*[^\n]+\n?/gim, "")
    .replace(/^Needed by:\s*[^\n]+\n?/gim, "")
    .replace(/^Priority:\s*[^\n]+\n?/gim, "")
    .trim();
}
