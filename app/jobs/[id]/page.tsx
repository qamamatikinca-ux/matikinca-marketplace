"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AccessibleDialog from "@/components/platform/AccessibleDialog";
import Breadcrumbs from "@/components/platform/Breadcrumbs";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import ReportDialog from "@/components/platform/ReportDialog";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Listing = {
  id: string;
  title: string;
  city?: string;
  province?: string;
  rate?: string;
  posted_by?: string;
  description?: string;
  photos?: string[];
  listing_kind?: string;
  vehicle_group?: string;
  created_at?: string;
  verification_level?: string;
};

type LocalSavedItem = { id: string; title: string; href: string; category: string; type: string; image?: string; meta?: string; entity_type: string; entity_id: string };

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [interestOpen, setInterestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/listings/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Listing could not be loaded.");
        if (active) setListing(data.listing);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Listing could not be loaded."); });

    try {
      const local = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      setSaved(Array.isArray(local) && local.some((item) => String(item?.id) === String(id)));
    } catch { setSaved(false); }

    void authenticatedFetch("/api/saved-items")
      .then(async (response) => {
        if (response.status === 401) return null;
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Saved state could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (!active || !payload) return;
        setSaved((payload.references || payload.items || []).some((item: { entity_type?: string; entity_id?: string }) => ["job", "contract"].includes(String(item.entity_type)) && String(item.entity_id) === String(id)));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id]);

  async function expressInterest() {
    try {
      const response = await authenticatedFetch("/api/jobs/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, message, proposedRate: proposedRate ? Number(proposedRate) : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInterestOpen(false);
      setMessage("");
      setNotice(data.message);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Interest could not be sent.");
    }
  }

  async function toggleSave() {
    if (!listing) return;
    const entityType = listing.listing_kind === "contract" ? "contract" : "job";
    const nextSaved = !saved;
    try {
      const local = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      const current = Array.isArray(local) ? local : [];
      const item: LocalSavedItem = {
        id: listing.id,
        entity_id: listing.id,
        entity_type: entityType,
        title: listing.title,
        href: `/jobs/${listing.id}`,
        category: entityType === "contract" ? "Contract" : "Job",
        type: entityType,
        image: listing.photos?.[0],
        meta: [listing.city, listing.province, listing.rate].filter(Boolean).join(" · ") || "Open saved opportunity",
      };
      const next = nextSaved ? [item, ...current.filter((entry) => String(entry?.id) !== listing.id)].slice(0, 100) : current.filter((entry) => String(entry?.id) !== listing.id);
      localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
      setSaved(nextSaved);
      window.dispatchEvent(new Event("loadlink-liked-listings-updated"));

      const response = await authenticatedFetch(nextSaved ? "/api/saved-items" : `/api/saved-items?entityType=${entityType}&entityId=${encodeURIComponent(listing.id)}`, {
        method: nextSaved ? "POST" : "DELETE",
        headers: nextSaved ? { "Content-Type": "application/json" } : undefined,
        body: nextSaved ? JSON.stringify({ entityType, entityId: listing.id }) : undefined,
      });
      if (response.status === 401) {
        setNotice(nextSaved ? "Saved on this device. Sign in to synchronize it across devices." : "Removed on this device. Sign in to synchronize across devices.");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Saved state could not be synchronized.");
      }
      setNotice(nextSaved ? "Saved to your LoadLink account." : "Removed from your saved items.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "This opportunity could not be saved.");
    }
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const workType = listing?.listing_kind === "contract" ? "Contracts" : "Jobs";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Breadcrumbs darkMode={darkMode} items={[{ label: "Home", href: "/" }, { label: workType, href: workType === "Contracts" ? "/contracts" : "/jobs" }, { label: listing?.title || "Details" }]} />
        {error ? <p className="mt-5 rounded-xl border border-red-500/40 p-4 font-bold text-red-500">{error}</p> : null}
        {listing ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <article className={`overflow-hidden rounded-[28px] border ${surface}`}>
              <div className="grid max-h-[520px] grid-cols-2 gap-1 bg-black">
                {(listing.photos || []).slice(0, 4).map((photo, index) => <img key={photo} src={photo} alt={`${listing.title} photo ${index + 1}`} className={`h-full min-h-44 w-full object-cover ${index === 0 ? "col-span-2 max-h-80" : ""}`} />)}
                {!listing.photos?.length ? <div className="col-span-2 flex h-64 items-center justify-center font-black text-[#f6b800]">LoadLink work opportunity</div> : null}
              </div>
              <div className="p-5 md:p-7">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">{listing.listing_kind || "job"}</span>
                  {listing.verification_level && listing.verification_level !== "unverified" ? <span className="rounded-full border border-current/15 px-3 py-1 text-[10px] font-black uppercase">{listing.verification_level.replaceAll("_", " ")}</span> : null}
                </div>
                <h1 className="mt-4 text-4xl font-black tracking-[-.045em] md:text-6xl">{listing.title}</h1>
                <p className={`mt-3 font-bold ${muted}`}>{listing.city || "South Africa"} · {listing.vehicle_group || "Logistics"}</p>
                <p className="mt-5 text-2xl font-black text-[#b88900]">{listing.rate || "Rate on application"}</p>
                <h2 className="mt-8 text-xl font-black">Work details</h2>
                <div className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${muted}`}>{listing.description}</div>
              </div>
            </article>
            <aside className={`h-fit rounded-[28px] border p-5 lg:sticky lg:top-32 ${surface}`}>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#b88900]">Posted by</p>
              <h2 className="mt-2 text-2xl font-black">{listing.posted_by || "LoadLink member"}</h2>
              <p className={`mt-3 text-sm leading-6 ${muted}`}>Keep all first contact inside LoadLink so the listing context, report tools and message history remain connected.</p>
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={() => setInterestOpen(true)} className="h-12 rounded-xl bg-[#f6b800] font-black text-black">Express interest</button>
                <Link href={`/messages?listing=${listing.id}`} className="flex h-12 items-center justify-center rounded-xl border border-current/15 font-black">Message poster</Link>
                <button type="button" onClick={() => void toggleSave()} className="h-12 rounded-xl border border-current/15 font-black">{saved ? "Saved" : "Save opportunity"}</button>
                <button type="button" onClick={() => setReportOpen(true)} className="h-12 rounded-xl border border-red-500/30 font-black text-red-500">Report listing</button>
              </div>
              {notice ? <p role="status" className="mt-4 rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-3 text-sm font-bold">{notice}</p> : null}
            </aside>
          </div>
        ) : !error ? <p className={`mt-8 ${muted}`}>Loading listing…</p> : null}
      </section>
      <ProfessionalFooter darkMode={darkMode} />
      <AccessibleDialog open={interestOpen} onClose={() => setInterestOpen(false)} title="Express interest" description="Send your availability, equipment and proposed rate to the poster’s shortlist." darkMode={darkMode}>
        <div className="grid gap-3">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe your equipment, availability and relevant experience" className="min-h-36 rounded-xl border border-current/15 bg-transparent p-4 outline-none focus:border-[#f6b800]" />
          <input value={proposedRate} onChange={(event) => setProposedRate(event.target.value)} inputMode="decimal" placeholder="Optional proposed rate in rand" className="h-12 rounded-xl border border-current/15 bg-transparent px-4 outline-none focus:border-[#f6b800]" />
          <button type="button" onClick={() => void expressInterest()} className="h-12 rounded-xl bg-[#f6b800] font-black text-black">Send interest</button>
        </div>
      </AccessibleDialog>
      {listing ? <ReportDialog open={reportOpen} listingId={listing.id} listingTitle={listing.title} darkMode={darkMode} onClose={() => setReportOpen(false)} onSubmitted={setNotice} /> : null}
    </main>
  );
}
