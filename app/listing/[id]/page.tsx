"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLogo from "@/components/LoadLinkLogo";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ListingState = {
  state: "active" | "deleted" | "rejected" | "pending" | "closed" | "unavailable";
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  checked_at?: string | null;
};

const COPY: Record<ListingState["state"], { eyebrow: string; title: string; copy: string }> = {
  active: {
    eyebrow: "LoadLink listing",
    title: "Opening post",
    copy: "This post is active. Taking you to the live listing now.",
  },
  deleted: {
    eyebrow: "Post removed",
    title: "This post has been deleted",
    copy: "The poster removed this post from LoadLink. It is no longer active or available on the marketplace.",
  },
  rejected: {
    eyebrow: "LoadLink review",
    title: "This post was not approved",
    copy: "This post did not pass LoadLink review and is not publicly available.",
  },
  pending: {
    eyebrow: "LoadLink review",
    title: "This post is still under review",
    copy: "The post has not been approved for the public marketplace yet.",
  },
  closed: {
    eyebrow: "Post closed",
    title: "This post is no longer active",
    copy: "The opportunity was closed or marked as completed by the poster.",
  },
  unavailable: {
    eyebrow: "Post unavailable",
    title: "This post is no longer available",
    copy: "LoadLink cannot find an active public post at this link.",
  },
};

export default function ListingStatePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [data, setData] = useState<ListingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await supabase.rpc("loadlink_listing_public_state", { p_listing_id: id });
        if (!active) return;
        if (result.error || !result.data) {
          setData({ state: "unavailable" });
          return;
        }
        const next = result.data as ListingState;
        if (next.state === "active") {
          window.location.replace(`/jobs#job-${encodeURIComponent(id)}`);
          return;
        }
        setData(next);
      } catch {
        if (active) setData({ state: "unavailable" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const copy = useMemo(() => COPY[data?.state || "unavailable"], [data?.state]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl items-center px-4 py-10 md:px-7">
        <div className={`w-full overflow-hidden rounded-[28px] border ${surface}`}>
          <div className={`h-1.5 w-full ${data?.state === "rejected" || data?.state === "deleted" ? "bg-red-500" : "bg-[#f6b800]"}`} />
          <div className="p-6 md:p-9">
            <div className="flex min-h-14 items-center">
              {data?.state === "deleted" || data?.state === "rejected" ? (
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border text-xl font-black ${data.state === "deleted" ? "border-red-500/30 text-red-500" : "border-red-500/30 text-red-500"}`}>{data.state === "deleted" ? "×" : "!"}</span>
              ) : (
                <LoadLinkLogo theme={darkMode ? "dark" : "light"} showGlow={false} containerClassName="!w-[132px]" />
              )}
            </div>
            <p className={`mt-5 text-xs font-black ${data?.state === "rejected" || data?.state === "deleted" ? "text-red-500" : muted}`}>{copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.045em] md:text-5xl">{copy.title}</h1>
            <p className={`mt-4 max-w-xl text-sm font-semibold leading-7 md:text-base ${muted}`}>{copy.copy}</p>

            {data?.title ? (
              <div className={`mt-6 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>
                <p className={`text-[9px] font-black uppercase tracking-[.13em] ${muted}`}>Post</p>
                <p className="mt-1 text-base font-black">{data.title}</p>
                {(data.city || data.vehicle_group) ? <p className={`mt-1 text-xs font-semibold ${muted}`}>{[data.city, data.vehicle_group].filter(Boolean).join(" · ")}</p> : null}
              </div>
            ) : null}

            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              <Link href="/jobs" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.08em] text-black">Browse active posts</Link>
              <Link href="/messages" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-xs font-black uppercase tracking-[.08em] ${darkMode ? "border-white/15" : "border-black/15"}`}>Open messages</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
