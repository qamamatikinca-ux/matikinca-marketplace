"use client";

import { useEffect, useRef, useState } from "react";
import { dealerFetch, removeDealerUpload, uploadDealerFile } from "@/lib/dealer/client";
import { DEALER_STATUS_TYPES } from "@/lib/dealer/constants";
import type { DealerInventoryItem, DealerStatusType, DealerWorkspaceState } from "@/lib/dealer/types";
import { Input, Modal, PrimaryButton, Select, SecondaryButton, Textarea } from "./ui";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

function fileMime(file: File, kind: "photo" | "video") {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (kind === "video") {
    if (name.endsWith(".mov")) return "video/quicktime";
    if (name.endsWith(".webm")) return "video/webm";
    if (name.endsWith(".mp4") || name.endsWith(".m4v")) return "video/mp4";
  }
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}

async function readImageSize(file: File) {
  return new Promise<{width:number;height:number}>((resolve, reject) => {
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{const out={width:img.naturalWidth,height:img.naturalHeight};URL.revokeObjectURL(url);resolve(out)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("This photo could not be read."))}; img.src=url;
  });
}

async function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = Number.isFinite(video.duration) ? video.duration : 0; URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This video could not be read. Try MP4, MOV or WebM.")); }; video.src = url;
  });
}

type SavedMedia = { id: string; media_type: "image" | "video"; url: string; label?: string | null; duration_seconds?: number | null };

