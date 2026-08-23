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

function uniqueDealerships(rows: DealerUpdate[]) {
  const map = new Map<string, DealerUpdate>();
  for (const row of rows) {
    const current = map.get(row.dealership_id);
    if (!current || (!row.seen && current.seen) || new Date(row.starts_at).getTime() > new Date(current.starts_at).getTime()) {
      map.set(row.dealership_id, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => Number(a.seen) - Number(b.seen) || a.dealership_name.localeCompare(b.dealership_name));
}

export default function LoadLinkDealerUpdateRail20260822({ darkMode, onAvailabilityChange }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

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
      const rows = !error && Array.isArray(data) ? uniqueDealerships(data as DealerUpdate[]) : [];
      setUpdates(rows);
      setLoaded(true);
      onAvailabilityChange?.(rows.length > 0);
    }

    void load();
    const refresh = () => void load();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("loadlink-dealership-follow-changed", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    window.addEventListener("loadlink-account-state-changed", refresh);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("loadlink-dealership-follow-changed", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
      window.removeEventListener("loadlink-account-state-changed", refresh);
      subscription.unsubscribe();
    };
  }, [onAvailabilityChange]);

  const visible = useMemo(() => uniqueDealerships(updates), [updates]);

  async function openShowroom(update: DealerUpdate) {
    setUpdates((current) => current.map((item) => item.status_id === update.status_id ? { ...item, seen: true } : item));
    void supabase.rpc("loadlink_mark_followed_dealer_status_seen", { p_status_id: update.status_id });
    router.push(`/dealership/${encodeURIComponent(update.slug)}`);
  }

  function discoverNearby() {
    router.push("/search?category=dealer&nearby=1");
  }

  if (!loaded || !signedIn || visible.length === 0) return null;

  return (
    <div data-loadlink-dealer-update-rail data-loadlink-auth-only="true" className="mb-4">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1" aria-label="Updates from followed dealerships">
        <div className="flex min-w-max items-start gap-3 pr-2">
          {visible.map((update) => {
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
                  data-loadlink-status-avatar="true"
                  className={`relative mx-auto block h-[56px] w-[56px] rounded-full p-[2px] transition group-active:scale-[.97] ${
                    update.seen
                      ? darkMode ? "bg-white/16" : "bg-black/12"
                      : "bg-[#f6b800] shadow-[0_7px_24px_rgba(246,184,0,.18)]"
                  }`}
                >
                  <span className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border text-sm font-extrabold ${darkMode ? "border-black bg-[#171717] text-white" : "border-[#fff6dc] bg-white text-black"}`}>
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
            onClick={discoverNearby}
            data-loadlink-discover-dealers="true"
            className="group outline-none"
            aria-label="Discover dealerships in your area"
          >
            <span className={`mx-auto flex h-[56px] w-[56px] items-center justify-center rounded-full border transition group-active:scale-[.97] ${darkMode ? "border-white/12 bg-white/[.06] text-white" : "border-black/10 bg-black/[.045] text-black"}`}>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M14.5 20v-1.5a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="8.5" cy="7" r="3.5" stroke="currentColor" strokeWidth="2"/>
                <path d="M18 8v6M15 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className={`mt-1.5 block truncate text-[10px] font-semibold ${darkMode ? "text-white/60" : "text-black/60"}`}>Discover</span>
          </button>
        </div>
      </div>
    </div>
  );
}
