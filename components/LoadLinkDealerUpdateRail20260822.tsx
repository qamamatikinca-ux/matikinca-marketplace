"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function newestFirst(left: DealerUpdate, right: DealerUpdate) {
  return new Date(right.starts_at || 0).getTime() - new Date(left.starts_at || 0).getTime();
}

function oneBubblePerDealer(rows: DealerUpdate[]) {
  const grouped = new Map<string, DealerUpdate[]>();
  rows.forEach((row) => {
    const key = String(row.dealership_id || row.slug || "");
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });

  return Array.from(grouped.values()).map((items) => {
    const ordered = items.slice().sort(newestFirst);
    const unseen = ordered.find((item) => !item.seen);
    return unseen || ordered[0];
  }).filter(Boolean).sort(newestFirst);
}

export default function LoadLinkDealerUpdateRail20260822({ darkMode, onAvailabilityChange }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const retryTimers = useRef<number[]>([]);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUpdates([]);
      setLoaded(true);
      onAvailabilityChange?.(false);
      return;
    }

    const { data, error } = await supabase.rpc("loadlink_my_followed_dealer_updates");
    const rows = !error && Array.isArray(data) ? oneBubblePerDealer(data as DealerUpdate[]) : [];
    setUpdates(rows);
    setLoaded(true);
    onAvailabilityChange?.(rows.length > 0);
  }, [onAvailabilityChange]);

  useEffect(() => {
    void load();

    const scheduleRefresh = () => {
      retryTimers.current.forEach((timer) => window.clearTimeout(timer));
      retryTimers.current = [0, 350, 1100].map((delay) => window.setTimeout(() => void load(), delay));
    };

    window.addEventListener("loadlink-dealership-follow-changed", scheduleRefresh);
    window.addEventListener("loadlink-dealership-status-changed", scheduleRefresh);
    window.addEventListener("loadlink-account-state-changed", scheduleRefresh);
    window.addEventListener("focus", scheduleRefresh);
    return () => {
      retryTimers.current.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("loadlink-dealership-follow-changed", scheduleRefresh);
      window.removeEventListener("loadlink-dealership-status-changed", scheduleRefresh);
      window.removeEventListener("loadlink-account-state-changed", scheduleRefresh);
      window.removeEventListener("focus", scheduleRefresh);
    };
  }, [load]);

  const visibleUpdates = useMemo(() => oneBubblePerDealer(updates), [updates]);

  async function openShowroom(update: DealerUpdate) {
    setUpdates((current) => current.map((item) => item.dealership_id === update.dealership_id ? { ...item, seen: true } : item));
    void supabase.rpc("loadlink_mark_followed_dealer_status_seen", { p_status_id: update.status_id });
    router.push(`/dealership/${encodeURIComponent(update.slug)}`);
  }

  function discoverDealers() {
    const location = (document.querySelector<HTMLInputElement>("#loadlink-marketplace-location")?.value || "").trim();
    const params = new URLSearchParams({ category: "dealerships" });
    if (location) params.set("location", location);
    router.push(`/search?${params.toString()}`);
  }

  if (!loaded || visibleUpdates.length === 0) return null;

  return (
    <div data-loadlink-dealer-update-rail className="mb-4">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1" aria-label="Updates from followed dealerships">
        <div className="flex min-w-max items-start gap-3 pr-2">
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
                <span
                  className={`relative mx-auto block h-[58px] w-[58px] rounded-full p-[2px] transition group-active:scale-[.97] ${
                    update.seen
                      ? darkMode ? "bg-white/16" : "bg-black/12"
                      : "bg-[#f6b800] shadow-[0_5px_18px_rgba(246,184,0,.14)]"
                  }`}
                >
                  <span className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border text-sm font-extrabold ${darkMode ? "border-black bg-[#171717] text-white" : "border-white bg-white text-black"}`}>
                    {initial}
                    {update.image_url ? (
                      <img
                        src={update.image_url}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                  </span>
                </span>
                <span className={`mt-1.5 block truncate text-[10px] font-semibold tracking-[-.01em] ${darkMode ? "text-white/68" : "text-black/68"}`}>
                  {update.dealership_name}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={discoverDealers}
            className="group w-[66px] shrink-0 text-center outline-none"
            aria-label="Discover dealerships nearby"
            title="Discover dealerships"
          >
            <span className={`mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full border transition group-active:scale-[.97] ${darkMode ? "border-white/12 bg-[#292929] text-white" : "border-black/10 bg-[#292929] text-white shadow-[0_8px_24px_rgba(0,0,0,.10)]"}`}>
              <AddDealerIcon />
            </span>
            <span className={`mt-1.5 block truncate text-[10px] font-semibold ${darkMode ? "text-white/62" : "text-black/62"}`}>Discover</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddDealerIcon() {
  return (
    <svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="13" cy="9" r="5" fill="currentColor" />
      <path d="M4.8 24.2c.4-5.2 3.5-8.2 8.2-8.2 2.1 0 3.9.6 5.3 1.8a8.3 8.3 0 0 0-1.1 4.2c0 1 .2 2 .5 2.9H5.4a.6.6 0 0 1-.6-.7Z" fill="currentColor" />
      <circle cx="23.2" cy="22.8" r="6.2" fill="white" />
      <path d="M23.2 19.4v6.8M19.8 22.8h6.8" stroke="#292929" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
