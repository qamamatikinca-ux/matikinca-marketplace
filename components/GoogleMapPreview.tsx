"use client";

import { useEffect, useRef, useState } from "react";
import { googleMapsConfigured, loadGoogleMaps } from "@/lib/googleMapsClient";

type MapInstance = {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type MapConstructor = new (
  element: HTMLElement,
  options: {
    center: { lat: number; lng: number };
    zoom: number;
    mapTypeControl: boolean;
    streetViewControl: boolean;
    fullscreenControl: boolean;
    zoomControl: boolean;
    clickableIcons: boolean;
    keyboardShortcuts: boolean;
    gestureHandling: string;
  },
) => MapInstance;

export default function GoogleMapPreview({
  latitude,
  longitude,
  label,
  darkMode,
  className = "",
}: {
  latitude: number;
  longitude: number;
  label?: string;
  darkMode: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!hostRef.current || !googleMapsConfigured()) return;
      try {
        const maps = await loadGoogleMaps();
        const library = await maps.importLibrary("maps") as { Map?: MapConstructor };
        if (!active || !hostRef.current || !library.Map) return;
        const center = { lat: latitude, lng: longitude };
        if (mapRef.current) {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(13);
          return;
        }
        mapRef.current = new library.Map(hostRef.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: "cooperative",
        });
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => { active = false; };
  }, [latitude, longitude]);

  if (!googleMapsConfigured() || failed) return null;

  return (
    <div className={`overflow-hidden rounded-[18px] border ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white"} ${className}`}>
      <div className="relative h-52 w-full">
        <div ref={hostRef} className="absolute inset-0" aria-label={label ? `Map preview for ${label}` : "Selected location map preview"} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" aria-hidden="true">
          <span className="block h-7 w-7 rotate-45 rounded-[50%_50%_50%_0] border-[3px] border-white bg-[#f6b800] shadow-[0_5px_18px_rgba(0,0,0,.35)]" />
          <span className="absolute left-1/2 top-[8px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
      {label ? <p className={`px-4 py-3 text-[11px] font-bold ${darkMode ? "text-white/65" : "text-black/60"}`}>{label}</p> : null}
    </div>
  );
}
