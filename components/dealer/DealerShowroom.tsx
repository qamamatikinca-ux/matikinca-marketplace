"use client";

import { useEffect, useRef, useState } from "react";
import { dealerFetch, removeDealerUpload, uploadDealerFile } from "@/lib/dealer/client";
import type { DealerProfile, DealerWorkspaceState } from "@/lib/dealer/types";
import { Input, PrimaryButton, SectionHeading, SecondaryButton, Surface, Textarea } from "./ui";

type ShowroomForm = {
  name: string;
  slug: string;
  short_bio: string;
  business_description: string;
  physical_location: string;
  contact_email: string;
  phone_number: string;
  whatsapp_number: string;
  website_url: string;
  trading_hours: string;
  year_established: string;
  is_public: boolean;
};

function toForm(profile: DealerProfile): ShowroomForm {
  return {
    name: profile.name,
    slug: profile.slug,
    short_bio: profile.short_bio || "",
    business_description: profile.business_description || "",
    physical_location: profile.physical_location || "",
    contact_email: profile.contact_email || "",
    phone_number: profile.phone_number || "",
    whatsapp_number: profile.whatsapp_number || "",
    website_url: profile.website_url || "",
    trading_hours: profile.trading_hours || "",
    year_established: profile.year_established ? String(profile.year_established) : "",
    is_public: Boolean(profile.is_public),
  };
}

async function imageSize(file: File) {
  return await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image could not be checked.")); };
    image.src = url;
  });
}

