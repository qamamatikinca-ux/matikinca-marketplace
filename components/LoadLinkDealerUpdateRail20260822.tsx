"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DealerUpdate = {
  dealership_id: string;
  slug: string;
  dealership_name: string;
  image_url: string | null;
  status_id: string;
  content_type: string;
  title: string | null;
  seen: boolean;
  starts_at: string;
  expires_at: string;
};

type Props = {
  darkMode: boolean;
  onAvailabilityChange?: (available: boolean) => void;
};

function uniqueDealers(rows: DealerUpdate[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.dealership_id || row.slug;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function LoadLinkDealerUpdateRail20260822({ darkMode, onAvailabilityChange }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let timer = 0;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      const authenticated = Boolean(session?.user);
      setSignedIn(authenticated);
      if (!authenticated) {
        setUpdates([]);
        setLoaded(true);
        onAvailabilityChange?.(false);
        return;
      }

      const { data, error } = await supabase.rpc("loadlink_my_followed_dealer_updates");
      if (!active) return;
      const rows = !error && Array.isArray(data) ? uniqueDealers(data as DealerUpdate[]) : [];
      setUpdates(rows);
      setLoaded(true);
      onAvailabilityChange?.(true);
    }

    void load();
    timer = window.setInterval(() => void load(), 15_000);
    const refresh = () => void load();
    const visibility = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("loadlink-dealership-follow-changed", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    window.addEventListener("loadlink-account-state-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("loadlink-dealership-follow-changed", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
      window.removeEventListener("loadlink-account-state-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [onAvailabilityChange]);

  const visibleUpdates = useMemo(() => uniqueDealers(updates), [updates]);

  async function openShowroom(update: DealerUpdate) {
    setUpdates((current) => current.map((item) => item.dealership_id === update.dealership_id ? { ...item, seen: true } : item));
    void supabase.rpc("loadlink_mark_followed_dealer_status_seen", { p_status_id: update.status_id });
    router.push(`/dealership/${encodeURIComponent(update.slug)}`);
  }

  if (!loaded || !signedIn) return null;

  return (
    <div data-loadlink-dealer-update-rail className="mb-4">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1" aria-label="Dealership updates">
        <div className="flex min-w-max gap-3 pr-2">
          <button
            type="button"
            onClick={() => router.push("/following?discover=1")}
            className="group w-[66px] shrink-0 text-center outline-none"
            aria-label="Find other dealerships"
          >
            <span className={`relative mx-auto grid h-[56px] w-[56px] place-items-center rounded-full border backdrop-blur-xl transition group-active:scale-[.97] ${darkMode ? "border-white/12 bg-white/[.09] text-white" : "border-black/10 bg-black/[.78] text-white"}`}>
              <AddDealerIcon />
            </span>
            <span className={`mt-1.5 block truncate text-[10px] font-semibold ${darkMode ? "text-white/64" : "text-black/64"}`}>Find dealers</span>
          </button>

          {visibleUpdates.map((update) => {
            const initial = update.dealership_name.trim().charAt(0).toUpperCase() || "L";
            return (
              <button
                key={update.dealership_id}
                type="button"
                onClick={() => void openShowroom(update)}
                className="group w-[66px] shrink-0 text-center outline-none"
                aria-label={`Open ${update.dealership_name} showroom${update.seen ? "" : ", new update"}`}
              >
                <span className={`relative mx-auto block h-[56px] w-[56px] rounded-full p-[2px] transition group-active:scale-[.97] ${update.seen ? darkMode ? "bg-white/14" : "bg-black/10" : darkMode ? "bg-gradient-to-br from-white/90 via-white/45 to-white/18" : "bg-gradient-to-br from-black/80 via-black/30 to-black/10"}`}>
                  <span className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border text-sm font-extrabold ${darkMode ? "border-black bg-[#171717] text-white" : "border-white bg-white text-black"}`}>
                    {initial}
                    {update.image_url ? (
                      <img src={update.image_url} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover object-center" />
                    ) : null}
                  </span>
                  {!update.seen ? <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 ${darkMode ? "border-black bg-white" : "border-white bg-black"}`} aria-hidden="true" /> : null}
                </span>
                <span className={`mt-1.5 block truncate text-[10px] font-semibold tracking-[-.01em] ${darkMode ? "text-white/68" : "text-black/68"}`}>{update.dealership_name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddDealerIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" aria-hidden="true">
      <circle cx="10" cy="7.5" r="4" fill="currentColor" />
      <path d="M2.6 20.8c.35-5 3.1-7.7 7.4-7.7s7.05 2.7 7.4 7.7c.05.7-.5 1.2-1.15 1.2H3.75c-.65 0-1.2-.5-1.15-1.2Z" fill="currentColor" />
      <circle cx="20.2" cy="18.8" r="5.5" fill="white" />
      <path d="M20.2 15.9v5.8M17.3 18.8h5.8" stroke="#222" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
