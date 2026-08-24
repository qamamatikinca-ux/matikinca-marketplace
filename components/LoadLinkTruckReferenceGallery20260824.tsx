"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type ReferencePhoto = {
  imageUrl?: string | null;
  originalUrl?: string | null;
  title?: string | null;
  matchConfidence?: "high" | "medium" | "reference" | string;
  credit?: string | null;
  license?: string | null;
  sourceUrl?: string | null;
};

type ReferenceResponse = {
  images?: ReferencePhoto[];
  imageUrl?: string | null;
  title?: string | null;
  matchConfidence?: string | null;
  credit?: string | null;
  license?: string | null;
  sourceUrl?: string | null;
};

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
  const [photos, setPhotos] = useState<ReferencePhoto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/list-your-vehicle")) return;
    let timer = 0;
    const sync = () => {
      setHost(ensureHost());
      setIdentity(readIdentity());
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 90);
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

  const key = useMemo(() => identity ? `${identity.year}|${identity.brand}|${identity.model}` : "", [identity]);

  useEffect(() => {
    if (!identity) { setPhotos([]); return; }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ year: identity.year, brand: identity.brand, model: identity.model });
    fetch(`/api/truck-image?${params.toString()}`, { cache: "force-cache" })
      .then((response) => response.json())
      .then((payload: ReferenceResponse) => {
        if (!active) return;
        const candidates = Array.isArray(payload.images) ? payload.images : [];
        const fallback: ReferencePhoto[] = payload.imageUrl ? [{ imageUrl: payload.imageUrl, title: payload.title, matchConfidence: payload.matchConfidence || "reference", credit: payload.credit, license: payload.license, sourceUrl: payload.sourceUrl }] : [];
        const unique = new Map<string, ReferencePhoto>();
        [...candidates, ...fallback].forEach((photo) => { if (photo.imageUrl && !unique.has(photo.imageUrl)) unique.set(photo.imageUrl, photo); });
        setPhotos(Array.from(unique.values()).slice(0, 8));
      })
      .catch(() => { if (active) setPhotos([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key]);

  if (!host || !identity) return null;

  return createPortal(
    <div data-loadlink-truck-reference-gallery="20260824" className="mt-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.12em] opacity-45">Model reference</p>
          <h4 className="mt-1 text-sm font-black">{identity.year} {identity.brand} {identity.model}</h4>
        </div>
        <span className="shrink-0 text-[10px] font-bold opacity-40">{loading ? "Checking…" : photos.length ? `${photos.length} references` : "No reference yet"}</span>
      </div>
      {photos.length ? (
        <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2" aria-label="Truck model reference photos">
          {photos.map((photo, index) => (
            <a key={`${photo.imageUrl}-${index}`} href={photo.sourceUrl || photo.originalUrl || "#"} target={photo.sourceUrl || photo.originalUrl ? "_blank" : undefined} rel="noreferrer" className="block w-[78%] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[16px] border border-current/10 bg-current/[.025]">
              <img src={photo.imageUrl || ""} alt={`${identity.brand} ${identity.model} reference ${index + 1}`} className="aspect-[16/10] w-full object-cover" loading="lazy" />
              <div className="p-2.5">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-black">Reference {index + 1}</span><span className="shrink-0 text-[9px] font-bold uppercase opacity-45">{photo.matchConfidence === "high" ? "High match" : photo.matchConfidence === "medium" ? "Family match" : "Reference"}</span></div>
                <p className="mt-1 truncate text-[9px] font-semibold opacity-38">{photo.credit || photo.license || "Wikimedia Commons"}</p>
              </div>
            </a>
          ))}
        </div>
      ) : !loading ? <p className="mt-3 text-xs font-semibold opacity-45">No reliable public model photo was found. Your uploaded photos remain the authoritative listing images.</p> : null}
      <p className="mt-1 text-[10px] font-semibold leading-4 opacity-42">Reference photos help confirm the model family only. Buyers will see the actual photos you upload for this vehicle.</p>
    </div>,
    host,
  );
}
