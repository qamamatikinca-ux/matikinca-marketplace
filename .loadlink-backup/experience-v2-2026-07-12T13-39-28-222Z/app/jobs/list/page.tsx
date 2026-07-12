"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { formatListingRate } from "@/lib/formatCurrency";
import { ensureGuestSession } from "@/lib/ensureGuestSession";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
type ListingMode = "job" | "asset" | "contract";

const cityOptions = ["Johannesburg", "Sandton", "Midrand", "Pretoria", "Centurion", "Soweto", "Tembisa", "Kempton Park", "Boksburg", "Benoni", "Germiston", "Randburg", "Roodepoort", "Durban", "Pinetown", "Umhlanga", "Cape Town", "Bellville", "Stellenbosch", "Paarl", "George", "Gqeberha", "East London", "Bloemfontein", "Kimberley", "Rustenburg", "Polokwane", "Mbombela", "Emalahleni", "Mthatha"];
const groups: VehicleGroup[] = ["Catering / Event", "Trucks / Trailers", "Farming / Mining"];
const assetTypes = ["Truck", "Trailer", "Mobile toilet", "Mobile fridge", "Food truck", "Mobile kitchen", "Other mobile unit"];
const vehicleNeedOptions = [
  "Any suitable vehicle", "Bakkie", "Van", "Closed truck", "Flat deck", "Side tipper", "Superlink", "Lowbed", "Tautliner", "Refrigerated truck", "Mobile toilet", "Mobile fridge", "Food truck", "Mobile kitchen", "Other mobile unit"
];

function groupForVehicle(value: string): VehicleGroup {
  if (["Mobile toilet", "Mobile fridge", "Food truck", "Mobile kitchen"].includes(value)) return "Catering / Event";
  return "Trucks / Trailers";
}

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

function getOwnerKey() {
  const existing = localStorage.getItem("loadlink-device-key");
  if (existing) return existing;

  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  localStorage.setItem("loadlink-device-key", key);
  return key;
}

function saveOwnedJob(jobId: string, ownerKey: string) {
  try {
    const saved = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}");
    saved[jobId] = ownerKey;
    localStorage.setItem("loadlink-owned-job-keys", JSON.stringify(saved));
  } catch {
    localStorage.setItem("loadlink-owned-job-keys", JSON.stringify({ [jobId]: ownerKey }));
  }
}

function resizePhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 1000;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) reject(new Error("Could not convert image."));
          else resolve(blob);
        }, "image/jpeg", 0.74);
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

  useEffect(() => {
    const savedTheme = localStorage.getItem("loadlink-theme");
    if (savedTheme === "dark") setDarkMode(true);
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "asset" || mode === "contract") setListingMode(mode);
  }, []);

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem("loadlink-theme", nextMode ? "dark" : "light");
    window.dispatchEvent(new Event("loadlink-theme-change"));
  }

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [rate, setRate] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [posterPhoto, setPosterPhoto] = useState<File | null>(null);
  const [posterPhotoPreview, setPosterPhotoPreview] = useState("");
  const [description, setDescription] = useState("");
  const [packageType, setPackageType] = useState<"standard" | "pro">("standard");
  const [files, setFiles] = useState<File[]>([]);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const photoLimit = packageType === "pro" ? 15 : 5;

  async function handlePosterPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPosterPhoto(file);
    if (!file) return setPosterPhotoPreview("");
    const reader = new FileReader();
    reader.onload = () => setPosterPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handlePhotos(e: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    setMessage("");

    if (selectedFiles.length < 1) {
      setFiles([]);
      setPreviewPhotos([]);
      return;
    }

    if (selectedFiles.length > photoLimit) {
      setMessage(`This package allows up to ${photoLimit} photos. Extra photos were ignored.`);
    }

    const limitedFiles = selectedFiles.slice(0, photoLimit);
    setFiles(limitedFiles);

    const previews = await Promise.all(limitedFiles.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));

    setPreviewPhotos(previews);
  }

  async function uploadOne(file: File, folder: string, maxWidth = 1000) {
    const resizedBlob = await resizePhoto(file);
    const safeFileName = file.name.replace(/[^a-z0-9.]/gi, "-").toLowerCase();
    const filePath = `${folder}/${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage.from("job-photos").upload(filePath, resizedBlob, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });

    if (error) throw error;
    const { data } = supabase.storage.from("job-photos").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function uploadPhotos() {
    const uploadedUrls: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const resizedBlob = await resizePhoto(file);
      const safeFileName = file.name.replace(/[^a-z0-9.]/gi, "-").toLowerCase();
      const filePath = `jobs/${Date.now()}-${index}-${safeFileName}`;

      const { error } = await supabase.storage.from("job-photos").upload(filePath, resizedBlob, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from("job-photos").getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  }

  async function submitJob(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Posting is not connected yet. Add Supabase keys to this Vercel project and redeploy.");
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
      setMessage("Please upload at least 1 photo.");
      return;
    }

    setIsSaving(true);
    const minimumLoading = wait(900);

    try {
      const ownerKey = getOwnerKey();
      let guestUser: { id: string } | null = null;
      try {
        guestUser = await ensureGuestSession();
      } catch {
        // Posting and no-login chat still work through the private owner key.
      }
      const uploadedUrls = await uploadPhotos();
      const posterPhotoUrl = posterPhoto ? await uploadOne(posterPhoto, "posters", 500) : "";

      const listingType = listingMode === "asset" ? assetType : listingMode === "contract" ? "Contract" : "Job";
      const vehicleLine = listingMode === "job" ? `Vehicle needed: ${vehicleNeeded}\n` : "";
      const storedDescription = `Listing type: ${listingType}\n${vehicleLine}${description}`;

      const fullListing = {
        title,
        city,
        vehicle_group: group,
        rate: formatListingRate(rate),
        posted_by: postedBy,
        contact_number: contactNumber,
        whatsapp_number: whatsappNumber,
        poster_photo: posterPhotoUrl,
        description: storedDescription,
        photos: uploadedUrls,
        sponsored: packageType === "pro",
        package_type: packageType,
        owner_key: ownerKey,
        user_id: guestUser?.id || null,
      };

      let result = await supabase
        .from("job_listings")
        .insert(fullListing)
        .select("id")
        .single();

      if (result.error && /column|schema cache|user_id|whatsapp_number|poster_photo/i.test(result.error.message)) {
        result = await supabase
          .from("job_listings")
          .insert({
            title,
            city,
            vehicle_group: group,
            rate: formatListingRate(rate),
            posted_by: postedBy,
            contact_number: contactNumber,
            description: storedDescription,
            photos: uploadedUrls,
            sponsored: packageType === "pro",
            package_type: packageType,
            owner_key: ownerKey,
          })
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      if (result.data?.id) saveOwnedJob(result.data.id, ownerKey);

      await minimumLoading;
      router.push("/jobs?posted=success");
    } catch (error) {
      await minimumLoading;
      setIsSaving(false);
      setMessage(error instanceof Error ? error.message : "The listing could not be uploaded.");
    }
  }

  const pageTitle = listingMode === "asset" ? "List a vehicle or mobile unit" : listingMode === "contract" ? "Post a contract" : "List a job";
  const pageDescription = listingMode === "asset"
    ? "List trucks, trailers, mobile toilets, mobile fridges, food trucks or another mobile unit."
    : listingMode === "contract"
      ? "Post a logistics contract for operators and service providers to find."
      : "Post the work, location and exact vehicle or mobile unit you need.";

  return (
    <main className="min-h-screen bg-black text-white transition-colors duration-500">
      {isSaving ? <LoadLinkLoading /> : null}
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <section className="relative overflow-hidden">
        <img src="/images/jobs/list-job-forklift.jpg" alt="Forklift loading a logistics trailer" className="absolute inset-x-0 top-0 h-[680px] w-full object-cover grayscale" />
        <div className="absolute inset-x-0 top-0 h-[760px] bg-gradient-to-b from-black/30 via-black/78 to-black" />
        <div className="relative mx-auto max-w-3xl px-5 py-8">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-[#f6b800]">Shared listing</p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.06em]">{pageTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-white/65">{pageDescription}</p>

        <form onSubmit={submitJob} className="mt-7 border border-[#f6b800] bg-[#080808] p-5">
          <div className="grid gap-4">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">1. Listing details</p>
              <p className="mt-2 text-sm text-white/55">Keep it specific so the right operators can find it quickly.</p>
            </div>

            <FieldLabel label={listingMode === "asset" ? "Listing title" : listingMode === "contract" ? "Contract title" : "Job title"}>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={listingMode === "asset" ? "Mobile fridge available for hire" : listingMode === "contract" ? "Weekly construction material deliveries" : "Side tipper needed for mine route"} className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>

            <FieldLabel label="Location">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]">
                {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </FieldLabel>

            {listingMode === "job" ? (
              <FieldLabel label="What vehicle or mobile unit do you need?">
                <select value={vehicleNeeded} onChange={(e) => { const value = e.target.value; setVehicleNeeded(value); setGroup(groupForVehicle(value)); }} className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]">
                  {vehicleNeedOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FieldLabel>
            ) : listingMode === "asset" ? (
              <FieldLabel label="What are you listing?">
                <select value={assetType} onChange={(e) => { const value = e.target.value; setAssetType(value); setGroup(groupForVehicle(value)); }} className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]">
                  {assetTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FieldLabel>
            ) : (
              <FieldLabel label="Contract category">
                <select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]">
                  {groups.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FieldLabel>
            )}

            <FieldLabel label={listingMode === "asset" ? "Rate or hire price" : "Budget or rate"}>
              <input required value={rate} onChange={(e) => setRate(e.target.value)} placeholder="R2 500 per load or Request a quote" className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>

            <FieldLabel label="Description">
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={listingMode === "asset" ? "Describe the unit, condition, availability and service area" : listingMode === "contract" ? "Explain the route, load, frequency and contract requirements" : "Explain the route, load, dates and any important requirements"} className="min-h-28 w-full border border-white/15 bg-white px-4 py-3 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>
          </div>

          <div className="mt-7 grid gap-4 border-t border-white/10 pt-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">2. Contact details</p>
              <p className="mt-2 text-sm text-white/55">These details appear on the listing so interested users can contact you.</p>
            </div>

            <FieldLabel label="Name or company">
              <input required value={postedBy} onChange={(e) => setPostedBy(e.target.value)} placeholder="Your name or company name" className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>

            <FieldLabel label="Contact number">
              <input required type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="0821234567" className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>

            <FieldLabel label="WhatsApp number (optional)">
              <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Leave empty to use the contact number" className="h-12 w-full border border-white/15 bg-white px-4 font-bold text-black outline-none focus:border-[#f6b800]" />
            </FieldLabel>
          </div>

          <div className="mt-7 grid gap-4 border-t border-white/10 pt-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">3. Photos</p>
              <p className="mt-2 text-sm leading-6 text-white/60">Upload the clearest photo first. It becomes the cover image people see in search results.</p>
            </div>

            <label className="border border-white/15 bg-black p-4">
              <span className="block text-sm font-black">Upload listing photos</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-3 block w-full text-sm" />
              <span className="mt-3 block text-xs text-white/55">Selected: {files.length}/{photoLimit} photos</span>
            </label>

            {previewPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previewPhotos.slice(0, 6).map((photo, index) => (
                  <div key={photo + index} className="relative aspect-square overflow-hidden bg-white/5">
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? <span className="absolute left-1 top-1 bg-[#f6b800] px-2 py-1 text-[10px] font-black uppercase text-black">Cover</span> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <details className="border border-white/15 bg-black">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-black">
                Optional profile and visibility settings
                <span className="text-[#f6b800]">+</span>
              </summary>
              <div className="grid gap-5 border-t border-white/10 p-4">
                <label>
                  <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Face or business logo photo</span>
                  <span className="mt-2 block text-sm text-white/55">Optional. This helps people recognise who posted the listing.</span>
                  <input type="file" accept="image/*" onChange={handlePosterPhoto} className="mt-3 block w-full text-sm" />
                </label>

                {posterPhotoPreview ? <div className="flex items-center gap-3"><img src={posterPhotoPreview} alt="" className="h-16 w-16 object-cover" /><p className="text-sm font-bold text-white/60">Contact poster preview</p></div> : null}

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Listing visibility</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPackageType("standard")} className={`border px-3 py-3 text-left text-sm font-black ${packageType === "standard" ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/15 text-white"}`}>Standard<br /><span className="text-xs font-semibold opacity-65">Up to 5 photos</span></button>
                    <button type="button" onClick={() => setPackageType("pro")} className={`border px-3 py-3 text-left text-sm font-black ${packageType === "pro" ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/15 text-white"}`}>Pro visibility<br /><span className="text-xs font-semibold opacity-65">Up to 15 photos</span></button>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {message ? <p className="mt-5 border border-[#f6b800] bg-black p-3 text-sm font-bold text-[#f6b800]">{message}</p> : null}

          <button type="submit" className="mt-6 h-12 w-full border border-[#f6b800] bg-[#f6b800] text-sm font-black uppercase tracking-wide text-black">{listingMode === "asset" ? "Publish listing" : listingMode === "contract" ? "Publish contract" : "Publish job"}</button>
        </form>

        <section className="mt-10 border-t border-white/15 pt-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6b800]">LoadLink help</p>
          <h2 className="mt-2 text-3xl font-black">Before you publish</h2>
          <div className="mt-5 border-y border-white/15">
            <FaqItem question="What can I post on LoadLink?">You can post logistics jobs, transport contracts, trucks, trailers and useful mobile units such as mobile toilets, mobile fridges, food trucks and mobile kitchens.</FaqItem>
            <FaqItem question="What information helps me find the right operator?">Use a specific title, exact location, vehicle needed, route or service area, rate and clear dates. This helps LoadLink search match your listing with the right people.</FaqItem>
            <FaqItem question="How will people contact me?">Your contact number appears on the listing. You can also add a separate WhatsApp number and an optional face photo or business logo.</FaqItem>
            <FaqItem question="How do I make my listing easier to notice?">Use your strongest photo first, keep the title short and specific, add the real location and update your rate or availability when it changes.</FaqItem>
            <FaqItem question="Why does LoadLink verify users?">Verification helps reduce fake profiles and improves trust between truck owners, operators, companies and people booking mobile services.</FaqItem>
            <Link href="/help" className="mt-5 inline-flex border border-[#f6b800] px-5 py-3 text-sm font-black text-[#f6b800]">More questions? Open the Help Centre</Link>
          </div>
        </section>
        </div>
      </section>
    </main>
  );

}


