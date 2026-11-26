"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatZar } from "@/lib/vehicleMarketGuide";
import { canAutoDetermineVehiclePrice } from "@/lib/automaticVehiclePricing";

type PriceEvidence = {
  available?: boolean;
  sample_count?: number;
  low_cents?: number;
  recommended_cents?: number;
  high_cents?: number;
};

type Props = {
  darkMode: boolean; category: string; make: string; model: string; year: number;
  condition: string; mileage: string; salePrice: string; offerMode: string;
  bodyType?: string; readyForEstimate?: boolean;
  serviceHistory?: string; accidentHistory?: string; engineCondition?: string;
  tyreCondition?: string; roadworthy?: string; description?: string;
  fuelUse?: string; onFuelUseChange?: (value: string) => void; posting?: boolean;
  onUsePrice?: (value: string) => void;
};

/**
 * Uses real comparable LoadLink listing data, not guessed trade values.
 * The estimator runs automatically when the seller has finished the relevant
 * vehicle details. Never overwrites an asking price supplied by the seller.
 */
export default function VehicleIntelligentPricingPanel({
  darkMode, make, model, year, condition, mileage, offerMode, bodyType = "",
  readyForEstimate = true, onUsePrice,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [evidence, setEvidence] = useState<PriceEvidence | null>(null);
  const [error, setError] = useState("");
  const selling = offerMode === "sale" || offerMode === "sale_or_rental" || offerMode === "poa";
  const ready = canAutoDetermineVehiclePrice({
    make, model, year, condition, mileage, offerMode, detailsComplete: readyForEstimate,
  });

  useEffect(() => {
    let active = true;
    setEvidence(null);
    setChecked(false);
    setError("");
    setLoading(false);
    if (!ready) return;
    setLoading(true);
    // One comparison request after the last relevant edit, not on every keystroke.
    const timer = window.setTimeout(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("loadlink_vehicle_market_recommendation", {
          p_brand: make.trim(), p_model: model.trim(), p_year: year,
          p_condition: condition,
          p_odometer_km: Number(mileage),
          p_body_type: bodyType.trim() || null,
        });
        if (rpcError) throw rpcError;
        if (!active) return;
        setEvidence((Array.isArray(data) ? data[0] : data) as PriceEvidence | null);
        setChecked(true);
      } catch {
        if (active) setError("Price data is temporarily unavailable. Set your own asking price.");
      } finally {
        if (active) setLoading(false);
      }
    }, 650);
    return () => { active = false; window.clearTimeout(timer); };
  }, [ready, make, model, year, condition, mileage, bodyType]);

  if (offerMode === "rental") return (
    <section data-loadlink-price-determination="rental-cost-based" className="min-w-0 border-t border-current/10 pt-4">
      <h3 className="text-sm font-semibold">Automatic price determination</h3>
      <p className={"mt-2 text-xs leading-5 " + (darkMode ? "text-white/65" : "text-black/60")}>
        Comparable sale prices do not determine a reliable rental rate. The cost of ownership calculator immediately below
        uses your actual operating expenses; use those costs to set a rental rate.
      </p>
    </section>
  );
  const supported = Boolean(checked && evidence?.available &&
    Number(evidence.sample_count) >= 3 && Number.isFinite(Number(evidence.recommended_cents)) &&
    Number(evidence.recommended_cents) > 0);
  const estimated = Number(evidence?.recommended_cents || 0) / 100;
  const lower = Number(evidence?.low_cents || evidence?.recommended_cents || 0) / 100;
  const upper = Number(evidence?.high_cents || evidence?.recommended_cents || 0) / 100;
  const muted = darkMode ? "text-white/65" : "text-black/60";

  return (
    <section data-loadlink-price-determination="automatic" aria-label="Automatic vehicle price determination"
      className="min-w-0 border-t border-current/10 pt-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Automatic price determination</h3>
        <span className={"text-xs " + muted}>{loading ? "Calculating…" : supported ? "Estimate ready" : "Market data"}</span>
      </div>
      {loading ? <p role="status" className={"mt-2 text-xs leading-5 " + muted}>
        Checking comparable LoadLink sale listings automatically…
      </p> : !ready ? <p role="status" className={"mt-2 text-xs leading-5 " + muted}>
        {readyForEstimate
          ? "Complete the make, model, year, condition and odometer reading to calculate a price automatically."
          : "Complete the vehicle details below. The price check runs automatically when they are ready."}
      </p> : error ? <p role="status" className={"mt-2 text-xs leading-5 " + muted}>{error}</p> : supported ? (
        <div role="status" className="mt-2 space-y-1 text-xs leading-5">
          <p><strong>Suggested asking range: {formatZar(lower)} – {formatZar(upper)}</strong></p>
          <p className={muted}>Based on {evidence?.sample_count} comparable advertised LoadLink prices, not completed sales or a guaranteed valuation.</p>
          <p className={muted}>The asking price you enter stays under your control.</p>
          {onUsePrice && offerMode !== "poa" ? <button type="button" onClick={() => onUsePrice(String(Math.round(estimated)))}
            className="min-h-10 font-semibold underline underline-offset-4 decoration-[#f6b800]">
            Use suggested {formatZar(estimated)}
          </button> : null}
        </div>
      ) : checked ? <p role="status" className={"mt-2 text-xs leading-5 " + muted}>
        Not enough matching advertised sales for a reliable estimate (at least three are needed). You can still enter your asking price.
      </p> : null}
    </section>
  );
}
