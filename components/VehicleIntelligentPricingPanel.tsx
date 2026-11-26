"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatZar } from "@/lib/vehicleMarketGuide";

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
  serviceHistory?: string; accidentHistory?: string; engineCondition?: string;
  tyreCondition?: string; roadworthy?: string; description?: string;
  fuelUse?: string; onFuelUseChange?: (value: string) => void; posting?: boolean;
  onUsePrice?: (value: string) => void;
};

/** A single unobtrusive seller action, not an additional comparison/guide card. */
export default function VehicleIntelligentPricingPanel({
  darkMode, make, model, year, condition, mileage, offerMode, onUsePrice,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [evidence, setEvidence] = useState<PriceEvidence | null>(null);
  const [error, setError] = useState("");
  const selling = offerMode === "sale" || offerMode === "sale_or_rental";
  const ready = make.trim().length >= 2 && model.trim().length >= 2 &&
    Number.isInteger(year) && year >= 1970 && condition.trim().length > 0;

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
      setError("Pricing is temporarily unavailable. You may enter your own asking price.");
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
    <div data-loadlink-price-determination="true" className="min-w-0 text-left">
      <button type="button" onClick={determinePrice} disabled={!ready || loading}
        className="inline-flex min-h-9 items-center text-xs font-semibold underline underline-offset-4 decoration-[#f6b800] disabled:cursor-not-allowed disabled:opacity-45">
        {loading ? "Calculating price…" : "Determine price"}
      </button>
      {!ready ? <p className={"text-xs leading-5 " + muted}>Confirm make, model, year and actual condition first.</p> : null}
      {error ? <p role="status" className={"mt-1 text-xs leading-5 " + muted}>{error}</p> : null}
      {checked && supported ? (
        <div role="status" className="mt-2 space-y-1 text-xs leading-5">
          <p><strong>Suggested asking range: {formatZar(lower)} – {formatZar(upper)}</strong></p>
          <p className={muted}>Based on {evidence?.sample_count} approved LoadLink asking prices, not confirmed sales.</p>
          {onUsePrice ? <button type="button" onClick={() => onUsePrice(String(Math.round(estimated)))}
            className="min-h-9 font-semibold underline underline-offset-4 decoration-[#f6b800]">
            Use {formatZar(estimated)}
          </button> : null}
        </div>
      ) : null}
      {checked && !supported ? (
        <p role="status" className={"mt-1 text-xs leading-5 " + muted}>
          Not enough verified market data for a reliable estimate yet. You can set your own asking price.
        </p>
      ) : null}
    </div>
  );
}
