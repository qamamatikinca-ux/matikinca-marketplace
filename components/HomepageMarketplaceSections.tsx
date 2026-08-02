"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import RequireAuthLink from "@/components/RequireAuthLink";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { getFollowedProfiles } from "@/lib/following";
import { formatListingRate } from "@/lib/formatCurrency";
import { isAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ListingKind = "job" | "contract" | "vehicle";

type ListingRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  listing_kind?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  expires_at?: string | null;
  stock_status?: string | null;
  dealership_id?: string | null;
};

type DriverRow = {
  id: string;
  full_name: string;
  headline?: string | null;
  city?: string | null;
  province?: string | null;
  years_experience?: number | null;
  licence_code?: string | null;
  vehicle_types?: string[] | null;
  availability?: string | null;
};

type DealershipRow = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  physical_location?: string | null;
  short_bio?: string | null;
};

type SavedSummary = {
  listings: number;
  followedDealerships: number;
  recentlyViewed: number;
};

const EMPTY_SAVED: SavedSummary = { listings: 0, followedDealerships: 0, recentlyViewed: 0 };

export default function HomepageMarketplaceSections({ darkMode }: { darkMode: boolean }) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [dealerships, setDealerships] = useState<DealershipRow[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [listingNotice, setListingNotice] = useState("");
  const [driverNotice, setDriverNotice] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState<SavedSummary>(EMPTY_SAVED);
  const vehicleSliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(payload.error || "Listings could not be loaded."));
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setListings(((payload.rows || []) as ListingRow[]).filter(isPublicAndCurrent));
      })
      .catch(() => {
        if (!active) return;
        setListings([]);
        setListingNotice("Approved marketplace listings are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoadingListings(false);
      });

    fetch("/api/phase2/public-drivers?limit=4&offset=0", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(payload.error || "Drivers could not be loaded."));
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setDrivers((payload.drivers || []) as DriverRow[]);
      })
      .catch(() => {
        if (!active) return;
        setDrivers([]);
        setDriverNotice("Approved driver profiles are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoadingDrivers(false);
      });

    if (isSupabaseConfigured) {
      supabase
        .from("dealership_profiles")
        .select("id,slug,name,profile_image_url,physical_location,short_bio")
        .eq("verification_status", "approved")
        .eq("is_public", true)
        .eq("is_featured", true)
        .order("updated_at", { ascending: false })
        .limit(4)
        .then(({ data, error }) => {
          if (active && !error) setDealerships((data || []) as DealershipRow[]);
        });
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function refreshSavedSummary() {
      try {
        const savedListings = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
        const recentlyViewed = JSON.parse(localStorage.getItem("loadlink-recent-viewed-jobs") || "[]");
        setSaved({
          listings: Array.isArray(savedListings) ? savedListings.length : 0,
          followedDealerships: getFollowedProfiles().filter((item) => item.type === "dealership").length,
          recentlyViewed: Array.isArray(recentlyViewed) ? recentlyViewed.length : 0,
        });
      } catch {
        setSaved(EMPTY_SAVED);
      }
    }

    refreshSavedSummary();
    window.addEventListener("storage", refreshSavedSummary);
    window.addEventListener("loadlink-liked-listings-updated", refreshSavedSummary);
    window.addEventListener("loadlink-recent-activity-updated", refreshSavedSummary);
    window.addEventListener("loadlink-following-changed", refreshSavedSummary);
    window.addEventListener("loadlink-account-state-synced", refreshSavedSummary);

    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => setSignedIn(isAuthenticatedUser(data.user)));
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(isAuthenticatedUser(session?.user)));

      return () => {
        subscription.unsubscribe();
        window.removeEventListener("storage", refreshSavedSummary);
        window.removeEventListener("loadlink-liked-listings-updated", refreshSavedSummary);
        window.removeEventListener("loadlink-recent-activity-updated", refreshSavedSummary);
        window.removeEventListener("loadlink-following-changed", refreshSavedSummary);
        window.removeEventListener("loadlink-account-state-synced", refreshSavedSummary);
      };
    }

    return () => {
      window.removeEventListener("storage", refreshSavedSummary);
      window.removeEventListener("loadlink-liked-listings-updated", refreshSavedSummary);
      window.removeEventListener("loadlink-recent-activity-updated", refreshSavedSummary);
      window.removeEventListener("loadlink-following-changed", refreshSavedSummary);
      window.removeEventListener("loadlink-account-state-synced", refreshSavedSummary);
    };
  }, []);

  const jobs = useMemo(() => listings.filter((item) => listingKind(item) === "job").slice(0, 3), [listings]);
  const contracts = useMemo(() => listings.filter((item) => listingKind(item) === "contract").slice(0, 3), [listings]);
  const vehicles = useMemo(
    () => listings.filter((item) => listingKind(item) === "vehicle" && String(item.stock_status || "available").toLowerCase() !== "sold").slice(0, 10),
    [listings],
  );

  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#fffaf0] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  function moveVehicles(direction: number) {
    vehicleSliderRef.current?.scrollBy({ left: direction * Math.min(340, window.innerWidth * 0.82), behavior: "smooth" });
  }

  return (
    <section className={`${page} px-5 py-12 md:px-12 md:py-16`} aria-label="Latest LoadLink marketplace activity">
      <div className="mx-auto max-w-7xl space-y-14">
        <div>
          <SectionHeading
            eyebrow="Current marketplace activity"
            title="Latest approved opportunities"
            description="Only active, administrator-approved jobs and contracts are shown here."
            muted={muted}
          />

          {loadingListings ? (
            <LoadingGrid darkMode={darkMode} />
          ) : listingNotice ? (
            <StatusPanel message={listingNotice} darkMode={darkMode} />
          ) : (
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              <OpportunityColumn title="Latest jobs" href="/jobs" items={jobs} kind="job" darkMode={darkMode} surface={surface} muted={muted} />
              <OpportunityColumn title="Latest contracts" href="/contracts" items={contracts} kind="contract" darkMode={darkMode} surface={surface} muted={muted} />
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Vehicles"
              title="Available commercial vehicles"
              description="Approved private and dealership stock currently available on LoadLink."
              muted={muted}
            />
            {vehicles.length > 1 ? (
              <div className="hidden gap-2 sm:flex">
                <button type="button" onClick={() => moveVehicles(-1)} className={`flex h-10 w-10 items-center justify-center border ${darkMode ? "border-white/20" : "border-black/15"}`} aria-label="Previous vehicles">←</button>
                <button type="button" onClick={() => moveVehicles(1)} className="flex h-10 w-10 items-center justify-center bg-[#f6b800] text-black" aria-label="Next vehicles">→</button>
              </div>
            ) : null}
          </div>

          {loadingListings ? (
            <LoadingRow darkMode={darkMode} />
          ) : vehicles.length ? (
            <div ref={vehicleSliderRef} className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
              {vehicles.map((vehicle) => {
                const image = vehicle.photos?.[0] || "/images/truck-1.jpg";
                const href = listingHref(vehicle, "vehicle");
                return (
                  <Link
                    key={vehicle.id}
                    href={href}
                    onClick={() => rememberViewed({ id: vehicle.id, title: vehicle.title || "Commercial vehicle", href, category: "Vehicle", type: vehicle.vehicle_group || "Commercial vehicle", image, meta: `${vehicle.city || "South Africa"} · ${formatListingRate(vehicle.rate || "")}` })}
                    className={`w-[82vw] max-w-[310px] shrink-0 snap-start overflow-hidden border ${surface}`}
                  >
                    <div className="relative aspect-[4/3] bg-black/10">
                      <img src={image} alt={vehicle.title || "Commercial vehicle"} className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-3 bg-black/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#f6b800]">{vehicle.stock_status || "Available"}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-lg font-black">{vehicle.title || "Commercial vehicle"}</h3>
                      <p className={`mt-2 text-xs font-bold ${muted}`}>{vehicle.city || "South Africa"}</p>
                      <p className="mt-3 text-base font-black text-[#b88900]">{formatListingRate(vehicle.rate || "Price on request")}</p>
                      <span className={`mt-4 block text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>View listing</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <StatusPanel message="No approved commercial vehicles are available yet." darkMode={darkMode} />
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Drivers"
              title="Approved drivers available for work"
              description="A preview of professional drivers who have completed the LoadLink approval process."
              muted={muted}
            />
            <Link href="/drivers" className="border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#b88900]">View all drivers</Link>
          </div>

          {loadingDrivers ? (
            <LoadingGrid darkMode={darkMode} />
          ) : driverNotice ? (
            <StatusPanel message={driverNotice} darkMode={darkMode} />
          ) : drivers.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {drivers.map((driver) => {
                const href = "/drivers";
                return (
                  <Link
                    key={driver.id}
                    href={href}
                    onClick={() => rememberViewed({ id: driver.id, title: driver.full_name, href, category: "Driver", type: driver.headline || "Professional driver", meta: `${driver.city || "South Africa"} · Licence ${driver.licence_code || "on request"}` })}
                    className={`border p-5 ${surface}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xs font-black text-[#f6b800]">{initials(driver.full_name)}</span>
                      <span className="border border-[#f6b800]/55 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#b88900]">Approved</span>
                    </div>
                    <h3 className="mt-5 text-xl font-black">{driver.full_name}</h3>
                    <p className={`mt-1 text-xs font-bold ${muted}`}>{driver.headline || "Professional driver"}</p>
                    <dl className={`mt-5 space-y-2 text-xs font-semibold ${muted}`}>
                      <div className="flex justify-between gap-3"><dt>Location</dt><dd className="text-right font-black">{[driver.city, driver.province].filter(Boolean).join(", ") || "South Africa"}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Experience</dt><dd className="text-right font-black">{driver.years_experience || 0} years</dd></div>
                      <div className="flex justify-between gap-3"><dt>Licence</dt><dd className="text-right font-black">{driver.licence_code || "On request"}</dd></div>
                    </dl>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">View driver profiles</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <StatusPanel message="No approved driver profiles are available yet." darkMode={darkMode} />
          )}
        </div>

        {dealerships.length ? (
          <div id="featured-dealerships">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Dealerships"
                title="Featured verified dealerships"
                description="Approved dealership profiles currently featured on LoadLink."
                muted={muted}
              />
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dealerships.map((dealer) => {
                const href = `/dealership/${dealer.slug}`;
                return (
                  <Link
                    key={dealer.id}
                    href={href}
                    onClick={() => rememberViewed({ id: dealer.id, title: dealer.name, href, category: "Dealership", type: "Verified dealership", image: dealer.profile_image_url || undefined, meta: dealer.physical_location || "South Africa" })}
                    className={`border p-5 ${surface}`}
                  >
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-black text-sm font-black text-[#f6b800]">
                      {dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={dealer.name} className="h-full w-full object-cover" /> : initials(dealer.name)}
                    </div>
                    <h3 className="mt-5 text-xl font-black">{dealer.name}</h3>
                    <p className={`mt-2 text-xs font-semibold ${muted}`}>{dealer.physical_location || "South Africa"}</p>
                    {dealer.short_bio ? <p className={`mt-4 line-clamp-3 text-sm leading-6 ${muted}`}>{dealer.short_bio}</p> : null}
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">View dealership</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <section className={`border p-6 ${surface}`}>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Post on LoadLink</p>
            <h2 className="mt-3 text-2xl font-black">Choose what you want to publish</h2>
            <div className="mt-5 grid gap-2">
              <RequireAuthLink href="/jobs/list" className="flex h-12 items-center justify-between border border-[#f6b800] px-4 text-xs font-black uppercase tracking-[.1em] text-[#b88900]"><span>Post a logistics job</span><span>→</span></RequireAuthLink>
              <RequireAuthLink href="/jobs/list?mode=contract" className="flex h-12 items-center justify-between border border-[#f6b800] px-4 text-xs font-black uppercase tracking-[.1em] text-[#b88900]"><span>Post a contract</span><span>→</span></RequireAuthLink>
              <RequireAuthLink href="/list-your-vehicle" className="flex h-12 items-center justify-between bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[.1em] text-black"><span>List a vehicle</span><span>→</span></RequireAuthLink>
            </div>
          </section>

          <section className={`border p-6 ${surface}`}>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Why LoadLink</p>
            <h2 className="mt-3 text-2xl font-black">Built around trusted logistics activity</h2>
            <div className={`mt-5 space-y-4 text-sm font-semibold ${muted}`}>
              <TrustLine title="Reviewed listings" copy="Public homepage results are limited to active, approved posts." />
              <TrustLine title="Approved profiles" copy="Driver and dealership previews use approved public profiles only." />
              <TrustLine title="Direct communication" copy="Signed-in users can continue enquiries through LoadLink messaging." />
            </div>
          </section>

          <section className={`border p-6 ${surface}`}>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Your activity</p>
            <h2 className="mt-3 text-2xl font-black">Saved and recently viewed</h2>
            {signedIn ? (
              <div className="mt-5 grid grid-cols-3 gap-2">
                <SummaryMetric label="Saved" value={saved.listings} muted={muted} />
                <SummaryMetric label="Dealers" value={saved.followedDealerships} muted={muted} />
                <SummaryMetric label="Viewed" value={saved.recentlyViewed} muted={muted} />
              </div>
            ) : (
              <p className={`mt-5 text-sm font-semibold leading-6 ${muted}`}>Sign in to synchronize saved listings and recent activity with your LoadLink account.</p>
            )}
            <Link href={signedIn ? "/account/settings" : "/login?next=%2F"} className="mt-6 inline-flex border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-[#b88900]">
              {signedIn ? "Account settings" : "Sign in"}
            </Link>
          </section>
        </div>
      </div>
    </section>
  );
}

function OpportunityColumn({
  title,
  href,
  items,
  kind,
  darkMode,
  surface,
  muted,
}: {
  title: string;
  href: string;
  items: ListingRow[];
  kind: "job" | "contract";
  darkMode: boolean;
  surface: string;
  muted: string;
}) {
  return (
    <section className={`border ${surface}`}>
      <div className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${darkMode ? "border-white/10" : "border-black/10"}`}>
        <h2 className="text-xl font-black">{title}</h2>
        <Link href={href} className="text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">View all</Link>
      </div>
      {items.length ? (
        <div className={`divide-y ${darkMode ? "divide-white/10" : "divide-black/10"}`}>
          {items.map((item) => {
            const itemHref = listingHref(item, kind);
            return (
              <Link
                key={item.id}
                href={itemHref}
                onClick={() => rememberViewed({ id: item.id, title: item.title || "LoadLink opportunity", href: itemHref, category: kind === "contract" ? "Contract" : "Job", type: item.vehicle_group || "Logistics", image: item.photos?.[0] || undefined, meta: `${item.city || "South Africa"} · ${formatListingRate(item.rate || "")}` })}
                className="flex items-center gap-4 p-5 transition hover:bg-[#f6b800]/[.05]"
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden bg-black/10">
                  {item.photos?.[0] ? <img src={item.photos[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-black text-xs font-black text-[#f6b800]">LL</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[.12em] text-[#b88900]">{listingStatus(item)}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[.1em] ${muted}`}>{item.city || "South Africa"}</span>
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-base font-black">{item.title || "LoadLink opportunity"}</h3>
                  <p className={`mt-1 truncate text-xs font-semibold ${muted}`}>{item.vehicle_group || item.posted_by || "Logistics opportunity"}</p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={`p-7 text-sm font-semibold ${muted}`}>No approved {kind === "contract" ? "contracts" : "jobs"} are available yet.</div>
      )}
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, muted }: { eyebrow: string; title: string; description: string; muted: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-[-.05em] md:text-5xl">{title}</h2>
      <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>{description}</p>
    </div>
  );
}

function LoadingGrid({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading marketplace information">
      {[0, 1, 2, 3].map((item) => <div key={item} className={`h-48 animate-pulse border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.04]"}`} />)}
    </div>
  );
}

function LoadingRow({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="mt-7 flex gap-4 overflow-hidden" aria-label="Loading vehicles">
      {[0, 1, 2].map((item) => <div key={item} className={`h-72 w-[82vw] max-w-[310px] shrink-0 animate-pulse border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.04]"}`} />)}
    </div>
  );
}

function StatusPanel({ message, darkMode }: { message: string; darkMode: boolean }) {
  return <div className={`mt-7 border p-7 text-sm font-semibold ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white/55" : "border-black/10 bg-white text-black/55"}`}>{message}</div>;
}

function TrustLine({ title, copy }: { title: string; copy: string }) {
  return <div className="border-l-2 border-[#f6b800] pl-4"><p className="font-black text-current">{title}</p><p className="mt-1 text-xs leading-5">{copy}</p></div>;
}

function SummaryMetric({ label, value, muted }: { label: string; value: number; muted: string }) {
  return <div className="border border-current/10 p-3 text-center"><p className="text-2xl font-black">{value}</p><p className={`mt-1 text-[9px] font-black uppercase tracking-[.1em] ${muted}`}>{label}</p></div>;
}

function isPublicAndCurrent(item: ListingRow) {
  if (item.status && item.status !== "active") return false;
  if (item.moderation_status && item.moderation_status !== "approved") return false;
  if (item.expires_at) {
    const expiry = new Date(item.expires_at).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

function listingKind(item: ListingRow): ListingKind {
  const stored = String(item.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(stored)) return "vehicle";
  if (stored === "contract") return "contract";
  if (stored === "job") {
    const described = descriptionKind(item.description);
    return described || "job";
  }
  return descriptionKind(item.description) || "job";
}

function descriptionKind(description?: string | null): ListingKind | null {
  const match = String(description || "").match(/^Listing type:\s*([^\n]+)/i);
  const value = String(match?.[1] || "").toLowerCase();
  if (value.includes("contract")) return "contract";
  if (value.includes("truck") || value.includes("vehicle") || value.includes("mobile unit") || value.includes("trailer")) return "vehicle";
  if (value.includes("job")) return "job";
  return null;
}

function listingHref(item: ListingRow, kind = listingKind(item)) {
  const portal = kind === "contract" ? "contract" : kind === "vehicle" ? "asset" : "job";
  return `/jobs?portal=${portal}#job-${item.id}`;
}

function listingStatus(item: ListingRow) {
  const now = Date.now();
  const created = item.created_at ? new Date(item.created_at).getTime() : 0;
  const expiry = item.expires_at ? new Date(item.expires_at).getTime() : 0;
  if (expiry && expiry - now <= 3 * 24 * 60 * 60 * 1000) return "Closing soon";
  if (created && now - created <= 48 * 60 * 60 * 1000) return "Newly posted";
  return "Approved";
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL";
}

function rememberViewed(item: { id: string; title: string; href: string; category: string; type: string; image?: string; meta?: string }) {
  try {
    const current = JSON.parse(localStorage.getItem("loadlink-recent-viewed-jobs") || "[]");
    const nextItem = { ...item, savedAt: Date.now() };
    const next = [nextItem, ...(Array.isArray(current) ? current.filter((entry) => entry?.id !== item.id) : [])].slice(0, 20);
    localStorage.setItem("loadlink-recent-viewed-jobs", JSON.stringify(next));
    window.dispatchEvent(new Event("loadlink-recent-activity-updated"));
    window.dispatchEvent(new Event("loadlink-account-state-changed"));
    void recordUserActivity("marketplace_item_view", { entityType: item.category.toLowerCase(), entityId: item.id, metadata: { title: item.title, href: item.href } });
    void syncAccountState().catch(() => undefined);
  } catch {
    // Browsing remains available when local storage is blocked.
  }
}
