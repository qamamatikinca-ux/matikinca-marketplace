"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import HomeLogoLink from "@/components/HomeLogoLink";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentRelativePath, loginHref } from "@/lib/auth";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, revokePreviewUrl, validateImageFile } from "@/lib/mobilePosting";
import { getFreshAuthenticatedUser, postingErrorMessage, withTransientRetry } from "@/lib/reliableSupabase";
import { submitJobListing } from "@/lib/listingSubmission";
import { getAccountOwnerKey } from "@/lib/chatKeys";
import AuthStatusButton from "@/components/AuthStatusButton";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import PhotoLimitUpgradeToast from "@/components/PhotoLimitUpgradeToast";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
type ListingMode = "job" | "asset" | "contract";


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
  const [packageType] = useState<"standard">("standard");
  const [boostJob, setBoostJob] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [posterPhoto, setPosterPhoto] = useState<File | null>(null);
  const [posterPhotoPreview, setPosterPhotoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState("");
  const [message, setMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [photoLimitToast, setPhotoLimitToast] = useState(false);
  const [submittedListingId, setSubmittedListingId] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const submissionIdRef = useRef("");
  const previewUrlsRef = useRef<string[]>([]);
  const posterPreviewRef = useRef("");

  const photoLimit = 5;

  useEffect(() => {
    setDarkMode(localStorage.getItem("loadlink-theme") === "dark");
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "asset" || mode === "contract") setListingMode(mode);

    async function requireAccount() {
      if (!isSupabaseConfigured) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      const user = await getFreshAuthenticatedUser();

      if (!user) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      await syncAccountState().catch(() => undefined);
      setAuthReady(true);
    }

    requireAccount().catch(() => router.replace(loginHref(currentRelativePath())));
  }, [router]);

  useEffect(() => {
    try {
      submissionIdRef.current = localStorage.getItem("loadlink-job-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-job-submission-id", submissionIdRef.current);
      const saved = JSON.parse(localStorage.getItem("loadlink-job-draft-v1") || "null");
      if (!saved) return;
      setListingMode(saved.listingMode || "job"); setAssetType(saved.assetType || "Truck"); setVehicleNeeded(saved.vehicleNeeded || "Any suitable vehicle");
      setTitle(saved.title || ""); setCity(saved.city || "Johannesburg"); setGroup(saved.group || "Trucks / Trailers");
      setRate(saved.rate || ""); setPostedBy(saved.postedBy || ""); setContactNumber(saved.contactNumber || "");
      setWhatsappNumber(saved.whatsappNumber || ""); setDescription(saved.description || ""); setBoostJob(Boolean(saved.boostJob));
      submissionIdRef.current = String(saved.submissionId || localStorage.getItem("loadlink-job-submission-id") || createSafeRandomId());
      localStorage.setItem("loadlink-job-submission-id", submissionIdRef.current);
    } catch {
      submissionIdRef.current = localStorage.getItem("loadlink-job-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-job-submission-id", submissionIdRef.current);
    }
  }, []);

  useEffect(() => {
    const draft = { listingMode, assetType, vehicleNeeded, title, city, group, rate, postedBy, contactNumber, whatsappNumber, description, boostJob, submissionId: submissionIdRef.current || localStorage.getItem("loadlink-job-submission-id") || "" };
    const timer = window.setTimeout(() => localStorage.setItem("loadlink-job-draft-v1", JSON.stringify(draft)), 150);
    return () => window.clearTimeout(timer);
  }, [listingMode, assetType, vehicleNeeded, title, city, group, rate, postedBy, contactNumber, whatsappNumber, description, boostJob]);

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

  function replacePosterPreview(nextUrl: string) {
    revokePreviewUrl(posterPreviewRef.current);
    posterPreviewRef.current = nextUrl;
    setPosterPhotoPreview(nextUrl);
  }

  function replaceListingPreviews(nextUrls: string[]) {
    previewUrlsRef.current.forEach(revokePreviewUrl);
    previewUrlsRef.current = nextUrls;
    setPreviewPhotos(nextUrls);
  }

  async function handlePosterPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setMessage("");
    if (!file) {
      setPosterPhoto(null);
      replacePosterPreview("");
      return;
    }

    const validation = validateImageFile(file, "Profile photo");
    if (validation) {
      setMessage(validation);
      return;
    }

    setIsPreparingPhotos(true);
    setPhotoProgress("Preparing profile photo…");
    try {
      const prepared = await prepareImageFileForForm(file, {
        maxWidth: 720,
        maxHeight: 720,
        quality: 0.78,
        namePrefix: "loadlink-profile",
      });
      setPosterPhoto(prepared.file);
      replacePosterPreview(prepared.previewUrl);
    } catch (error) {
      setMessage(readableUploadError(error, "The profile photo could not be prepared."));
    } finally {
      setIsPreparingPhotos(false);
      setPhotoProgress("");
    }
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, photoLimit);
    const hadExtraPhotos = (event.target.files?.length || 0) > photoLimit;
    event.target.value = "";
    setMessage("");
    if (!selected.length) return;

    setIsPreparingPhotos(true);
    const preparedFiles: File[] = [];
    const preparedUrls: string[] = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        const source = selected[index];
        const validation = validateImageFile(source, source.name || `Photo ${index + 1}`);
        if (validation) throw new Error(validation);
        setPhotoProgress(`Preparing photo ${index + 1} of ${selected.length}…`);
        const prepared = await prepareImageFileForForm(source, {
          maxWidth: 1440,
          maxHeight: 1440,
          quality: 0.76,
          namePrefix: `loadlink-listing-${index + 1}`,
        });
        preparedFiles.push(prepared.file);
        preparedUrls.push(prepared.previewUrl);
        await wait(20);
      }

      setFiles(preparedFiles);
      replaceListingPreviews(preparedUrls);
      if (hadExtraPhotos) {
        setMessage(`We kept the first ${photoLimit} photos.`);
        setPhotoLimitToast(false);
        window.requestAnimationFrame(() => setPhotoLimitToast(true));
      }
    } catch (error) {
      preparedUrls.forEach(revokePreviewUrl);
      setMessage(readableUploadError(error, "One selected photo could not be prepared."));
    } finally {
      setIsPreparingPhotos(false);
      setPhotoProgress("");
    }
  }

  useEffect(() => () => {
    previewUrlsRef.current.forEach(revokePreviewUrl);
    revokePreviewUrl(posterPreviewRef.current);
  }, []);

  function currentSubmissionId() {
    if (!submissionIdRef.current) {
      submissionIdRef.current = localStorage.getItem("loadlink-job-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-job-submission-id", submissionIdRef.current);
    }
    return submissionIdRef.current;
  }

  async function uploadOne(file: File, userId: string, submissionId: string, folder: string, index: number) {
    const contentType = inferUploadContentType(file);
    const path = `${userId}/${folder}/${submissionId}/${index}.${imageExtension(contentType)}`;
    await withTransientRetry(async () => {
      const upload = await supabase.storage.from("job-photos").upload(path, file, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });
      if (upload.error) throw upload.error;
    });
    const publicUrl = supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
    if (!publicUrl) throw new Error("The uploaded photo URL could not be created.");
    return publicUrl;
  }

  async function uploadPhotos(userId: string, submissionId: string) {
    const urls: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      urls.push(await uploadOne(files[index], userId, submissionId, "jobs", index));
    }
    return urls;
  }

  async function submitJob(event: FormEvent) {
    event.preventDefault();
    if (submitLockRef.current || isSaving || isPreparingPhotos) return;
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
    if (isPreparingPhotos) {
      setMessage("Wait for the selected photos to finish preparing.");
      return;
    }
    if (files.length < 1) {
      setMessage("Please upload at least one clear listing photo.");
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);
    const minimumLoading = wait(350);
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) throw new Error("Your sign-in session could not be confirmed.");

      const submissionId = currentSubmissionId();
      const ownerKey = getAccountOwnerKey(user.id);
      const uploadedUrls = await uploadPhotos(user.id, submissionId);
      const posterPhotoUrl = posterPhoto ? await uploadOne(posterPhoto, user.id, submissionId, "posters", 0) : "";
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
        listing_kind: listingMode === "contract" ? "contract" : listingMode === "asset" ? "asset" : "job",
        status: "active",
        moderation_status: "pending",
        client_request_id: submissionId,
      };

      const listingId = await submitJobListing({
        payload: fullListing,
        userId: user.id,
        submissionId,
        rpcArguments: {
          p_title: fullListing.title,
          p_city: fullListing.city,
          p_vehicle_group: fullListing.vehicle_group,
          p_rate: fullListing.rate,
          p_posted_by: fullListing.posted_by,
          p_contact_number: fullListing.contact_number,
          p_whatsapp_number: fullListing.whatsapp_number,
          p_poster_photo: fullListing.poster_photo,
          p_description: fullListing.description,
          p_photos: fullListing.photos,
          p_listing_kind: fullListing.listing_kind,
          p_client_request_id: fullListing.client_request_id,
          p_owner_key: fullListing.owner_key,
        },
      });

      if (boostJob) {
        const boostResult = await supabase.from("job_boosts").upsert({
          listing_id: listingId,
          user_id: user.id,
          amount_cents: 1400,
          status: "pending_payment",
          requested_at: new Date().toISOString(),
        }, { onConflict: "listing_id,user_id" });
        if (boostResult.error && !/relation|schema cache|does not exist|constraint/i.test(boostResult.error.message)) throw boostResult.error;
      }

      saveOwnedJob(listingId, ownerKey);
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      await recordUserActivity("listing_posted", {
        entityType: "listing",
        entityId: listingId,
        metadata: { title: fullListing.title, listingType },
      }).catch(() => undefined);
      await syncAccountState().catch(() => undefined);
      await minimumLoading;
      localStorage.removeItem("loadlink-job-draft-v1");
      localStorage.removeItem("loadlink-job-submission-id");
      submissionIdRef.current = createSafeRandomId();
      setSubmittedListingId(listingId);
      setSubmissionSuccess(true);
    } catch (error) {
      await minimumLoading;
      setMessage(postingErrorMessage(error, readableUploadError(error, "The listing could not be uploaded.")));
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
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
      <PhotoLimitUpgradeToast open={photoLimitToast} onClose={() => setPhotoLimitToast(false)} limit={photoLimit} />
      <SubmissionSuccess
        open={submissionSuccess}
        title={listingMode === "contract" ? "Contract published" : listingMode === "asset" ? "Listing published" : "Job published"}
        message="Your post is live on LoadLink. Before you continue, you can rate how the posting process felt."
        listingId={submittedListingId}
        listingTitle={title.trim()}
        surface={listingMode}
        enableFeedback
        continueLabel="View jobs"
        onContinue={() => router.push("/jobs?posted=success")}
      />
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
                <SouthAfricaLocationInput value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Listing location" className={inputClass} required />
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
                    <input type="file" accept="image/*" onChange={handlePosterPhoto} disabled={isPreparingPhotos || isSaving} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard number="03" title="Photos and visibility" subtitle="Your first image becomes the cover shown in search results." darkMode={darkMode}>
            <label className={`block cursor-pointer rounded-2xl border border-dashed border-[#f6b800]/70 p-5 text-center ${darkMode ? "bg-[#12100a]" : "bg-[#fff9e8]"}`}>
              <span className="block text-sm font-black">Upload listing photos</span>
              <span className={`mt-2 block text-xs ${muted}`}>{photoProgress || `Choose clear landscape or square images. Selected: ${files.length}/${photoLimit}`}</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotos} disabled={isPreparingPhotos || isSaving} className="mt-4 block w-full text-sm disabled:opacity-50" />
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

            <div className={`mt-5 overflow-hidden rounded-2xl border ${boostJob ? "border-[#f6b800] bg-[#fff7d7] text-black" : surface}`}>
              <label className="flex cursor-pointer items-start gap-4 p-5">
                <input type="checkbox" checked={boostJob} onChange={(event) => setBoostJob(event.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-base font-black">Boost this job on the homepage</strong><strong className="rounded-full bg-[#f6b800] px-3 py-1 text-xs font-black text-black">R14 once off</strong></span>
                  <span className="mt-2 block text-xs font-semibold leading-5 opacity-60">Your job is posted free. Select this optional boost to request seven days of priority homepage placement. The control centre activates it after payment is confirmed.</span>
                </span>
              </label>
            </div>
          </FormCard>

          {message ? <p className="rounded-2xl border border-[#f6b800] bg-[#fff4c8] p-4 text-sm font-bold text-[#6f5200]">{message}</p> : null}

          <button type="submit" disabled={isSaving || isPreparingPhotos} className="h-14 w-full rounded-2xl border border-[#f6b800] bg-[#f6b800] text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_16px_35px_rgba(184,137,0,.2)] transition active:scale-[.99] disabled:opacity-50">
            {isPreparingPhotos ? "Preparing photos…" : isSaving ? "Publishing…" : pageCopy.submit}
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
          <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
          <AuthStatusButton darkMode={darkMode} />
        </div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} className="ml-auto" />
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