export default function DealerStatusComposer({ darkMode, open, onClose, inventory, context, onDone }: { darkMode: boolean; open: boolean; onClose: () => void; inventory: DealerInventoryItem[]; context: DealerWorkspaceState; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DealerStatusType>("photo");
  const [form, setForm] = useState({ title: "", body: "", listing_id: "", cta_label: "View vehicle", starts_at: "" });
  const [file, setFile] = useState<File | null>(null); const [mediaItems, setMediaItems] = useState<SavedMedia[]>([]); const [selectedMedia, setSelectedMedia] = useState<SavedMedia | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [mediaNote, setMediaNote] = useState("");

  useEffect(() => { if (open) void dealerFetch<{ items: SavedMedia[] }>("/api/dealer/media").then((r) => setMediaItems(r.items || [])).catch(() => setMediaItems([])); }, [open]);

  function resetMedia() { setFile(null); setSelectedMedia(null); setMediaNote(""); if (inputRef.current) inputRef.current.value = ""; }
  function draftWording() {
    const vehicle = inventory.find((item) => item.id === form.listing_id);
    if (type === "vehicle" && vehicle) { setForm({ ...form, title: form.title || "Available now", body: form.body || `${vehicle.title} is available. Open the vehicle for the full specification and contact our sales team through LoadLink.`, cta_label: "View vehicle" }); return; }
    if (type === "promotion" && vehicle) { setForm({ ...form, title: form.title || "Stock update", body: form.body || `${vehicle.title} is included in our current dealership promotion. View the vehicle for the latest price and details.`, cta_label: "View vehicle" }); return; }
    if (type === "text") { setForm({ ...form, title: form.title || "Dealership update", body: form.body || "Our sales team is available for vehicle enquiries, stock information and viewing arrangements through LoadLink.", cta_label: "View showroom" }); return; }
    if (type === "video") { setForm({ ...form, title: form.title || "Vehicle walk-around", body: form.body || "A closer look at current dealership stock. Contact our sales team for specifications, pricing or a viewing.", cta_label: "View showroom" }); return; }
    setForm({ ...form, title: form.title || "Dealership update", body: form.body || "Current stock from our dealership. Open our showroom for vehicle details and direct sales contact.", cta_label: "View showroom" });
  }

  async function chooseFile(next: File | null) {
    setError(""); setMediaNote(""); setSelectedMedia(null); setFile(next);
    if (!next) return;
    const mime = fileMime(next, type === "video" ? "video" : "photo");
    const allowed = type === "video" ? VIDEO_TYPES : PHOTO_TYPES;
    if (!allowed.includes(mime as never)) { setFile(null); setError(type === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPEG, PNG or WebP photo."); return; }
    if (type === "video") {
      try { const duration = await readVideoDuration(next); if (!duration || duration > 60.5) { setFile(null); setError("Dealer Status videos can be up to 60 seconds."); return; } setMediaNote(`${Math.ceil(duration)} sec video ready to post.`); }
      catch (e) { setFile(null); setError(e instanceof Error ? e.message : "This video could not be read."); }
    } else {
      void readImageSize(next).then(({width,height})=>{ if(width<1080 || height<1080) setMediaNote("Photo selected. A higher-resolution image will look sharper."); else if(width>height*2.2) setMediaNote("Photo selected. This image is very wide, so check the crop."); else setMediaNote("Photo ready to post."); }).catch(()=>setMediaNote("Photo selected."));
    }
  }

  async function submit() {
    if (busy) return; setBusy(true); setError(""); let uploadedPath = "";
    try {
      let duration: number | null = selectedMedia?.duration_seconds ? Number(selectedMedia.duration_seconds) : null;
      let storagePath: string | null = null; let mime: string | null = null; let filename: string | null = null;
      if (type === "photo" || type === "video") {
        if (!file && !selectedMedia) throw new Error(type === "video" ? "Choose a video first." : "Choose a photo first.");
        if (selectedMedia && selectedMedia.media_type !== (type === "video" ? "video" : "image")) throw new Error("Choose media that matches this Status type.");
        if (file) {
          const allowed = type === "video" ? VIDEO_TYPES : PHOTO_TYPES;
          const detectedMime = fileMime(file, type === "video" ? "video" : "photo");
          if (!allowed.includes(detectedMime as never)) throw new Error(type === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPEG, PNG or WebP photo.");
          if (type === "video") { duration = await readVideoDuration(file); if (!duration || duration > 60.5) throw new Error("Dealer Status videos can be up to 60 seconds."); }
          const safeFile = file.type ? file : new File([file], file.name, { type: detectedMime, lastModified: file.lastModified });
          const uploaded = await uploadDealerFile({ bucket: "dealership-status-media", dealershipId: context.dealership_id, file: safeFile, allowedTypes: allowed, maxBytes: 60 * 1024 * 1024, folder: "status" });
          storagePath = uploaded.storage_path; uploadedPath = storagePath; mime = uploaded.mime; filename = uploaded.filename;
        }
      }
      if ((type === "vehicle" || type === "promotion") && !form.listing_id) throw new Error("Choose a vehicle.");
      if (type === "text" && !form.body.trim()) throw new Error("Enter the Status text.");
      await dealerFetch("/api/dealer/statuses", { method: "POST", body: JSON.stringify({ ...form, content_type: type, video_duration_seconds: duration, storage_path: storagePath, mime, filename, media_library_id: selectedMedia?.id || null }) });
      uploadedPath = ""; setForm({ title: "", body: "", listing_id: "", cta_label: "View vehicle", starts_at: "" }); resetMedia(); await Promise.resolve(onDone()); onClose();
    } catch (e) { if (uploadedPath) await removeDealerUpload("dealership-status-media", uploadedPath); setError(e instanceof Error ? e.message : "Status could not be created."); }
    finally { setBusy(false); }
  }

  const matchingMedia = mediaItems.filter((m) => m.media_type === (type === "video" ? "video" : "image"));
  const mediaReady = Boolean(file || selectedMedia);

  return <Modal open={open} onClose={onClose} darkMode={darkMode} title="Post Status">
    <div className="flex gap-2 overflow-x-auto pb-1">{DEALER_STATUS_TYPES.map((item) => <button type="button" key={item.value} onClick={() => { setType(item.value); resetMedia(); setError(""); }} className={`min-w-[98px] rounded-lg border px-3 py-2.5 text-left ${type === item.value ? "border-[#f6b800] bg-[#f6b800]/10" : "border-current/10"}`}><div className="text-xs font-black">{item.label}</div></button>)}</div>
    <div className="mt-5 grid gap-3">
      {(type === "photo" || type === "video") ? <div className={`rounded-xl border p-3 ${mediaReady ? "border-[#f6b800]/60" : "border-current/10"}`}><input ref={inputRef} type="file" className="hidden" accept={type === "video" ? "video/mp4,video/webm,video/quicktime,.mov,.m4v" : "image/jpeg,image/png,image/webp"} onChange={(e) => void chooseFile(e.target.files?.[0] || null)} /><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-black">{mediaReady ? "Media selected" : type === "video" ? "Add video" : "Add photo"}</div><div className="mt-1 truncate text-[11px] opacity-50">{file?.name || selectedMedia?.label || (selectedMedia ? "Saved media" : type === "video" ? "MP4, MOV or WebM · up to 60 sec" : "JPEG, PNG or WebP")}</div></div><SecondaryButton darkMode={darkMode} type="button" onClick={() => inputRef.current?.click()}>{mediaReady ? "Replace" : "Choose"}</SecondaryButton></div>{mediaNote ? <p className="mt-2 text-[11px] font-semibold opacity-55">{mediaNote}</p> : null}</div> : null}
      {(type === "photo" || type === "video") && matchingMedia.length ? <div><div className="mb-2 flex items-center justify-between"><div className="text-[11px] font-black uppercase tracking-[.08em] opacity-40">Recent media</div>{selectedMedia ? <button type="button" className="text-[11px] font-black opacity-55" onClick={resetMedia}>Clear</button> : null}</div><div className="flex gap-2 overflow-x-auto pb-1">{matchingMedia.slice(0, 12).map((item) => <button type="button" key={item.id} onClick={() => { setSelectedMedia(item); setFile(null); setError(""); setMediaNote(item.media_type === "video" ? "Saved video selected and ready to post." : "Saved photo selected and ready to post."); }} className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${selectedMedia?.id === item.id ? "border-[#f6b800] ring-2 ring-[#f6b800]/20" : "border-current/10"}`}>{item.media_type === "video" ? <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={item.url} alt={item.label || "Dealer media"} className="h-full w-full object-cover" />}</button>)}</div></div> : null}
      {(type === "vehicle" || type === "promotion") ? <label className="text-xs font-black">Vehicle<Select darkMode={darkMode} className="mt-1" value={form.listing_id} onChange={(e) => setForm({ ...form, listing_id: e.target.value })}><option value="">Choose live stock</option>{inventory.filter((item) => item.stock_status !== "sold").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label> : null}
      <label className="text-xs font-black">Title<Input darkMode={darkMode} className="mt-1" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Optional" /></label>
      <label className="text-xs font-black">Caption<Textarea darkMode={darkMode} className="mt-1" maxLength={400} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={type === "text" ? "What do you want customers to know?" : "Optional caption"} /></label>
      <div className="flex flex-wrap items-center gap-2"><SecondaryButton darkMode={darkMode} type="button" onClick={draftWording}>Help me word it</SecondaryButton><span className="text-[11px] opacity-45">Review before posting.</span></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Button text<Input darkMode={darkMode} className="mt-1" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></label><label className="text-xs font-black">Post later<Input darkMode={darkMode} className="mt-1" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label></div>
    </div>
    {error ? <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/[.06] px-3 py-2.5 text-sm font-bold text-red-500">{error}</div> : null}
    <div className="mt-5 flex items-center justify-between gap-3"><span className="text-[11px] font-semibold opacity-45">Status stays live for 24 hours.</span><PrimaryButton type="button" disabled={busy || ((type === "photo" || type === "video") && !mediaReady)} onClick={submit}>{busy ? "Posting…" : "Post Status"}</PrimaryButton></div>
  </Modal>;
}
