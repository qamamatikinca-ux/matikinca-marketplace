"use client";

import { useEffect, useState } from "react";
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

export default function LoadLinkDealerUpdateRail20260822({ darkMode, onAvailabilityChange }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        setUpdates([]);
        setLoaded(true);
        onAvailabilityChange?.(false);
        return;
      }

      const { data, error } = await supabase.rpc("loadlink_my_followed_dealer_updates");
      if (!active) return;
      const rows = !error && Array.isArray(data) ? (data as DealerUpdate[]) : [];
      setUpdates(rows);
      setLoaded(true);
      onAvailabilityChange?.(rows.length > 0);
    }

    void load();
    const refresh = () => void load();
    window.addEventListener("loadlink-dealership-follow-changed", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    window.addEventListener("loadlink-account-state-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("loadlink-dealership-follow-changed", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
      window.removeEventListener("loadlink-account-state-changed", refresh);
    };
  }, [onAvailabilityChange]);

  async function openShowroom(update: DealerUpdate) {
    setUpdates((current) => current.map((item) => item.status_id === update.status_id ? { ...item, seen: true } : item));
    void supabase.rpc("loadlink_mark_followed_dealer_status_seen", { p_status_id: update.status_id });
    router.push(`/dealership/${encodeURIComponent(update.slug)}`);
  }

  if (!loaded || updates.length === 0) return null;

  return (
    <div data-loadlink-dealer-update-rail className="mb-4">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1" aria-label="Updates from followed dealerships">
        <div className="flex min-w-max gap-3 pr-2">
          {updates.map((update) => {
            const initial = update.dealership_name.trim().charAt(0).toUpperCase() || "L";
            return (
              <button
                key={update.status_id}
                type="button"
                onClick={() => void openShowroom(update)}
                className="group w-[66px] shrink-0 text-center outline-none"
                aria-label={`Open ${update.dealership_name} showroom${update.seen ? "" : ", new update"}`}
              >
                <span
                  className={`relative mx-auto block h-[56px] w-[56px] rounded-full p-[2px] transition group-active:scale-[.97] ${
                    update.seen
                      ? darkMode ? "bg-white/16" : "bg-black/12"
                      : "bg-[#f6b800] shadow-[0_5px_18px_rgba(246,184,0,.12)]"
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
        </div>
      </div>
    </div>
  );
}
