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

function readIdentity(): Identity | null {
  const year = controlForLabel(/Registration \/ model year/i)?.value?.trim() || "";
  const brand = controlForLabel(/Make \/ manufacturer/i)?.value?.trim() || "";
  const model = controlForLabel(/^Model$/i)?.value?.trim() || "";
  if (!year || !brand || !model) return null;
  return { year, brand, model };
}

function ensureHost() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => /confirm truck model/i.test(node.textContent || ""));
  const container = button?.parentElement;
  if (!container) return null;
  let host = container.querySelector<HTMLElement>(":scope > [data-loadlink-truck-reference-gallery-host]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.loadlinkTruckReferenceGalleryHost = "true";
    container.appendChild(host);
  }
  const nativeFigure = Array.from(container.children).find((child) => child.tagName === "FIGURE") as HTMLElement | undefined;
  if (nativeFigure) {
    nativeFigure.dataset.loadlinkNativeTruckReference = "true";
    nativeFigure.style.display = "none";
  }
  return host;
}

export default function LoadLinkTruckReferenceGallery20260824() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/list-your-vehicle")) return;
    let timer = 0;
    const sync = () => {
      setHost(ensureHost());
      setIdentity(readIdentity());
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 80);
    };
    sync();
    document.addEventListener("change", schedule, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("change", schedule, true);
      observer.disconnect();
      window.clearTimeout(timer);
      document.querySelectorAll<HTMLElement>('[data-loadlink-native-truck-reference="true"]').forEach((node) => { node.style.display = ""; });
    };
  }, [pathname]);

  if (!host || !identity) return null;

  return createPortal(
    <div data-loadlink-truck-reference-gallery="20260826-model-confirmation" className="mt-4 rounded-[18px] border border-current/10 bg-current/[.025] p-3.5 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.11em] opacity-42">Selected truck model</p>
          <h4 className="mt-1 truncate text-sm font-black">{identity.year} {identity.brand} {identity.model}</h4>
        </div>
        <span className="shrink-0 rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black text-black">Ready</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <ModelPart label="Year" value={identity.year} />
        <ModelPart label="Make" value={identity.brand} />
        <ModelPart label="Model" value={identity.model} />
      </div>
      <p className="mt-3 text-[10px] font-semibold leading-4 opacity-45">Confirm the model above, then use your own vehicle photos in the listing. LoadLink no longer loads external model reference pictures here.</p>
    </div>,
    host,
  );
}

function ModelPart({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-[12px] border border-current/10 px-2.5 py-2"><span className="block text-[8px] font-black uppercase tracking-[.08em] opacity-35">{label}</span><strong className="mt-0.5 block truncate text-[10px]">{value}</strong></div>;
}
