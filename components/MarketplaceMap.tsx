"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { googleMapsConfigured, loadGoogleMaps } from "@/lib/googleMapsClient";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type MapListing = {
  id: string;
  listing_kind: string;
  title: string;
  city: string;
  province: string | null;
  latitude: number;
  longitude: number;
  vehicle_group: string | null;
  rate: string | null;
  work_starts_at: string | null;
  created_at: string | null;
};

type UserPoint = { latitude: number; longitude: number };
type Filter = "all" | "job" | "contract" | "asset";

type Listener = { remove?: () => void };
type CircleInstance = {
  setMap: (map: MapInstance | null) => void;
  addListener: (name: string, callback: () => void) => Listener;
};
type CircleConstructor = new (options: Record<string, unknown>) => CircleInstance;
type InfoWindowInstance = {
  setContent: (content: HTMLElement | string) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
  open: (options: { map: MapInstance }) => void;
  close: () => void;
};
type InfoWindowConstructor = new () => InfoWindowInstance;
type BoundsInstance = {
  extend: (point: { lat: number; lng: number }) => void;
};
type BoundsConstructor = new () => BoundsInstance;
type MapInstance = {
  fitBounds: (bounds: BoundsInstance, padding?: number) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};
type MapConstructor = new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;

type MapsLibrary = {
  Map?: MapConstructor;
  Circle?: CircleConstructor;
  InfoWindow?: InfoWindowConstructor;
  LatLngBounds?: BoundsConstructor;
};

const SOUTH_AFRICA = { lat: -30.5595, lng: 22.9375 };

function listingKindLabel(kind: string) {
  if (kind === "contract") return "Contract";
  if (kind === "asset") return "Vehicle / unit";
  return "Job";
}

function listingHref(listing: MapListing) {
  if (listing.listing_kind === "asset") return "/vehicles";
  if (listing.listing_kind === "contract") return `/contracts?post=${encodeURIComponent(listing.id)}`;
  return `/jobs?post=${encodeURIComponent(listing.id)}`;
}

