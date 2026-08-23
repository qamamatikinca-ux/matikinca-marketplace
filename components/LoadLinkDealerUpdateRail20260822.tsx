"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
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

function PersonPlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="7.5" r="3.5" fill="currentColor" />
      <path d="M3.5 18.5c.5-4 2.4-6 5.5-6s5 2 5.5 6" fill="currentColor" />
      <path d="M18 10v7M14.5 13.5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function LoadLinkDealerUpdateRail20260822({ darkMode, onAvailabilityChange }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let refreshTimer = 0;
    const channels: RealtimeChannel[] = [];

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      const user = session?.user || null;
      setSignedIn(Boolean(user));
      if (!user) {
        setUpdates([]);
        setLoaded(true);
        onAvailabilityChange?.(false);
        return;
      }

      const { data, error } = await supabase.rpc("loadlink_my_followed_dealer_updates");
      if (!active) return;
      const rows = !error && Array.isArray(data) ? (data as DealerUpdate[]) : [];
      const unique = Array.from(new Map(rows.map((row) => [row.dealership_id, row])).values());
      setUpdates(unique);
      setLoaded(true);
      onAvailabilityChange?.(unique.length > 0);
    }

    void load();
    const refresh = () => void load();
    window.addEventListener("loadlink-dealership-follow-changed", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    window.addEventListener("loadlink-account-state-changed", refresh);

    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const followerChannel = supabase
        .channel(`loadlink-home-dealer-follow-${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "dealership_followers", filter: `user_id=eq.${data.user.id}` }, refresh)
        .subscribe();
      const statusChannel = supabase
        .channel(`loadlink-home-dealer-status-${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "dealership_statuses" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "dealership_updates" }, refresh)
        .subscribe();
      channels.push(followerChannel, statusChannel);
    });

    refreshTimer = window.setInterval(refresh, 12000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("loadlink-dealership-follow-changed", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
      window.removeEventListener("loadlink-account-state-changed", refresh);
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [onAvailabilityChange]);

  const visibleUpdates = useMemo(() => {
    const now = Date.now();
    return updates.filter((update) => {
      const expiry = new Date(update.expires_at).getTime();
      return !Number.isFinite(expiry) || expiry > now;
    });
  }, [updates]);

  async function openShowroom(update: DealerUpdate) {
    setUpdates((current) => current.map((item) => item.status_id === update.status_id ? { ...item, seen: true } : item));
    void supabase.rpc("loadlink_mark_followed_dealer_status_seen", { p_status_id: update.status_id });
    router.push(`/dealership/${encodeURIComponent(update.slug)}`);
  }

  if (!loaded || !signedIn || visibleUpdates.length === 0) return null;

  return (
    <div data-loadlink-dealer-update-rail className="mb-4">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1" aria-label="Updates from followed dealerships">
        <div className="flex min-w-max items-start gap-3 pr-2">
          <button
            type="button"
            onClick={() => router.push("/search?category=dealerships")}
            className="group w-[66px] shrink-0 text-center outline-none"
            aria-label="Discover other dealerships"
          >
            <span className={`mx-auto flex h-[56px] w-[56px] items-center justify-center rounded-full border transition group-active:scale-[.97] ${darkMode ? "border-white/14 bg-white/[.055] text-white" : "border-black/10 bg-white/75 text-black"}`}>
              <PersonPlusIcon />
            </span>
            <span className={`mt-1.5 block truncate text-[10px] font-semibold ${darkMode ? "text-white/62" : "text-black/62"}`}>Discover</span>
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
                <span
                  className={`relative mx-auto block h-[56px] w-[56px] rounded-full p-[2px] transition group-active:scale-[.97] ${
                    update.seen
                      ? darkMode ? "bg-white/14" : "bg-black/10"
                      : "bg-[#f6b800] shadow-[0_4px_16px_rgba(246,184,0,.16)]"
                  }`}
                >
                  <span className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border text-sm font-extrabold ${darkMode ? "border-black bg-[#171717] text-white" : "border-white bg-white text-black"}`}>
                    {initial}
                    {update.image_url ? (
                      <img
                        src={update.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
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
        </div>
      </div>
    </div>
  );
}
