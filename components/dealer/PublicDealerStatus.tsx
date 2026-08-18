"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PublicStatus = {
  id: string;
  dealership_id: string;
  content_type: "photo" | "video" | "vehicle" | "text" | "promotion";
  title?: string | null;
  body?: string | null;
  media_url?: string | null;
  listing_id?: string | null;
  cta_label?: string | null;
  action_url?: string | null;
  display_seconds?: number | null;
  starts_at: string;
  expires_at: string;
  created_at: string;
};

type Props = {
  dealerId: string;
  dealerSlug: string;
  darkMode: boolean;
  dealerName?: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
};

function viewerKey() {
  if (typeof window === "undefined") return "";
  const key = "loadlink-public-status-viewer-v1";
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LL";
}

export default function PublicDealerStatus({
  dealerId,
  dealerSlug,
  darkMode,
  dealerName = "Dealership",
  avatarUrl,
  phoneNumber,
}: Props) {
  const [items, setItems] = useState<PublicStatus[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const autoOpened = useRef(false);

  const current = active === null ? null : items[active] || null;

  useEffect(() => {
    let cancelled = false;
    const now = new Date().toISOString();
    void supabase
      .from("public_dealership_statuses")
      .select("*")
      .eq("dealership_id", dealerId)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        const live = ((data || []) as PublicStatus[])
          .filter((item) => new Date(item.expires_at).getTime() > Date.now())
          .reverse();
        setItems(live);
      });
    return () => { cancelled = true; };
  }, [dealerId]);

  useEffect(() => {
    if (!items.length || autoOpened.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") !== "1") return;
    autoOpened.current = true;
    open(0);
  }, [items]);

  async function record(item: PublicStatus, kind: "view" | "complete" | "vehicle_open" | "message", watch = 0) {
    try {
      await supabase.rpc("loadlink_public_dealer_status_event", {
        p_status_id: item.id,
        p_viewer_hash: viewerKey(),
        p_event: kind,
        p_watch_seconds: watch,
      });
    } catch {}
  }

  function stopTimer() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  function open(index: number) {
    const item = items[index];
    if (!item) return;
    stopTimer();
    startedAt.current = Date.now();
    setProgress(0);
    setActive(index);
    void record(item, "view", 0);
  }

  function close() {
    stopTimer();
    setActive(null);
    setProgress(0);
    startedAt.current = 0;
  }

  function next(markComplete = false) {
    if (active === null || !current) return;
    const watched = startedAt.current ? Math.max(0, (Date.now() - startedAt.current) / 1000) : 0;
    if (markComplete) void record(current, "complete", watched);
    if (active < items.length - 1) open(active + 1);
    else close();
  }

  function previous() {
    if (active === null) return;
    if (active > 0) open(active - 1);
    else {
      startedAt.current = Date.now();
      setProgress(0);
    }
  }

  useEffect(() => {
    if (!current) return;
    stopTimer();
    const seconds = Math.min(60, Math.max(3, Number(current.display_seconds || (current.content_type === "video" ? 60 : 30))));
    if (current.content_type !== "video") {
      timer.current = window.setInterval(() => {
        const elapsed = Math.max(0, (Date.now() - startedAt.current) / 1000);
        setProgress(Math.min(100, (elapsed / seconds) * 100));
        if (elapsed >= seconds) next(true);
      }, 200);
    }
    return stopTimer;
  }, [current?.id]);

  if (!items.length) return null;

  const muted = darkMode ? "text-white/48" : "text-black/48";
  const surface = darkMode ? "border-white/10 bg-white/[.035] text-white" : "border-black/10 bg-white/62 text-black";

  return (
    <>
      <section className={`mt-4 rounded-[22px] border px-4 py-3.5 backdrop-blur-xl ${surface}`}>
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => open(0)} className="flex min-w-0 items-center gap-3 text-left" aria-label={`View ${dealerName} status`}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#f6b800] p-[2px] shadow-[0_8px_22px_rgba(246,184,0,.16)]">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-current/10 bg-[#111] text-[10px] font-black text-[#f6b800]">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(dealerName)}
              </span>
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-black">Dealership updates</strong>
              <span className={`mt-0.5 block text-[11px] font-semibold ${muted}`}>{items.length} live · Tap to view</span>
            </span>
          </button>
          <button type="button" onClick={() => open(Math.max(0, items.length - 1))} className="shrink-0 rounded-full border border-current/12 px-3 py-2 text-[10px] font-black uppercase tracking-[.06em]">Latest</button>
        </div>
      </section>

      {current ? (
        <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/94 p-0 sm:p-3" role="dialog" aria-modal="true" aria-label={`${dealerName} status`}>
          <section className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-[#080808] text-white shadow-2xl sm:h-[min(820px,94dvh)] sm:rounded-[24px]">
            <div className="absolute left-3 right-3 top-[max(10px,env(safe-area-inset-top))] z-30 flex gap-1">
              {items.map((item, index) => (
                <span key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full bg-white transition-[width] duration-150"
                    style={{ width: index < (active ?? 0) ? "100%" : index === active ? `${progress}%` : "0%" }}
                  />
                </span>
              ))}
            </div>

            <header className="absolute left-0 right-0 top-[calc(max(10px,env(safe-area-inset-top))+12px)] z-30 flex items-center gap-3 bg-gradient-to-b from-black/72 to-transparent px-4 pb-8 pt-3">
              <a href={`/dealership/${dealerSlug}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#111] text-[8px] font-black text-[#f6b800]">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(dealerName)}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[13px] font-black">{dealerName}</strong>
                  <span className="block text-[9px] font-semibold text-white/55">LoadLink dealership update</span>
                </span>
              </a>
              <button type="button" onClick={close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/48 text-2xl font-light" aria-label="Close status">×</button>
            </header>

            <div className="relative min-h-0 flex-1 bg-black">
              {current.media_url ? (
                current.content_type === "video" ? (
                  <video
                    src={current.media_url}
                    autoPlay
                    playsInline
                    controls
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget;
                      if (video.duration) setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
                    }}
                    onEnded={() => next(true)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img src={current.media_url} alt="" className="h-full w-full object-contain" />
                )
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(246,184,0,.18),transparent_42%),#0a0a0a] p-8 text-center">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#f6b800]">{current.content_type.replaceAll("_", " ")}</div>
                    <div className="mt-3 text-3xl font-black tracking-[-.04em]">{current.title || current.body || "Dealership update"}</div>
                  </div>
                </div>
              )}
              <button type="button" onClick={previous} className="absolute bottom-0 left-0 top-24 z-20 w-[18%] cursor-w-resize bg-transparent" aria-label="Previous status" />
              <button type="button" onClick={() => next(false)} className="absolute bottom-0 right-0 top-24 z-20 w-[18%] cursor-e-resize bg-transparent" aria-label="Next status" />
            </div>

            <footer className="border-t border-white/10 bg-[#0b0b0b] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-black">{current.title || "Dealership update"}</div>
                  {current.body ? <p className="mt-1.5 line-clamp-3 text-sm leading-5 text-white/58">{current.body}</p> : null}
                </div>
                <span className="shrink-0 rounded-full border border-white/12 px-2 py-1 text-[8px] font-black uppercase text-white/45">{current.content_type}</span>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
                {current.action_url ? (
                  <a
                    href={current.action_url}
                    onClick={() => void record(current, "vehicle_open", startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0)}
                    className="flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#f6b800] px-5 text-xs font-black text-black"
                  >
                    {current.cta_label || (current.listing_id ? "View vehicle" : "Open update")}
                  </a>
                ) : null}
                <a
                  href={`/messages?dealer=${encodeURIComponent(dealerId)}&returnTo=${encodeURIComponent(`/dealership/${dealerSlug}`)}`}
                  onClick={() => void record(current, "message", startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0)}
                  className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-5 text-xs font-black"
                >
                  Message
                </a>
                {phoneNumber ? <a href={`tel:${phoneNumber}`} className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-5 text-xs font-black">Call</a> : null}
                <a href={`/dealership/${dealerSlug}#showroom`} className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-5 text-xs font-black">Showroom</a>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
