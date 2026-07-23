"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { getAccountOwnerKey } from "@/lib/chatKeys";
import AuthStatusButton from "@/components/AuthStatusButton";
import SubmissionSuccess from "@/components/SubmissionSuccess";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
type ListingMode = "job" | "asset" | "contract";

const cityOptions = [
  "Johannesburg", "Sandton", "Midrand", "Pretoria", "Centurion", "Soweto", "Tembisa", "Kempton Park",
  "Boksburg", "Benoni", "Germiston", "Alberton", "Randburg", "Roodepoort", "Krugersdorp", "Vereeniging",
  "Vanderbijlpark", "Springs", "Durban", "Pinetown", "Umhlanga", "Pietermaritzburg", "Richards Bay",
  "Cape Town", "Bellville", "Stellenbosch", "Paarl", "George", "Gqeberha", "East London", "Mthatha",
  "Bloemfontein", "Welkom", "Kimberley", "Upington", "Rustenburg", "Klerksdorp", "Polokwane", "Mbombela",
  "Emalahleni", "Middelburg", "Secunda",
];

const groups: VehicleGroup[] = ["Catering / Event", "Trucks / Trailers", "Farming / Mining"];

const vehicleNeedOptions = [
  "Any suitable vehicle", "Side tipper", "Superlink", "Flat deck", "Tautliner", "Lowbed", "Refrigerated truck",
  "Closed truck", "Dropside truck", "Bakkie", "8 ton truck", "34 ton truck", "Food truck", "Mobile kitchen",
  "Mobile fridge", "Mobile toilet", "Farming vehicle", "Mining transport vehicle", "Other mobile unit",
];

const assetTypes = [
  "Truck", "Trailer", "Side tipper", "Superlink", "Flat deck", "Tautliner", "Lowbed", "Refrigerated truck",
  "Bakkie", "Food truck", "Mobile kitchen", "Mobile fridge", "Mobile toilet", "Farming equipment", "Mining equipment",
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function isValidSouthAfricanPhone(value: string) {
  const clean = normalizePhone(value);
  return /^0\d{9}$/.test(clean) || /^\+27\d{9}$/.test(clean);
}

function groupForVehicle(value: string): VehicleGroup {
  const lower = value.toLowerCase();
  if (/food|kitchen|toilet|fridge|event|catering/.test(lower)) return "Catering / Event";
  if (/farm|mining|tractor|agri/.test(lower)) return "Farming / Mining";
  return "Trucks / Trailers";
}


function saveOwnedJob(jobId: string, ownerKey: string) {
  try {
    const current = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}") as Record<string, string>;
    current[jobId] = ownerKey;
    localStorage.setItem("loadlink-owned-job-keys", JSON.stringify(current));
  } catch {
    localStorage.setItem("loadlink-owned-job-keys", JSON.stringify({ [jobId]: ownerKey }));
  }
}

