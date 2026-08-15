"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type DealerSnapshot = {
  slug: string;
  name: string;
  trading_hours?: string | null;
  physical_location?: string | null;
};

type ReviewRow = {
  id?: string | null;
  rating?: number | string | null;
  body?: string | null;
  dealer_response?: string | null;
  dealer_response_at?: string | null;
  created_at?: string | null;
};

type Props = { description: string; city: string; dealershipId?: string | null; darkMode: boolean };
type ParsedDetails = { narrative: string; entries: Array<[string, string]> };

const preferredOrder = [
  "Offer", "Sale price", "Rental rate", "Vehicle subtype", "Year", "Make", "Model", "Condition", "Mileage",
  "Transmission", "Fuel", "Axle configuration", "GVM", "Payload", "Service history", "Previous owners",
  "Engine / power", "Cab configuration", "Braking / retarder", "Suspension", "Braking system", "Body / deck dimensions",
  "Loading configuration", "Temperature range", "Refrigeration system", "Power supply", "Internal capacity", "Water system",
  "Included kitchen equipment", "Extraction / ventilation", "Internal dimensions", "Fit-out / equipment", "Operating capability", "Seller",
];

function parseVehicleDetails(value: string): ParsedDetails {
  const metadata = new Map<string, string>();
  const narrative: string[] = [];
  let inNarrative = false;
  String(value || "").split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (/^description\s*:\s*$/i.test(line)) { inNarrative = true; return; }
    if (inNarrative) { narrative.push(line); return; }
    const match = line.match(/^([^:]{2,64}):\s*(.+)$/);
    if (match) metadata.set(match[1].trim(), match[2].trim()); else narrative.push(line);
  });
  const ordered: Array<[string, string]> = [];
  preferredOrder.forEach((key) => {
    const found = metadata.get(key);
    if (found) { ordered.push([key, found]); metadata.delete(key); }
  });
  metadata.forEach((entryValue, key) => ordered.push([key, entryValue]));
  return { narrative: narrative.join(" "), entries: ordered };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDistance = toRadians(lat2 - lat1);
  const longitudeDistance = toRadians(lon2 - lon1);
  const first = Math.sin(latitudeDistance / 2) ** 2;
  const second = Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDistance / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(first + second), Math.sqrt(1 - first - second));
}

