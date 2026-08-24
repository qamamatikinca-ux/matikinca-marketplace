"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DealerChatIdentity = {
  dealership_id: string;
  slug: string;
  dealership_name: string;
  image_url: string | null;
  status_id: string | null;
  status_title: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("thread") || params.get("conversation") || "";
  return UUID_RE.test(value) ? value : "";
}

export default function LoadLinkDealerChatStatus20260823() {
  const pathname = usePathname();
  const [dealer, setDealer] = useState<DealerChatIdentity | null>(null);
  const dealerRef = useRef<DealerChatIdentity | null>(null);

  const decorate = useCallback(() => {
    const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
    if (!header) return;

    const avatar = header.querySelector<HTMLElement>('span[aria-label$=" profile picture"]')
      || header.querySelector<HTMLImageElement>('img[alt*="profile"]')?.parentElement
      || null;

    header.querySelectorAll<HTMLElement>('[data-loadlink-dealer-profile-target="true"]').forEach((node) => {
      if (node !== avatar) {
        delete node.dataset.loadlinkDealerProfileTarget;
        delete node.dataset.loadlinkDealerStatusActive;
        node.removeAttribute("role");
        node.removeAttribute("tabindex");
        node.removeAttribute("title");
      }
    });

    if (!avatar || !dealerRef.current) {
      if (avatar) {
        delete avatar.dataset.loadlinkDealerProfileTarget;
        delete avatar.dataset.loadlinkDealerStatusActive;
        avatar.removeAttribute("role");
        avatar.removeAttribute("tabindex");
        avatar.removeAttribute("title");
      }
      return;
    }

    const current = dealerRef.current;
    const hasLiveStatus = Boolean(current.status_id);

    avatar.dataset.loadlinkDealerProfileTarget = "true";
    if (hasLiveStatus) avatar.dataset.loadlinkDealerStatusActive = "true";
    else delete avatar.dataset.loadlinkDealerStatusActive;

    avatar.setAttribute("role", "button");
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute(
      "title",
      hasLiveStatus ? `View ${current.dealership_name} status` : `Open ${current.dealership_name} showroom`,
    );
    avatar.setAttribute(
      "aria-label",
      hasLiveStatus
        ? `${current.dealership_name} profile, view active dealership status`
        : `${current.dealership_name} profile, open dealership showroom`,
    );
  }, []);

  const load = useCallback(async () => {
    if (pathname !== "/messages") {
      setDealer(null);
      dealerRef.current = null;
      return;
    }

    const thread = currentThread();
    if (!thread) {
      setDealer(null);
      dealerRef.current = null;
      decorate();
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setDealer(null);
      dealerRef.current = null;
      decorate();
      return;
    }

    const { data, error } = await supabase.rpc("loadlink_chat_dealer_status", { p_thread_id: thread });
    const row = !error ? (Array.isArray(data) ? data[0] : data) : null;
    const next = row ? (row as DealerChatIdentity) : null;

    dealerRef.current = next;
    setDealer(next);
    requestAnimationFrame(decorate);
  }, [decorate, pathname]);

  const openCurrent = useCallback(() => {
    const current = dealerRef.current;
    if (!current) return;

    if (current.status_id) {
      window.dispatchEvent(
        new CustomEvent("loadlink:open-dealer-status", {
          detail: {
            dealershipId: current.dealership_id,
            statusId: current.status_id,
            dealershipName: current.dealership_name,
            slug: current.slug,
            imageUrl: current.image_url,
          },
        }),
      );
      return;
    }

    if (current.slug) {
      window.location.assign(`/dealership/${encodeURIComponent(current.slug)}`);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/messages") return;

    void load();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });

    const refresh = () => void load();
    window.addEventListener("popstate", refresh);
    window.addEventListener("loadlink-dealership-status-changed", refresh);
    window.addEventListener("loadlink-dealership-follow-changed", refresh);
    window.addEventListener("focus", refresh);

    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-loadlink-dealer-profile-target="true"]')
        : null;
      if (!target || !dealerRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      openCurrent();
    };

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-loadlink-dealer-profile-target="true"]')
        : null;
      if (!target || !dealerRef.current) return;
      event.preventDefault();
      openCurrent();
    };

    document.addEventListener("click", click, true);
    document.addEventListener("keydown", keydown, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("loadlink-dealership-status-changed", refresh);
      window.removeEventListener("loadlink-dealership-follow-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", keydown, true);
    };
  }, [decorate, load, openCurrent, pathname]);

  if (!dealer) return null;
  return (
    <span className="sr-only" aria-live="polite">
      {dealer.status_id
        ? `${dealer.dealership_name} has an active dealership status.`
        : `${dealer.dealership_name} dealership profile opens the showroom.`}
    </span>
  );
}
