"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PIN_KEY = "loadlink-pinned-conversations-v1";
const PIN_META_KEY = "loadlink-pinned-conversation-meta-v1";
const DISTANCE_ENABLED_KEY = "loadlink-distance-enabled-v1";
const DISTANCE_DISMISSED_KEY = "loadlink-distance-prompt-dismissed-v1";

type PinMeta = Record<string, { name: string; avatar?: string; savedAt?: string }>;
type MarketResult = { available?: boolean; sample_count?: number; low_cents?: number; recommended_cents?: number; high_cents?: number; confidence?: string; reason?: string; basis?: string };

type MarketSnapshot = { mode: string; brand: string; model: string; year: number; condition: string; mileage: number | null; bodyType: string };

function readPinIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(PIN_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  } catch { return []; }
}

function readPinMeta(): PinMeta {
  try { return JSON.parse(localStorage.getItem(PIN_META_KEY) || "{}") || {}; } catch { return {}; }
}

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  return params.get("thread") || params.get("conversation") || "";
}

function currentChatIdentity() {
  const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
  const image = header?.querySelector<HTMLImageElement>("img");
  const name = Array.from(header?.querySelectorAll<HTMLElement>("h1,h2,h3,strong") || [])
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .find((value) => value && value.length < 80 && !/activity status|search|loadlink/i.test(value)) || "Pinned chat";
  return { name, avatar: image?.currentSrc || image?.src || "" };
}

function normaliseOffer(value: string) {
  const text = value.trim().toLowerCase();
  if (text.includes("sale or rental")) return "SALE OR RENTAL";
  if (text.includes("rental")) return "FOR RENT";
  if (text.includes("sale")) return "FOR SALE";
  if (text.includes("poa")) return "POA";
  return value;
}

function findOfferSelect() {
  return Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
    const values = Array.from(select.options).map((option) => option.value.toLowerCase());
    return values.includes("sale") && values.includes("rental");
  }) || null;
}

function controlByLabel(pattern: RegExp) {
  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const text = (label.textContent || "").replace(/\s+/g, " ").trim();
    if (!pattern.test(text)) continue;
    const control = label.querySelector<HTMLInputElement | HTMLSelectElement>("input,select");
    if (control) return control;
  }
  return null;
}

function marketSnapshot(): MarketSnapshot | null {
  const offer = findOfferSelect();
  if (!offer) return null;
  const brand = controlByLabel(/^Make \/ manufacturer/i)?.value?.trim() || "";
  const model = controlByLabel(/^Model$/i)?.value?.trim() || "";
  const year = Number(controlByLabel(/Registration \/ model year/i)?.value || 0);
  const condition = controlByLabel(/^Condition$/i)?.value?.trim() || "Good";
  const mileageRaw = Number(controlByLabel(/Mileage \/ usage/i)?.value || NaN);
  const bodyType = controlByLabel(/^(Body type|Type)$/i)?.value?.trim() || "";
  return { mode: offer.value, brand, model, year, condition, mileage: Number.isFinite(mileageRaw) ? mileageRaw : null, bodyType };
}

function moneyFromCents(cents?: number) {
  if (!Number.isFinite(Number(cents))) return "—";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(cents) / 100);
}