export default function VehicleFullDetails({ description, city, dealershipId, darkMode }: Props) {
  const parsed = useMemo(() => parseVehicleDetails(description), [description]);
  const [dealer, setDealer] = useState<DealerSnapshot | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [distanceState, setDistanceState] = useState<"idle" | "loading" | "unavailable">("idle");
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewState, setReviewState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [reviewMessage, setReviewMessage] = useState("");

  async function loadReviews(id: string) {
    const result = await supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: id, p_limit: 20 });
    if (!result.error && Array.isArray(result.data)) setReviews(result.data as ReviewRow[]);
  }

  useEffect(() => {
    let active = true;
    setDealer(null);
    setReviews([]);
    if (!dealershipId || !isSupabaseConfigured) return;

    void (async () => {
      const profileResult = await supabase.from("public_dealership_profiles").select("slug,name,trading_hours,physical_location").eq("id", dealershipId).maybeSingle();
      if (!active) return;
      if (!profileResult.error && profileResult.data) setDealer(profileResult.data as DealerSnapshot);
      await loadReviews(dealershipId);
    })().catch(() => undefined);

    const channel = supabase
      .channel(`loadlink-public-reviews-${dealershipId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_reviews", filter: `dealership_id=eq.${dealershipId}` }, () => void loadReviews(dealershipId))
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [dealershipId]);

  const reviewSummary = useMemo(() => {
    const ratings = reviews.map((row) => Number(row.rating || 0)).filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
    if (!ratings.length) return null;
    return { average: ratings.reduce((sum, value) => sum + value, 0) / ratings.length, count: ratings.length };
  }, [reviews]);

  async function submitReview() {
    if (!dealershipId) return;
    setReviewState("saving");
    setReviewMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const { error } = await supabase.rpc("loadlink_submit_public_dealer_review", {
      p_dealership_id: dealershipId,
      p_rating: rating,
      p_body: reviewBody.trim(),
    });
    if (error) {
      setReviewState("error");
      setReviewMessage(error.message || "The review could not be saved.");
      return;
    }
    setReviewBody("");
    setReviewState("saved");
    setReviewMessage("Review published.");
    await loadReviews(dealershipId);
  }

  async function calculateDistance() {
    if (!city || !navigator.geolocation) { setDistanceState("unavailable"); return; }
    setDistanceState("loading");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch(`/api/location-coordinates?place=${encodeURIComponent(city)}`, { cache: "force-cache" });
        const payload = (await response.json()) as { lat?: number; lon?: number };
        if (!response.ok || !Number.isFinite(Number(payload.lat)) || !Number.isFinite(Number(payload.lon))) throw new Error("Location unavailable");
        setDistance(Math.max(0, Math.round(haversineKm(position.coords.latitude, position.coords.longitude, Number(payload.lat), Number(payload.lon)))));
        setDistanceState("idle");
      } catch { setDistanceState("unavailable"); }
    }, () => setDistanceState("unavailable"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  }

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const tile = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.08] bg-black/[.025]";
  const input = darkMode ? "border-white/12 bg-black text-white" : "border-black/10 bg-white text-black";

  return (
    <div>
      {parsed.entries.length ? (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h4 className="text-xl font-black">Vehicle specifications</h4>
            <button type="button" onClick={() => void calculateDistance()} disabled={distanceState === "loading"} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black ${darkMode ? "border-white/15 bg-white/[.04]" : "border-black/10 bg-white"}`}>
              {distance !== null ? `${distance} km from you` : distanceState === "loading" ? "Checking distance…" : "Check distance"}
            </button>
          </div>
          {distanceState === "unavailable" ? <p className={`mt-2 text-xs font-semibold ${muted}`}>Distance could not be calculated. Allow approximate location access and try again.</p> : null}
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {parsed.entries.map(([label, value]) => <div key={`${label}-${value}`} className={`rounded-xl border px-3.5 py-3 ${tile}`}><dt className={`text-[10px] font-black uppercase tracking-[.09em] ${muted}`}>{label}</dt><dd className="mt-1.5 text-sm font-black leading-5">{value}</dd></div>)}
          </dl>
        </section>
      ) : null}

      {parsed.narrative ? <section className={`mt-4 rounded-xl border p-4 ${tile}`}><h4 className="text-sm font-black">Seller description</h4><p className={`mt-2 text-sm leading-7 ${darkMode ? "text-white/70" : "text-black/65"}`}>{parsed.narrative}</p></section> : null}

      <section className={`mt-4 rounded-xl border p-4 ${tile}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-black">Reviews</h4>
            <p className={`mt-1 text-sm font-semibold ${muted}`}>{reviewSummary ? `${reviewSummary.average.toFixed(1)} / 5 · ${reviewSummary.count} review${reviewSummary.count === 1 ? "" : "s"}` : dealershipId ? "No dealership reviews yet" : "Reviews are available on dealership listings"}</p>
          </div>
          {dealer?.slug ? <Link href={`/dealership/${dealer.slug}`} className="text-xs font-black underline underline-offset-4">View dealership</Link> : null}
        </div>

        {reviews.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{reviews.slice(0, 6).map((review, index) => <article key={String(review.id || index)} className={`rounded-xl border p-3.5 ${darkMode ? "border-white/10 bg-black/25" : "border-black/[.07] bg-white/65"}`}><div className="text-sm font-black">{Number(review.rating || 0)}/5</div>{review.body ? <p className={`mt-2 text-sm leading-6 ${muted}`}>{review.body}</p> : null}</article>)}</div> : null}

        {dealershipId ? <div className={`mt-4 border-t pt-4 ${darkMode ? "border-white/10" : "border-black/10"}`}>
          <p className="text-sm font-black">Leave or update your review</p>
          <div className="mt-3 flex flex-wrap gap-2">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={`h-10 min-w-10 rounded-full border text-sm font-black ${rating === value ? "border-[#f6b800] bg-[#f6b800] text-black" : input}`}>{value}</button>)}</div>
          <textarea value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} maxLength={1200} placeholder="Share your experience with this dealership" className={`mt-3 min-h-24 w-full rounded-xl border p-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${input}`} />
          <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={reviewState === "saving" || reviewBody.trim().length < 5} onClick={() => void submitReview()} className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black disabled:opacity-40">{reviewState === "saving" ? "Publishing…" : "Publish review"}</button>{reviewMessage ? <span className={`text-xs font-semibold ${reviewState === "error" ? "text-red-500" : muted}`}>{reviewMessage}</span> : null}</div>
        </div> : null}

        {dealer ? <div className={`mt-4 grid gap-3 border-t pt-4 text-sm font-semibold ${darkMode ? "border-white/10" : "border-black/10"}`}><div><span className={muted}>Dealership</span><strong className="ml-2">{dealer.name}</strong></div>{dealer.physical_location ? <div><span className={muted}>Location</span><strong className="ml-2">{dealer.physical_location}</strong></div> : null}{dealer.trading_hours ? <div><span className={muted}>Opening times</span><strong className="ml-2 whitespace-pre-line">{dealer.trading_hours}</strong></div> : null}</div> : null}
      </section>
    </div>
  );
}
