"use client";

import { useEffect, useMemo, useState } from "react";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";

export type ListingCoordinates = { latitude: number; longitude: number } | null;

export default function ExactListingLocationField({
  value,
  onChange,
  onCoordinatesChange,
  darkMode,
  className,
  id = "loadlink-listing-location",
}: {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (value: ListingCoordinates) => void;
  darkMode: boolean;
  className: string;
  id?: string;
}) {
  const [exactMode, setExactMode] = useState(false);
  const [coordinates, setCoordinates] = useState<ListingCoordinates>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => onCoordinatesChange?.(coordinates), [coordinates, onCoordinatesChange]);

  const mapQuery = useMemo(() => {
    if (coordinates) return `${coordinates.latitude},${coordinates.longitude}`;
    return value.trim() || "South Africa";
  }, [coordinates, value]);

  async function geocodeAddress(address: string) {
    if (!mapsKey || !address.trim()) return;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&region=za&key=${encodeURIComponent(mapsKey)}`);
      const payload = await response.json();
      const first = payload?.results?.[0];
      const location = first?.geometry?.location;
      if (typeof location?.lat === "number" && typeof location?.lng === "number") {
        setCoordinates({ latitude: location.lat, longitude: location.lng });
        if (first.formatted_address) onChange(String(first.formatted_address));
        setNotice("Exact location confirmed for distance estimates.");
      }
    } catch {
      setNotice("The address is saved, but LoadLink could not confirm its map coordinates right now.");
    }
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    if (!mapsKey) return;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(mapsKey)}`);
      const payload = await response.json();
      const first = payload?.results?.[0];
      if (first?.formatted_address) onChange(String(first.formatted_address));
    } catch {
      // Coordinates remain valid even if address formatting is temporarily unavailable.
    }
  }

  function useCurrentLocation() {
    setNotice("");
    if (!navigator.geolocation) {
      setNotice("Location services are not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoordinates(next);
        setExactMode(true);
        setNotice(`Precise location selected${Math.round(position.coords.accuracy) ? ` · about ${Math.round(position.coords.accuracy)} m accuracy` : ""}.`);
        void reverseGeocode(next.latitude, next.longitude);
        setLocating(false);
      },
      () => {
        setNotice("Location permission was not granted. You can still type an exact address or keep city/province only.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";
  const muted = darkMode ? "text-white/50" : "text-black/52";

  return (
    <div data-loadlink-exact-location="20260823">
      {exactMode ? (
        <input
          id={id}
          type="text"
          inputMode="text"
          data-loadlink-text-keyboard="true"
          autoComplete="street-address"
          value={value}
          onChange={(event) => { onChange(event.target.value); setCoordinates(null); setNotice(""); }}
          onBlur={() => void geocodeAddress(value)}
          placeholder="e.g. 32 Superdrive Avenue, Centurion"
          className={className}
          aria-label="Exact contract or listing address"
        />
      ) : (
        <SouthAfricaLocationInput
          id={id}
          value={value}
          onChange={(next) => { onChange(next); setCoordinates(null); }}
          darkMode={darkMode}
          placeholder="City, town or province"
          ariaLabel="Listing city, town or province"
          className={className}
        />
      )}

      <div className={`mt-2 rounded-[16px] border p-3 ${soft}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setExactMode((current) => !current); setCoordinates(null); setNotice(""); }} className="rounded-full border border-[#f6b800]/55 px-3 py-2 text-[10px] font-black">
            {exactMode ? "Use city / province" : "Use exact address"}
          </button>
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black disabled:opacity-50">
            {locating ? "Locating…" : "Use my current location"}
          </button>
          <button type="button" onClick={() => setMapOpen((current) => !current)} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black">
            {mapOpen ? "Hide map" : "Check on map"}
          </button>
        </div>
        <p className={`mt-2 text-[10px] font-semibold leading-4 ${muted}`}>
          Exact location is optional. It helps interested users calculate approximate distance. If you prefer privacy, keep only your city or province.
        </p>
        {notice ? <p className="mt-2 text-[10px] font-bold text-[#a87a00]">{notice}</p> : null}
        {mapOpen ? (
          <div className="mt-3 overflow-hidden rounded-[14px] border border-current/10 bg-black/[.03]">
            <iframe
              title="LoadLink location map preview"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              className="h-48 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {!mapsKey && exactMode ? <p className={`px-3 py-2 text-[9px] font-semibold ${muted}`}>Map preview is available. Verified distance coordinates require the LoadLink Google Maps key or “Use my current location”.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
