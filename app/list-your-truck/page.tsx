"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getAccountOwnerKey, getOwnedJobKeys, setOwnedJobKeys } from "@/lib/chatKeys";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  getTruckModel,
  getTruckModels,
  truckCatalog,
  truckYears,
  validateTruckTransmission,
} from "@/lib/truckCatalog";

const cityOptions = [
  "Johannesburg", "Sandton", "Midrand", "Pretoria", "Centurion", "Soweto", "Kempton Park", "Boksburg",
  "Benoni", "Germiston", "Alberton", "Randburg", "Roodepoort", "Krugersdorp", "Vereeniging", "Vanderbijlpark",
  "Durban", "Pinetown", "Umhlanga", "Pietermaritzburg", "Richards Bay", "Cape Town", "Bellville", "Stellenbosch",
  "Paarl", "George", "Gqeberha", "East London", "Mthatha", "Bloemfontein", "Welkom", "Kimberley", "Upington",
  "Rustenburg", "Klerksdorp", "Polokwane", "Mbombela", "Emalahleni", "Middelburg", "Secunda", "Other",
];

const bodyTypes = [
  "Tractor unit / horse", "Side tipper", "Dropside", "Flat deck", "Tautliner", "Refrigerated body", "Closed box body",
  "Lowbed", "Mixer", "Tipper", "Tanker", "Curtainsider", "Car carrier", "Refuse truck", "Tow truck", "Fire truck",
  "Crane truck", "Logging truck", "Other",
];

const gearboxOptions = ["Manual", "Automatic", "Automated manual", "Electric direct drive", "Converted / custom"];
const acceptedDocuments = ".jpg,.jpeg,.png,.webp,.pdf";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function isValidSouthAfricanPhone(value: string) {
  const clean = normalizePhone(value);
  return /^0\d{9}$/.test(clean) || /^\+27\d{9}$/.test(clean);
}

