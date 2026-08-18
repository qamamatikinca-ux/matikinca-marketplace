"use client";

import { useEffect } from "react";

type DealerListing = {
  id?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_trading_hours?: string | null;
  dealership_location?: string | null;
  dealership_logo?: string | null;
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

    function openShowroom(event: Event, slug: string) {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(`/dealership/${encodeURIComponent(slug)}#showroom`);
    }

    function decorateHost(host: HTMLElement, id: string) {
      if (!id || host.querySelector(BENEFIT_SELECTOR)) return;
      const row = rows.get(id);
      if (!row?.dealership_slug || !row.dealership_name) return;

      const bar = document.createElement("div");
      bar.dataset.loadlinkDealerBenefits = "true";
      bar.setAttribute("role", "button");
      bar.tabIndex = 0;
      bar.setAttribute("aria-label", `View ${row.dealership_name} showroom and customer reviews`);
      bar.className = "m-3 mt-0 flex min-h-[54px] w-[calc(100%-1.5rem)] items-center gap-3 rounded-[17px] border px-3 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,.045)]";

      const avatar = document.createElement("span");
      avatar.className = "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current/10 bg-black text-[9px] font-black uppercase text-[#f6b800]";
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
      copy.appendChild(makeText("strong", row.dealership_name, "block truncate text-[12px] font-black"));
      const details = [
        row.dealership_trading_hours ? `Hours: ${row.dealership_trading_hours}` : "Verified dealership",
        row.dealership_location || "",
      ].filter(Boolean).join(" · ");
      copy.appendChild(makeText("small", details, "mt-0.5 block truncate text-[10px] font-semibold opacity-55"));

      const action = makeText("span", "Showroom · Reviews", "shrink-0 text-[10px] font-black underline underline-offset-4");
      bar.append(avatar, copy, action);
      bar.addEventListener("click", (event) => openShowroom(event, row.dealership_slug!));
      bar.addEventListener("keydown", (event) => {
        if (!(event instanceof KeyboardEvent) || (event.key !== "Enter" && event.key !== " ")) return;
        openShowroom(event, row.dealership_slug!);
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
          if (row.id && row.dealership_id && row.dealership_slug && row.dealership_name) rows.set(String(row.id), row);
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
