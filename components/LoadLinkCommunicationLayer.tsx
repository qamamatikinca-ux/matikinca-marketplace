"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAuthenticatedUser } from "@/lib/auth";
import {
  communicationEventKey,
  type CommunicationEventType,
  type LoadLinkCommunication,
  type LoadLinkCommunicationEvent,
} from "@/lib/loadlinkCommunications";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const HIDDEN_ROUTES = ["/admin", "/login", "/auth", "/complete-profile"];

export default function LoadLinkCommunicationLayer() {
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<LoadLinkCommunication[]>([]);
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(auth.user)) {
      setUserId(null);
      setCampaigns([]);
      setEvents(new Set());
      return;
    }

    setUserId(auth.user.id);
    const syncResult = await supabase.rpc("loadlink_sync_my_campaign_notifications");
    if (!syncResult.error && Number(syncResult.data || 0) > 0) {
      window.dispatchEvent(new Event("loadlink-notifications-updated"));
    }

    const result = await supabase.rpc("loadlink_my_active_communications");
    if (result.error) return;
    const nextCampaigns = ((result.data || []) as LoadLinkCommunication[]).filter((item) => item.surface !== "inbox");
    setCampaigns(nextCampaigns);

    if (!nextCampaigns.length) {
      setEvents(new Set());
      return;
    }

    const eventResult = await supabase
      .from("loadlink_communication_events")
      .select("campaign_id,event_type")
      .in("campaign_id", nextCampaigns.map((item) => item.id));
    if (!eventResult.error) {
      const keys = new Set(
        ((eventResult.data || []) as LoadLinkCommunicationEvent[]).map((item) => communicationEventKey(item.campaign_id, item.event_type)),
      );
      setEvents(keys);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void load();
    const timer = window.setInterval(() => void load(), 120_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      subscription.unsubscribe();
    };
  }, [load]);

  const record = useCallback(async (campaignId: string, eventType: CommunicationEventType) => {
    if (!userId) return;
    const key = communicationEventKey(campaignId, eventType);
    if (events.has(key)) return;
    const { error } = await supabase.from("loadlink_communication_events").upsert(
      { campaign_id: campaignId, user_id: userId, event_type: eventType },
      { onConflict: "campaign_id,user_id,event_type", ignoreDuplicates: true },
    );
    if (!error) {
      setEvents((current) => new Set(current).add(key));
      window.dispatchEvent(new CustomEvent("loadlink-communications-updated", { detail: { campaignId, eventType } }));
    }
  }, [events, userId]);

  const visible = useMemo(() => campaigns.filter((campaign) => {
    const dismissed = events.has(communicationEventKey(campaign.id, "dismissed"));
    const acknowledged = events.has(communicationEventKey(campaign.id, "acknowledged"));
    return !dismissed && !acknowledged;
  }), [campaigns, events]);

  const selected = useMemo(() => {
    const bySurface = new Map<string, LoadLinkCommunication>();
    for (const campaign of visible) {
      if (!bySurface.has(campaign.surface)) bySurface.set(campaign.surface, campaign);
    }
    return [...bySurface.values()];
  }, [visible]);

  useEffect(() => {
    selected.forEach((campaign) => void record(campaign.id, "viewed"));
  }, [record, selected]);

  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) || !userId || !selected.length) return null;

  return (
    <>
      {selected.map((campaign) => (
        <CommunicationSurface
          key={campaign.id}
          campaign={campaign}
          onDismiss={() => void record(campaign.id, "dismissed")}
          onAcknowledge={() => void record(campaign.id, "acknowledged")}
          onCta={() => void record(campaign.id, "cta_clicked")}
        />
      ))}
    </>
  );
}

function CommunicationSurface({
  campaign,
  onDismiss,
  onAcknowledge,
  onCta,
}: {
  campaign: LoadLinkCommunication;
  onDismiss: () => void;
  onAcknowledge: () => void;
  onCta: () => void;
}) {
  if (campaign.surface === "modal") {
    return (
      <div className="fixed inset-0 z-[145] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={campaign.title}>
        <article className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/10 p-6 shadow-[0_28px_90px_rgba(0,0,0,.35)] sm:p-7" style={{ backgroundColor: campaign.background_color, color: campaign.text_color }}>
          <CommunicationContent campaign={campaign} onDismiss={onDismiss} onAcknowledge={onAcknowledge} onCta={onCta} />
        </article>
      </div>
    );
  }

  const isBanner = campaign.surface === "banner";
  return (
    <aside
      className={`fixed z-[135] border border-white/10 shadow-[0_18px_55px_rgba(0,0,0,.22)] ${positionClass(campaign.position, isBanner)} ${isBanner ? "rounded-[20px] px-5 py-4" : "rounded-[22px] p-4"}`}
      style={{ backgroundColor: campaign.background_color, color: campaign.text_color }}
      role="status"
      aria-label={campaign.title}
    >
      <CommunicationContent campaign={campaign} compact={!isBanner} onDismiss={onDismiss} onAcknowledge={onAcknowledge} onCta={onCta} />
    </aside>
  );
}

function CommunicationContent({
  campaign,
  compact = false,
  onDismiss,
  onAcknowledge,
  onCta,
}: {
  campaign: LoadLinkCommunication;
  compact?: boolean;
  onDismiss: () => void;
  onAcknowledge: () => void;
  onCta: () => void;
}) {
  return (
    <div className={compact ? "pr-8" : "pr-9"}>
      {campaign.priority !== "normal" ? (
        <p className="mb-2 text-[9px] font-black uppercase tracking-[.18em]" style={{ color: campaign.accent_color }}>
          {campaign.priority}
        </p>
      ) : null}
      <h2 className={`${compact ? "text-[15px]" : "text-[18px]"} font-black tracking-[-.025em]`}>{campaign.title}</h2>
      <p className={`mt-1.5 ${compact ? "text-[11px]" : "text-[12px]"} font-semibold leading-[1.6] opacity-80`}>{campaign.message}</p>

      {(campaign.cta_label && campaign.cta_url) || campaign.acknowledgement_required ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {campaign.cta_label && campaign.cta_url ? (
            <Link
              href={campaign.cta_url}
              onClick={onCta}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[11px] font-black"
              style={{ backgroundColor: campaign.accent_color, color: readableText(campaign.accent_color) }}
            >
              {campaign.cta_label}
            </Link>
          ) : null}
          {campaign.acknowledgement_required ? (
            <button
              type="button"
              onClick={onAcknowledge}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-current/20 px-4 text-[11px] font-black"
            >
              Acknowledge
            </button>
          ) : null}
        </div>
      ) : null}

      {campaign.dismissible ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-current/15 text-lg font-medium opacity-70 transition hover:opacity-100"
          aria-label="Dismiss announcement"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function positionClass(position: LoadLinkCommunication["position"], banner: boolean) {
  const width = banner ? "w-[calc(100vw-1.5rem)] max-w-[920px]" : "w-[calc(100vw-1.5rem)] max-w-[380px]";
  switch (position) {
    case "bottom": return `bottom-5 left-1/2 -translate-x-1/2 ${width}`;
    case "top-left": return `left-3 top-3 ${width}`;
    case "top-right": return `right-3 top-3 ${width}`;
    case "bottom-left": return `bottom-5 left-3 ${width}`;
    case "bottom-right": return `bottom-5 right-3 ${width}`;
    case "center": return `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${width}`;
    default: return `left-1/2 top-3 -translate-x-1/2 ${width}`;
  }
}

function readableText(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#000000";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145 ? "#000000" : "#FFFFFF";
}
