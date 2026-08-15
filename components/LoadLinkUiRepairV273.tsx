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
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    return new Set<string>(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function markSeen(id: string) {
  if (!id) return;
  const seen = readSeen();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
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

function ensureSeenBadge(link: HTMLAnchorElement, id: string) {
  if (!id || !readSeen().has(id)) return;
  if (link.querySelector('[data-loadlink-seen-badge="true"]')) return;
  const media = link.querySelector<HTMLElement>("img")?.parentElement || link;
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
    if (!id) return;
    if (!link.dataset.loadlinkSeenBound) {
      link.dataset.loadlinkSeenBound = "true";
      link.addEventListener("click", () => {
        markSeen(id);
      });
    }
    if (seen.has(id)) ensureSeenBadge(link, id);
  });
}

function repairVehiclePortal() {
  if (!window.location.pathname.startsWith("/list-your-vehicle")) return;
  const headings = [...document.querySelectorAll<HTMLElement>("h1")];
  const heroHeading = headings.find((node) => /find a vehicle|add stock/i.test(node.textContent || ""));
  const hero = heroHeading?.closest("section");
  if (!hero) return;
  const controls = [...hero.querySelectorAll<HTMLElement>("a,button")];
  const browse = controls.find((node) => /browse available stock|view available vehicles/i.test(node.textContent || ""));
  const listVehicle = controls.find((node) => /^\s*list your vehicle\s*$/i.test(node.textContent || ""));
  const listUnit = controls.find((node) => /list a mobile unit/i.test(node.textContent || ""));
  const parent = listVehicle?.parentElement;
  if (!parent || !browse || !listVehicle || !listUnit) return;
  browse.textContent = "View available vehicles";
  browse.className = listVehicle.className;
  listVehicle.className = listUnit.className;
  parent.insertBefore(browse, parent.firstChild);
  if (!parent.dataset.loadlinkDriverHierarchy) parent.dataset.loadlinkDriverHierarchy = "true";
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
        <p>Dealerships can publish their own verified trading hours from their Dealer profile settings.</p>
      </article>
      <article class="loadlink-dealer-business-card">
        <div class="loadlink-dealer-card-kicker">Reviews</div>
        <div class="loadlink-review-heading"><h2>Customer reviews</h2><strong>New</strong></div>
        <p>Verified LoadLink customers can review a dealership after a genuine enquiry or transaction. Reviews are tied to the dealership profile rather than individual stock cards.</p>
        <button type="button" data-loadlink-review-action="true">Write a review</button>
      </article>
    </div>`;
  const firstContentSection = main.querySelector("section:nth-of-type(2)");
  if (firstContentSection?.nextSibling) main.insertBefore(section, firstContentSection.nextSibling);
  else main.appendChild(section);
  section.querySelector<HTMLButtonElement>('[data-loadlink-review-action="true"]')?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("loadlink-toast", { detail: { message: "Reviews are available to verified customers after a genuine LoadLink interaction." } }));
  });
}

function ensureStyles() {
  if (document.getElementById("loadlink-v276-ui-repair")) return;
  const style = document.createElement("style");
  style.id = "loadlink-v276-ui-repair";
  style.textContent = `
.loadlink-chat-header button[aria-label="View latest dealer update"]{padding:0!important;background:transparent!important;overflow:visible!important}
.loadlink-chat-header button[aria-label="View latest dealer update"]>span{width:100%!important;height:100%!important;padding:0!important;background:transparent!important;border-radius:999px!important}
.loadlink-chat-header button[aria-label="View latest dealer update"] [aria-label$="profile picture"]{width:100%!important;height:100%!important}
[aria-label$="profile picture"]>span{background:transparent!important}

/* Homepage portal photography stays full-cover; only the section and CTA controls become neater. */
body[data-loadlink-path="/"] section[aria-label="LoadLink portals"]>div>a{height:330px!important;min-height:330px!important}
body[data-loadlink-path="/"] section[aria-label="LoadLink portals"]>div>a img{width:100%!important;height:100%!important;object-fit:cover!important;transform:none!important}
body[data-loadlink-path="/"] section[aria-label="LoadLink portals"]>div>a>div.relative.z-10>div{min-height:50px!important;width:min(72vw,390px)!important;padding:10px 20px!important;font-size:14px!important}
@media(min-width:768px){body[data-loadlink-path="/"] section[aria-label="LoadLink portals"]>div>a{height:420px!important;min-height:420px!important}body[data-loadlink-path="/"] section[aria-label="LoadLink portals"]>div>a>div.relative.z-10>div{min-height:58px!important;width:min(42vw,430px)!important;padding:12px 28px!important;font-size:16px!important}}

/* All / Jobs / Contracts / Vehicles stay visible but compact. */
[data-loadlink-marketplace-search-shell] [aria-label="Search category"] button{min-height:40px!important;min-width:86px!important;padding:8px 16px!important;font-size:13px!important}

.loadlink-seen-post-badge{position:absolute!important;top:12px!important;right:12px!important;z-index:8!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:12px!important;background:rgba(0,0,0,.72)!important;color:#fff!important;padding:7px 12px!important;font-size:12px!important;font-weight:600!important;line-height:1!important;letter-spacing:0!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important}

.loadlink-dealer-business-info{padding:28px 20px;border-bottom:1px solid rgba(0,0,0,.08)}
.loadlink-dealer-business-grid{width:min(100%,1216px);margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.loadlink-dealer-business-card{border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.78);border-radius:24px;padding:22px;box-shadow:0 12px 34px rgba(0,0,0,.05)}
.loadlink-dealer-card-kicker{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#9a7300}
.loadlink-dealer-business-card h2{margin:8px 0 0;font-size:24px;font-weight:900;letter-spacing:-.035em}
.loadlink-dealer-business-card p{margin:13px 0 0;font-size:13px;font-weight:600;line-height:1.65;color:rgba(0,0,0,.58)}
.loadlink-hours-grid{margin-top:18px;display:grid;grid-template-columns:1fr auto;gap:10px 18px;font-size:13px}
.loadlink-hours-grid strong{font-weight:900}
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
  repairVehiclePortal();
  repairDealerProfile();
}

export default function LoadLinkUiRepairV273() {
  const pathname = usePathname();

  useEffect(() => {
    runRepairs();
    const observer = new MutationObserver(() => runRepairs());
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(runRepairs);
    const shortTimer = window.setTimeout(runRepairs, 180);
    const longTimer = window.setTimeout(runRepairs, 700);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(longTimer);
    };
  }, [pathname]);

  useEffect(() => {
    const body = document.body;
    body.dataset.loadlinkPath = pathname || "/";
    return () => { delete body.dataset.loadlinkPath; };
  }, [pathname]);

  return null;
}
