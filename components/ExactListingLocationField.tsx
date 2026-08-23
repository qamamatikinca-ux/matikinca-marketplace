"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { attachSouthAfricaAutocomplete, geocodeLoadLinkAddress, googleMapsKey, reverseGeocodeLoadLink, type LoadLinkLatLng } from "@/lib/googleMapsBrowser";

export type ListingCoordinates = LoadLinkLatLng | null;

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
  const exactInputRef = useRef<HTMLInputElement>(null);
  const [exactMode, setExactMode] = useState(false);
  const [coordinates, setCoordinates] = useState<ListingCoordinates>(null);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const mapsKey = googleMapsKey();

  useEffect(() => onCoordinatesChange?.(coordinates), [coordinates, onCoordinatesChange]);

  useEffect(() => {
    if (!exactMode || !exactInputRef.current || !mapsKey) return;
    let active = true;
    let listener: { remove?: () => void } | null = null;
    void attachSouthAfricaAutocomplete(exactInputRef.current, (place) => {
      if (!active) return;
      onChange(place.address);
      setCoordinates(place.coordinates);
      setNotice("Exact location confirmed for distance estimates.");
      setMapOpen(true);
    }).then((next) => { listener = next; });
    return () => { active = false; listener?.remove?.(); };
  }, [exactMode, mapsKey, onChange]);

  const mapQuery = useMemo(() => {
    if (coordinates) return `${coordinates.latitude},${coordinates.longitude}`;
    return value.trim() || "South Africa";
  }, [coordinates, value]);

  async function confirmAddress() {
    if (!value.trim() || confirming || coordinates) return;
    if (!mapsKey) {
      setNotice("Address saved. Add the Google Maps browser key later to verify exact coordinates, or use your current location now.");
      return;
    }
    setConfirming(true);
    const confirmed = await geocodeLoadLinkAddress(value);
    if (confirmed) {
      onChange(confirmed.address);
      setCoordinates(confirmed.coordinates);
      setNotice("Exact location confirmed for distance estimates.");
    } else {
      setNotice("LoadLink could not confirm that exact address. Choose one of Google’s suggestions or keep city / province only.");
    }
    setConfirming(false);
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
        setMapOpen(true);
        setNotice(`Precise location selected${Math.round(position.coords.accuracy) ? ` · about ${Math.round(position.coords.accuracy)} m accuracy` : ""}.`);
        void reverseGeocodeLoadLink(next.latitude, next.longitude).then((address) => {
          if (address) onChange(address);
        });
        setLocating(false);
      },
      () => {
        setNotice("Location permission was not granted. You can still type an exact address or keep city / province only.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";
  const muted = darkMode ? "text-white/50" : "text-black/52";

  return (
    <div data-loadlink-exact-location="places-20260823">
      {exactMode ? (
        <input
          ref={exactInputRef}
          id={id}
          type="text"
          inputMode="text"
          data-loadlink-text-keyboard="true"
          autoComplete="street-address"
          value={value}
          onChange={(event) => { onChange(event.target.value); setCoordinates(null); setNotice(""); }}
          onBlur={() => void confirmAddress()}
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
          Exact location is optional. Google suggestions keep the address accurate and let interested users calculate an approximate distance. For privacy, keep only city / province.
        </p>
        {confirming ? <p className="mt-2 text-[10px] font-bold text-[#a87a00]">Confirming address…</p> : notice ? <p className="mt-2 text-[10px] font-bold text-[#a87a00]">{notice}</p> : null}
        {mapOpen ? (
          <div className="mt-3 overflow-hidden rounded-[14px] border border-current/10 bg-black/[.03]">
            <iframe title="LoadLink location map preview" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} className="h-48 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            {!mapsKey && exactMode ? <p className={`px-3 py-2 text-[9px] font-semibold ${muted}`}>Map preview works now. Verified typed-address coordinates will activate when the Google Maps browser key is added; current-location coordinates already work without it.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