function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-white/70">{label}</span>{children}</label>;
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="border-b border-white/15 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-black">
        {question}
        <span className="shrink-0 text-[#f6b800]">+</span>
      </summary>
      <p className="pb-5 pr-8 text-sm font-semibold leading-7 text-white/60">{children}</p>
    </details>
  );
}


function Header({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-500 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
      <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className={`flex h-10 w-10 items-center justify-center text-3xl font-black ${darkMode ? "text-white" : "text-black"}`} aria-label="Open menu"><MenuIcon /></Link>
          <Link href="/login" aria-label="Log in or sign up" className={`flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-yellow-400/60 bg-yellow-400 text-black" : "border-black/10 bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)]"}`}><HeaderUserPlusIcon /></Link>
        </div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <button onClick={toggleDarkMode} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${darkMode ? "border-yellow-400/70 bg-yellow-400 text-black" : "border-black/10 bg-black text-[#f6b800]"}`}>{darkMode ? <HeaderSunIcon /> : <HeaderMoonIcon />}</button>
      </div>
    </header>
  );
}
function MenuIcon(){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
function HeaderUserPlusIcon() { return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M10.4 11.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM3.2 20.4c.55-3.85 3.35-6.4 7.2-6.4 2.1 0 3.86.76 5.1 2.07" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 14.2v6.6M14.7 17.5h6.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>; }
function HeaderSunIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function HeaderMoonIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" /></svg>; }
