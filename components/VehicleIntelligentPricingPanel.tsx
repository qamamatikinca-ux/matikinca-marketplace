"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatZar } from "@/lib/vehicleMarketGuide";

type PriceEvidence = {
  available?: boolean; sample_count?: number;
  low_cents?: number; recommended_cents?: number; high_cents?: number;
};
type Props = {
  darkMode: boolean; category: string; make: string; model: string; year: number;
  condition: string; mileage: string; salePrice: string; offerMode: string;
  serviceHistory?: string; accidentHistory?: string; engineCondition?: string;
  tyreCondition?: string; roadworthy?: string; description?: string;
  fuelUse?: string; onFuelUseChange?: (value: string) => void; posting?: boolean;
  onUsePrice?: (value: string) => void;
};

/** Seller-controlled pricing based on available evidence, never a fabricated appraisal. */
export default function VehicleIntelligentPricingPanel({
  darkMode, make, model, year, condition, mileage, offerMode, onUsePrice,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [evidence, setEvidence] = useState<PriceEvidence | null>(null);
  const [error, setError] = useState("");
  const selling = offerMode === "sale" || offerMode === "sale_or_rental";
  const ready = make.trim().length >= 2 && model.trim().length >= 2 &&
    Number.isInteger(year) && year >= 1970;

  useEffect(() => {
    setEvidence(null);
    setChecked(false);
    setError("");
  }, [make, model, year, condition, mileage, offerMode]);

  async function determinePrice() {
    if (!selling || !ready || loading) return;
    setLoading(true);
    setChecked(false);
    setEvidence(null);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("loadlink_vehicle_market_recommendation", {
        p_brand: make.trim(), p_model: model.trim(), p_year: year,
        p_condition: condition,
        p_odometer_km: mileage.trim() && Number.isFinite(Number(mileage)) ? Number(mileage) : null,
        p_body_type: null,
      });
      if (rpcError) throw rpcError;
      setEvidence((Array.isArray(data) ? data[0] : data) as PriceEvidence | null);
      setChecked(true);
    } catch {
      setError("The pricing service is unavailable. You can still enter your own price.");
    } finally {
      setLoading(false);
    }
  }

  if (!selling) return null;
  const supported = Boolean(evidence?.available && Number(evidence.sample_count) >= 3 &&
    Number(evidence.recommended_cents) > 0);
  const estimated = Number(evidence?.recommended_cents || 0) / 100;
  const lower = Number(evidence?.low_cents || evidence?.recommended_cents || 0) / 100;
  const upper = Number(evidence?.high_cents || evidence?.recommended_cents || 0) / 100;
  const muted = darkMode ? "text-white/60" : "text-black/60";

  return (
    <div data-loadlink-price-determination="true" className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Price determination</p>
          <p className={"mt-1 text-xs leading-5 " + muted}>Optional guidance for your asking price.</p>
        </div>
        <button type="button" onClick={determinePrice} disabled={!ready || loading}
          className="min-h-11 shrink-0 rounded-lg border border-[#f6b800] px-4 text-xs font-semibold text-inherit transition-colors hover:bg-[#f6b800]/10 disabled:cursor-not-allowed disabled:opacity-45">
          {loading ? "Calculating…" : "Determine price"}
        </button>
      </div>
      {!ready ? <p className={"mt-2 text-xs " + muted}>Confirm the make, model and year to request a price estimate.</p> : null}
      {error ? <p role="status" className="mt-3 text-sm">{error}</p> : null}
      {checked && supported ? (
        <div className={"mt-3 rounded-lg border p-3 " + (darkMode ? "border-white/15" : "border-black/10")}>
          <p className={"text-xs " + muted}>Indicative asking-price range</p>
          <p className="mt-1 text-lg font-semibold">{formatZar(lower)} – {formatZar(upper)}</p>
          <p className={"mt-1 text-xs leading-5 " + muted}>
            Midpoint {formatZar(estimated)}. Based on {evidence?.sample_count} approved LoadLink listings;
            advertised prices are not confirmed sale prices.
          </p>
          {onUsePrice ? <button type="button" onClick={() => onUsePrice(String(Math.round(estimated)))}
            className="mt-3 min-h-10 rounded-lg bg-[#f6b800] px-4 text-xs font-semibold text-black">
            Use midpoint as asking price
          </button> : null}
        </div>
      ) : null}
      {checked && !supported ? (
        <p role="status" className={"mt-3 text-xs leading-5 " + muted}>
          A reliable market estimate is not available for this specific vehicle yet.
          Enter your own asking price; LoadLink will not invent a valuation.
        </p>
      ) : null}
    </div>
  );
}