function resizePhoto(file: File, maxWidth = 1600, quality = 0.82): Promise<Blob> {
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
        if (!context) return reject(new Error("Could not process the vehicle image."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the vehicle image.")), "image/jpeg", quality);
      };
      image.onerror = () => reject(new Error("Could not read the vehicle image."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the vehicle image."));
    reader.readAsDataURL(file);
  });
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

type ReferenceImage = {
  imageUrl: string;
  title: string;
  exactMatch: boolean;
  credit?: string;
  license?: string;
  sourceUrl?: string;
};

type VerificationFiles = {
  idDocument: File | null;
  driverLicence: File | null;
  registrationPaper: File | null;
  ownershipProof: File | null;
  roadworthy: File | null;
  operatingLicence: File | null;
  modificationProof: File | null;
};

const emptyVerificationFiles: VerificationFiles = {
  idDocument: null,
  driverLicence: null,
  registrationPaper: null,
  ownershipProof: null,
  roadworthy: null,
  operatingLicence: null,
  modificationProof: null,
};

export default function ListYourTruckPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [year, setYear] = useState(2026);
  const [brand, setBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelConfirmed, setModelConfirmed] = useState(false);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [bodyType, setBodyType] = useState("Tractor unit / horse");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [axleConfiguration, setAxleConfiguration] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vin, setVin] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [gvmKg, setGvmKg] = useState("");
  const [payloadKg, setPayloadKg] = useState("");
  const [rate, setRate] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const [packageType, setPackageType] = useState<"standard" | "pro">("standard");
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [vehiclePreviews, setVehiclePreviews] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationFiles>(emptyVerificationFiles);
  const [confirmOwnership, setConfirmOwnership] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  const availableModels = useMemo(() => getTruckModels(brand, year), [brand, year]);
  const selectedModel = useMemo(() => getTruckModel(brand, modelName, year), [brand, modelName, year]);
  const transmissionCheck = useMemo(
    () => transmission ? validateTruckTransmission(brand, modelName, year, transmission) : null,
    [brand, modelName, year, transmission],
  );

  useEffect(() => {
    queueMicrotask(() => setDarkMode(localStorage.getItem("loadlink-theme") === "dark"));

    async function requireAccount() {
      if (!isSupabaseConfigured) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }
      await syncAccountState().catch(() => undefined);
      setPostedBy(String(user.user_metadata?.full_name || user.user_metadata?.name || ""));
      setAuthReady(true);
    }

    requireAccount().catch(() => router.replace(loginHref(currentRelativePath())));
  }, [router]);


  useEffect(() => {
    if (!brand || !modelName) return;
    let active = true;
    fetch(`/api/truck-image?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(modelName)}&year=${year}`, { cache: "force-cache" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setReferenceImage(data);
      })
      .catch(() => {
        if (!active) return;
        setReferenceImage(null);
      })
      .finally(() => active && setImageLoading(false));
    return () => { active = false; };
  }, [brand, modelName, year]);

  function changeYear(nextYear: number) {
    setYear(nextYear);
    setModelName("");
    setModelConfirmed(false);
    setReferenceImage(null);
    setTransmission("");
    setFuelType("");
    setAxleConfiguration("");
    setImageLoading(false);
  }

  function changeBrand(nextBrand: string) {
    setBrand(nextBrand);
    setModelName("");
    setModelConfirmed(false);
    setReferenceImage(null);
    setTransmission("");
    setFuelType("");
    setAxleConfiguration("");
    setImageLoading(false);
  }

  function changeModel(nextModel: string) {
    setModelName(nextModel);
    setModelConfirmed(false);
    setReferenceImage(null);
    setTransmission("");
    setFuelType("");
    setAxleConfiguration("");
    setImageLoading(Boolean(nextModel));
  }

  function confirmSelectedModel() {
    if (!selectedModel) {
      setMessage("Choose a valid year, truck brand and model first.");
      return;
    }
    setMessage("");
    setTitle(`${year} ${brand} ${modelName}`);
    setTransmission(selectedModel.transmissions[0] || "");
    setFuelType(selectedModel.fuels[0] || "Diesel");
    setAxleConfiguration(selectedModel.axleConfigurations[0] || "4x2");
    setModelConfirmed(true);
    requestAnimationFrame(() => document.getElementById("vehicle-information")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function handleVehiclePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, packageType === "pro" ? 15 : 8);
    setVehiclePhotos(selected);
    const previews = await Promise.all(selected.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setVehiclePreviews(previews);
  }

  function setDocument(key: keyof VerificationFiles, file: File | null) {
    setDocuments((current) => ({ ...current, [key]: file }));
  }

  async function uploadVehiclePhoto(file: File, userId: string) {
    const resized = await resizePhoto(file);
    const path = `trucks/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(file.name)}.jpg`;
    const result = await supabase.storage.from("job-photos").upload(path, resized, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });
    if (result.error) throw result.error;
    return supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
  }

  async function uploadVerificationDocument(file: File, userId: string, folder: string, label: string) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${label} must be smaller than 10 MB.`);
    const path = `${userId}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
    const result = await supabase.storage.from("vehicle-verification").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
    if (result.error) throw result.error;
    return path;
  }

  function validateBeforeSubmit() {
    if (!modelConfirmed || !selectedModel) return "Confirm the exact truck model before continuing.";
    if (!transmissionCheck?.valid) return transmissionCheck?.message || "Choose a valid gearbox.";
    if (!title.trim() || !postedBy.trim() || !rate.trim() || !description.trim()) return "Complete all required vehicle and listing fields.";
    if (!registrationNumber.trim() || vin.trim().length < 8 || !engineNumber.trim()) return "Enter the registration number, VIN/chassis number and engine number.";
    if (!odometerKm || Number(odometerKm) < 0) return "Enter a valid odometer reading.";
    if (!isValidSouthAfricanPhone(contactNumber)) return "Enter a valid South African contact number.";
    if (whatsappNumber && !isValidSouthAfricanPhone(whatsappNumber)) return "Enter a valid WhatsApp number or leave it blank.";
    if (vehiclePhotos.length < 2) return "Upload at least two clear photos of the actual truck.";
    if (!documents.idDocument || !documents.driverLicence || !documents.registrationPaper || !documents.ownershipProof) {
      return "Upload your ID, driver’s licence, vehicle registration paper and proof of ownership/authority.";
    }
    if (transmissionCheck.requiresModificationProof && !documents.modificationProof) {
      return "Upload gearbox conversion or engineering paperwork for a converted/custom transmission.";
    }
    if (!confirmOwnership || !confirmAccuracy) return "Confirm ownership authority and the accuracy of the vehicle information.";
    return "";
  }

  async function submitTruck(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setSaving(true);
    let createdListingId = "";
    let createdOwnerKey = "";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        router.replace(loginHref(currentRelativePath()));
        return;
      }

      const ownerKey = getAccountOwnerKey(user.id);
      createdOwnerKey = ownerKey;
      const folder = crypto.randomUUID();
      const photoUrls: string[] = [];
      for (const file of vehiclePhotos) photoUrls.push(await uploadVehiclePhoto(file, user.id));

      const idPath = await uploadVerificationDocument(documents.idDocument!, user.id, folder, "ID document");
      const licencePath = await uploadVerificationDocument(documents.driverLicence!, user.id, folder, "Driver's licence");
      const registrationPath = await uploadVerificationDocument(documents.registrationPaper!, user.id, folder, "Vehicle registration paper");
      const ownershipPath = await uploadVerificationDocument(documents.ownershipProof!, user.id, folder, "Proof of ownership");
      const roadworthyPath = documents.roadworthy ? await uploadVerificationDocument(documents.roadworthy, user.id, folder, "Roadworthy certificate") : null;
      const operatingLicencePath = documents.operatingLicence ? await uploadVerificationDocument(documents.operatingLicence, user.id, folder, "Operating licence") : null;
      const modificationProofPath = documents.modificationProof ? await uploadVerificationDocument(documents.modificationProof, user.id, folder, "Modification paperwork") : null;

      const storedDescription = [
        "Listing type: Truck",
        `Vehicle needed: ${year} ${brand} ${modelName}`,
        `Body type: ${bodyType}`,
        `Transmission: ${transmission}`,
        `Fuel: ${fuelType}`,
        `Axle configuration: ${axleConfiguration}`,
        `Odometer: ${Number(odometerKm).toLocaleString()} km`,
        gvmKg ? `GVM: ${Number(gvmKg).toLocaleString()} kg` : "",
        payloadKg ? `Payload: ${Number(payloadKg).toLocaleString()} kg` : "",
        "",
        description.trim(),
      ].filter(Boolean).join("\n");

      const listingResult = await supabase.from("job_listings").insert({
        title: title.trim(),
        city,
        vehicle_group: "Trucks / Trailers",
        rate: formatListingRate(rate),
        posted_by: postedBy.trim(),
        contact_number: contactNumber.trim(),
        whatsapp_number: whatsappNumber.trim(),
        description: storedDescription,
        photos: photoUrls,
        sponsored: packageType === "pro",
        package_type: packageType,
        owner_key: ownerKey,
        user_id: user.id,
      }).select("id").single();

      if (listingResult.error || !listingResult.data?.id) throw listingResult.error || new Error("The truck listing could not be created.");
      const listingId = listingResult.data.id;
      createdListingId = listingId;

      const detailsResult = await supabase.from("truck_listing_details").insert({
        listing_id: listingId,
        user_id: user.id,
        vehicle_year: year,
        brand,
        model: modelName,
        body_type: bodyType,
        transmission,
        fuel_type: fuelType,
        axle_configuration: axleConfiguration,
        registration_number: registrationNumber.trim().toUpperCase(),
        vin: vin.trim().toUpperCase(),
        engine_number: engineNumber.trim().toUpperCase(),
        odometer_km: Number(odometerKm),
        gvm_kg: gvmKg ? Number(gvmKg) : null,
        payload_kg: payloadKg ? Number(payloadKg) : null,
        reference_image_url: referenceImage?.imageUrl || null,
        reference_image_source: referenceImage?.sourceUrl || null,
        factory_transmissions: selectedModel?.transmissions || [],
        specification_status: transmissionCheck?.requiresModificationProof ? "modified_pending_review" : "catalogue_match",
      });
      if (detailsResult.error) throw detailsResult.error;

      const verificationResult = await supabase.from("vehicle_verifications").insert({
        listing_id: listingId,
        user_id: user.id,
        id_document_path: idPath,
        licence_document_path: licencePath,
        registration_document_path: registrationPath,
        ownership_document_path: ownershipPath,
        roadworthy_document_path: roadworthyPath,
        operating_licence_document_path: operatingLicencePath,
        modification_document_path: modificationProofPath,
        status: "pending",
      });
      if (verificationResult.error) throw verificationResult.error;

      const owned = getOwnedJobKeys();
      owned[listingId] = ownerKey;
      setOwnedJobKeys(owned);
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      await recordUserActivity("truck_listing_posted", {
        entityType: "listing",
        entityId: listingId,
        metadata: { title: title.trim(), brand, model: modelName, year },
      }).catch(() => undefined);
      await syncAccountState().catch(() => undefined);
      router.push("/my-posts?posted=truck");
    } catch (error) {
      if (createdListingId) {
        try {
          await supabase.rpc("delete_my_listing", {
            p_listing_id: createdListingId,
            p_owner_key: createdOwnerKey,
          });
        } catch {
          // Preserve the original submission error if rollback is unavailable.
        }
      }
      setMessage(error instanceof Error ? error.message : "The truck listing could not be submitted.");
      setSaving(false);
    }
  }

  if (!authReady) {
    return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;
  }

  const surface = darkMode ? "border-white/10 bg-[#101010] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-xl border px-4 font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#171717] text-white placeholder:text-white/30" : "border-black/10 bg-[#faf8f2] text-black placeholder:text-black/35"}`;
  const textAreaClass = `${inputClass} min-h-32 py-4`;

  return (
    <main className={`min-h-screen transition-colors duration-500 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      {saving ? <LoadLinkLoading /> : null}
      <Header darkMode={darkMode} />

      <section className="relative min-h-[300px] overflow-hidden border-b border-[#f6b800]/35 md:min-h-[360px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial trucks ready to be listed on LoadLink" className="absolute inset-0 h-full w-full object-cover object-center grayscale" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
        <div className="relative mx-auto flex min-h-[300px] max-w-5xl flex-col justify-end px-5 pb-9 pt-20 text-white md:min-h-[360px]">
          <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] md:text-7xl">List your truck</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">Choose the year, make and model, then confirm the truck details.</p>
        </div>
      </section>

      <form onSubmit={submitTruck} className="mx-auto grid max-w-5xl gap-6 px-4 py-7 md:px-6 md:py-12">
        <section className={`overflow-hidden rounded-2xl border ${surface}`}>
          <div className="border-b border-black/10 px-5 py-5 md:px-7">
            <h2 className="text-3xl font-black tracking-[-0.04em]">Choose your truck</h2>
            <p className={`mt-2 text-sm leading-6 ${muted}`}>Select the registration year, manufacturer and exact model.</p>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-3 md:p-7">
            <Field label="Registration / model year">
              <select value={year} onChange={(event) => changeYear(Number(event.target.value))} className={inputClass}>
                {truckYears.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Truck brand">
              <select value={brand} onChange={(event) => changeBrand(event.target.value)} className={inputClass}>
                <option value="">Choose manufacturer</option>
                {truckCatalog.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={modelName} disabled={!brand} onChange={(event) => changeModel(event.target.value)} className={inputClass}>
                <option value="">{brand ? "Choose exact model" : "Choose brand first"}</option>
                {availableModels.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </Field>
          </div>

          {brand && modelName ? (
            <div className="border-t border-black/10 p-5 md:p-7">
              <p className={`mb-4 text-sm font-bold ${muted}`}>1 result</p>
              <article className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white"}`}>
                <div className={`relative flex min-h-[260px] items-center justify-center ${darkMode ? "bg-[#080808]" : "bg-[#f2f4f7]"}`}>
                  {imageLoading ? (
                    <div className="absolute inset-0 loadlink-skeleton" />
                  ) : referenceImage?.imageUrl ? (
                    <img
                      src={referenceImage.imageUrl}
                      alt={`${year} ${brand} ${modelName}`}
                      loading="eager"
                      fetchPriority="high"
                      className="h-full min-h-[260px] w-full object-contain"
                    />
                  ) : (
                    <div className={`px-6 text-center ${muted}`}>
                      <TruckOutlineIcon />
                      <p className="mt-3 text-sm font-bold">Model photo unavailable</p>
                    </div>
                  )}
                </div>

                <div className="p-5 md:p-6">
                  <h3 className="text-3xl font-black tracking-[-0.04em]">{brand} {modelName}</h3>
                  <p className={`mt-1 text-base font-semibold ${muted}`}>{year}</p>

                  <button
                    type="button"
                    onClick={confirmSelectedModel}
                    className={`mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl border-2 px-5 font-black ${modelConfirmed ? "border-[#2f9f5b] bg-[#2f9f5b] text-white" : "border-[#d8a800] text-[#b88900]"}`}
                  >
                    <CheckIcon />
                    {modelConfirmed ? "Truck selected" : "Choose truck"}
                  </button>

                  {selectedModel ? (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <ModelSpec label="Gearbox" value={selectedModel.transmissions.join(" / ")} darkMode={darkMode} />
                      <ModelSpec label="Fuel" value={selectedModel.fuels.join(" / ")} darkMode={darkMode} />
                      <ModelSpec label="Axles" value={selectedModel.axleConfigurations.join(", ")} darkMode={darkMode} />
                      <ModelSpec label="Model years" value={`${selectedModel.from}–${selectedModel.to}`} darkMode={darkMode} />
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          ) : null}
        </section>

        {modelConfirmed && selectedModel ? (
          <>
            <section id="vehicle-information" className={`scroll-mt-24 overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="02" title="Vehicle information" description="Factory options are checked against the selected model. Converted vehicles need supporting paperwork." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
                <Field label="Listing title" wide><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} required /></Field>
                <Field label="Body type"><select value={bodyType} onChange={(event) => setBodyType(event.target.value)} className={inputClass}>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Location"><select value={city} onChange={(event) => setCity(event.target.value)} className={inputClass}>{cityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Gearbox">
                  <select value={transmission} onChange={(event) => setTransmission(event.target.value)} className={inputClass}>
                    <option value="">Choose gearbox</option>
                    {gearboxOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  {transmissionCheck ? <p className={`mt-2 text-xs font-bold leading-5 ${transmissionCheck.valid ? "text-[#2f9f5b]" : "text-red-500"}`}>{transmissionCheck.message}</p> : null}
                </Field>
                <Field label="Fuel"><select value={fuelType} onChange={(event) => setFuelType(event.target.value)} className={inputClass}>{selectedModel.fuels.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Axle configuration"><select value={axleConfiguration} onChange={(event) => setAxleConfiguration(event.target.value)} className={inputClass}>{selectedModel.axleConfigurations.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Registration number"><input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} placeholder="e.g. ABC 123 GP" className={inputClass} required /></Field>
                <Field label="VIN / chassis number"><input value={vin} onChange={(event) => setVin(event.target.value)} placeholder="17-character VIN where applicable" className={inputClass} required /></Field>
                <Field label="Engine number"><input value={engineNumber} onChange={(event) => setEngineNumber(event.target.value)} className={inputClass} required /></Field>
                <Field label="Odometer (km)"><input type="number" min="0" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} placeholder="e.g. 420000" className={inputClass} required /></Field>
                <Field label="GVM (kg) — optional"><input type="number" min="0" value={gvmKg} onChange={(event) => setGvmKg(event.target.value)} className={inputClass} /></Field>
                <Field label="Payload (kg) — optional"><input type="number" min="0" value={payloadKg} onChange={(event) => setPayloadKg(event.target.value)} className={inputClass} /></Field>
                <Field label="Hire rate / asking rate" wide><input value={rate} onChange={(event) => setRate(event.target.value)} placeholder="e.g. R4 500 / day or R35 / km" className={inputClass} required /></Field>
                <Field label="Truck description" wide><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Condition, service history, tyres, extras, permitted work and availability." className={textAreaClass} required /></Field>
              </div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="03" title="Actual truck photos" description="The catalogue picture is only a reference. Upload clear current photos of the truck being listed." />
              <div className="p-5 md:p-7">
                <label className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 text-center ${darkMode ? "border-white/15 bg-white/5" : "border-black/15 bg-[#faf8f2]"}`}>
                  <span className="text-lg font-black">Upload truck photos</span>
                  <span className={`mt-2 text-sm ${muted}`}>Minimum 2. Front, rear, both sides, cab and licence plate are recommended.</span>
                  <input type="file" accept="image/*" multiple onChange={handleVehiclePhotos} className="hidden" />
                </label>
                {vehiclePreviews.length ? <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{vehiclePreviews.map((src, index) => <img key={src + index} src={src} alt={`Truck preview ${index + 1}`} className="aspect-[4/3] w-full rounded-2xl border border-[#f6b800]/30 object-cover" />)}</div> : null}
              </div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="04" title="Owner and vehicle verification" description="These files are stored privately and are not shown on the public listing." />
              <div className="grid gap-4 p-5 md:grid-cols-2 md:p-7">
                <DocumentInput label="South African ID or passport" required file={documents.idDocument} onChange={(file) => setDocument("idDocument", file)} />
                <DocumentInput label="Driver’s licence" required file={documents.driverLicence} onChange={(file) => setDocument("driverLicence", file)} />
                <DocumentInput label="Vehicle registration certificate" required file={documents.registrationPaper} onChange={(file) => setDocument("registrationPaper", file)} />
                <DocumentInput label="Proof of ownership or authority to list" required file={documents.ownershipProof} onChange={(file) => setDocument("ownershipProof", file)} />
                <DocumentInput label="Roadworthy certificate" file={documents.roadworthy} onChange={(file) => setDocument("roadworthy", file)} />
                <DocumentInput label="Operating licence" file={documents.operatingLicence} onChange={(file) => setDocument("operatingLicence", file)} />
                {transmissionCheck?.requiresModificationProof ? <DocumentInput label="Gearbox conversion / engineering paperwork" required file={documents.modificationProof} onChange={(file) => setDocument("modificationProof", file)} /> : null}
              </div>
              <div className={`border-t p-5 md:p-7 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b88900]">Security notice</p>
                <p className={`mt-2 text-sm leading-6 ${muted}`}>Verification reduces fraudulent listings and account abuse. Documents remain in a private storage bucket and are only available to authorised verification reviewers.</p>
              </div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="05" title="Contact, visibility and confirmation" description="Choose the listing package and confirm that the truck details are truthful." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
                <Field label="Owner / company name"><input value={postedBy} onChange={(event) => setPostedBy(event.target.value)} className={inputClass} required /></Field>
                <Field label="Contact number"><input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="0821234567" className={inputClass} required /></Field>
                <Field label="WhatsApp number — optional"><input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="0821234567" className={inputClass} /></Field>
                <Field label="Listing package"><select value={packageType} onChange={(event) => setPackageType(event.target.value as "standard" | "pro")} className={inputClass}><option value="standard">Standard listing</option><option value="pro">Pro listing — analytics enabled</option></select></Field>
              </div>
              <div className="grid gap-3 px-5 pb-5 md:px-7 md:pb-7">
                <CheckRow checked={confirmOwnership} onChange={setConfirmOwnership} label="I own this vehicle or have written authority from the owner to list it." />
                <CheckRow checked={confirmAccuracy} onChange={setConfirmAccuracy} label="I confirm that the model, gearbox, registration and uploaded documents are accurate." />
              </div>
              <div className="border-t border-[#f6b800]/25 bg-black p-5 text-white md:p-7">
                {message ? <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-300">{message}</div> : null}
                <button type="submit" disabled={saving} className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-50">{saving ? "Submitting verification..." : "Submit truck for verification"}</button>
                <p className="mt-3 text-center text-xs leading-5 text-white/45">The listing is marked verification pending until the documents have been reviewed. Analytics remains available only on Pro listings.</p>
              </div>
            </section>
          </>
        ) : null}
      </form>
    </main>
  );
}

function Header({ darkMode }: { darkMode: boolean }) {
  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
      <div className="grid h-20 grid-cols-[92px_1fr_92px] items-center px-4">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Back home" className={`flex h-10 w-10 items-center justify-center ${darkMode ? "text-white" : "text-black"}`}><MenuIcon /></Link>
          <AuthStatusButton darkMode={darkMode} />
        </div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <div aria-hidden="true" />
      </div>
    </header>
  );
}

function SectionHeading({ step, title, description }: { step: string; title: string; description: string }) {
  return <div className="border-b border-black/10 px-5 py-5 md:px-7"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b88900]">{step}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h2><p className="mt-2 text-sm leading-6 opacity-55">{description}</p></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "block md:col-span-2" : "block"}><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#b88900]">{label}</span>{children}</label>;
}

function ModelSpec({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`rounded-xl px-3 py-3 ${darkMode ? "bg-white/7" : "bg-[#f3f5f8]"}`}><p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p><p className="mt-1 text-sm font-bold leading-5">{value}</p></div>;
}

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TruckOutlineIcon() {
  return <svg className="mx-auto" width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M5 13h24v21H5V13Zm24 8h8l6 7v6H29V21Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="14" cy="35" r="4" stroke="currentColor" strokeWidth="2.5"/><circle cx="36" cy="35" r="4" stroke="currentColor" strokeWidth="2.5"/></svg>;
}

function DocumentInput({ label, required = false, file, onChange }: { label: string; required?: boolean; file: File | null; onChange: (file: File | null) => void }) {
  return (
    <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-2xl border border-[#f6b800]/35 bg-[#f6b800]/5 px-4 py-4">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#b88900]">{label}{required ? " *" : ""}</span>
      <span className="mt-2 truncate text-sm font-bold">{file ? file.name : "Choose image or PDF"}</span>
      <span className="mt-1 text-[10px] opacity-45">JPG, PNG, WEBP or PDF · maximum 10 MB</span>
      <input type="file" accept={acceptedDocuments} required={required && !file} onChange={(event) => onChange(event.target.files?.[0] || null)} className="hidden" />
    </label>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#f6b800]/30 p-4"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" /><span className="text-sm font-semibold leading-6">{label}</span></label>;
}

function MenuIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
