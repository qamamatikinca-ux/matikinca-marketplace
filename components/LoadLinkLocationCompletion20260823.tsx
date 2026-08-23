"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { attachSouthAfricaAutocomplete, geocodeLoadLinkAddress, googleMapsKey, reverseGeocodeLoadLink, type LoadLinkLatLng } from "@/lib/googleMapsBrowser";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type LocationTarget = { host: HTMLElement; input: HTMLInputElement; kind: "job" | "vehicle" };

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function scoreInput(input: HTMLInputElement) {
  if (input.dataset.loadlinkInjectedExactLocation === "true") return -100;
  const text = `${input.id} ${input.name} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`.toLowerCase();
  let score = 0;
  if (/listing.*city|listing.*location|location.*listing/.test(text)) score += 12;
  if (/city|town|province/.test(text)) score += 8;
  if (/location|address/.test(text)) score += 5;
  if (input.getAttribute("list") === "loadlink-job-cities") score += 20;
  if (input.type !== "text" && input.type !== "search") score -= 20;
  return score;
}

function findLocationTarget(pathname: string): LocationTarget | null {
  const kind = pathname === "/jobs/list" ? "job" : pathname === "/list-your-vehicle" ? "vehicle" : null;
  if (!kind) return null;
  if (kind === "vehicle" && !new URL(window.location.href).searchParams.get("entry")) return null;

  const scope = kind === "vehicle" ? document.querySelector<HTMLElement>("#listing-form") || document.querySelector<HTMLElement>('[data-loadlink-vehicle-listing-shell]') || document.body : document.body;
  const candidates = Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="text"],input[type="search"],input:not([type])'))
    .map((input) => ({ input, score: scoreInput(input) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const input = candidates[0]?.input;
  if (!input) return null;
  if (input.parentElement?.querySelector('[data-loadlink-location-completion-host="true"]')) return null;

  const host = document.createElement("div");
  host.dataset.loadlinkLocationCompletionHost = "true";
  const label = input.closest("label");
  const parent = label?.parentElement || input.parentElement;
  if (!parent) return null;
  if (label) label.insertAdjacentElement("afterend", host);
  else input.insertAdjacentElement("afterend", host);
  return { host, input, kind };
}

async function attachCoordinatesToListing(kind: "job" | "vehicle", requestId: string, coordinates: LoadLinkLatLng, address: string) {
  if (!requestId) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  for (let attempt = 0; attempt < 22; attempt += 1) {
    const lookup = await supabase
      .from("job_listings")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("client_request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookup.data?.id) {
      const update: Record<string, unknown> = { latitude: coordinates.latitude, longitude: coordinates.longitude };
      if (address.trim()) update.city = address.trim();
      const result = await supabase.from("job_listings").update(update).eq("id", lookup.data.id).eq("user_id", auth.user.id);
      if (!result.error) window.dispatchEvent(new Event("loadlink-listing-location-updated"));
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, attempt < 5 ? 300 : 550));
  }
  console.warn(`LoadLink ${kind} coordinates were captured but the new listing could not be matched yet.`);
}

function InlineLocationControls({ target }: { target: LocationTarget }) {
  const { darkMode } = useLoadLinkTheme();
  const exactRef = useRef<HTMLInputElement>(null);
  const coordinatesRef = useRef<LoadLinkLatLng | null>(null);
  const addressRef = useRef("");
  const [exactOpen, setExactOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<LoadLinkLatLng | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const key = googleMapsKey();

  useEffect(() => { coordinatesRef.current = coordinates; }, [coordinates]);
  useEffect(() => { addressRef.current = address; }, [address]);

  useEffect(() => {
    if (!exactOpen || !exactRef.current || !key) return;
    let alive = true;
    let listener: { remove?: () => void } | null = null;
    void attachSouthAfricaAutocomplete(exactRef.current, (place) => {
      if (!alive) return;
      setAddress(place.address);
      setCoordinates(place.coordinates);
      setReactInputValue(target.input, place.address);
      setNotice("Exact location confirmed. LoadLink can use it for distance estimates.");
      setMapOpen(true);
    }).then((value) => { listener = value; });
    return () => { alive = false; listener?.remove?.(); };
  }, [exactOpen, key, target.input]);

  useEffect(() => {
    const form = target.input.closest("form");
    if (!form) return;
    const capture = () => {
      const selected = coordinatesRef.current;
      if (!selected) return;
      void supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id || "";
        const requestId = target.kind === "job"
          ? localStorage.getItem(`loadlink-job-submission-id:${userId}`) || ""
          : localStorage.getItem("loadlink-vehicle-submission-id") || "";
        if (requestId) void attachCoordinatesToListing(target.kind, requestId, selected, addressRef.current || target.input.value);
      });
    };
    form.addEventListener("submit", capture, true);
    return () => form.removeEventListener("submit", capture, true);
  }, [target]);

  async function confirmTyped() {
    if (!address.trim() || coordinates || confirming) return;
    if (!key) {
      setReactInputValue(target.input, address.trim());
      setNotice("Exact address saved as text. Add the Google Maps browser key to verify typed-address coordinates, or use your current location now.");
      return;
    }
    setConfirming(true);
    const result = await geocodeLoadLinkAddress(address);
    if (result) {
      setAddress(result.address);
      setCoordinates(result.coordinates);
      setReactInputValue(target.input, result.address);
      setNotice("Exact location confirmed. LoadLink can use it for distance estimates.");
      setMapOpen(true);
    } else {
      setNotice("That address could not be confirmed. Choose a Google suggestion or keep the city / province field above.");
    }
    setConfirming(false);
  }

  function currentLocation() {
    if (!navigator.geolocation) { setNotice("Location services are unavailable in this browser."); return; }
    setLocating(true); setNotice("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoordinates(next); setExactOpen(true); setMapOpen(true);
        setNotice(`Current location selected${position.coords.accuracy ? ` · about ${Math.round(position.coords.accuracy)} m accuracy` : ""}.`);
        void reverseGeocodeLoadLink(next.latitude, next.longitude).then((formatted) => {
          if (!formatted) return;
          setAddress(formatted);
          setReactInputValue(target.input, formatted);
        });
        setLocating(false);
      },
      () => { setLocating(false); setNotice("Location permission was not granted. You can still type an exact address."); },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  const soft = darkMode ? "border-white/10 bg-white/[.035] text-white" : "border-black/10 bg-black/[.025] text-black";
  const input = darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/32" : "border-black/10 bg-white/80 text-black placeholder:text-black/36";
  const mapQuery = coordinates ? `${coordinates.latitude},${coordinates.longitude}` : address || target.input.value || "South Africa";

  return <div data-loadlink-location-upgrade="20260823" className={`mt-2 rounded-[17px] border p-3 ${soft}`}>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setExactOpen((value) => !value)} className="rounded-full border border-[#f6b800]/55 px-3 py-2 text-[10px] font-black">{exactOpen ? "Use city / province only" : "Add exact address"}</button>
      <button type="button" onClick={currentLocation} disabled={locating} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black disabled:opacity-45">{locating ? "Locating…" : "Use my current location"}</button>
      {(address || coordinates) ? <button type="button" onClick={() => setMapOpen((value) => !value)} className="rounded-full border border-current/15 px-3 py-2 text-[10px] font-black">{mapOpen ? "Hide map" : "Check on map"}</button> : null}
    </div>
    <p className="mt-2 text-[10px] font-semibold leading-4 opacity-50">Optional: add an exact pickup, work or vehicle location so interested users can see an approximate distance. Keep city / province only if you prefer.</p>
    {exactOpen ? <div className="mt-3">
      <input ref={exactRef} data-loadlink-injected-exact-location="true" type="text" inputMode="text" autoComplete="street-address" value={address} onChange={(event) => { setAddress(event.target.value); setCoordinates(null); setNotice(""); }} onBlur={() => void confirmTyped()} placeholder="e.g. 32 Superdrive Avenue, Centurion" className={`h-12 w-full rounded-[15px] border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${input}`} />
      <p className="mt-1.5 text-[9px] font-semibold opacity-45">{key ? "Choose a Google address suggestion for the most accurate result." : "Google address suggestions will activate after the Maps browser key is added."}</p>
    </div> : null}
    {confirming ? <p className="mt-2 text-[10px] font-bold text-[#a87a00]">Confirming address…</p> : notice ? <p className="mt-2 text-[10px] font-bold text-[#a87a00]">{notice}</p> : null}
    {mapOpen ? <div className="mt-3 overflow-hidden rounded-[14px] border border-current/10"><iframe title="LoadLink exact location preview" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} className="h-44 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div> : null}
  </div>;
}

export default function LoadLinkLocationCompletion20260823() {
  const pathname = usePathname();
  const [target, setTarget] = useState<LocationTarget | null>(null);

  useEffect(() => {
    if (pathname !== "/jobs/list" && pathname !== "/list-your-vehicle") { setTarget(null); return; }
    let active = true;
    let timer = 0;
    const locate = () => {
      if (!active) return;
      const next = findLocationTarget(pathname);
      if (next) { setTarget(next); return; }
      timer = window.setTimeout(locate, 350);
    };
    locate();
    return () => { active = false; window.clearTimeout(timer); setTarget((current) => { current?.host.remove(); return null; }); };
  }, [pathname]);

  if (!target) return null;
  return createPortal(<InlineLocationControls target={target} />, target.host);
}