function distanceKm(from: UserPoint, listing: MapListing) {
  const radius = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(listing.latitude);
  const dLat = toRadians(listing.latitude - from.latitude);
  const dLng = toRadians(listing.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value: number) {
  if (value < 1) return "Under 1 km away";
  if (value < 10) return `${value.toFixed(1)} km away`;
  return `${Math.round(value)} km away`;
}

export default function MarketplaceMap({ darkMode }: { darkMode: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const overlaysRef = useRef<CircleInstance[]>([]);
  const infoWindowRef = useRef<InfoWindowInstance | null>(null);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [userPoint, setUserPoint] = useState<UserPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        if (active) {
          setMessage("Marketplace locations are temporarily unavailable.");
          setLoading(false);
        }
        return;
      }
      const result = await supabase.rpc("loadlink_public_map_listings");
      if (!active) return;
      if (result.error) setMessage("LoadLink could not load map listings right now.");
      else setListings((Array.isArray(result.data) ? result.data : []) as MapListing[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!googleMapsConfigured() || !hostRef.current) return;
    let active = true;
    void (async () => {
      try {
        const maps = await loadGoogleMaps();
        const library = await maps.importLibrary("maps") as MapsLibrary;
        if (!active || !hostRef.current || !library.Map || !library.InfoWindow) return;
        const map = new library.Map(hostRef.current, {
          center: SOUTH_AFRICA,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
          keyboardShortcuts: true,
          gestureHandling: "cooperative",
          backgroundColor: darkMode ? "#0d0d0d" : "#eee9dc",
          styles: darkMode ? [
            { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#a9a9a9" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#343434" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#090909" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ] : undefined,
        });
        mapRef.current = map;
        infoWindowRef.current = new library.InfoWindow();
        setMapReady(true);
      } catch {
        if (active) setMessage("Google Maps could not load. Check the Maps API key restrictions.");
      }
    })();
    return () => { active = false; };
  }, [darkMode]);

  const visibleListings = useMemo(() => {
    const filtered = filter === "all" ? listings : listings.filter((item) => item.listing_kind === filter);
    if (!userPoint) return filtered;
    return [...filtered].sort((a, b) => distanceKm(userPoint, a) - distanceKm(userPoint, b));
  }, [filter, listings, userPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;

    void (async () => {
      const maps = await loadGoogleMaps();
      const library = await maps.importLibrary("maps") as MapsLibrary;
      if (cancelled || !library.Circle || !library.LatLngBounds) return;

      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      const bounds = new library.LatLngBounds();

      for (const listing of visibleListings) {
        const isContract = listing.listing_kind === "contract";
        const isAsset = listing.listing_kind === "asset";
        const circle = new library.Circle({
          map,
          center: { lat: listing.latitude, lng: listing.longitude },
          radius: isAsset ? 1100 : 900,
          strokeColor: isContract ? "#111111" : isAsset ? "#ffffff" : "#f6b800",
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: isContract ? "#f6b800" : isAsset ? "#111111" : "#f6b800",
          fillOpacity: isContract ? 0.34 : isAsset ? 0.78 : 0.82,
          clickable: true,
          zIndex: isContract ? 3 : 2,
        });
        circle.addListener("click", () => {
          const info = infoWindowRef.current;
          if (!info) return;
          const card = document.createElement("div");
          card.style.maxWidth = "240px";
          const eyebrow = document.createElement("div");
          eyebrow.textContent = listingKindLabel(listing.listing_kind);
          eyebrow.style.fontSize = "10px";
          eyebrow.style.fontWeight = "800";
          eyebrow.style.textTransform = "uppercase";
          eyebrow.style.letterSpacing = ".08em";
          const title = document.createElement("div");
          title.textContent = listing.title;
          title.style.marginTop = "5px";
          title.style.fontWeight = "800";
          title.style.fontSize = "14px";
          const meta = document.createElement("div");
          meta.textContent = [listing.city, listing.province, listing.rate].filter(Boolean).join(" · ");
          meta.style.marginTop = "5px";
          meta.style.fontSize = "11px";
          const link = document.createElement("a");
          link.href = listingHref(listing);
          link.textContent = "View listing";
          link.style.display = "inline-block";
          link.style.marginTop = "10px";
          link.style.fontWeight = "800";
          link.style.fontSize = "11px";
          card.append(eyebrow, title, meta, link);
          info.setContent(card);
          info.setPosition({ lat: listing.latitude, lng: listing.longitude });
          info.open({ map });
        });
        overlaysRef.current.push(circle);
        bounds.extend({ lat: listing.latitude, lng: listing.longitude });
      }

      if (userPoint && library.Circle) {
        const userCircle = new library.Circle({
          map,
          center: { lat: userPoint.latitude, lng: userPoint.longitude },
          radius: 1500,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          clickable: false,
          zIndex: 1,
        });
        overlaysRef.current.push(userCircle);
        bounds.extend({ lat: userPoint.latitude, lng: userPoint.longitude });
      }

      if (visibleListings.length || userPoint) map.fitBounds(bounds, 64);
      else {
        map.setCenter(SOUTH_AFRICA);
        map.setZoom(5);
      }
    })().catch(() => setMessage("LoadLink could not draw marketplace locations right now."));

    return () => { cancelled = true; };
  }, [mapReady, userPoint, visibleListings]);

  function useMyLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setMessage(error.code === 1 ? "Location permission was not granted. The map still works without it." : "LoadLink could not detect your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }

  if (!googleMapsConfigured()) {
    return (
      <div className={`rounded-[28px] border p-6 ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-white/60"}`}>
        <p className="text-sm font-black">Google Maps is ready in the codebase, but the production API key has not been connected yet.</p>
        <p className={`mt-2 text-xs font-semibold leading-5 ${darkMode ? "text-white/52" : "text-black/52"}`}>Jobs and contracts continue using the normal LoadLink location fallback until the key is added.</p>
      </div>
    );
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "job", label: "Jobs" },
    { value: "contract", label: "Contracts" },
    { value: "asset", label: "Vehicles" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap gap-1 rounded-2xl border p-1 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/55"}`}>
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-xl px-3.5 py-2 text-[10px] font-black transition ${filter === item.value ? "bg-[#f6b800] text-black" : darkMode ? "text-white/62" : "text-black/60"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={`rounded-full border px-4 py-2.5 text-[10px] font-black ${darkMode ? "border-white/14 bg-white/[.04] text-white" : "border-black/10 bg-white/60 text-black"}`}
        >
          {locating ? "Finding you…" : userPoint ? "Location on" : "Use my location"}
        </button>
      </div>

      <div className={`overflow-hidden rounded-[28px] border ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white"}`}>
        <div ref={hostRef} className="h-[58vh] min-h-[430px] w-full" aria-label="LoadLink marketplace map" />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f6b800]" /> Job</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border-2 border-black bg-[#f6b800]" /> Contract</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-black ring-1 ring-white/70" /> Vehicle / unit</span>
        {userPoint ? <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> You</span> : null}
      </div>

      {message ? <p className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${darkMode ? "border-white/10 bg-white/[.035] text-white/68" : "border-black/10 bg-white/55 text-black/64"}`}>{message}</p> : null}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-.03em]">Nearby marketplace</h2>
            <p className={`mt-1 text-xs font-semibold ${darkMode ? "text-white/48" : "text-black/48"}`}>{loading ? "Loading approved locations…" : `${visibleListings.length} map-enabled listing${visibleListings.length === 1 ? "" : "s"}`}</p>
          </div>
        </div>
        {!loading && !visibleListings.length ? (
          <div className={`mt-4 rounded-[22px] border p-5 text-xs font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.025] text-white/55" : "border-black/8 bg-white/45 text-black/55"}`}>
            No approved map-enabled listings match this view yet. Existing listings remain available in the normal marketplace, and newly posted Google/GPS locations will appear here after approval.
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleListings.slice(0, 12).map((listing) => (
            <Link key={listing.id} href={listingHref(listing)} className={`rounded-[22px] border p-4 transition active:scale-[.995] ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/8 bg-white/55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-[.1em] ${darkMode ? "text-[#f6b800]" : "text-[#8f6900]"}`}>{listingKindLabel(listing.listing_kind)}</p>
                  <h3 className="mt-1 truncate text-sm font-black">{listing.title}</h3>
                  <p className={`mt-1 truncate text-[11px] font-semibold ${darkMode ? "text-white/48" : "text-black/48"}`}>{[listing.city, listing.province].filter(Boolean).join(", ")}</p>
                </div>
                {userPoint ? <span className="shrink-0 rounded-full bg-[#f6b800] px-2.5 py-1.5 text-[9px] font-black text-black">{formatDistance(distanceKm(userPoint, listing))}</span> : null}
              </div>
              <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold ${darkMode ? "text-white/52" : "text-black/52"}`}>
                {listing.vehicle_group ? <span>{listing.vehicle_group}</span> : null}
                {listing.rate ? <span>{listing.rate}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
