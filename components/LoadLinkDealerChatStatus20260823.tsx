"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ChatDealerStatus = {
  dealershipId: string;
  slug: string;
  name: string;
  imageUrl: string;
  statusId: string;
  title: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("thread") || params.get("conversation") || "";
  return UUID_RE.test(value) ? value : "";
}

export default function LoadLinkDealerChatStatus20260823() {
  const pathname = usePathname();
  const [status, setStatus] = useState<ChatDealerStatus | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) { setStatus(null); setHost(null); return; }
    let active = true;

    const findHost = () => {
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      if (!header?.parentElement) return;
      let node = header.parentElement.querySelector<HTMLElement>(":scope > [data-loadlink-dealer-chat-status-host]");
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkDealerChatStatusHost = "true";
        header.insertAdjacentElement("afterend", node);
      }
      if (active) setHost(node);
    };

    async function load() {
      findHost();
      const thread = currentThread();
      if (!thread) { if (active) setStatus(null); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !active) { if (active) setStatus(null); return; }

      const conversation = await supabase.from("chat_conversations").select("listing_id").eq("id", thread).maybeSingle();
      const listingId = String(conversation.data?.listing_id || "");
      if (!UUID_RE.test(listingId)) { if (active) setStatus(null); return; }

      const listing = await supabase.from("job_listings").select("dealership_id").eq("id", listingId).maybeSingle();
      const dealershipId = String(listing.data?.dealership_id || "");
      if (!UUID_RE.test(dealershipId)) { if (active) setStatus(null); return; }

      const now = new Date().toISOString();
      const [dealer, update] = await Promise.all([
        supabase.from("public_dealership_profiles").select("id,slug,name,profile_image_url,logo_url").eq("id", dealershipId).maybeSingle(),
        supabase.from("public_dealership_statuses").select("id,title,starts_at,expires_at").eq("dealership_id", dealershipId).lte("starts_at", now).gt("expires_at", now).order("starts_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (!active || dealer.error || update.error || !dealer.data || !update.data) {
        if (active) setStatus(null);
        return;
      }

      setStatus({
        dealershipId,
        slug: String(dealer.data.slug || ""),
        name: String(dealer.data.name || "Dealership"),
        imageUrl: String(dealer.data.profile_image_url || dealer.data.logo_url || ""),
        statusId: String(update.data.id),
        title: String(update.data.title || "New showroom update"),
      });
    }

    void load();
    const refresh = () => void load();
    const interval = window.setInterval(refresh, 15_000);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
    };
  }, [pathname]);

  if (!host || !status || !status.slug) return null;

  return createPortal(
    <div data-loadlink-dealer-chat-status="true" data-loadlink-auth-only="true" className="px-3 pb-2 pt-1">
      <button
        type="button"
        onClick={() => window.location.assign(`/dealership/${encodeURIComponent(status.slug)}`)}
        className="loadlink-glass flex w-full items-center gap-3 rounded-[16px] border border-[#f6b800]/28 px-3 py-2 text-left"
        aria-label={`Open ${status.name} showroom update`}
      >
        <span className="shrink-0 rounded-full bg-[#f6b800] p-[2px] shadow-[0_4px_14px_rgba(246,184,0,.14)]">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black bg-[#151515] text-xs font-black text-white">
            {status.name.slice(0, 1).toUpperCase()}
            {status.imageUrl ? <img src={status.imageUrl} alt="" className="absolute inset-0 h-full w-full rounded-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[11px] font-black">{status.name}</strong>
          <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-50">{status.title}</span>
        </span>
        <span className="text-[10px] font-black opacity-55">View →</span>
      </button>
    </div>,
    host,
  );
}
