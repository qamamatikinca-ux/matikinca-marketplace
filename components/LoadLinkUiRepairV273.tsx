"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SEEN_KEY = "loadlink-seen-listings-v2";

function repairContractLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/list?mode=contract"]').forEach((link) => {
    link.href = link.href.replace("mode=contract", "type=contract");
  });
}

function readSeen() {
  const seen = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    if (Array.isArray(saved)) saved.forEach((id) => id && seen.add(String(id)));
  } catch {}
  try {
    const recent = JSON.parse(localStorage.getItem("loadlink-recent-viewed-jobs") || "[]");
    if (Array.isArray(recent)) recent.forEach((item) => item?.id && seen.add(String(item.id)));
  } catch {}
  return seen;
}

function markSeen(id: string) {
  if (!id) return;
  const seen = readSeen();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
  window.dispatchEvent(new Event("loadlink-seen-listings-updated"));
}

function listingIdFromHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/^\/listing\/([^/?#]+)/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function ensureSeenBadge(media: HTMLElement, id: string) {
  if (!id || !readSeen().has(id)) return;
  if (media.querySelector('[data-loadlink-seen-badge="true"]')) return;
  if (getComputedStyle(media).position === "static") media.style.position = "relative";
  const badge = document.createElement("span");
  badge.dataset.loadlinkSeenBadge = "true";
  badge.textContent = "Seen";
  badge.setAttribute("aria-label", "Seen listing");
  badge.className = "loadlink-seen-post-badge";
  media.appendChild(badge);
}

function repairSeenListings() {
  const seen = readSeen();

  document.querySelectorAll<HTMLAnchorElement>('a[href*="/listing/"]').forEach((link) => {
    const id = listingIdFromHref(link.href);
    if (!id || !seen.has(id)) return;
    const media = link.querySelector<HTMLElement>("img")?.parentElement || link;
    ensureSeenBadge(media, id);
  });

  document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
    const id = article.id.replace(/^job-/, "");
    if (!id || !seen.has(id)) return;
    const media = article.querySelector<HTMLElement>('[role="button"]') || article.querySelector<HTMLElement>("img")?.parentElement;
    if (media) ensureSeenBadge(media, id);
  });
}

function captureSeenClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const listingLink = target.closest<HTMLAnchorElement>('a[href*="/listing/"]');
  if (listingLink) {
    const id = listingIdFromHref(listingLink.href);
    if (id) markSeen(id);
    window.requestAnimationFrame(repairSeenListings);
    return;
  }

  const card = target.closest<HTMLElement>('article[id^="job-"]');
  if (!card) return;
  const id = card.id.replace(/^job-/, "");
  const photoOpen = Boolean(target.closest('[role="button"]'));
  const summary = target.closest("summary");
  const detailsOpen = Boolean(summary && /view full details/i.test(summary.textContent || ""));
  if (!photoOpen && !detailsOpen) return;
  markSeen(id);
  window.requestAnimationFrame(repairSeenListings);
}

function repairDealerPackage() {
  if (!window.location.pathname.startsWith("/packages") && !window.location.pathname.startsWith("/list-your-vehicle")) return;
  const cards = [...document.querySelectorAll<HTMLElement>("article")];
  const dealer = cards.find((card) => /^\s*Dealer\s*$/i.test(card.querySelector("h3")?.textContent || ""));
  const list = dealer?.querySelector("ul");
  if (!dealer || !list) return;
  const add = (label: string) => {
    if ((dealer.textContent || "").toLowerCase().includes(label.toLowerCase())) return;
    const li = document.createElement("li");
    li.className = "flex gap-2 text-[11px] font-semibold";
    li.innerHTML = '<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]"></span>' + label;
    list.appendChild(li);
  };
  add("Public dealership opening times");
  add("Verified customer reviews");
}

function repairDealerProfile() {
  if (!window.location.pathname.startsWith("/dealership/")) return;
  if (document.querySelector('[data-loadlink-dealer-business-info="true"]')) return;
  const main = document.querySelector("main");
  if (!main) return;
  const section = document.createElement("section");
  section.dataset.loadlinkDealerBusinessInfo = "true";
  section.className = "loadlink-dealer-business-info";
  section.innerHTML = `
    <div class="loadlink-dealer-business-grid">
      <article class="loadlink-dealer-business-card">
        <div class="loadlink-dealer-card-kicker">Opening times</div>
        <h2>Showroom hours</h2>
        <div class="loadlink-hours-grid" aria-label="Dealership opening times">
          <span>Monday – Friday</span><strong>08:00 – 17:00</strong>
          <span>Saturday</span><strong>08:00 – 13:00</strong>
          <span>Sunday</span><strong>Closed</strong>
        </div>
        <p>Dealer accounts can publish their own trading hours on the public showroom.</p>
      </article>
      <article class="loadlink-dealer-business-card">
        <div class="loadlink-dealer-card-kicker">Reviews</div>
        <div class="loadlink-review-heading"><h2>Customer reviews</h2><strong>Dealer</strong></div>
        <p>Verified customers can review a dealership after a genuine LoadLink interaction. Reviews stay attached to the dealership profile rather than one stock card.</p>
        <button type="button" data-loadlink-review-action="true">Write a review</button>
      </article>
    </div>`;
  const firstContentSection = main.querySelector("section:nth-of-type(2)");
  if (firstContentSection?.nextSibling) main.insertBefore(section, firstContentSection.nextSibling);
  else main.appendChild(section);
}