export default function DealerShowroom({ darkMode, profile, context, onProfile }: { darkMode: boolean; profile: DealerProfile; context: DealerWorkspaceState; onProfile: (profile: DealerProfile) => void }) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ShowroomForm>(() => toForm(profile));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(toForm(profile)), [profile]);

  const canPublish = context.verification_status === "approved" && ["active", "past_due", "grace_period"].includes(context.subscription_status) && context.account_status === "active";

  async function save(nextPublic = form.is_public) {
    const slugChanged = form.slug.trim() !== profile.slug;
    if (slugChanged && !window.confirm(`Change your showroom URL from /${profile.slug} to /${form.slug.trim()}? The old LoadLink showroom link will redirect to the new one.`)) return;
    if (nextPublic && !canPublish) { setMessage("Showroom publishing becomes available after Dealer access and business verification are in good standing."); return; }
    setBusy(true); setMessage("");
    try {
      const data = await dealerFetch<{ profile: DealerProfile }>("/api/dealer/showroom", { method: "POST", body: JSON.stringify({ action: "save", ...form, is_public: nextPublic }) });
      onProfile(data.profile); setForm(toForm(data.profile));
      setMessage(nextPublic ? "Showroom is live." : "Showroom saved privately.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Showroom could not be saved."); }
    finally { setBusy(false); }
  }

  async function media(kind: "logo" | "cover", file?: File) {
    if (!file) return;
    setMessage("");
    try {
      const size = await imageSize(file);
      if (kind === "logo" && (size.width < 600 || size.height < 600)) setMessage("The logo can be uploaded, but a square image of at least 600 × 600 will look sharper across LoadLink.");
      if (kind === "cover" && (size.width < 1400 || size.width / Math.max(1, size.height) < 2)) setMessage("The cover can be uploaded, but a wide image of at least 1400 px works better in the showroom header.");
      const uploaded = await uploadDealerFile({ bucket: "dealership-assets", dealershipId: context.dealership_id, file, allowedTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, folder: kind });
      try {
        const data = await dealerFetch<{ profile: DealerProfile }>("/api/dealer/showroom", { method: "POST", body: JSON.stringify({ action: "media", kind, filename: file.name, mime: uploaded.mime, storage_path: uploaded.storage_path }) });
        onProfile(data.profile);
      } catch (e) { await removeDealerUpload("dealership-assets", uploaded.storage_path); throw e; }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Image could not be uploaded."); }
  }

  return <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
    <Surface darkMode={darkMode} className="p-4 sm:p-5">
      <SectionHeading title="Showroom" detail="Your public dealership identity. Verification remains separate." />
      <div className="mt-5 grid gap-3">
        <label className="text-xs font-black">Dealership name<Input darkMode={darkMode} className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-xs font-black">Showroom URL<div className={`mt-1 flex h-12 items-center border px-3 ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white"}`}><span className="shrink-0 text-xs opacity-45">/dealership/</span><input aria-label="Showroom URL" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></div><span className="mt-1 block text-[11px] font-semibold opacity-45">Changing this keeps the previous LoadLink link as a redirect.</span></label>
        <label className="text-xs font-black">Short bio<Input darkMode={darkMode} className="mt-1" maxLength={120} value={form.short_bio} onChange={(e) => setForm({ ...form, short_bio: e.target.value })} /></label>
        <label className="text-xs font-black">About<Textarea darkMode={darkMode} className="mt-1" value={form.business_description} onChange={(e) => setForm({ ...form, business_description: e.target.value })} /></label>
        <label className="text-xs font-black">Location<Input darkMode={darkMode} className="mt-1" value={form.physical_location} onChange={(e) => setForm({ ...form, physical_location: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black">Email<Input darkMode={darkMode} className="mt-1" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></label>
          <label className="text-xs font-black">Phone<Input darkMode={darkMode} className="mt-1" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></label>
          <label className="text-xs font-black">WhatsApp<Input darkMode={darkMode} className="mt-1" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></label>
          <label className="text-xs font-black">Website<Input darkMode={darkMode} className="mt-1" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></label>
          <label className="text-xs font-black">Trading hours<Input darkMode={darkMode} className="mt-1" value={form.trading_hours} onChange={(e) => setForm({ ...form, trading_hours: e.target.value })} /></label>
          <label className="text-xs font-black">Year established<Input darkMode={darkMode} className="mt-1" inputMode="numeric" value={form.year_established} onChange={(e) => setForm({ ...form, year_established: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
        </div>
      </div>
      {message ? <div role="status" className={`mt-4 border-l-2 pl-3 text-sm font-bold ${/could not|invalid|required|not available|after dealer/i.test(message) ? "border-red-500" : "border-current/30"}`}>{message}</div> : null}
      <div className="mt-5 flex flex-wrap gap-2"><PrimaryButton type="button" disabled={busy} onClick={() => void save(form.is_public)}>{busy ? "Saving…" : "Save showroom"}</PrimaryButton></div>
    </Surface>

    <div className="grid content-start gap-4">
      <Surface darkMode={darkMode} className="overflow-hidden">
        <div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Branding" detail="Use dealership photography and clean, legible brand assets." /></div>
        <div className="p-4"><div className="relative aspect-[16/6] overflow-hidden border border-current/10 bg-current/[.04]">{profile.cover_image_url ? <img src={profile.cover_image_url} alt="Dealership cover" className="h-full w-full object-cover" /> : null}<div className={`absolute bottom-3 left-3 h-20 w-20 overflow-hidden rounded-full border-4 ${darkMode ? "border-[#0d0d0d] bg-[#161616]" : "border-white bg-[#f4f0e7]"}`}>{profile.profile_image_url ? <img src={profile.profile_image_url} alt={`${profile.name} logo`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-black">{profile.name.slice(0, 2).toUpperCase()}</div>}</div></div><div className="mt-3 flex flex-wrap gap-2"><input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void media("logo", e.target.files?.[0])} /><input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void media("cover", e.target.files?.[0])} /><SecondaryButton darkMode={darkMode} type="button" onClick={() => logoRef.current?.click()}>Replace logo</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={() => coverRef.current?.click()}>Replace cover</SecondaryButton></div></div>
      </Surface>

      <Surface darkMode={darkMode} className="p-4">
        <SectionHeading title="Public showroom" />
        <div className="mt-4 text-sm"><b>{form.is_public && context.showroom_status === "live" ? "Live" : context.verification_status === "approved" ? "Ready" : "Private"}</b><p className="mt-1 opacity-55">{form.is_public && context.showroom_status === "live" ? "Customers can open the dealership and approved live stock." : canPublish ? "Your dealership is eligible to publish when the showroom is ready." : "You can prepare the showroom while verification or Dealer access is still being completed."}</p></div>
        <div className="mt-4 flex flex-wrap gap-2"><SecondaryButton darkMode={darkMode} type="button" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>Preview showroom</SecondaryButton>{form.is_public ? <SecondaryButton darkMode={darkMode} type="button" disabled={busy} onClick={() => { setForm((v) => ({ ...v, is_public: false })); void save(false); }}>Take offline</SecondaryButton> : <PrimaryButton type="button" disabled={busy || !canPublish} onClick={() => { setForm((v) => ({ ...v, is_public: true })); void save(true); }}>Publish showroom</PrimaryButton>}</div>
      </Surface>
    </div>
  </div>;
}
