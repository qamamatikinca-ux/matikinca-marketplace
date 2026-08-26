"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type Identity = { year: string; brand: string; model: string };

function controlForLabel(pattern: RegExp) {
  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const text = (label.textContent || "").replace(/\s+/g, " ").trim();
    if (!pattern.test(text)) continue;
    const control = label.querySelector<HTMLSelectElement | HTMLInputElement>("select,input");
    if (control) return control;
  }
  return null;
}

function byNameOrPlaceholder(pattern: RegExp) {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select")).find((control) => pattern.test(`${control.name || ""} ${control.id || ""} ${control.getAttribute("placeholder") || ""}`));
}

function readIdentity(): Identity | null {
  const year = (controlForLabel(/(Registration \/ model year|model year|year)/i) || byNameOrPlaceholder(/year/i))?.value?.trim() || "";
  const brand = (controlForLabel(/(Make \/ manufacturer|manufacturer|make|brand)/i) || byNameOrPlaceholder(/make|brand|manufacturer/i))?.value?.trim() || "";
  const model = (controlForLabel(/^Model$/i) || byNameOrPlaceholder(/model/i))?.value?.trim() || "";
  if (!brand && !model) return null;
  return { year, brand, model };
}

function ensureHost() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => /confirm truck model|confirm model|truck model/i.test(node.textContent || ""));
  const container = button?.parentElement || controlForLabel(/(Make \/ manufacturer|manufacturer|make|brand)/i)?.closest("section") || null;
  if (!container) return null;
  let host = container.querySelector<HTMLElement>(":scope > [data-loadlink-truck-reference-gallery-host]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.loadlinkTruckReferenceGalleryHost = "true";
    container.appendChild(host);
  }
  container.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
    figure.dataset.loadlinkNativeTruckReference = "true";
    figure.style.display = "";
    figure.style.opacity = "1";
    figure.style.visibility = "visible";
  });
  return host;
}

export default function LoadLinkTruckReferenceGallery20260824() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/list-your-vehicle") && !pathname.startsWith("/list-your-truck")) return;
    let timer = 0;
    const sync = () => { setHost(ensureHost()); setIdentity(readIdentity()); };
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(sync, 160); };
    sync();
    document.addEventListener("change", schedule, true);
    document.addEventListener("input", schedule, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => { document.removeEventListener("change", schedule, true); document.removeEventListener("input", schedule, true); observer.disconnect(); window.clearTimeout(timer); };
  }, [pathname]);

  if (!host || !identity) return null;
  const complete = Boolean(identity.brand && identity.model);

  return createPortal(
    <div data-loadlink-truck-reference-gallery="20260826-resilient" className="mt-4 rounded-[16px] border border-current/10 bg-current/[.022] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.11em] opacity-40">Truck model reference</p><h4 className="mt-1 truncate text-sm font-black">{[identity.year, identity.brand, identity.model].filter(Boolean).join(" ") || "Choose a truck model"}</h4></div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${complete ? "border-[#f6b800]/35 bg-[#f6b800]/10 text-[#d9a400]" : "border-current/10 opacity-55"}`}>{complete ? "Matched" : "Waiting"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5"><ModelPart label="Year" value={identity.year || "Any"} /><ModelPart label="Make" value={identity.brand || "Select"} /><ModelPart label="Model" value={identity.model || "Select"} /></div>
      <p className="mt-3 text-[10px] font-semibold leading-4 opacity-45">Reference content now stays visible when available. You can continue even if a reference image is missing; your own vehicle photos remain the source of truth.</p>
    </div>, host,
  );
}

function ModelPart({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-[11px] border border-current/10 px-2.5 py-2"><span className="block text-[8px] font-black uppercase tracking-[.08em] opacity-35">{label}</span><strong className="mt-0.5 block truncate text-[10px]">{value}</strong></div>; }
