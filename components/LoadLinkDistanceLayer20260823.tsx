"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Point = { latitude: number; longitude: number };
type ListingPoint = { id: string; latitude: number | null; longitude: number | null };

const ENABLED_KEY = "loadlink-distance-enabled-v1";
const USER_POINT_KEY = "loadlink-distance-user-point-v1";
const DISMISSED_KEY = "loadlink-distance-prompt-dismissed-v1";
const MARKETPLACE_ROUTES = ["/jobs", "/contracts", "/list-your-vehicle", "/vehicles", "/listing"];

function distanceKm(from: Point, to: Point) {
  const r = 6371;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value: number) {
  if (value < 1) return `${Math.max(0.1, Math.round(value * 10) / 10)} km away`;
  if (value < 100) return `${Math.round(value * 10) / 10} km away`;
  return `${Math.round(value)} km away`;
}

function listingIdFromHref(href: string) {
  const clean = href.split(/[?#]/)[0];
  const match = clean.match(/^\/(?:listing|vehicles|contracts)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function collectListingAnchors() {
  const map = new Map<string, HTMLElement[]>();
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/listing/"],a[href^="/vehicles/"],a[href^="/contracts/"]').forEach((anchor) => {
    const id = listingIdFromHref(anchor.getAttribute("href") || "");
    if (!id || id === "post") return;
    const card = anchor.closest<HTMLElement>("article") || anchor.closest<HTMLElement>('[id^="job-"]') || anchor.closest<HTMLElement>('[data-loadlink-listing-card]') || anchor;
    const current = map.get(id) || [];
    if (!current.includes(card)) current.push(card);
    map.set(id, current);
  });
  return map;
}

function clearBadges() {
  document.querySelectorAll<HTMLElement>('[data-loadlink-distance-badge="true"]').forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>('[data-loadlink-distance-anchor="true"]').forEach((node) => delete node.dataset.loadlinkDistanceAnchor);
}

function drawBadges(user: Point, rows: ListingPoint[]) {
  clearBadges();
  const anchors = collectListingAnchors();
  rows.forEach((row) => {
    if (typeof row.latitude !== "number" || typeof row.longitude !== "number") return;
    const km = distanceKm(user, { latitude: row.latitude, longitude: row.longitude });
    for (const card of anchors.get(row.id) || []) {
      card.dataset.loadlinkDistanceAnchor = "true";
      const badge = document.createElement("span");
      badge.dataset.loadlinkDistanceBadge = "true";
      badge.textContent = formatDistance(km);
      badge.title = "Approximate straight-line distance from your current location";
      card.appendChild(badge);
    }
  });
}

function isOnlyDistanceDecoration(mutations: MutationRecord[]) {
  const changedNodes = mutations.flatMap((mutation) => [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)]);
  return changedNodes.length > 0 && changedNodes.every((node) => node instanceof HTMLElement && (node.dataset.loadlinkDistanceBadge === "true" || node.closest?.('[data-loadlink-distance-badge="true"]')));
}

export default function LoadLinkDistanceLayer20260823() {
  const pathname = usePathname();
  const isPostingRoute = pathname === "/jobs/list" || pathname === "/contracts/post";
  const eligible = !isPostingRoute && MARKETPLACE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const [enabled, setEnabled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const userPointRef = useRef<Point | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const refreshDistances = useCallback(async () => {
    const user = userPointRef.current;
    if (!user || !eligible) return;
    const anchors = collectListingAnchors();
    const ids = Array.from(anchors.keys()).slice(0, 100);
    if (!ids.length) { clearBadges(); return; }
    const result = await supabase.from("job_listings").select("id,latitude,longitude").in("id", ids);
    if (!result.error) drawBadges(user, (result.data || []) as ListingPoint[]);
  }, [eligible]);

  const getLocation = useCallback((fromSavedChoice = false) => {
    if (!navigator.geolocation || busy) return;
    setBusy(true); setNotice("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        userPointRef.current = next;
        try {
          sessionStorage.setItem(USER_POINT_KEY, JSON.stringify(next));
          localStorage.removeItem(DISMISSED_KEY);
          localStorage.setItem(ENABLED_KEY, "true");
        } catch {}
        setEnabled(true);
        setShowPrompt(false);
        setBusy(false);
        void refreshDistances();
      },
      () => {
        userPointRef.current = null;
        setEnabled(false);
        setBusy(false);
        if (fromSavedChoice) {
          try {
            localStorage.removeItem(ENABLED_KEY);
            localStorage.removeItem(DISMISSED_KEY);
            sessionStorage.removeItem(USER_POINT_KEY);
          } catch {}
          setNotice("Location access is needed again to show distance labels.");
          setShowPrompt(true);
        } else {
          setNotice("Location permission was not granted. Distance labels remain off.");
          setShowPrompt(true);
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [busy, refreshDistances]);

  useEffect(() => {
    if (!eligible) { clearBadges(); setShowPrompt(false); return; }
    try {
      const cached = JSON.parse(sessionStorage.getItem(USER_POINT_KEY) || "null") as Point | null;
      const savedEnabled = localStorage.getItem(ENABLED_KEY) === "true";
      const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
      if (cached && typeof cached.latitude === "number" && typeof cached.longitude === "number") {
        userPointRef.current = cached;
        setEnabled(true);
        setShowPrompt(false);
        void refreshDistances();
      } else if (savedEnabled) {
        setShowPrompt(false);
        getLocation(true);
      } else {
        setEnabled(false);
        setShowPrompt(!dismissed);
      }
    } catch {
      setShowPrompt(true);
    }
  }, [eligible, getLocation, pathname, refreshDistances]);

  useEffect(() => {
    if (!eligible || !enabled) return;
    const observer = new MutationObserver((mutations) => {
      if (isOnlyDistanceDecoration(mutations)) return;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refreshDistances(), 280);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const refresh = () => void refreshDistances();
    window.addEventListener("loadlink-listing-location-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      observer.disconnect();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      window.removeEventListener("loadlink-listing-location-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [eligible, enabled, refreshDistances]);

  if (!eligible || enabled || !showPrompt) return null;
  return <div data-loadlink-distance-control="true" className="fixed bottom-[calc(env(safe-area-inset-bottom)+82px)] right-3 z-[90] flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-full border border-current/10 bg-white/88 p-1.5 pl-3 text-black shadow-lg backdrop-blur-2xl dark:bg-[#111]/88 dark:text-white">
    <span className="min-w-0 truncate text-[10px] font-bold opacity-60">{notice || "See how far listings are"}</span>
    <button type="button" disabled={busy} onClick={() => getLocation(false)} className="shrink-0 rounded-full bg-[#f6b800] px-3 py-2 text-[10px] font-black text-black disabled:opacity-45">{busy ? "Locating…" : "Use my location"}</button>
    <button data-loadlink-location-dismiss="true" type="button" aria-label="Close location prompt" onClick={() => { try { localStorage.setItem(DISMISSED_KEY, "true"); } catch {} setShowPrompt(false); setNotice(""); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/10 text-sm font-black opacity-60">×</button>
  </div>;
}
