"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/platform/Breadcrumbs";
import EmptyState from "@/components/platform/EmptyState";
import MarketplaceCard, { type MarketplaceCardItem } from "@/components/platform/MarketplaceCard";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import ReportDialog from "@/components/platform/ReportDialog";
import StatusBadge from "@/components/platform/StatusBadge";
import StickyContactBar from "@/components/platform/StickyContactBar";
import { formatListingRate } from "@/lib/formatCurrency";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Listing = MarketplaceCardItem & Record<string, unknown>;
type Dealer = { id: string; slug?: string; name?: string; profile_image_url?: string; physical_location?: string; verification_status?: string; average_response_minutes?: number; trust_score?: number; phone_number?: string; whatsapp_number?: string };

function display(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "number") return `${value.toLocaleString("en-ZA")}${suffix}`;
  return `${String(value)}${suffix}`;
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [listing, setListing] = useState<Listing | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [similar, setSimilar] = useState<MarketplaceCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/listings/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "This vehicle could not be loaded."); return data; })
      .then((data) => { if (!active) return; setListing(data.listing); setDealer(data.dealership); setSimilar(data.similar || []); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "This vehicle could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    try { const ids = JSON.parse(localStorage.getItem("loadlink-saved-vehicle-ids") || "[]"); setSaved(Array.isArray(ids) && ids.includes(id)); } catch { setSaved(false); }
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const response = await authenticatedFetch("/api/saved-items");
        const payload = await response.json();
        if (active && response.ok) setSaved((payload.items || []).some((item: { entity_type?: string; entity_id?: string }) => item.entity_type === "vehicle" && item.entity_id === id));
      } catch { /* local saved state remains available offline */ }
    });
    return () => { active = false; };
  }, [id]);

  const photos = useMemo(() => (listing?.photos as string[] | undefined)?.filter(Boolean) || [], [listing]);
  const specs = useMemo(() => listing ? [
    ["Year", listing.vehicle_year], ["Make", listing.brand], ["Model", listing.model], ["Vehicle type", listing.vehicle_type || listing.body_type],
    ["Transmission", listing.transmission], ["Fuel", listing.fuel_type], ["Axle configuration", listing.axle_configuration],
    ["Mileage", listing.odometer_km != null ? `${Number(listing.odometer_km).toLocaleString("en-ZA")} km` : null],
    ["GVM", listing.gvm_kg != null ? `${Number(listing.gvm_kg).toLocaleString("en-ZA")} kg` : null],
    ["Payload", listing.payload_kg != null ? `${Number(listing.payload_kg).toLocaleString("en-ZA")} kg` : null],
    ["Condition", listing.condition], ["Previous owners", listing.previous_owners], ["Service history", listing.service_history],
  ] : [], [listing]);

  async function toggleSave() {
    if (!listing) return;
    try {
      const ids = new Set<string>(JSON.parse(localStorage.getItem("loadlink-saved-vehicle-ids") || "[]"));
      const cards = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      if (ids.has(listing.id)) ids.delete(listing.id); else ids.add(listing.id);
      localStorage.setItem("loadlink-saved-vehicle-ids", JSON.stringify([...ids]));
      const item = { id: listing.id, title: listing.title, href: `/vehicles/${listing.id}`, category: "Vehicle", type: listing.vehicle_type || listing.vehicle_group || "Commercial vehicle", image: photos[0] || "/images/jobs/job-card-1.jpg", meta: `${listing.city || "South Africa"} · ${listing.rate || "POA"}`, savedAt: Date.now() };
      const next = ids.has(listing.id) ? [item, ...(Array.isArray(cards) ? cards.filter((entry) => entry?.id !== listing.id) : [])].slice(0, 60) : (Array.isArray(cards) ? cards.filter((entry) => entry?.id !== listing.id) : []);
      localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
      const nextSaved = ids.has(listing.id);
      setSaved(nextSaved);
      window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
      try {
        const response = await authenticatedFetch(nextSaved ? "/api/saved-items" : `/api/saved-items?entityType=vehicle&entityId=${encodeURIComponent(listing.id)}`, {
          method: nextSaved ? "POST" : "DELETE",
          headers: nextSaved ? { "Content-Type": "application/json" } : undefined,
          body: nextSaved ? JSON.stringify({ entityType: "vehicle", entityId: listing.id }) : undefined,
        });
        if (!response.ok) throw new Error();
      } catch {
        setMessage(nextSaved ? "Saved on this device. Sign in to synchronize it across devices." : "Removed on this device. Sign in to synchronize across devices.");
      }
    } catch { setMessage("This vehicle could not be saved."); }
  }

  async function share() {
    if (!listing) return;
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: listing.title || "LoadLink vehicle", text: `${listing.title} on LoadLink`, url }); else { await navigator.clipboard.writeText(url); setMessage("Vehicle link copied."); } } catch { /* sharing cancelled */ }
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} compact /><div className="mx-auto max-w-7xl px-5 py-12"><div className={`aspect-[16/8] animate-pulse rounded-[28px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} /></div></main>;
  if (!listing) return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="mx-auto max-w-3xl px-5 py-12"><EmptyState title="Vehicle unavailable" body={message || "This listing may have expired, been sold or been removed during moderation."} actionLabel="Browse active vehicles" actionHref="/vehicles" darkMode={darkMode} /></div><ProfessionalFooter darkMode={darkMode} /></main>;

  const price = String(listing.rate || (listing.price_amount ? `R ${Number(listing.price_amount).toLocaleString("en-ZA")}` : "Price on application"));
  return <main className={`min-h-screen pb-20 md:pb-0 ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="px-5 py-5 md:px-12"><div className="mx-auto max-w-7xl"><Breadcrumbs darkMode={darkMode} items={[{ label: "Home", href: "/" }, { label: "Vehicles", href: "/vehicles" }, { label: String(listing.brand || listing.vehicle_type || "Commercial vehicle"), href: `/vehicles?make=${encodeURIComponent(String(listing.brand || ""))}` }, { label: String(listing.title || "Vehicle") }]} /></div></section><section className="px-5 pb-10 md:px-12"><div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[1.35fr_.65fr]"><div><div className={`overflow-hidden rounded-[28px] border ${surface}`}><div className="relative aspect-[16/10] bg-black">{photos[imageIndex] ? <img src={photos[imageIndex]} alt={`${listing.title} image ${imageIndex + 1}`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-2xl font-black text-[#f6b800]">LOADLINK</div>}{photos.length > 1 ? <><button onClick={() => setImageIndex((current) => (current - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Previous image">←</button><button onClick={() => setImageIndex((current) => (current + 1) % photos.length)} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Next image">→</button></> : null}<span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-black text-white">{Math.min(imageIndex + 1, Math.max(1, photos.length))} / {Math.max(1, photos.length)}</span></div>{photos.length > 1 ? <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">{photos.map((photo, index) => <button key={`${photo}-${index}`} onClick={() => setImageIndex(index)} className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 ${imageIndex === index ? "border-[#f6b800]" : "border-transparent"}`} aria-label={`Show image ${index + 1}`}><img src={photo} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}</div><section className={`mt-6 rounded-[24px] border p-5 md:p-7 ${surface}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><StatusBadge status={listing.stock_status || "active"} />{listing.verification_level ? <span className="rounded-full border border-[#f6b800]/50 bg-[#f6b800]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#b88900]">{String(listing.verification_level).replaceAll("_", " ")}</span> : null}</div><h1 className="mt-4 text-3xl font-black tracking-[-.04em] md:text-5xl">{listing.title}</h1><p className={`mt-3 text-sm font-bold ${muted}`}>{[listing.city, listing.province].filter(Boolean).join(", ") || "South Africa"} · Listed {listing.created_at ? new Date(String(listing.created_at)).toLocaleDateString("en-ZA") : "recently"}</p></div><p className="text-3xl font-black text-[#b88900]">{formatListingRate(price)}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><button onClick={() => void toggleSave()} className="h-12 rounded-xl border border-current/15 text-xs font-black uppercase">{saved ? "Saved" : "Save"}</button><button onClick={() => void share()} className="h-12 rounded-xl border border-current/15 text-xs font-black uppercase">Share</button><button onClick={() => setReportOpen(true)} className="h-12 rounded-xl border border-current/15 text-xs font-black uppercase">Report</button></div>{listing.description ? <div className="mt-7"><h2 className="text-2xl font-black">Description</h2><p className={`mt-3 whitespace-pre-line text-sm leading-7 ${muted}`}>{String(listing.description)}</p></div> : null}</section><section className={`mt-6 rounded-[24px] border p-5 md:p-7 ${surface}`}><h2 className="text-2xl font-black">Vehicle specifications</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{specs.map(([label, value]) => <div key={String(label)} className={`rounded-xl border p-4 ${darkMode ? "border-white/10 bg-white/[.02]" : "border-black/8 bg-black/[.02]"}`}><p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>{String(label)}</p><p className="mt-2 text-sm font-black">{display(value)}</p></div>)}</div></section></div><aside className="self-start lg:sticky lg:top-36"><section className={`rounded-[24px] border p-5 ${surface}`}><p className="text-xs font-black uppercase tracking-[.16em] text-[#b88900]">Seller</p><div className="mt-4 flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#f6b800] bg-black text-lg font-black text-[#f6b800]">{dealer?.profile_image_url ? <img src={dealer.profile_image_url} alt="" className="h-full w-full object-cover" /> : String(dealer?.name || listing.posted_by || "L").slice(0, 2).toUpperCase()}</div><div><h2 className="text-xl font-black">{dealer?.name || String(listing.posted_by || "Private seller")}</h2><p className={`mt-1 text-xs font-bold ${muted}`}>{dealer ? "Verified LoadLink dealership" : "LoadLink seller"}</p></div></div>{dealer?.physical_location ? <p className={`mt-4 text-sm font-semibold ${muted}`}>{dealer.physical_location}</p> : null}{dealer?.average_response_minutes ? <p className={`mt-2 text-xs font-bold ${muted}`}>Usually responds in about {dealer.average_response_minutes} minutes</p> : null}<div className="mt-5 grid gap-2"><Link href={`/messages?listing=${listing.id}${dealer?.id ? `&dealership=${dealer.id}` : ""}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Message on LoadLink</Link>{dealer?.slug ? <Link href={`/dealership/${dealer.slug}`} className="flex h-12 items-center justify-center rounded-xl border border-current/15 text-xs font-black uppercase">View dealership</Link> : null}</div><p className={`mt-5 border-t pt-4 text-xs leading-6 ${darkMode ? "border-white/10 text-white/45" : "border-black/10 text-black/45"}`}>Never send OTPs, passwords or banking PINs. Confirm the vehicle, seller, documents and payment terms before paying.</p></section>{listing.price_amount ? <section className={`mt-4 rounded-[24px] border p-5 ${surface}`}><p className="text-xs font-black uppercase tracking-[.16em] text-[#b88900]">Affordability guide</p><p className="mt-3 text-sm font-bold">Estimated amount shown for comparison only</p><p className={`mt-2 text-xs leading-6 ${muted}`}>Finance approval, interest and monthly repayment depend on the lender. LoadLink does not promise credit approval.</p></section> : null}</aside></div></section>{similar.length ? <section className={`border-t px-5 py-12 md:px-12 ${darkMode ? "border-white/10 bg-[#070707]" : "border-black/10 bg-white"}`}><div className="mx-auto max-w-7xl"><h2 className="text-3xl font-black">Similar commercial vehicles</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{similar.map((item) => <MarketplaceCard key={item.id} item={item} darkMode={darkMode} />)}</div></div></section> : null}<ProfessionalFooter darkMode={darkMode} /><StickyContactBar listingId={listing.id} title={String(listing.title)} darkMode={darkMode} /><ReportDialog open={reportOpen} listingId={listing.id} listingTitle={String(listing.title)} darkMode={darkMode} onClose={() => setReportOpen(false)} onSubmitted={setMessage} />{message ? <button onClick={() => setMessage("")} className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white shadow-2xl md:bottom-5">{message}</button> : null}</main>;
}
