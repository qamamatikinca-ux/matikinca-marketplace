"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ListingMeta = {
  id?: string | null;
  title?: string | null;
  city?: string | null;
  user_id?: string | null;
  package_type?: string | null;
  dealer_package_active?: boolean | null;
  dealership_slug?: string | null;
  dealership_showroom_available?: boolean | null;
};

type DealerPostingGate = {
  required?: boolean;
  complete?: boolean;
  missing?: string[];
};

const POLISH_STYLE_ID = "loadlink-marketplace-polish-style";
const OWNER_SHEET_ID = "loadlink-owner-post-sheet";
const DEALER_GATE_ID = "loadlink-dealer-profile-posting-gate";
const PROMOTED_CONTROLS_ID = "loadlink-promoted-carousel-controls";

function clean(value: unknown) {
  return String(value || "").trim();
}

function listingIdFromHref(href: string) {
  const match = href.match(/^\/listing\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function button(label: string, className: string) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.className = className;
  return node;
}

function installPolishStyles() {
  if (document.getElementById(POLISH_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POLISH_STYLE_ID;
  style.textContent = `
    html[data-loadlink-theme="dark"] [class*="bg-[#f6b800]/"] {
      background-color: rgba(246,184,0,.075) !important;
      border-color: rgba(246,184,0,.22) !important;
      -webkit-backdrop-filter: blur(18px) saturate(125%);
      backdrop-filter: blur(18px) saturate(125%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
    }
    #loadlink-promoted-carousel::-webkit-scrollbar { display: none; }
    [data-loadlink-mobile-more-menu="true"] { overscroll-behavior: contain; }
    input[data-loadlink-future-date="true"]::-webkit-date-and-time-value { text-align: left; }
  `;
  document.head.appendChild(style);
}

function removeOwnerSheet() {
  document.getElementById(OWNER_SHEET_ID)?.remove();
}

function showToast(title: string, message: string, kind: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent("loadlink:toast", {
    detail: { id: `marketplace-polish-${Date.now()}`, kind, title, message, duration: 5200 },
  }));
}

export default function MarketplaceUxPolishEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    installPolishStyles();
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let rows = new Map<string, ListingMeta>();
    let currentUserId = "";

    function rowForPromotedCard(card: HTMLElement) {
      const title = clean(card.querySelector("h3")?.textContent).toLowerCase();
      const city = clean(card.querySelector("p")?.textContent).split("·")[0].trim().toLowerCase();
      if (!title) return undefined;
      return Array.from(rows.values()).find((row) => clean(row.title).toLowerCase() === title && (!city || clean(row.city).toLowerCase() === city));
    }

    function addViewPostHint(card: HTMLElement) {
      if (card.querySelector("[data-loadlink-promoted-view-post]")) return;
      const content = card.querySelector<HTMLElement>("div.p-4") || card.lastElementChild as HTMLElement | null;
      if (!content) return;
      const hint = document.createElement("span");
      hint.dataset.loadlinkPromotedViewPost = "true";
      hint.className = "mt-3 inline-flex items-center text-[10px] font-black uppercase tracking-[.08em] opacity-62";
      hint.textContent = "View post →";
      content.appendChild(hint);
    }

    function applyPromotedCarousel() {
      if (pathname !== "/jobs") return;
      const heading = Array.from(document.querySelectorAll<HTMLElement>("h2")).find((node) => clean(node.textContent) === "Promoted listings");
      const sectionInner = heading?.parentElement;
      const rail = sectionInner?.children?.[1] as HTMLElement | undefined;
      if (!heading || !sectionInner || !rail) return;

      rail.id = "loadlink-promoted-carousel";
      rail.setAttribute("role", "region");
      rail.setAttribute("aria-label", "Promoted listings carousel");
      Object.assign(rail.style, {
        display: "flex",
        gridTemplateColumns: "none",
        gap: "12px",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        paddingBottom: "8px",
      });
      rail.style.setProperty("-webkit-overflow-scrolling", "touch");

      Array.from(rail.children).forEach((child) => {
        const card = child as HTMLElement;
        card.style.flex = window.innerWidth < 640 ? "0 0 min(86vw, 390px)" : "0 0 min(420px, 46vw)";
        card.style.scrollSnapAlign = "start";
        card.style.scrollSnapStop = "always";
        addViewPostHint(card);

        if (card.dataset.loadlinkExactPost === "true") return;
        const row = rowForPromotedCard(card);
        if (!row?.id) return;
        card.dataset.loadlinkExactPost = "true";
        card.setAttribute("aria-label", `View ${clean(row.title) || "promoted"} post`);
        card.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if ("stopImmediatePropagation" in event) event.stopImmediatePropagation();
          window.location.assign(`/listing/${encodeURIComponent(String(row.id))}`);
        }, true);
      });

      if (!document.getElementById(PROMOTED_CONTROLS_ID)) {
        const controls = document.createElement("div");
        controls.id = PROMOTED_CONTROLS_ID;
        controls.className = "mb-3 flex items-center justify-end gap-2";
        const previous = button("‹", "flex h-10 w-10 items-center justify-center rounded-full border border-current/15 bg-current/[.035] text-xl font-black backdrop-blur-xl");
        const next = button("›", "flex h-10 w-10 items-center justify-center rounded-full border border-current/15 bg-current/[.035] text-xl font-black backdrop-blur-xl");
        previous.setAttribute("aria-label", "Previous promoted listing");
        next.setAttribute("aria-label", "Next promoted listing");
        previous.addEventListener("click", () => rail.scrollBy({ left: -Math.max(280, rail.clientWidth * .86), behavior: "smooth" }));
        next.addEventListener("click", () => rail.scrollBy({ left: Math.max(280, rail.clientWidth * .86), behavior: "smooth" }));
        controls.append(previous, next);
        rail.insertAdjacentElement("beforebegin", controls);
      }
    }

    function addPublicViewPost(article: HTMLElement, id: string) {
      if (article.querySelector("[data-loadlink-public-view-post]")) return;
      const shareButton = Array.from(article.querySelectorAll<HTMLButtonElement>("button")).find((node) => clean(node.textContent).toLowerCase() === "share");
      const actionGrid = shareButton?.parentElement;
      if (!actionGrid) return;
      const link = document.createElement("a");
      link.dataset.loadlinkPublicViewPost = "true";
      link.href = `/listing/${encodeURIComponent(id)}`;
      link.className = "col-span-2 flex min-h-12 items-center justify-center border-t border-current/10 text-xs font-black uppercase tracking-[.06em]";
      link.textContent = "View post";
      actionGrid.appendChild(link);
    }

    async function deleteOwnedPost(row: ListingMeta, article?: HTMLElement | null) {
      if (!row.id || !window.confirm(`Delete “${clean(row.title) || "this post"}” permanently?`)) return;
      const result = await supabase.rpc("delete_my_listing", { p_listing_id: row.id, p_owner_key: "" });
      if (result.error || result.data !== true) {
        showToast("Post not deleted", result.error?.message || "LoadLink could not delete this post.", "error");
        return;
      }
      article?.remove();
      removeOwnerSheet();
      showToast("Post deleted", "The listing has been removed from LoadLink.");
    }

    function sheetAction(label: string, onClick: () => void, danger = false) {
      const node = button(label, `flex min-h-12 w-full items-center justify-between rounded-[16px] border px-4 text-left text-sm font-black ${danger ? "border-red-500/25 text-red-500" : "border-current/12"}`);
      node.addEventListener("click", onClick);
      return node;
    }

    function openOwnerSheet(row: ListingMeta, article: HTMLElement) {
      removeOwnerSheet();
      const overlay = document.createElement("div");
      overlay.id = OWNER_SHEET_ID;
      overlay.className = "fixed inset-0 z-[2147483500] flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center";
      overlay.addEventListener("click", (event) => { if (event.target === overlay) removeOwnerSheet(); });

      const sheet = document.createElement("section");
      sheet.className = "w-full max-w-md rounded-[26px] border border-white/12 bg-[#0b0b0b]/94 p-4 text-white shadow-2xl backdrop-blur-2xl";
      const header = document.createElement("div");
      header.className = "mb-4 flex items-start justify-between gap-3";
      const titleWrap = document.createElement("div");
      const eyebrow = document.createElement("div");
      eyebrow.className = "text-[9px] font-black uppercase tracking-[.12em] text-white/38";
      eyebrow.textContent = "Your post";
      const title = document.createElement("div");
      title.className = "mt-1 line-clamp-2 text-lg font-black";
      title.textContent = clean(row.title) || "LoadLink listing";
      titleWrap.append(eyebrow, title);
      const close = button("×", "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 text-xl");
      close.setAttribute("aria-label", "Close post actions");
      close.addEventListener("click", removeOwnerSheet);
      header.append(titleWrap, close);

      const actions = document.createElement("div");
      actions.className = "grid gap-2";
      actions.appendChild(sheetAction("View post", () => window.location.assign(`/listing/${encodeURIComponent(String(row.id))}`)));
      actions.appendChild(sheetAction("Edit post", () => window.location.assign(`/my-posts?edit=${encodeURIComponent(String(row.id))}`)));

      const packageType = clean(row.package_type).toLowerCase();
      if (["pro", "dealer"].includes(packageType)) {
        actions.appendChild(sheetAction("View analytics", () => window.location.assign(`/my-posts?analytics=${encodeURIComponent(String(row.id))}`)));
      }

      if (packageType === "dealer" || row.dealer_package_active) {
        actions.appendChild(sheetAction("Dealer workspace", () => window.location.assign("/dealer")));
        if (row.dealership_slug) {
          actions.appendChild(sheetAction("Dealership profile & reviews", () => window.location.assign(`/dealership/${encodeURIComponent(String(row.dealership_slug))}#reviews`)));
          if (row.dealership_showroom_available) actions.appendChild(sheetAction("Open showroom", () => window.location.assign(`/dealership/${encodeURIComponent(String(row.dealership_slug))}#showroom`)));
        }
      }

      actions.appendChild(sheetAction("Delete post", () => void deleteOwnedPost(row, article), true));
      sheet.append(header, actions);
      overlay.appendChild(sheet);
      document.body.appendChild(overlay);
    }

    function addOwnerControls(article: HTMLElement, row: ListingMeta) {
      if (!currentUserId || row.user_id !== currentUserId || !row.id || article.querySelector("[data-loadlink-owner-controls]")) return;
      const bar = document.createElement("div");
      bar.dataset.loadlinkOwnerControls = "true";
      bar.className = "m-4 mt-0 grid grid-cols-[1fr_1fr_auto] gap-2 rounded-[18px] border border-current/10 bg-current/[.025] p-2 backdrop-blur-xl";

      const view = document.createElement("a");
      view.href = `/listing/${encodeURIComponent(String(row.id))}`;
      view.className = "flex min-h-10 items-center justify-center rounded-[13px] border border-current/12 px-3 text-[11px] font-black";
      view.textContent = "View post";

      const edit = document.createElement("a");
      edit.href = `/my-posts?edit=${encodeURIComponent(String(row.id))}`;
      edit.className = "flex min-h-10 items-center justify-center rounded-[13px] bg-[#f6b800] px-3 text-[11px] font-black text-black";
      edit.textContent = "Edit post";

      const more = button("•••", "flex h-10 w-11 items-center justify-center rounded-[13px] border border-current/12 text-sm font-black");
      more.setAttribute("aria-label", "More options for your post");
      more.addEventListener("click", () => openOwnerSheet(row, article));
      bar.append(view, edit, more);
      article.appendChild(bar);
    }

    function applyJobsCards() {
      if (pathname !== "/jobs" || !rows.size) return;
      document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
        const id = article.id.replace(/^job-/, "");
        const row = rows.get(id);
        if (!row) return;
        addPublicViewPost(article, id);
        addOwnerControls(article, row);
      });
    }

    function applyMyPostsFixes() {
      if (pathname !== "/my-posts") return;
      document.querySelectorAll<HTMLElement>("article").forEach((article) => {
        const listingLink = article.querySelector<HTMLAnchorElement>('a[href^="/listing/"]');
        const id = listingIdFromHref(listingLink?.getAttribute("href") || "");
        if (id) article.id = `my-post-${id}`;
        article.style.overflow = "visible";

        if (listingLink && clean(listingLink.textContent) === "View") listingLink.textContent = "View post";

        const more = article.querySelector<HTMLDetailsElement>('details:has(summary[aria-label="More post actions"])');
        if (more) {
          more.style.position = "relative";
          const menu = more.querySelector<HTMLElement>("div.absolute");
          if (menu && window.innerWidth < 768) {
            menu.dataset.loadlinkMobileMoreMenu = "true";
            Object.assign(menu.style, {
              position: "fixed",
              left: "12px",
              right: "12px",
              bottom: "calc(env(safe-area-inset-bottom) + 12px)",
              top: "auto",
              width: "auto",
              maxHeight: "65dvh",
              overflowY: "auto",
              zIndex: "2147483400",
            });
          }
        }
      });

      document.querySelectorAll<HTMLElement>("button,span").forEach((node) => {
        if (clean(node.textContent) === "Seen" && node.closest("article")) node.style.display = "none";
      });
    }

    async function openMyPostsTarget() {
      if (pathname !== "/my-posts" || !isSupabaseConfigured) return;
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit") || "";
      const analyticsId = params.get("analytics") || "";
      const targetId = editId || analyticsId;
      if (!targetId) return;

      const auth = await supabase.auth.getUser();
      if (!auth.data.user || cancelled) return;

      const locate = () => document.getElementById(`my-post-${targetId}`);
      let card = locate();
      if (!card) {
        const result = await supabase
          .from("job_listings")
          .select("id,created_at,status")
          .eq("user_id", auth.data.user.id)
          .order("created_at", { ascending: false });
        const visible = (result.data || []).filter((item) => !["deleted", "removed"].includes(clean(item.status).toLowerCase()));
        const index = visible.findIndex((item) => item.id === targetId);
        const page = index >= 0 ? Math.floor(index / 7) + 1 : 1;
        if (page > 1) {
          const pager = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => clean(node.textContent) === String(page));
          pager?.click();
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          applyMyPostsFixes();
          card = locate();
        }
      }
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      if (editId) {
        const editButton = Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find((node) => /edit (post|& resubmit)/i.test(clean(node.textContent)));
        editButton?.click();
      } else if (analyticsId) {
        const details = card.querySelector<HTMLDetailsElement>('details:has(summary[aria-label="More post actions"])');
        if (details) details.open = true;
        const analyticsButton = Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find((node) => /analytics/i.test(clean(node.textContent)));
        analyticsButton?.click();
      }
      window.history.replaceState({}, "", "/my-posts");
    }

    function applyDateInputFix() {
      if (pathname !== "/jobs/list") return;
      document.querySelectorAll<HTMLInputElement>('input[type="date"][data-loadlink-future-date="true"]').forEach((input) => {
        input.style.width = "100%";
        input.style.minWidth = "0";
        input.style.maxWidth = "100%";
        input.style.fontSize = "16px";
        input.style.paddingRight = "12px";
        input.style.boxSizing = "border-box";
        input.style.setProperty("-webkit-appearance", "none");
        const customIcon = input.parentElement?.querySelector<HTMLElement>("span.pointer-events-none");
        if (customIcon) customIcon.style.display = "none";
      });
    }

    async function enforceDealerPostingProfile() {
      if (pathname !== "/jobs/list" || !isSupabaseConfigured || document.getElementById(DEALER_GATE_ID)) return;
      const auth = await supabase.auth.getUser();
      if (!auth.data.user || cancelled) return;
      const result = await supabase.rpc("loadlink_dealer_profile_posting_gate", { p_user_id: auth.data.user.id });
      const gate = result.data as DealerPostingGate | null;
      if (result.error || !gate?.required || gate.complete || cancelled) return;

      const overlay = document.createElement("div");
      overlay.id = DEALER_GATE_ID;
      overlay.className = "fixed inset-0 z-[2147483550] flex items-end bg-black/74 p-3 backdrop-blur-md sm:items-center sm:justify-center";
      const panel = document.createElement("section");
      panel.className = "w-full max-w-md rounded-[28px] border border-white/12 bg-[#0a0a0a]/94 p-5 text-white shadow-2xl backdrop-blur-2xl";
      const eyebrow = document.createElement("div");
      eyebrow.className = "text-[10px] font-black uppercase tracking-[.12em] text-white/40";
      eyebrow.textContent = "Dealer profile required";
      const title = document.createElement("h2");
      title.className = "mt-2 text-2xl font-black tracking-[-.035em]";
      title.textContent = "Finish your dealership profile before posting.";
      const copy = document.createElement("p");
      copy.className = "mt-3 text-sm font-semibold leading-6 text-white/60";
      copy.textContent = `Your Dealer package is active. Add ${gate.missing?.join(", ") || "the missing dealership information"} so customers can see real dealership details on your posts.`;
      const actions = document.createElement("div");
      actions.className = "mt-5 grid gap-2";
      const finish = document.createElement("a");
      finish.href = "/dealer?section=showroom";
      finish.className = "flex min-h-12 items-center justify-center rounded-[16px] bg-[#f6b800] px-4 text-sm font-black text-black";
      finish.textContent = "Finish Dealer profile";
      const back = document.createElement("a");
      back.href = "/jobs";
      back.className = "flex min-h-12 items-center justify-center rounded-[16px] border border-white/12 px-4 text-sm font-black text-white";
      back.textContent = "Back to marketplace";
      actions.append(finish, back);
      panel.append(eyebrow, title, copy, actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    }

    function modernizeSafetyFooter() {
      if (pathname !== "/") return;
      const title = Array.from(document.querySelectorAll<HTMLElement>("p")).find((node) => clean(node.textContent) === "Trade with confidence.");
      const card = title?.parentElement;
      if (card && !card.dataset.loadlinkSafetyModernized) {
        card.dataset.loadlinkSafetyModernized = "true";
        card.style.background = "transparent";
        card.style.border = "0";
        card.style.borderTop = "1px solid rgba(127,127,127,.18)";
        card.style.borderRadius = "0";
        card.style.boxShadow = "none";
        card.style.paddingLeft = "0";
        card.style.paddingRight = "0";
        card.style.backdropFilter = "none";
        title.classList.add("tracking-[-.02em]");
      }

      const socialLabels = new Set(["f", "X", "YT", "IG", "TT", "in"]);
      document.querySelectorAll<HTMLAnchorElement>("footer a").forEach((link) => {
        if (!socialLabels.has(clean(link.textContent))) return;
        link.style.width = "44px";
        link.style.height = "44px";
        link.style.borderRadius = "999px";
        link.style.background = "rgba(127,127,127,.07)";
        link.style.color = "inherit";
        link.style.border = "1px solid rgba(127,127,127,.18)";
        link.style.backdropFilter = "blur(14px)";
        link.style.boxShadow = "none";
      });
    }

    function scan() {
      if (cancelled) return;
      applyPromotedCarousel();
      applyJobsCards();
      applyMyPostsFixes();
      applyDateInputFix();
      modernizeSafetyFooter();
    }

    async function initialise() {
      if (isSupabaseConfigured) {
        const [listingsResponse, auth] = await Promise.all([
          fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
          supabase.auth.getUser().catch(() => ({ data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>)),
        ]);
        if (cancelled) return;
        currentUserId = auth.data.user?.id || "";
        ((listingsResponse?.rows || []) as ListingMeta[]).forEach((row) => { if (row.id) rows.set(String(row.id), row); });
      }

      scan();
      void enforceDealerPostingProfile();
      if (pathname === "/my-posts") window.setTimeout(() => void openMyPostsTarget(), 320);
      observer = new MutationObserver(scan);
      observer.observe(document.body, { childList: true, subtree: true });
      window.addEventListener("loadlink-theme-change", scan);
    }

    void initialise();
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("loadlink-theme-change", scan);
      removeOwnerSheet();
      document.getElementById(DEALER_GATE_ID)?.remove();
      document.getElementById(PROMOTED_CONTROLS_ID)?.remove();
    };
  }, [pathname]);

  return null;
}
