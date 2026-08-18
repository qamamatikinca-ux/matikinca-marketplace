"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { formatListingRate } from "@/lib/formatCurrency";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ListingState = {
  state: "active" | "deleted" | "rejected" | "pending" | "closed" | "unavailable";
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
};

type PublicListing = {
  id: string;
  title: string;
  city?: string | null;
  province?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  listing_kind?: string | null;
  dealership_id?: string | null;
  price_amount?: number | null;
  price_type?: string | null;
  vehicle_type?: string | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
  body_type?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  axle_configuration?: string | null;
  odometer_km?: number | null;
  gvm_kg?: number | null;
  payload_kg?: number | null;
  condition?: string | null;
  service_history?: string | null;
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

const STATE_COPY: Record<Exclude<ListingState["state"], "active">, { title: string; detail: string }> = {
  deleted: { title: "This listing has been deleted", detail: "The poster removed it from LoadLink and it is no longer available." },
  rejected: { title: "This listing was not approved", detail: "The listing did not pass LoadLink review and is not publicly available." },
  pending: { title: "This listing is still under review", detail: "It has not been approved for the public marketplace yet." },
  closed: { title: "This listing is no longer active", detail: "The opportunity was closed or marked as completed by the poster." },
  unavailable: { title: "This listing is unavailable", detail: "LoadLink cannot find an active public listing at this link." },
};

const PUBLIC_FIELDS = [
  "id", "title", "city", "province", "vehicle_group", "rate", "posted_by", "description", "photos", "created_at", "listing_kind", "dealership_id",
  "price_amount", "price_type", "vehicle_type", "vehicle_year", "brand", "model", "body_type", "transmission", "fuel_type", "axle_configuration", "odometer_km", "gvm_kg", "payload_kg", "condition", "service_history",
  "route_start", "route_end", "route_distance_km", "load_type", "required_equipment", "rate_amount", "rate_unit", "payment_terms", "work_starts_at", "work_ends_at",
].join(",");

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<ListingState | null>(null);
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const status = await supabase.rpc("loadlink_listing_public_state", { p_listing_id: id });
        if (!mounted) return;
        const nextState = status.error || !status.data ? ({ state: "unavailable" } as ListingState) : (status.data as ListingState);
        setState(nextState);
        if (nextState.state !== "active") return;

        const { data, error } = await supabase.from("job_listings").select(PUBLIC_FIELDS).eq("id", id).maybeSingle();
        if (!mounted) return;
        if (error || !data) {
          setState({ state: "unavailable" });
          return;
        }
        setListing(data as unknown as PublicListing);
      } catch {
        if (mounted) setState({ state: "unavailable" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const photos = listing?.photos?.filter(Boolean) || [];
  const kind = useMemo(() => String(listing?.listing_kind || "job").toLowerCase(), [listing?.listing_kind]);
  const isVehicle = kind.includes("vehicle") || kind.includes("asset") || Boolean(listing?.brand || listing?.model || listing?.vehicle_year);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  async function shareListing() {
    if (!listing) return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: `${listing.title} on LoadLink`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Listing link copied.");
        window.setTimeout(() => setNotice(""), 1800);
      }
    } catch {
      // User cancelled share or clipboard was unavailable.
    }
  }

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  if (!listing || state?.state !== "active") {
    const fallbackState = state?.state && state.state !== "active" ? state.state : "unavailable";
    const copy = STATE_COPY[fallbackState];
    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl items-center px-4 py-10 md:px-7">
          <div className={`w-full rounded-[28px] border p-6 md:p-9 ${surface}`}>
            <div className="h-2 w-12 rounded-full bg-[#f6b800]" />
            <h1 className="mt-6 text-3xl font-black tracking-[-.045em] md:text-5xl">{copy.title}</h1>
            <p className={`mt-4 max-w-xl text-sm font-semibold leading-7 md:text-base ${muted}`}>{copy.detail}</p>
            {state?.title ? <div className={`mt-6 rounded-2xl border p-4 ${surface}`}><div className="text-sm font-black">{state.title}</div><div className={`mt-1 text-[10px] font-semibold ${muted}`}>{[state.city, state.vehicle_group].filter(Boolean).join(" · ")}</div></div> : null}
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/jobs" className="flex min-h-12 items-center rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">Browse active listings</Link>
              <Link href="/messages" className="flex min-h-12 items-center rounded-full border border-current/15 px-5 text-[11px] font-black">Open messages</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const price = listing.price_amount ? `R${Number(listing.price_amount).toLocaleString("en-ZA")}` : formatListingRate(listing.rate || "");
  const facts = isVehicle ? vehicleFacts(listing) : workFacts(listing);

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-listing-detail="v1">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      {notice ? <div className="fixed left-1/2 top-24 z-[150] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-[10px] font-black text-white shadow-xl">{notice}</div> : null}

      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href={kind.includes("contract") ? "/contracts" : "/jobs"} className={`text-[10px] font-black ${muted}`}>← Back to marketplace</Link>
          <button type="button" onClick={() => void shareListing()} className="min-h-10 rounded-full border border-current/15 px-4 text-[10px] font-black">Share</button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]">
          <div className="min-w-0">
            <section className={`overflow-hidden rounded-[28px] border ${surface}`}>
              <div className="relative aspect-[16/10] bg-black sm:aspect-[16/9]">
                {photos.length ? <img src={photos[Math.min(galleryIndex, photos.length - 1)]} alt={listing.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black text-white/55">No listing photo</div>}
                {photos.length > 1 ? <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[9px] font-black text-white">{galleryIndex + 1} / {photos.length}</div> : null}
              </div>
              {photos.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
                  {photos.map((photo, index) => <button key={`${photo}-${index}`} type="button" onClick={() => setGalleryIndex(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border ${galleryIndex === index ? "border-[#f6b800]" : "border-current/10"}`}><img src={photo} alt="" className="h-full w-full object-cover" /></button>)}
                </div>
              ) : null}
            </section>

            <section className={`mt-4 rounded-[28px] border p-5 sm:p-6 ${surface}`}>
              <h2 className="text-lg font-black">Details</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {facts.map(([label, value]) => <Fact key={label} label={label} value={value} darkMode={darkMode} />)}
              </div>
            </section>

            {listing.description ? (
              <section className={`mt-4 rounded-[28px] border p-5 sm:p-6 ${surface}`}>
                <h2 className="text-lg font-black">About this listing</h2>
                <p className={`mt-4 whitespace-pre-line text-sm font-semibold leading-7 ${muted}`}>{cleanDescription(listing.description)}</p>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className={`rounded-[28px] border p-5 sm:p-6 ${surface}`}>
              <p className={`text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>{listingLabel(kind, isVehicle)}</p>
              <h1 className="mt-2 text-[30px] font-black leading-[1.02] tracking-[-.055em] sm:text-[38px]">{listing.title}</h1>
              <p className={`mt-3 text-[11px] font-semibold ${muted}`}>{[listing.city, listing.province].filter(Boolean).join(", ") || "South Africa"}</p>
              {price && price !== "POA" ? <div className="mt-5 text-[28px] font-black tracking-[-.04em] text-[#b88600]">{price}</div> : <div className="mt-5 text-xl font-black">Price on application</div>}

              <div className="mt-6 border-t border-current/10 pt-5">
                <p className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Posted by</p>
                <div className="mt-2 text-sm font-black">{listing.posted_by || "LoadLink member"}</div>
                <div className={`mt-1 text-[10px] font-semibold ${muted}`}>Contact details are handled through the marketplace conversation flow.</div>
              </div>

              <div className="mt-6 grid gap-2">
                <Link href={`/messages?listing=${encodeURIComponent(listing.id)}`} className="flex min-h-13 items-center justify-center rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">Message on LoadLink</Link>
                <button type="button" onClick={() => void shareListing()} className="min-h-12 rounded-full border border-current/15 px-5 text-[11px] font-black">Share listing</button>
              </div>

              <div className={`mt-6 rounded-[18px] border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/[.07] bg-[#f8f7f3]"}`}>
                <div className="text-[10px] font-black">Marketplace safety</div>
                <p className={`mt-1.5 text-[9px] font-semibold leading-4 ${muted}`}>Confirm the counterparty, inspect vehicles where relevant and keep important deal details in writing before making payment.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function vehicleFacts(listing: PublicListing): Array<[string, string]> {
  return [
    ["Year", listing.vehicle_year ? String(listing.vehicle_year) : ""],
    ["Make", listing.brand || ""],
    ["Model", listing.model || ""],
    ["Vehicle type", listing.vehicle_type || listing.vehicle_group || ""],
    ["Body", listing.body_type || ""],
    ["Transmission", listing.transmission || ""],
    ["Fuel", listing.fuel_type || ""],
    ["Axles", listing.axle_configuration || ""],
    ["Odometer", listing.odometer_km != null ? `${Number(listing.odometer_km).toLocaleString("en-ZA")} km` : ""],
    ["GVM", listing.gvm_kg != null ? `${Number(listing.gvm_kg).toLocaleString("en-ZA")} kg` : ""],
    ["Payload", listing.payload_kg != null ? `${Number(listing.payload_kg).toLocaleString("en-ZA")} kg` : ""],
    ["Condition", listing.condition || ""],
    ["Service history", listing.service_history || ""],
  ].filter((item) => Boolean(item[1])) as Array<[string, string]>;
}

function workFacts(listing: PublicListing): Array<[string, string]> {
  return [
    ["Route", [listing.route_start, listing.route_end].filter(Boolean).join(" → ")],
    ["Distance", listing.route_distance_km != null ? `${Number(listing.route_distance_km).toLocaleString("en-ZA")} km` : ""],
    ["Load", listing.load_type || ""],
    ["Equipment", listing.required_equipment?.join(", ") || listing.vehicle_group || ""],
    ["Rate", listing.rate_amount != null ? `R${Number(listing.rate_amount).toLocaleString("en-ZA")}${listing.rate_unit ? ` / ${listing.rate_unit}` : ""}` : ""],
    ["Payment terms", listing.payment_terms || ""],
    ["Starts", formatDate(listing.work_starts_at)],
    ["Ends", formatDate(listing.work_ends_at)],
  ].filter((item) => Boolean(item[1])) as Array<[string, string]>;
}

function Fact({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`rounded-[18px] border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/[.07] bg-[#f8f7f3]"}`}><div className="text-[9px] font-black uppercase tracking-[.1em] opacity-42">{label}</div><div className="mt-1.5 text-[12px] font-black">{value}</div></div>;
}

function listingLabel(kind: string, isVehicle: boolean) {
  if (isVehicle) return "Vehicle listing";
  if (kind.includes("contract")) return "Contract";
  return "Logistics job";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function cleanDescription(value: string) {
  return value
    .replace(/^Listing type:\s*[^\n]+\n?/gim, "")
    .replace(/^Vehicle needed:\s*[^\n]+\n?/gim, "")
    .replace(/^Needed by:\s*[^\n]+\n?/gim, "")
    .replace(/^Priority:\s*[^\n]+\n?/gim, "")
    .trim();
}
