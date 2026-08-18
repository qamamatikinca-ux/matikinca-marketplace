"use client";

import { useEffect } from "react";

type DealerListing = {
  id?: string | null;
  dealer_package_active?: boolean | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_trading_hours?: string | null;
  dealership_location?: string | null;
  dealership_logo?: string | null;
  dealership_verified?: boolean | null;
  dealership_public_profile_available?: boolean | null;
  dealership_showroom_available?: boolean | null;
  dealership_active_listing_count?: number | null;
  dealership_review_count?: number | null;
  dealership_review_average?: number | null;
};

const BENEFIT_SELECTOR = "[data-loadlink-dealer-benefits='true']";

function listingIdFromHref(href: string) {
  const match = href.match(/^\/(?:listing|vehicles)\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function makeText(tag: string, value: string, className: string) {
  const node = document.createElement(tag);
  node.textContent = value;
  node.className = className;
  return node;
}

export default function DealerPostBenefitsEnhancer() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    const rows = new Map<string, DealerListing>();

    function openDealer(event: Event, slug: string, hasShowroom: boolean) {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(`/dealership/${encodeURIComponent(slug)}${hasShowroom ? "#showroom" : ""}`);
    }

    function decorateHost(host: HTMLElement, id: string) {
      if (!id || host.querySelector(BENEFIT_SELECTOR)) return;
      const row = rows.get(id);
      if (!row?.dealer_package_active || !row.dealership_slug || !row.dealership_name) return;

      const hasShowroom = Boolean(row.dealership_showroom_available) || Number(row.dealership_active_listing_count || 0) > 0;
      const reviewCount = Number(row.dealership_review_count || 0);
      const reviewAverage = Number(row.dealership_review_average || 0);
      const reviewLabel = reviewCount > 0 && reviewAverage > 0 ? `★ ${reviewAverage.toFixed(1)} (${reviewCount})` : "Reviews";

      const bar = document.createElement("div");
      bar.dataset.loadlinkDealerBenefits = "true";
      bar.setAttribute("role", "button");
      bar.tabIndex = 0;
      bar.setAttribute("aria-label", hasShowroom ? `View ${row.dealership_name} showroom, opening hours and customer reviews` : `View ${row.dealership_name} profile, opening hours and customer reviews`);
      bar.className = "m-3 mt-0 flex min-h-[62px] w-[calc(100%-1.5rem)] items-center gap-3 rounded-[18px] border border-black/10 bg-white/58 px-3 py-2.5 text-left shadow-[0_10px_28px_rgba(0,0,0,.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.045]";

      const avatar = document.createElement("span");
      avatar.className = "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current/10 bg-black text-[9px] font-black uppercase text-[#f6b800]";
      if (row.dealership_logo) {
        const image = document.createElement("img");
        image.src = row.dealership_logo;
        image.alt = "";
        image.loading = "lazy";
        image.className = "h-full w-full object-cover";
        avatar.appendChild(image);
      } else {
        avatar.textContent = row.dealership_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").slice(0, 2) || "LL";
      }

      const copy = document.createElement("span");
      copy.className = "min-w-0 flex-1";

      const top = document.createElement("span");
      top.className = "flex min-w-0 items-center gap-1.5";
      top.appendChild(makeText("strong", row.dealership_name, "min-w-0 truncate text-[12px] font-black"));
      const packageChip = makeText("span", row.dealership_verified ? "Verified dealer" : "Dealer", "shrink-0 rounded-full border border-current/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[.04em] opacity-55");
      top.appendChild(packageChip);
      copy.appendChild(top);

      const details = [
        row.dealership_trading_hours ? `Hours: ${row.dealership_trading_hours}` : "Opening hours on profile",
        row.dealership_location || "",
      ].filter(Boolean).join(" · ");
      copy.appendChild(makeText("small", details, "mt-1 block truncate text-[9.5px] font-semibold opacity-52"));

      const right = document.createElement("span");
      right.className = "flex shrink-0 flex-col items-end gap-0.5";
      right.appendChild(makeText("strong", reviewLabel, "text-[10px] font-black"));
      right.appendChild(makeText("small", hasShowroom ? "View showroom" : "View dealership", "text-[9px] font-bold opacity-48"));

      bar.append(avatar, copy, right);
      bar.addEventListener("click", (event) => openDealer(event, row.dealership_slug!, hasShowroom));
      bar.addEventListener("keydown", (event) => {
        if (!(event instanceof KeyboardEvent) || (event.key !== "Enter" && event.key !== " ")) return;
        openDealer(event, row.dealership_slug!, hasShowroom);
      });
      host.appendChild(bar);
    }

    function scan() {
      if (cancelled || !rows.size) return;

      document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
        decorateHost(article, article.id.replace(/^job-/, ""));
      });

      document.querySelectorAll<HTMLAnchorElement>('a[href^="/listing/"],a[href^="/vehicles/"]').forEach((anchor) => {
        const id = listingIdFromHref(anchor.getAttribute("href") || "");
        const host = anchor.closest<HTMLElement>("article") || anchor;
        decorateHost(host, id);
      });
    }

    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Listings unavailable")))
      .then((payload) => {
        if (cancelled) return;
        ((payload?.rows || []) as DealerListing[]).forEach((row) => {
          if (row.id && row.dealer_package_active && row.dealership_slug && row.dealership_name) rows.set(String(row.id), row);
        });
        scan();
        observer = new MutationObserver(scan);
        observer.observe(document.body, { childList: true, subtree: true });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