function resizePhoto(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Could not process image."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not convert image.")), "image/jpeg", quality);
      };
      image.onerror = () => reject(new Error("Could not read image."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function ListJobPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [listingMode, setListingMode] = useState<ListingMode>("job");
  const [assetType, setAssetType] = useState("Truck");
  const [vehicleNeeded, setVehicleNeeded] = useState("Any suitable vehicle");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [rate, setRate] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const packageType = "standard" as const;
  const [files, setFiles] = useState<File[]>([]);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [posterPhoto, setPosterPhoto] = useState<File | null>(null);
  const [posterPhotoPreview, setPosterPhotoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const photoLimit = 5;

  useEffect(() => {
    setDarkMode(localStorage.getItem("loadlink-theme") === "dark");
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "asset") {
      router.replace("/list-your-truck");
      return;
    }
    if (mode === "contract") setListingMode(mode);

    async function requireAccount() {
      if (!isSupabaseConfigured) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isAuthenticatedUser(user)) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      await syncAccountState().catch(() => undefined);
      setAuthReady(true);
    }

    requireAccount().catch(() => router.replace(loginHref(currentRelativePath())));
  }, [router]);

  const pageCopy = useMemo(() => {
    if (listingMode === "asset") {
      return {
        eyebrow: "Vehicle or mobile unit",
        title: "List equipment for hire",
        description: "Show operators what is available, where it is based and how it can be booked.",
        submit: "Publish listing",
      };
    }
    if (listingMode === "contract") {
      return {
        eyebrow: "Logistics opportunity",
        title: "Post a contract",
        description: "Share the route, work scope and requirements so suitable operators can respond.",
        submit: "Publish contract",
      };
    }
    return {
      eyebrow: "Shared listing",
      title: "List a job",
      description: "Post the work, location and exact vehicle or mobile unit you need.",
      submit: "Publish job",
    };
  }, [listingMode]);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("loadlink-theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("loadlink-theme-change"));
  }

  async function handlePosterPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPosterPhoto(file);
    if (!file) {
      setPosterPhotoPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPosterPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    setMessage("");
    const limited = selected.slice(0, photoLimit);
    if (selected.length > photoLimit) setMessage(`This package allows up to ${photoLimit} photos. Extra photos were ignored.`);
    setFiles(limited);
    const previews = await Promise.all(limited.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setPreviewPhotos(previews);
  }

  async function uploadOne(file: File, folder: string, maxWidth = 1200) {
    const resized = await resizePhoto(file, maxWidth, folder === "posters" ? 0.82 : 0.78);
    const safeName = file.name.replace(/[^a-z0-9.]/gi, "-").toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const upload = await supabase.storage.from("job-photos").upload(path, resized, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });
    if (upload.error) throw upload.error;
    return supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
  }

  async function uploadPhotos() {
    const urls: string[] = [];
    for (const file of files) urls.push(await uploadOne(file, "jobs"));
    return urls;
  }

  async function submitJob(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Posting is not connected yet. Add the existing Supabase keys to this Vercel project and redeploy.");
      return;
    }
    if (!title.trim() || !postedBy.trim() || !rate.trim() || !description.trim()) {
      setMessage("Complete the required listing details before publishing.");
      return;
    }
    if (!isValidSouthAfricanPhone(contactNumber)) {
      setMessage("Enter a valid South African number, for example 0821234567 or +27821234567.");
      return;
    }
    if (whatsappNumber && !isValidSouthAfricanPhone(whatsappNumber)) {
      setMessage("Enter a valid WhatsApp number or leave it empty.");
      return;
    }
    if (files.length < 1) {
      setMessage("Please upload at least one clear listing photo.");
      return;
    }

    setIsSaving(true);
    const minimumLoading = wait(900);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      const ownerKey = getAccountOwnerKey(user.id);
      const uploadedUrls = await uploadPhotos();
      const posterPhotoUrl = posterPhoto ? await uploadOne(posterPhoto, "posters", 500) : "";
      const listingType = listingMode === "asset" ? assetType : listingMode === "contract" ? "Contract" : "Job";
      const vehicleLine = listingMode === "job" ? `Vehicle needed: ${vehicleNeeded}\n` : "";
      const storedDescription = `Listing type: ${listingType}\n${vehicleLine}${description.trim()}`;

      const fullListing = {
        title: title.trim(),
        city,
        vehicle_group: group,
        rate: formatListingRate(rate),
        posted_by: postedBy.trim(),
        contact_number: contactNumber.trim(),
        whatsapp_number: whatsappNumber.trim(),
        poster_photo: posterPhotoUrl,
        description: storedDescription,
        photos: uploadedUrls,
        sponsored: false,
        package_type: packageType,
        owner_key: ownerKey,
        user_id: user.id,
      };

      let result = await supabase.from("job_listings").insert(fullListing).select("id").single();
      if (result.error && /column|schema cache|whatsapp_number|poster_photo/i.test(result.error.message)) {
        result = await supabase.from("job_listings").insert({
          title: fullListing.title,
          city: fullListing.city,
          vehicle_group: fullListing.vehicle_group,
          rate: fullListing.rate,
          posted_by: fullListing.posted_by,
          contact_number: fullListing.contact_number,
          description: fullListing.description,
          photos: fullListing.photos,
          sponsored: fullListing.sponsored,
          package_type: fullListing.package_type,
          owner_key: fullListing.owner_key,
          user_id: fullListing.user_id,
        }).select("id").single();
      }
      if (result.error) throw result.error;
      if (result.data?.id) {
        saveOwnedJob(result.data.id, ownerKey);
        window.dispatchEvent(new Event("loadlink-account-state-changed"));
        await recordUserActivity("listing_posted", {
          entityType: "listing",
          entityId: result.data.id,
          metadata: { title: fullListing.title, listingType },
        }).catch(() => undefined);
        await syncAccountState().catch(() => undefined);
      }
      await minimumLoading;
      setIsSaving(false);
      setSubmissionSuccess(true);
      window.setTimeout(() => router.push("/jobs?posted=success"), 1700);
    } catch (error) {
      await minimumLoading;
      setIsSaving(false);
      setMessage(error instanceof Error ? error.message : "The listing could not be uploaded.");
    }
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <LoadLinkLoading />
      </main>
    );
  }

  const surface = darkMode ? "bg-[#111] text-white border-white/10" : "bg-white text-black border-black/10";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-2xl border px-4 font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#171717] text-white placeholder:text-white/30" : "border-black/10 bg-[#faf8f2] text-black placeholder:text-black/35"}`;

  return (
    <main className={`min-h-screen transition-colors duration-500 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      {isSaving ? <LoadLinkLoading /> : null}
      <SubmissionSuccess open={submissionSuccess} />
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <section className="relative h-[300px] overflow-hidden border-b border-[#f6b800]/30 md:h-[380px]">
        <img
          src="/images/jobs/list-job-forklift.jpg"
          alt="Forklift loading a logistics trailer"
          className="absolute inset-0 h-full w-full object-cover object-[center_44%] grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/85" />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-5 pb-8 md:pb-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f6b800]">{pageCopy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black tracking-[-0.055em] text-white md:text-6xl">{pageCopy.title}</h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/80 md:text-base">{pageCopy.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
        <form onSubmit={submitJob} className="grid gap-5">
          <FormCard number="01" title="Listing details" subtitle="Keep it specific so the right operators can find it quickly." darkMode={darkMode}>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label={listingMode === "asset" ? "Listing title" : listingMode === "contract" ? "Contract title" : "Job title"} darkMode={darkMode} wide>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={listingMode === "asset" ? "Mobile fridge available for hire" : listingMode === "contract" ? "Weekly construction material deliveries" : "Side tipper needed for mine route"} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Location" darkMode={darkMode}>
                <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                  {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FieldLabel>
              {listingMode === "job" ? (
                <FieldLabel label="Vehicle or mobile unit needed" darkMode={darkMode}>
                  <select value={vehicleNeeded} onChange={(e) => { const value = e.target.value; setVehicleNeeded(value); setGroup(groupForVehicle(value)); }} className={inputClass}>
                    {vehicleNeedOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </FieldLabel>
              ) : listingMode === "asset" ? (
                <FieldLabel label="What are you listing?" darkMode={darkMode}>
                  <select value={assetType} onChange={(e) => { const value = e.target.value; setAssetType(value); setGroup(groupForVehicle(value)); }} className={inputClass}>
                    {assetTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </FieldLabel>
              ) : (
                <FieldLabel label="Contract category" darkMode={darkMode}>
                  <select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className={inputClass}>
                    {groups.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </FieldLabel>
              )}
              <FieldLabel label={listingMode === "asset" ? "Rate or hire price" : "Budget or rate"} darkMode={darkMode}>
                <input required value={rate} onChange={(e) => setRate(e.target.value)} placeholder="R2 500 per load or Request a quote" className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Description" darkMode={darkMode} wide>
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={listingMode === "asset" ? "Describe the unit, condition, availability and service area" : listingMode === "contract" ? "Explain the route, load, frequency and contract requirements" : "Explain the route, load, dates and important requirements"} className={`${inputClass} min-h-32 py-3`} />
              </FieldLabel>
            </div>
          </FormCard>

          <FormCard number="02" title="Contact and chat profile" subtitle="These details help interested users know who they are speaking to." darkMode={darkMode}>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Name or company" darkMode={darkMode}>
                <input required value={postedBy} onChange={(e) => setPostedBy(e.target.value)} placeholder="Your name or company name" className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Contact number" darkMode={darkMode}>
                <input required type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="0821234567" className={inputClass} />
              </FieldLabel>
              <FieldLabel label="WhatsApp number (optional)" darkMode={darkMode}>
                <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Leave empty to use contact number" className={inputClass} />
              </FieldLabel>
              <div className={`rounded-2xl border p-4 ${surface}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b88900]">Optional profile picture</p>
                <p className={`mt-2 text-sm leading-6 ${muted}`}>Use a clear face photo or business logo. It will appear on your listing and inside chat to improve trust.</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6b800]/50 ${darkMode ? "bg-black" : "bg-[#f4efe3]"}`}>
                    {posterPhotoPreview ? <img src={posterPhotoPreview} alt="Chat profile preview" className="h-full w-full object-cover" /> : <UserIcon />}
                  </div>
                  <label className="inline-flex cursor-pointer rounded-full border border-[#f6b800] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#b88900]">
                    Choose photo
                    <input type="file" accept="image/*" onChange={handlePosterPhoto} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard number="03" title="Photos and visibility" subtitle="Your first image becomes the cover shown in search results." darkMode={darkMode}>
            <label className={`block cursor-pointer rounded-2xl border border-dashed border-[#f6b800]/70 p-5 text-center ${darkMode ? "bg-[#12100a]" : "bg-[#fff9e8]"}`}>
              <span className="block text-sm font-black">Upload listing photos</span>
              <span className={`mt-2 block text-xs ${muted}`}>Choose clear landscape or square images. Selected: {files.length}/{photoLimit}</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-4 block w-full text-sm" />
            </label>

            {previewPhotos.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previewPhotos.slice(0, 6).map((photo, index) => (
                  <div key={photo + index} className={`relative aspect-[4/3] overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}>
                    <img src={photo} alt="" className="h-full w-full object-cover object-center" />
                    {index === 0 ? <span className="absolute left-2 top-2 rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Cover</span> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className={`mt-5 border border-[#f6b800]/45 p-4 ${darkMode ? "bg-[#f6b800]/10" : "bg-[#fff7dc]"}`}>
              <p className="text-sm font-black">Free job posting</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Job and contract opportunities are free to publish after sign-in. This form allows up to 5 clear photos. Vehicle sales and vehicle stock must use the paid List Your Truck flow.</p>
            </div>
          </FormCard>

          {message ? <p className="rounded-2xl border border-[#f6b800] bg-[#fff4c8] p-4 text-sm font-bold text-[#6f5200]">{message}</p> : null}

          <button type="submit" disabled={isSaving} className="h-14 w-full rounded-2xl border border-[#f6b800] bg-[#f6b800] text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_16px_35px_rgba(184,137,0,.2)] transition active:scale-[.99] disabled:opacity-50">
            {pageCopy.submit}
          </button>
        </form>

        <section className={`mt-8 rounded-3xl border p-5 md:p-6 ${surface}`}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b88900]">Before you publish</p>
          <div className="mt-3 divide-y divide-black/10">
            <FaqItem question="What information helps me find the right operator?" darkMode={darkMode}>Use a specific title, exact location, vehicle needed, route or service area, rate and clear dates.</FaqItem>
            <FaqItem question="How will people contact me?" darkMode={darkMode}>Your contact number and optional WhatsApp number appear on the listing. Your optional profile picture also appears in chat.</FaqItem>
            <FaqItem question="How do I make the listing image show properly?" darkMode={darkMode}>Upload the clearest image first. LoadLink uses it as the cover and keeps the centre of the image visible.</FaqItem>
          </div>
          <Link href="/help" className="mt-5 inline-flex rounded-full border border-[#f6b800] px-5 py-3 text-sm font-black text-[#b88900]">Open Help Centre</Link>
        </section>
      </section>
    </main>
  );
}

function FormCard({ number, title, subtitle, darkMode, children }: { number: string; title: string; subtitle: string; darkMode: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-[28px] border p-5 shadow-[0_14px_45px_rgba(0,0,0,.07)] md:p-7 ${darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>
      <div className="mb-5 flex gap-4 border-b border-black/10 pb-5">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f6b800] text-xs font-black text-black">{number}</span>
        <div>
          <h2 className="text-xl font-black tracking-[-.03em]">{title}</h2>
          <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-white/50" : "text-black/50"}`}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label, darkMode, wide = false, children }: { label: string; darkMode: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className={`mb-2 block text-xs font-black uppercase tracking-[0.15em] ${darkMode ? "text-white/65" : "text-black/60"}`}>{label}</span>
      {children}
    </label>
  );
}

function FaqItem({ question, darkMode, children }: { question: string; darkMode: boolean; children: React.ReactNode }) {
  return (
    <details className={darkMode ? "border-white/10" : "border-black/10"}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-black">
        {question}<span className="text-[#f6b800]">+</span>
      </summary>
      <p className={`pb-4 pr-7 text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{children}</p>
    </details>
  );
}

function Header({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
      <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
        <div className="flex items-center gap-2">
          <Link href="/jobs" className={`flex h-10 w-10 items-center justify-center ${darkMode ? "text-white" : "text-black"}`} aria-label="Back to jobs"><BackIcon /></Link>
          <AuthStatusButton darkMode={darkMode} />
        </div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <button onClick={toggleDarkMode} className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-yellow-400/70 bg-yellow-400 text-black" : "border-black/10 bg-black text-[#f6b800]"}`} aria-label="Toggle colour mode">{darkMode ? <SunIcon /> : <MoonIcon />}</button>
      </div>
    </header>
  );
}

function UserIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c.7-4.2 3.8-6.8 8-6.8s7.3 2.6 8 6.8" fill="currentColor"/></svg>;
}
function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function UserPlusIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M2.5 21c.7-4.2 3-6.5 6.5-6.5s5.8 2.3 6.5 6.5M18 7v6M15 10h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function MoonIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" fill="currentColor"/></svg>;
}
function SunIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