export default function LoadLinkFinalProductPass20260823() {
  const pathname = usePathname();
  const [pinHost, setPinHost] = useState<HTMLElement | null>(null);
  const [pinIds, setPinIds] = useState<string[]>([]);
  const [pinMeta, setPinMeta] = useState<PinMeta>({});
  const [messageViewport, setMessageViewport] = useState<HTMLElement | null>(null);
  const [showDown, setShowDown] = useState(false);
  const [marketHost, setMarketHost] = useState<HTMLElement | null>(null);
  const [market, setMarket] = useState<MarketResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketInput, setMarketInput] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) { setPinHost(null); setMessageViewport(null); return; }
    let alive = true;
    let timer = 0;
    const syncPins = () => { if (alive) { setPinIds(readPinIds()); setPinMeta(readPinMeta()); } };
    const mount = () => {
      document.querySelectorAll<HTMLElement>("[data-loadlink-chat-dealer-status-host]").forEach((node) => node.remove());
      const panel = document.querySelector<HTMLElement>(".loadlink-inbox-panel");
      const header = panel?.firstElementChild as HTMLElement | null;
      if (panel && header) {
        let host = panel.querySelector<HTMLElement>(":scope > [data-loadlink-pinned-chats-host]");
        if (!host) {
          host = document.createElement("div");
          host.dataset.loadlinkPinnedChatsHost = "true";
          header.insertAdjacentElement("afterend", host);
        }
        if (alive) setPinHost(host);
      }
      const viewport = document.querySelector<HTMLElement>(".loadlink-message-viewport");
      if (alive && viewport) setMessageViewport(viewport);
    };
    const capturePinMeta = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-loadlink-pin-chat]") : null;
      if (!target) return;
      window.setTimeout(() => {
        const ids = readPinIds();
        const thread = currentThread();
        const meta = readPinMeta();
        if (thread && ids.includes(thread)) meta[thread] = { ...currentChatIdentity(), savedAt: new Date().toISOString() };
        else if (thread) delete meta[thread];
        localStorage.setItem(PIN_META_KEY, JSON.stringify(meta));
        window.dispatchEvent(new Event("loadlink-pins-updated"));
      }, 20);
    };
    mount(); syncPins();
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(mount, 80); });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", capturePinMeta);
    window.addEventListener("storage", syncPins);
    window.addEventListener("loadlink-pins-updated", syncPins);
    return () => { alive = false; observer.disconnect(); window.clearTimeout(timer); document.removeEventListener("click", capturePinMeta); window.removeEventListener("storage", syncPins); window.removeEventListener("loadlink-pins-updated", syncPins); };
  }, [pathname]);

  useEffect(() => {
    const viewport = messageViewport;
    if (!viewport) { setShowDown(false); return; }
    const update = () => setShowDown(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 180);
    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const observer = new MutationObserver(update); observer.observe(viewport, { childList: true, subtree: true });
    window.addEventListener("loadlink-call-history-updated", update);
    return () => { viewport.removeEventListener("scroll", update); observer.disconnect(); window.removeEventListener("loadlink-call-history-updated", update); };
  }, [messageViewport]);

  useEffect(() => {
    if (!pathname.startsWith("/list-your-vehicle")) { setMarketHost(null); setMarket(null); return; }
    let alive = true;
    let debounce = 0;
    const mount = () => {
      const offer = findOfferSelect();
      if (!offer) return;
      let host = document.querySelector<HTMLElement>("[data-loadlink-market-guide-host]");
      if (!host) {
        host = document.createElement("div");
        host.dataset.loadlinkMarketGuideHost = "true";
        (offer.closest("label") || offer.parentElement)?.insertAdjacentElement("afterend", host);
      }
      if (alive) setMarketHost(host);
      const next = marketSnapshot();
      if (alive) setMarketInput(next);
    };
    const changed = () => { window.clearTimeout(debounce); debounce = window.setTimeout(mount, 220); };
    mount();
    const observer = new MutationObserver(changed); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", changed, true); document.addEventListener("change", changed, true);
    return () => { alive = false; observer.disconnect(); window.clearTimeout(debounce); document.removeEventListener("input", changed, true); document.removeEventListener("change", changed, true); };
  }, [pathname]);

  const marketKey = useMemo(() => marketInput ? JSON.stringify(marketInput) : "", [marketInput]);
  useEffect(() => {
    if (!marketInput || !["sale", "sale_or_rental"].includes(marketInput.mode) || !marketInput.brand || !marketInput.model || !marketInput.year) { setMarket(null); return; }
    let alive = true;
    const timer = window.setTimeout(() => {
      setMarketLoading(true);
      void supabase.rpc("loadlink_vehicle_market_recommendation", {
        p_brand: marketInput.brand,
        p_model: marketInput.model,
        p_year: marketInput.year,
        p_condition: marketInput.condition,
        p_odometer_km: marketInput.mileage,
        p_body_type: marketInput.bodyType || null,
      }).then(({ data, error }) => {
        if (!alive) return;
        setMarket(error ? { available: false, reason: "Market guide is temporarily unavailable." } : (data as MarketResult));
      }).finally(() => alive && setMarketLoading(false));
    }, 450);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [marketKey]);

  useEffect(() => {
    const approved = localStorage.getItem(DISTANCE_ENABLED_KEY) === "true";
    const dismissed = localStorage.getItem(DISTANCE_DISMISSED_KEY) === "true";
    let timer = 0;
    const repair = () => {
      const control = document.querySelector<HTMLElement>("[data-loadlink-distance-control='true']");
      if (!control) return;
      if (localStorage.getItem(DISTANCE_ENABLED_KEY) === "true" || localStorage.getItem(DISTANCE_DISMISSED_KEY) === "true") {
        control.style.display = "none";
        return;
      }
      control.style.display = "flex";
      if (!control.querySelector("[data-loadlink-location-dismiss]")) {
        const close = document.createElement("button");
        close.type = "button"; close.dataset.loadlinkLocationDismiss = "true"; close.setAttribute("aria-label", "Close location prompt"); close.textContent = "×";
        close.className = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/10 text-base font-black opacity-60";
        close.addEventListener("click", () => { localStorage.setItem(DISTANCE_DISMISSED_KEY, "true"); control.style.display = "none"; });
        control.appendChild(close);
      }
      const use = Array.from(control.querySelectorAll<HTMLButtonElement>("button")).find((button) => /use my location/i.test(button.textContent || ""));
      if (use && !use.dataset.loadlinkAutoHideBound) {
        use.dataset.loadlinkAutoHideBound = "true";
        use.addEventListener("click", () => {
          window.setTimeout(() => { if (localStorage.getItem(DISTANCE_ENABLED_KEY) === "true") control.style.display = "none"; }, 900);
          window.setTimeout(() => { if (localStorage.getItem(DISTANCE_ENABLED_KEY) === "true") control.style.display = "none"; }, 2500);
        });
      }
    };
    if (!approved && !dismissed) repair(); else repair();
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(repair, 100); }); observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/vehicles") && pathname !== "/list-your-vehicle") return;
    const apply = () => {
      document.querySelectorAll<HTMLElement>("[data-loadlink-vehicle-card='true']").forEach((card) => {
        Array.from(card.querySelectorAll<HTMLElement>("span")).forEach((span) => {
          const next = normaliseOffer(span.textContent || "");
          if (["FOR SALE","FOR RENT","SALE OR RENTAL","POA"].includes(next)) { span.textContent = next; span.dataset.loadlinkOfferBadge = "true"; }
        });
      });
      document.querySelectorAll<HTMLElement>("dt").forEach((dt) => {
        if ((dt.textContent || "").trim().toLowerCase() !== "offer") return;
        const dd = dt.parentElement?.querySelector<HTMLElement>("dd"); if (!dd) return;
        dd.textContent = normaliseOffer(dd.textContent || ""); dd.dataset.loadlinkOfferDetail = "true";
      });
    };
    apply(); const observer = new MutationObserver(apply); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect();
  }, [pathname]);

  return <>
    {pinHost ? createPortal(<section className="border-b border-current/10 px-4 py-3" data-loadlink-pinned-chat-rail="true"><div className="flex items-center justify-between gap-3"><strong className="text-[10px] font-black uppercase tracking-[.13em] opacity-45">Pinned chats</strong><span className="text-[9px] font-bold opacity-35">{pinIds.length ? `${pinIds.length} pinned` : "Pin from chat info"}</span></div>{pinIds.length ? <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">{pinIds.map((id) => { const meta = pinMeta[id]; return <button key={id} type="button" onClick={() => window.location.assign(`/messages?thread=${encodeURIComponent(id)}&conversation=${encodeURIComponent(id)}`)} className="flex min-w-[154px] max-w-[210px] items-center gap-2 rounded-2xl border border-current/10 bg-current/[.035] p-2.5 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-current/10 text-[10px] font-black">{meta?.avatar ? <img src={meta.avatar} alt="" className="h-full w-full object-cover" /> : (meta?.name || "P").slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-black">{meta?.name || "Pinned chat"}</span><span className="mt-0.5 block text-[9px] font-bold opacity-40">Open conversation</span></span></button>; })}</div> : null}</section>, pinHost) : null}

    {showDown && messageViewport && typeof document !== "undefined" ? createPortal(<button type="button" aria-label="Scroll to latest message" onClick={() => { messageViewport.scrollTo({ top: messageViewport.scrollHeight, behavior: "smooth" }); setShowDown(false); }} className="fixed bottom-[calc(env(safe-area-inset-bottom)+94px)] right-5 z-[2147481200] flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-[0_12px_35px_rgba(0,0,0,.22)] backdrop-blur-xl dark:border-white/10 dark:bg-[#181818] dark:text-white"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>, document.body) : null}

    {marketHost && marketInput && ["sale","sale_or_rental"].includes(marketInput.mode) ? createPortal(<div className="mt-3 rounded-[18px] border border-[#f6b800]/35 bg-[#f6b800]/[.07] p-4" data-loadlink-market-guide="true"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#a87a00]">LoadLink market guide</p><h4 className="mt-1 text-sm font-black">Suggested sale range</h4></div>{market?.confidence ? <span className="rounded-full border border-current/10 px-2.5 py-1 text-[9px] font-black uppercase opacity-55">{market.confidence} confidence</span> : null}</div>{marketLoading ? <p className="mt-3 text-xs font-semibold opacity-55">Comparing approved LoadLink vehicles…</p> : market?.available ? <><div className="mt-3 grid grid-cols-3 gap-2"><div><span className="block text-[9px] font-black uppercase opacity-40">Low</span><strong className="mt-1 block text-sm">{moneyFromCents(market.low_cents)}</strong></div><div><span className="block text-[9px] font-black uppercase opacity-40">Recommended</span><strong className="mt-1 block text-sm text-[#a87a00]">{moneyFromCents(market.recommended_cents)}</strong></div><div><span className="block text-[9px] font-black uppercase opacity-40">High</span><strong className="mt-1 block text-sm">{moneyFromCents(market.high_cents)}</strong></div></div><p className="mt-3 text-[10px] font-semibold leading-4 opacity-45">Based on {market.sample_count} approved comparable sale listing{market.sample_count === 1 ? "" : "s"}, adjusted for model year, condition, body type and mileage. This is guidance, not a guaranteed selling price.</p></> : <p className="mt-3 text-xs font-semibold leading-5 opacity-55">{market?.reason || "Choose the make, model and year to see a market recommendation."}</p>}</div>, marketHost) : null}

    <style jsx global>{`
      [data-loadlink-offer-badge="true"]{letter-spacing:.1em!important;font-size:9px!important;font-weight:900!important}
      [data-loadlink-offer-detail="true"]{display:inline-flex!important;width:auto!important;border-radius:999px!important;background:#f6b800!important;color:#050505!important;padding:6px 10px!important;font-size:11px!important;text-transform:uppercase!important;letter-spacing:.08em!important}
      [data-loadlink-call-active="true"]{background:radial-gradient(circle at 50% 22%,rgba(246,184,0,.14),transparent 25%),linear-gradient(180deg,#111 0%,#050505 58%,#000 100%)!important}
      [data-loadlink-call-active="true"] section{max-width:470px!important;padding-left:24px!important;padding-right:24px!important}
      [data-loadlink-call-active="true"] [data-loadlink-call-avatar="true"]{width:128px!important;height:128px!important;border-width:2px!important;box-shadow:0 0 0 10px rgba(246,184,0,.05),0 30px 70px rgba(0,0,0,.45)!important}
      [data-loadlink-call-active="true"] h2{font-size:34px!important;letter-spacing:-.045em!important}
      [data-loadlink-call-active="true"] .grid.grid-cols-3{gap:14px!important}
      [data-loadlink-call-active="true"] .grid.grid-cols-3>button{min-height:96px!important;border-radius:28px!important;background:rgba(255,255,255,.06)!important;backdrop-filter:blur(18px)!important}
      [data-loadlink-call-active="true"] .grid.grid-cols-3>button:hover{background:rgba(255,255,255,.09)!important}
      [data-loadlink-call-chooser="true"] section,[data-loadlink-call-incoming="true"] section{border-radius:32px!important;background:linear-gradient(180deg,rgba(25,25,25,.98),rgba(8,8,8,.98))!important;box-shadow:0 30px 100px rgba(0,0,0,.65)!important}
      [data-loadlink-call-minimized="true"]{border-radius:22px!important;padding:10px 12px!important;box-shadow:0 18px 55px rgba(0,0,0,.28)!important}
      .ll-final-call-history{max-width:768px;margin:4px auto 8px;display:grid;gap:8px}.ll-final-call-event{display:flex;align-items:center;gap:10px;border-radius:16px;padding:10px 12px;background:rgba(127,127,127,.075);border:1px solid rgba(127,127,127,.12)}.ll-final-call-icon{display:flex;width:34px;height:34px;flex:0 0 34px;align-items:center;justify-content:center;border-radius:50%;background:rgba(246,184,0,.14);color:#b88900}.ll-final-call-event-copy{min-width:0}.ll-final-call-event-copy strong{display:block;font-size:12px;line-height:1.3}.ll-final-call-event-copy small{display:block;margin-top:3px;font-size:10px;opacity:.48}
    `}</style>
  </>;
}