function ensureStyles() {
  if (document.getElementById("loadlink-v278-ui-repair")) return;
  const style = document.createElement("style");
  style.id = "loadlink-v278-ui-repair";
  style.textContent = `
.loadlink-chat-header button[aria-label="View latest dealer update"]{padding:0!important;background:transparent!important;overflow:visible!important}
.loadlink-chat-header button[aria-label="View latest dealer update"]>span{width:100%!important;height:100%!important;padding:0!important;background:transparent!important;border-radius:999px!important}
.loadlink-chat-header button[aria-label="View latest dealer update"] [aria-label$="profile picture"]{width:100%!important;height:100%!important}
[aria-label$="profile picture"]>span{background:transparent!important}
.loadlink-seen-post-badge{position:absolute!important;top:12px!important;right:12px!important;z-index:20!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:9px!important;background:rgba(18,18,18,.78)!important;color:#fff!important;padding:8px 13px!important;font-size:12px!important;font-weight:700!important;line-height:1!important;letter-spacing:0!important;box-shadow:0 6px 18px rgba(0,0,0,.2)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}
.loadlink-dealer-business-info{padding:28px 20px;border-bottom:1px solid rgba(0,0,0,.08)}
.loadlink-dealer-business-grid{width:min(100%,1216px);margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.loadlink-dealer-business-card{border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.78);border-radius:24px;padding:22px;box-shadow:0 12px 34px rgba(0,0,0,.05)}
.loadlink-dealer-card-kicker{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#9a7300}
.loadlink-dealer-business-card h2{margin:8px 0 0;font-size:24px;font-weight:900;letter-spacing:-.035em}
.loadlink-dealer-business-card p{margin:13px 0 0;font-size:13px;font-weight:600;line-height:1.65;color:rgba(0,0,0,.58)}
.loadlink-hours-grid{margin-top:18px;display:grid;grid-template-columns:1fr auto;gap:10px 18px;font-size:13px}.loadlink-hours-grid strong{font-weight:900}
.loadlink-review-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.loadlink-review-heading>strong{border-radius:999px;background:#f6b800;color:#000;padding:6px 9px;font-size:9px;text-transform:uppercase}
.loadlink-dealer-business-card button{margin-top:18px;height:42px;border:0;border-radius:12px;background:#f6b800;color:#000;padding:0 16px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
html[data-loadlink-theme="dark"] .loadlink-dealer-business-info{border-color:rgba(255,255,255,.1)}html[data-loadlink-theme="dark"] .loadlink-dealer-business-card{border-color:rgba(255,255,255,.11);background:rgba(13,13,13,.92);color:#fff}html[data-loadlink-theme="dark"] .loadlink-dealer-business-card p{color:rgba(255,255,255,.58)}
@media(max-width:720px){.loadlink-dealer-business-grid{grid-template-columns:1fr}.loadlink-dealer-business-info{padding:20px 16px}}
`;
  document.head.appendChild(style);
}

function runRepairs() {
  ensureStyles();
  repairContractLinks();
  repairSeenListings();
  repairDealerPackage();
  repairDealerProfile();
}

export default function LoadLinkUiRepairV273() {
  const pathname = usePathname();

  useEffect(() => {
    runRepairs();
    const observer = new MutationObserver(() => runRepairs());
    observer.observe(document.body, { childList: true, subtree: true });
    const seenRefresh = () => runRepairs();
    document.addEventListener("click", captureSeenClick, true);
    window.addEventListener("loadlink-seen-listings-updated", seenRefresh);
    window.addEventListener("loadlink-recent-activity-updated", seenRefresh);
    const frame = window.requestAnimationFrame(runRepairs);
    const timer = window.setTimeout(runRepairs, 350);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", captureSeenClick, true);
      window.removeEventListener("loadlink-seen-listings-updated", seenRefresh);
      window.removeEventListener("loadlink-recent-activity-updated", seenRefresh);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    const body = document.body;
    body.dataset.loadlinkPath = pathname || "/";
    return () => { delete body.dataset.loadlinkPath; };
  }, [pathname]);

  return null;
}
