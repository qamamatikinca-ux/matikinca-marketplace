"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ListingMeta = {
  id?: string | null;
  title?: string | null;
  city?: string | null;
  package_type?: string | null;
  dealer_package_active?: boolean | null;
  dealership_slug?: string | null;
  dealership_showroom_available?: boolean | null;
};

type DealerPostingGate = { required?: boolean; complete?: boolean; missing?: string[] };

const STYLE_ID = "loadlink-marketplace-polish-style";
const DEALER_GATE_ID = "loadlink-dealer-profile-posting-gate";

function clean(value: unknown) { return String(value || "").trim(); }

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html[data-loadlink-theme="dark"] [class*="bg-[#f6b800]/"] {
      background-color: rgba(246,184,0,.07) !important;
      border-color: rgba(246,184,0,.18) !important;
      -webkit-backdrop-filter: blur(10px) saturate(116%);
      backdrop-filter: blur(10px) saturate(116%);
    }
    #loadlink-promoted-carousel::-webkit-scrollbar { display:none; }
    input[data-loadlink-future-date="true"]::-webkit-date-and-time-value { text-align:left; }
  `;
  document.head.appendChild(style);
}

function hideSeenBadges() {
  document.querySelectorAll<HTMLElement>("button,span,div").forEach((node) => {
    if (clean(node.textContent).toLowerCase() === "seen") node.style.display = "none";
  });
}

export default function MarketplaceUxPolishEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!["/jobs", "/my-posts", "/jobs/list"].includes(pathname)) return;
    installStyles();
    let cancelled = false;
    const timers: number[] = [];
    const rows = new Map<string, ListingMeta>();

    function rowForCard(card: HTMLElement) {
      const title = clean(card.querySelector("h3")?.textContent).toLowerCase();
      const city = clean(card.querySelector("p")?.textContent).split("·")[0].trim().toLowerCase();
      if (!title) return undefined;
      return Array.from(rows.values()).find((row) => clean(row.title).toLowerCase() === title && (!city || clean(row.city).toLowerCase() === city));
    }

    function promotedCarousel() {
      if (pathname !== "/jobs") return;
      document.getElementById("loadlink-promoted-carousel-controls")?.remove();
      document.querySelectorAll("[data-loadlink-public-view-post],[data-loadlink-owner-controls]").forEach((node) => node.remove());

      const heading = Array.from(document.querySelectorAll<HTMLElement>("h2")).find((node) => clean(node.textContent).toLowerCase() === "promoted listings");
      const root = heading?.parentElement;
      if (!root) return;

      const candidates = Array.from(root.children).filter((child) => child !== heading) as HTMLElement[];
      const rail = candidates.find((node) => node.querySelectorAll("img").length > 0 || node.querySelectorAll("h3").length > 1);
      if (!rail) return;

      rail.id = "loadlink-promoted-carousel";
      Object.assign(rail.style, {
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        paddingBottom: "8px",
      });
      rail.style.setProperty("-webkit-overflow-scrolling", "touch");

      Array.from(rail.children).forEach((child) => {
        const card = child as HTMLElement;
        if (!card.querySelector("img") || !card.querySelector("h3")) return;
        card.style.flex = window.innerWidth < 640 ? "0 0 min(86vw,390px)" : "0 0 min(420px,46vw)";
        card.style.scrollSnapAlign = "start";
        card.style.scrollSnapStop = "always";
        card.style.cursor = "pointer";

        if (!card.querySelector("[data-loadlink-promoted-view-post]")) {
          const content = card.querySelector<HTMLElement>("div.p-4") || card.lastElementChild as HTMLElement | null;
          if (content) {
            const hint = document.createElement("span");
            hint.dataset.loadlinkPromotedViewPost = "true";
            hint.className = "mt-3 inline-flex text-[10px] font-black uppercase tracking-[.08em] opacity-60";
            hint.textContent = "View post →";
            content.appendChild(hint);
          }
        }

        if (card.dataset.loadlinkExactPost === "true") return;
        const row = rowForCard(card);
        if (!row?.id) return;
        card.dataset.loadlinkExactPost = "true";
        card.onclick = (event) => {
          event.preventDefault();
          window.location.assign(`/listing/${encodeURIComponent(String(row.id))}`);
        };
      });
    }

    function myPostsFixes() {
      if (pathname !== "/my-posts") return;
      hideSeenBadges();
      document.querySelectorAll<HTMLDetailsElement>('details:has(summary[aria-label="More post actions"])').forEach((details) => {
        const menu = details.querySelector<HTMLElement>("div.absolute");
        if (!menu || window.innerWidth >= 768) return;
        Object.assign(menu.style, {
          position: "fixed",
          left: "12px",
          right: "12px",
          bottom: "calc(env(safe-area-inset-bottom) + 12px)",
          top: "auto",
          width: "auto",
          maxHeight: "64dvh",
          overflowY: "auto",
          zIndex: "2147483400",
        });
      });
    }

    function dateFix() {
      if (pathname !== "/jobs/list") return;
      document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach((input) => {
        input.style.width = "100%";
        input.style.minWidth = "0";
        input.style.maxWidth = "100%";
        input.style.fontSize = "16px";
        input.style.boxSizing = "border-box";
      });
    }

    async function dealerGate() {
      if (pathname !== "/jobs/list" || !isSupabaseConfigured || document.getElementById(DEALER_GATE_ID)) return;
      const auth = await supabase.auth.getUser();
      if (!auth.data.user || cancelled) return;
      const result = await supabase.rpc("loadlink_dealer_profile_posting_gate", { p_user_id: auth.data.user.id });
      const gate = result.data as DealerPostingGate | null;
      if (result.error || !gate?.required || gate.complete || cancelled) return;

      const overlay = document.createElement("div");
      overlay.id = DEALER_GATE_ID;
      overlay.className = "fixed inset-0 z-[2147483550] flex items-end bg-black/75 p-3 sm:items-center sm:justify-center";
      const panel = document.createElement("section");
      panel.className = "w-full max-w-md rounded-[26px] border border-white/12 bg-[#0b0b0b] p-5 text-white shadow-2xl";
      const missing = (gate.missing || []).filter(Boolean);
      panel.innerHTML = `<h2 class="text-2xl font-black tracking-[-.03em]">Finish your Dealer profile</h2><p class="mt-3 text-sm font-semibold leading-6 text-white/60">Before this Dealer account can post, add: <strong class="text-white">${missing.join(", ") || "the missing public dealership details"}</strong>.</p><div class="mt-5 grid gap-2"><a href="/dealer?section=showroom" class="flex min-h-12 items-center justify-center rounded-[16px] bg-[#f6b800] px-4 text-sm font-black text-black">Complete Dealer profile</a><a href="/jobs" class="flex min-h-12 items-center justify-center rounded-[16px] border border-white/12 px-4 text-sm font-black text-white">Back</a></div>`;
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    }

    async function initialise() {
      if (isSupabaseConfigured && pathname === "/jobs") {
        const payload = await fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
        ((payload?.rows || []) as ListingMeta[]).forEach((row) => { if (row.id) rows.set(String(row.id), row); });
      }
      if (cancelled) return;
      const scan = () => { hideSeenBadges(); promotedCarousel(); myPostsFixes(); dateFix(); };
      scan();
      [120, 350, 800, 1500].forEach((delay) => timers.push(window.setTimeout(scan, delay)));
      void dealerGate();
    }

    void initialise();
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      document.getElementById(DEALER_GATE_ID)?.remove();
      document.getElementById("loadlink-promoted-carousel-controls")?.remove();
    };
  }, [pathname]);

  return null;
}
