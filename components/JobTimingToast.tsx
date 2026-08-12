"use client";

import { useEffect, useMemo, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { supabase } from "@/lib/supabaseClient";

type Timing = { id?: string; title?: string | null; vehicle_needed?: string | null; needed_at?: string | null; actionable?: boolean; state?: string | null; reason?: string | null };

export default function JobTimingToast({ listingId, conversationId, listingTitle, darkMode = false, onFollowUp }: {
  listingId?: string | null; conversationId?: string | null; listingTitle?: string | null; darkMode?: boolean; onFollowUp?: (text: string) => void;
}) {
  const [timing, setTiming] = useState<Timing | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true; setTiming(null); setVisible(false);
    if (!listingId) return;
    void supabase.rpc("loadlink_get_listing_timing", { p_listing_id: listingId }).then(({ data, error }) => {
      if (active && !error && data) setTiming(data as Timing);
    });
    return () => { active = false; };
  }, [listingId]);

  const info = useMemo(() => {
    if (!timing) return null;
    const vehicle = String(timing.vehicle_needed || listingTitle || timing.title || "vehicle").trim();
    if (timing.actionable === false) return { key: `inactive:${timing.state || "inactive"}`, title: "This listing is no longer active.", detail: timing.reason || "Check with the poster before continuing.", follow: `Hi, I’m following up on your ${vehicle} listing. Is it still available?` };
    if (!timing.needed_at) return null;
    const date = new Date(timing.needed_at); if (Number.isNaN(date.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0); const needed = new Date(date); needed.setHours(0,0,0,0);
    const days = Math.round((needed.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { key:`past:${needed.toISOString()}`, title:"The requested date has passed.", detail:"Confirm whether the job is still active before quoting.", follow:`Hi, I’m following up on your ${vehicle} request. The requested date has passed — is the job still available?` };
    if (days === 0) return { key:`today:${needed.toISOString()}`, title:`This customer needs ${vehicle} today.`, detail:"A quick follow-up may help while the request is still active.", follow:`Hi, I’m following up on your ${vehicle} request for today. Is it still available?` };
    if (days === 1) return { key:`tomorrow:${needed.toISOString()}`, title:`This customer needs ${vehicle} tomorrow.`, detail:"You may want to follow up before the requested date.", follow:`Hi, I’m following up on your ${vehicle} request for tomorrow. Is it still available?` };
    if (days <= 3) return { key:`soon:${needed.toISOString()}`, title:`${days} days until ${vehicle} is needed.`, detail:"The requested date is approaching.", follow:`Hi, I’m following up on your ${vehicle} request. Is the job still available?` };
    return null;
  }, [listingTitle, timing]);

  useEffect(() => {
    if (!info) return;
    const key = `loadlink-job-toast:${conversationId || listingId || "listing"}:${info.key}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key,"1"); setVisible(true);
  }, [conversationId, info, listingId]);

  if (!info || !visible) return null;
  return <div className={`loadlink-job-timing-toast fixed left-3 right-3 top-[76px] z-[90] mx-auto max-w-md rounded-[20px] border p-3.5 ${darkMode ? "text-white" : "text-black"}`}>
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${darkMode ? "bg-[#f6b800]/12 text-[#f6b800]" : "bg-[#f6b800]/16 text-[#8f6900]"}`}><LoadLinkIcon name="calendar" size={18} /></span>
      <div className="min-w-0 flex-1"><div className="text-[11px] font-black">{info.title}</div><div className="mt-1 text-[9px] font-semibold leading-4 opacity-60">{info.detail}</div>{onFollowUp ? <button type="button" onClick={() => { onFollowUp(info.follow); setVisible(false); }} className="mt-2 text-[9px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Follow up</button> : null}</div>
      <button type="button" onClick={() => setVisible(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/15 opacity-60" aria-label="Dismiss"><LoadLinkIcon name="close" size={14} /></button>
    </div>
  </div>;
}
