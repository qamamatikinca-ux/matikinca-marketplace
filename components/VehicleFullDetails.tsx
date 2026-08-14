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

type ReviewRow = { rating?: number | string | null };

type Props = {
  description: string;
  city: string;
  dealershipId?: string | null;
  darkMode: boolean;
};

type ParsedDetails = {
  narrative: string;
  entries: Array<[string, string]>;
};

const preferredOrder = [
  "Offer",
  "Sale price",
  "Rental rate",
  "Vehicle subtype",
  "Year",
  "Make",
  "Model",
  "Condition",
  "Mileage",
  "Transmission",
  "Fuel",
  "Axle configuration",
  "GVM",
  "Payload",
  "Service history",
  "Previous owners",
  "Engine / power",
  "Cab configuration",
  "Braking / retarder",
  "Suspension",
  "Braking system",
  "Body / deck dimensions",
  "Loading configuration",
  "Temperature range",
  "Refrigeration system",
  "Power supply",
  "Internal capacity",
  "Water system",
  "Included kitchen equipment",
  "Extraction / ventilation",
  "Internal dimensions",
  "Fit-out / equipment",
  "Operating capability",
  "Seller",
];

function parseVehicleDetails(value: string): ParsedDetails {
  const metadata = new Map<string, string>();
  const narrative: string[] = [];
  let inNarrative = false;

  String(value || "")
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      if (/^description\s*:\s*$/i.test(line)) {
        inNarrative = true;
        return;
      }
      if (inNarrative) {
        narrative.push(line);
        return;
      }
      const match = line.match(/^([^:]{2,64}):\s*(.+)$/);
      if (match) metadata.set(match[1].trim(), match[2].trim());
      else narrative.push(line);
    });

  const ordered: Array<[string, string]> = [];
  preferredOrder.forEach((key) => {
    const valueForKey = metadata.get(key);
    if (valueForKey) {
      ordered.push([key, valueForKey]);
      metadata.delete(key);
    }
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
  const [reviewSummary, setReviewSummary] = useState<{ average: number; count: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [distanceState, setDistanceState] = useState<"idle" | "loading" | "unavailable">("idle");

  useEffect(() => {
    let active = true;
    setDealer(null);
    setReviewSummary(null);
    if (!dealershipId || !isSupabaseConfigured) return;

    void (async () => {
      const [profileResult, reviewResult] = await Promise.all([
        supabase
          .from("public_dealership_profiles")
          .select("slug,name,trading_hours,physical_location")
          .eq("id", dealershipId)
          .maybeSingle(),
        supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: dealershipId, p_limit: 50 }),
      ]);
      if (!active) return;
      if (!profileResult.error && profileResult.data) setDealer(profileResult.data as DealerSnapshot);
      if (!reviewResult.error && Array.isArray(reviewResult.data)) {
        const ratings = (reviewResult.data as ReviewRow[])
          .map((row) => Number(row.rating || 0))
          .filter((rating) => Number.isFinite(rating) && rating > 0 && rating <= 5);
        if (ratings.length) {
          setReviewSummary({
            average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
            count: ratings.length,
          });
        }
      }
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [dealershipId]);

  async function calculateDistance() {
    if (!city || !navigator.geolocation) {
      setDistanceState("unavailable");
      return;
    }
    setDistanceState("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/location-coordinates?place=${encodeURIComponent(city)}`, { cache: "force-cache" });
          const payload = (await response.json()) as { lat?: number; lon?: number };
          if (!response.ok || !Number.isFinite(Number(payload.lat)) || !Number.isFinite(Number(payload.lon))) throw new Error("Location unavailable");
          const kilometres = haversineKm(
            position.coords.latitude,
            position.coords.longitude,
            Number(payload.lat),
            Number(payload.lon),
          );
          setDistance(Math.max(0, Math.round(kilometres)));
          setDistanceState("idle");
        } catch {
          setDistanceState("unavailable");
        }
      },
      () => setDistanceState("unavailable"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const tile = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/8 bg-black/[.025]";

  return (
    <div>
      {parsed.entries.length ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Commercial vehicle details</p>
              <h4 className="mt-1 text-lg font-black">Vehicle specification</h4>
            </div>
            <button
              type="button"
              onClick={() => void calculateDistance()}
              disabled={distanceState === "loading"}
              className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "border-white/15 bg-white/[.04]" : "border-black/10 bg-white"}`}
            >
              {distance !== null ? `${distance} km from you` : distanceState === "loading" ? "Checking…" : "Km from you"}
            </button>
          </div>
          {distanceState === "unavailable" ? <p className={`mt-2 text-xs font-semibold ${muted}`}>Distance could not be calculated. Allow approximate location access and try again.</p> : null}

          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {parsed.entries.map(([label, value]) => (
              <div key={`${label}-${value}`} className={`rounded-xl border px-3.5 py-3 ${tile}`}>
                <dt className={`text-[10px] font-black uppercase tracking-[.09em] ${muted}`}>{label}</dt>
                <dd className="mt-1.5 text-sm font-black leading-5">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {parsed.narrative ? (
        <section className={`mt-4 rounded-xl border p-4 ${tile}`}>
          <h4 className="text-sm font-black">Seller description</h4>
          <p className={`mt-2 text-sm leading-7 ${darkMode ? "text-white/70" : "text-black/65"}`}>{parsed.narrative}</p>
        </section>
      ) : null}

      <section className={`mt-4 rounded-xl border p-4 ${tile}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">Reviews</p>
            <p className="mt-1 text-sm font-black">
              {reviewSummary ? `${reviewSummary.average.toFixed(1)} / 5 · ${reviewSummary.count} verified review${reviewSummary.count === 1 ? "" : "s"}` : dealershipId ? "No verified dealership reviews yet" : "No verified seller reviews available yet"}
            </p>
          </div>
          {dealer?.slug ? <Link href={`/dealership/${dealer.slug}`} className="text-xs font-black underline underline-offset-4">View dealership</Link> : null}
        </div>

        {dealer ? (
          <div className={`mt-4 grid gap-3 border-t pt-4 text-sm font-semibold ${darkMode ? "border-white/10" : "border-black/10"}`}>
            <div><span className={muted}>Dealership</span><strong className="ml-2">{dealer.name}</strong></div>
            {dealer.physical_location ? <div><span className={muted}>Location</span><strong className="ml-2">{dealer.physical_location}</strong></div> : null}
            {dealer.trading_hours ? <div><span className={muted}>Opening times</span><strong className="ml-2 whitespace-pre-line">{dealer.trading_hours}</strong></div> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
