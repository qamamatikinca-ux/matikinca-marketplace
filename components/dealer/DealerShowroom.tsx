"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dealerFetch, removeDealerUpload, uploadDealerFile } from "@/lib/dealer/client";
import type { DealerProfile, DealerWorkspaceState } from "@/lib/dealer/types";
import { Input, PrimaryButton, SecondaryButton, Surface, Textarea } from "./ui";

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
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be checked."));
    };
    image.src = url;
  });
}

export default function DealerShowroom({
  darkMode,
  profile,
  context,
  onProfile,
}: {
  darkMode: boolean;
  profile: DealerProfile;
  context: DealerWorkspaceState;
  onProfile: (profile: DealerProfile) => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ShowroomForm>(() => toForm(profile));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(() => !profile.trading_hours || !(profile.phone_number || profile.whatsapp_number || profile.contact_email));

  useEffect(() => setForm(toForm(profile)), [profile]);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("dealership name");
    if (!form.physical_location.trim()) missing.push("location");
    if (!form.trading_hours.trim()) missing.push("opening hours");
    if (!profile.profile_image_url) missing.push("profile picture");
    if (!(form.phone_number.trim() || form.whatsapp_number.trim() || form.contact_email.trim())) missing.push("customer contact");
    return missing;
  }, [form.contact_email, form.name, form.phone_number, form.physical_location, form.trading_hours, form.whatsapp_number, profile.profile_image_url]);

  const profileComplete = missingRequired.length === 0;
  const canPublish = context.verification_status === "approved" && ["active", "past_due", "grace_period"].includes(context.subscription_status) && context.account_status === "active";
  const status = form.is_public && context.showroom_status === "live" ? "Live on LoadLink" : canPublish ? "Ready to publish" : "Private";

  async function save(nextPublic = form.is_public, requireComplete = false) {
    const slugChanged = form.slug.trim() !== profile.slug;
    if (slugChanged && !window.confirm(`Change your dealership link to /${form.slug.trim()}? The old LoadLink link will redirect to the new one.`)) return;
    if (requireComplete && !profileComplete) {
      setDetailsOpen(true);
      setMessage(`Complete the required Dealer profile details first: ${missingRequired.join(", ")}.`);
      return;
    }
    if (nextPublic && !canPublish) {
      setMessage("Your dealer page can go live after Dealer access and business verification are in good standing.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await dealerFetch<{ profile: DealerProfile }>("/api/dealer/showroom", {
        method: "POST",
        body: JSON.stringify({ action: "save", ...form, is_public: nextPublic }),
      });
      onProfile(data.profile);
      setForm(toForm(data.profile));
      setMessage(nextPublic ? "Dealer page saved." : "Dealer profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dealer page could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function media(kind: "logo" | "cover", file?: File) {
    if (!file) return;
    setMessage("");
    try {
      const size = await imageSize(file);
      if (kind === "logo" && (size.width < 600 || size.height < 600)) setMessage("Image uploaded. A square image of at least 600 × 600 will look sharper.");
      if (kind === "cover" && (size.width < 1400 || size.width / Math.max(1, size.height) < 2)) setMessage("Cover uploaded. A wider image of at least 1400 px will look sharper.");
      const uploaded = await uploadDealerFile({
        bucket: "dealership-assets",
        dealershipId: context.dealership_id,
        file,
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
        maxBytes: 8 * 1024 * 1024,
        folder: kind,
      });
      try {
        const data = await dealerFetch<{ profile: DealerProfile }>("/api/dealer/showroom", {
          method: "POST",
          body: JSON.stringify({ action: "media", kind, filename: file.name, mime: uploaded.mime, storage_path: uploaded.storage_path }),
        });
        onProfile(data.profile);
        setMessage(kind === "logo" ? "Profile picture updated." : "Cover picture updated.");
      } catch (error) {
        await removeDealerUpload("dealership-assets", uploaded.storage_path);
        throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image could not be uploaded.");
    }
  }

  return (
    <div className="mx-auto grid max-w-[1040px] gap-3 sm:gap-4">
      {!profileComplete ? (
        <Surface darkMode={darkMode} className="rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black">Finish your Dealer profile</h2>
              <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 opacity-52">
                These details appear to customers on Dealer posts. An active Dealer package cannot create new marketplace posts until they are completed.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-current/12 px-3 py-1.5 text-[10px] font-black">{missingRequired.length} missing</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {missingRequired.map((item) => <span key={item} className="rounded-full border border-current/10 bg-current/[.025] px-3 py-2 text-[10px] font-black capitalize backdrop-blur-xl">{item}</span>)}
          </div>
        </Surface>
      ) : null}

      <section className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/[.08] bg-white"}`}>
        <div className="relative aspect-[16/5] min-h-[150px] overflow-hidden bg-black">
          {profile.cover_image_url ? <img src={profile.cover_image_url} alt="Dealer cover" className="h-full w-full object-cover opacity-70" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white/60 bg-black">
              {profile.profile_image_url ? <img src={profile.profile_image_url} alt="Dealer profile" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black">{profile.name.slice(0, 2).toUpperCase()}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black tracking-[-.03em]">{form.name}</h1>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/65">{form.short_bio || "Add a short bio for customers"}</p>
            </div>
            <span className="rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-black backdrop-blur-xl">{status}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:flex sm:items-center">
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void media("logo", event.target.files?.[0])} />
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void media("cover", event.target.files?.[0])} />
          <SecondaryButton darkMode={darkMode} type="button" onClick={() => logoRef.current?.click()}>Profile picture</SecondaryButton>
          <SecondaryButton darkMode={darkMode} type="button" onClick={() => coverRef.current?.click()}>Cover picture</SecondaryButton>
          <SecondaryButton darkMode={darkMode} type="button" className="col-span-2 sm:ml-auto" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>Preview page</SecondaryButton>
        </div>
      </section>

      <Surface darkMode={darkMode} className="rounded-2xl p-4 sm:p-5">
        <div>
          <h2 className="text-base font-black">Public identity</h2>
          <p className="mt-1 text-xs opacity-45">The first things customers see.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black">Dealership name<Input darkMode={darkMode} className="mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-xs font-black">Location<Input darkMode={darkMode} className="mt-1" value={form.physical_location} onChange={(event) => setForm({ ...form, physical_location: event.target.value })} placeholder="Centurion, Gauteng" /></label>
          <label className="text-xs font-black sm:col-span-2">Short bio<Input darkMode={darkMode} className="mt-1" maxLength={120} value={form.short_bio} onChange={(event) => setForm({ ...form, short_bio: event.target.value })} placeholder="What should customers know in one line?" /></label>
          <label className="text-xs font-black sm:col-span-2">About<Textarea darkMode={darkMode} className="mt-1" value={form.business_description} onChange={(event) => setForm({ ...form, business_description: event.target.value })} placeholder="Tell customers about your dealership, stock and service." /></label>
        </div>
      </Surface>

      <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl">
        <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left sm:px-5">
          <div>
            <div className="text-base font-black">Contact & details</div>
            <div className="mt-1 text-xs opacity-45">Call, WhatsApp, email, opening hours and website</div>
          </div>
          <span className="text-lg font-black opacity-40">{detailsOpen ? "−" : "+"}</span>
        </button>
        {detailsOpen ? (
          <div className="grid gap-3 border-t border-current/10 p-4 sm:grid-cols-2 sm:p-5">
            <label className="text-xs font-black">Phone<Input darkMode={darkMode} className="mt-1" value={form.phone_number} onChange={(event) => setForm({ ...form, phone_number: event.target.value })} placeholder="Call button" /></label>
            <label className="text-xs font-black">WhatsApp<Input darkMode={darkMode} className="mt-1" value={form.whatsapp_number} onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value })} placeholder="WhatsApp button" /></label>
            <label className="text-xs font-black">Email<Input darkMode={darkMode} className="mt-1" type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} /></label>
            <label className="text-xs font-black">Website<Input darkMode={darkMode} className="mt-1" value={form.website_url} onChange={(event) => setForm({ ...form, website_url: event.target.value })} /></label>
            <label className="text-xs font-black">Opening hours<Input darkMode={darkMode} className="mt-1" value={form.trading_hours} onChange={(event) => setForm({ ...form, trading_hours: event.target.value })} placeholder="Mon–Fri 08:00–17:00" /></label>
            <label className="text-xs font-black">Established<Input darkMode={darkMode} className="mt-1" inputMode="numeric" value={form.year_established} onChange={(event) => setForm({ ...form, year_established: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
            <label className="text-xs font-black sm:col-span-2">Dealer page link<div className={`mt-1 flex h-11 items-center rounded-lg border px-3 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.08] bg-[#fbfaf7]"}`}><span className="text-xs opacity-35">/dealership/</span><input aria-label="Dealer page URL" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></div></label>
          </div>
        ) : null}
      </Surface>

      {message ? <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${/could not|after dealer|not available|invalid|required|complete/i.test(message) ? "border-red-500/25 bg-red-500/[.05] text-red-500" : darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>{message}</div> : null}

      <section className={`sticky bottom-[68px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border p-3 shadow-xl backdrop-blur-xl lg:bottom-4 ${darkMode ? "border-white/10 bg-[#0a0a0a]/90" : "border-black/10 bg-white/90"}`}>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black">{profileComplete ? status : "Profile incomplete"}</div>
          <div className="mt-0.5 text-[10px] opacity-40">{profileComplete ? "Save changes before leaving." : `Add ${missingRequired.join(", ")}.`}</div>
        </div>
        <PrimaryButton type="button" disabled={busy} onClick={() => void save(form.is_public, false)}>{busy ? "Saving…" : "Save changes"}</PrimaryButton>
        {form.is_public ? <SecondaryButton darkMode={darkMode} type="button" disabled={busy} onClick={() => void save(false, false)}>Take offline</SecondaryButton> : <SecondaryButton darkMode={darkMode} type="button" disabled={busy || !canPublish || !profileComplete} onClick={() => void save(true, true)}>Publish</SecondaryButton>}
      </section>
    </div>
  );
}
