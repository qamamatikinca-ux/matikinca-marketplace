"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type DocumentPreviewProps = {
  darkMode?: boolean;
  documentType?: string;
  reference?: string;
  amount?: string;
  unit?: string;
  vehicle?: string;
  route?: string;
  availability?: string;
  vat?: string;
  terms?: string;
  clientName?: string;
  compact?: boolean;
};

const LOGO_STORAGE_KEY = "loadlink-business-logo-clean-v1";

export default function LoadLinkDocumentPreview({
  darkMode = false,
  documentType = "Rate quote",
  reference,
  amount = "",
  unit = "total",
  vehicle = "",
  route = "",
  availability = "",
  vat = "included",
  terms = "",
  clientName = "",
  compact = false,
}: DocumentPreviewProps) {
  const [businessLogo, setBusinessLogo] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try { setBusinessLogo(localStorage.getItem(LOGO_STORAGE_KEY) || ""); } catch { /* optional local preference */ }
  }, []);

  const stamp = useMemo(() => new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()), []);
  const docReference = useMemo(() => {
    if (reference) return reference;
    const source = `${documentType}|${vehicle}|${route}|${amount}|${unit}|${availability}|${vat}|${terms}`;
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `LL-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
  }, [amount, availability, documentType, reference, route, terms, unit, vat, vehicle]);
  const rateUnit = unit === "km" ? "per km" : unit === "ton" ? "per ton" : unit === "day" ? "per day" : "total";

  async function uploadBusinessLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size > 5 * 1024 * 1024) {
      setLogoMessage("Use a PNG, JPG or WebP logo smaller than 5 MB.");
      return;
    }
    setLogoBusy(true); setLogoMessage("");
    try {
      const cleaned = await cleanLogoBackground(file);
      setBusinessLogo(cleaned);
      try { localStorage.setItem(LOGO_STORAGE_KEY, cleaned); } catch { /* storage may be unavailable */ }
      setLogoMessage("Business logo added to this document style.");
    } catch {
      setLogoMessage("The logo could not be prepared. Try a clearer logo image.");
    } finally { setLogoBusy(false); }
  }

  function removeLogo() {
    setBusinessLogo(""); setLogoMessage("");
    try { localStorage.removeItem(LOGO_STORAGE_KEY); } catch { /* optional */ }
  }

  return (
    <section className={`overflow-hidden rounded-[26px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-[#f8f6f0]"}`} data-loadlink-document-preview="v2714">
      <div className="p-3 sm:p-4">
        <article className="mx-auto overflow-hidden rounded-[22px] border border-black/10 bg-white text-black shadow-[0_18px_55px_rgba(0,0,0,.12)]">
          <header className="flex min-h-[86px] items-start justify-between gap-5 border-b border-black/8 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <img src="/images/loadlink-logo-light.png?v=universal-theme-v1" alt="LoadLink" className="h-7 w-auto max-w-[150px] object-contain object-left" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-[#9b7200]">Logistics made easier</p>
            </div>
            <div className="flex min-w-[96px] max-w-[42%] flex-col items-end">
              {businessLogo ? <img src={businessLogo} alt="Business logo" className="max-h-12 max-w-full object-contain object-right" /> : <span className="flex h-11 min-w-[88px] items-center justify-center rounded-xl border border-dashed border-black/15 px-3 text-center text-[8px] font-black uppercase tracking-[.08em] text-black/35">Business logo</span>}
            </div>
          </header>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/38">{documentType}</p><h3 className="mt-1 text-2xl font-black tracking-[-.04em]">{route || vehicle || documentType}</h3>{clientName ? <p className="mt-1 text-xs font-semibold text-black/48">Prepared for {clientName}</p> : null}</div>
              <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">Reference</p><p className="mt-1 text-xs font-black">{docReference}</p><p className="mt-1 text-[10px] font-semibold text-black/42">{stamp}</p></div>
            </div>

            <div className="my-5 h-px bg-black/8" />

            <div className={`grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
              <DocumentField label="Vehicle / service" value={vehicle || "Not specified"} />
              <DocumentField label="Route" value={route || "Not specified"} />
              <DocumentField label="Availability" value={availability || "Confirm with provider"} />
              <DocumentField label="VAT" value={String(vat || "included").replaceAll("_", " ")} capitalize />
            </div>

            <div className="mt-5 overflow-hidden rounded-[18px] border border-[#f6b800]/35 bg-[#fff8dc]">
              <div className="flex items-end justify-between gap-4 px-4 py-4">
                <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#8b6700]">Quoted amount</p><p className="mt-1 text-[11px] font-semibold text-black/46">{rateUnit}</p></div>
                <p className="text-[28px] font-black tracking-[-.045em]">{amount ? `R${amount}` : "Rate pending"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-black/8 bg-[#f7f7f5] p-4">
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-black/35">Terms / notes</p>
              <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-black/65">{terms || "No additional terms supplied."}</p>
            </div>
          </div>

          <footer className="border-t border-black/8 px-5 py-4 text-[9px] font-semibold leading-4 text-black/38 sm:px-6">
            This LoadLink document reflects the details supplied by the sender. Confirm final scope, rates and payment terms before work begins.
          </footer>
        </article>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-white"}`}>
          <div className="min-w-0"><p className="text-[10px] font-black">Business branding</p><p className={`mt-0.5 text-[9px] font-semibold ${darkMode ? "text-white/42" : "text-black/42"}`}>Optional. LoadLink removes near-white background pixels locally on this device.</p>{logoMessage ? <p className="mt-1 text-[9px] font-bold text-[#b88900]">{logoMessage}</p> : null}</div>
          <div className="flex gap-2"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadBusinessLogo} className="hidden"/><button type="button" disabled={logoBusy} onClick={() => inputRef.current?.click()} className="h-9 rounded-xl bg-[#f6b800] px-3 text-[9px] font-black text-black disabled:opacity-45">{logoBusy ? "Preparing…" : businessLogo ? "Change logo" : "Add logo"}</button>{businessLogo ? <button type="button" onClick={removeLogo} className={`h-9 rounded-xl border px-3 text-[9px] font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Remove</button> : null}</div>
        </div>
      </div>
    </section>
  );
}

function DocumentField({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return <div className="rounded-[16px] border border-black/8 bg-[#fafafa] p-3.5"><p className="text-[8px] font-black uppercase tracking-[.13em] text-black/33">{label}</p><p className={`mt-1.5 text-xs font-black leading-5 text-black/75 ${capitalize ? "capitalize" : ""}`}>{value}</p></div>;
}

async function cleanLogoBackground(file: File) {
  const source = await fileToImage(file);
  const max = 700;
  const scale = Math.min(1, max / Math.max(source.naturalWidth, source.naturalHeight));
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightest = Math.max(r, g, b);
    const darkest = Math.min(r, g, b);
    if (brightest > 238 && darkest > 226 && brightest - darkest < 24) {
      const whiteness = (brightest - 226) / 29;
      data[i + 3] = Math.round(255 * Math.max(0, 1 - whiteness));
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png", 0.92);
}

function fileToImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image failed")); };
    image.src = url;
  });
}
