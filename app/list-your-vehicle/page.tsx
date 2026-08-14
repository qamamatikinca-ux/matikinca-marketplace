"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import BusinessPlans, { type BusinessPlanId } from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import PhotoLimitUpgradeToast from "@/components/PhotoLimitUpgradeToast";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { currentRelativePath, loginHref } from "@/lib/auth";
import { getAccountOwnerKey, getOwnedJobKeys, setOwnedJobKeys } from "@/lib/chatKeys";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, revokePreviewUrl, validateImageFile } from "@/lib/mobilePosting";
import { getFreshAuthenticatedUser, postingErrorMessage, withTransientRetry } from "@/lib/reliableSupabase";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { inspectLoadLinkImage, showLoadLinkImageQuality } from "@/lib/loadlinkImageQuality";
import { submitListingDirect } from "@/lib/listingSubmission";
import { getTruckModel, getTruckModels, truckCatalog, truckYears, validateTruckTransmission } from "@/lib/truckCatalog";


const truckBodyTypes = [
  "Tractor unit / horse", "Side tipper", "Dropside", "Flat deck", "Tautliner", "Refrigerated body", "Closed box body",
  "Lowbed", "Mixer", "Tipper", "Tanker", "Curtainsider", "Car carrier", "Refuse truck", "Tow truck", "Fire truck",
  "Crane truck", "Logging truck", "Other",
];
const trailerTypes = ["Flatbed", "Tautliner", "Side Tipper", "End Tipper", "Refrigerated", "Tanker", "Lowbed", "Livestock", "Car Carrier", "Container", "Other"];
const mobileUnitTypes = ["Mobile Toilet", "Food Truck", "Mobile Kitchen", "Mobile Clinic", "Mobile Office", "Mobile Workshop", "Mobile Classroom", "Mobile Accommodation", "Mobile Shower", "Cold Room", "Other"];
const gearboxOptions = ["Manual", "Automatic", "Automated manual", "Electric direct drive", "Not applicable", "Converted / custom"];
const acceptedDocuments = ".jpg,.jpeg,.png,.webp,.pdf";

type VehicleCategory = "truck" | "trailer" | "mobile_unit";
type SellerType = "private" | "dealership";
type OfferMode = "sale" | "rental" | "sale_or_rental" | "poa";
type RentalPeriod = "day" | "week" | "month";
type VerificationFiles = {
  idDocument: File | null;
  driverLicence: File | null;
  registrationPaper: File | null;
  ownershipProof: File | null;
  roadworthy: File | null;
  operatingLicence: File | null;
  modificationProof: File | null;
  companyRegistration: File | null;
  taxDocument: File | null;
  businessAddress: File | null;
  representativeAuthority: File | null;
};
type ReferenceImage = { imageUrl: string; title: string; exactMatch: boolean; sourceUrl?: string; credit?: string; license?: string; matchConfidence?: "high" | "medium" | "reference" };

const emptyVerificationFiles: VerificationFiles = {
  idDocument: null, driverLicence: null, registrationPaper: null, ownershipProof: null,
  roadworthy: null, operatingLicence: null, modificationProof: null,
  companyRegistration: null, taxDocument: null, businessAddress: null, representativeAuthority: null,
};

function normalizePhone(value: string) { return value.replace(/[^\d+]/g, ""); }
function isValidSouthAfricanPhone(value: string) { const clean = normalizePhone(value); return /^0\d{9}$/.test(clean) || /^\+27\d{9}$/.test(clean); }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "document"; }
function categoryLabel(category: VehicleCategory) { return category === "truck" ? "Truck" : category === "trailer" ? "Trailer" : "Mobile Unit"; }
function offerLabel(mode: OfferMode) { return mode === "sale" ? "For sale only" : mode === "rental" ? "Rental only" : mode === "sale_or_rental" ? "Sale or rental" : "Price on application (POA)"; }
function unitSpecSchema(category: VehicleCategory | null, subtype: string): Array<[string, string]> {
  const clean = subtype.toLowerCase();
  if (category === "truck") return [["Engine / power", "Engine displacement, output or power rating"], ["Cab configuration", "Sleeper cab, day cab, crew cab"], ["Braking / retarder", "Retarder, engine brake, EBS or ABS"], ["Suspension", "Air, steel or mixed suspension"]];
  if (category === "trailer") return [["Braking system", "EBS, ABS, drum or disc"], ["Suspension", "Air or mechanical suspension"], ["Body / deck dimensions", "Length, width and usable body/deck size"], ["Loading configuration", "Rear doors, side access, ramps, tipper setup, etc."]];
  if (clean.includes("fridge") || clean.includes("cold room") || clean.includes("refrigerated")) return [["Temperature range", "Operating temperature range"], ["Refrigeration system", "Unit brand/model and cooling setup"], ["Power supply", "Mains, generator, solar or hybrid"], ["Internal capacity", "Usable refrigerated space / volume"]];
  if (clean.includes("kitchen") || clean.includes("food truck")) return [["Power supply", "Electrical, generator or gas setup"], ["Water system", "Fresh/grey water capacity and pumps"], ["Included kitchen equipment", "Cooking, refrigeration and prep equipment"], ["Extraction / ventilation", "Extraction hood and ventilation setup"]];
  return [["Power supply", "Electrical, generator, solar or other"], ["Internal dimensions", "Usable internal dimensions"], ["Fit-out / equipment", "Installed fixtures and equipment"], ["Operating capability", "What this unit is ready to do"]];
}
export default function ListYourVehiclePage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preparingVehiclePhotos, setPreparingVehiclePhotos] = useState(false);
  const [vehiclePhotoProgress, setVehiclePhotoProgress] = useState("");
  const [message, setMessage] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [photoLimitToast, setPhotoLimitToast] = useState(false);
  const [submittedListingId, setSubmittedListingId] = useState<string | null>(null);
  const [sellerType, setSellerType] = useState<SellerType>("private");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | null>(null);
  const [vehicleSubtype, setVehicleSubtype] = useState("");
  const [dealershipId, setDealershipId] = useState("");
  const [dealershipName, setDealershipName] = useState("");
  const [dealerPost, setDealerPost] = useState(false);

  const [year, setYear] = useState(2026);
  const [brand, setBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelConfirmed, setModelConfirmed] = useState(false);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [bodyType, setBodyType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [axleConfiguration, setAxleConfiguration] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vin, setVin] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [previousOwners, setPreviousOwners] = useState("");
  const [condition, setCondition] = useState("Good");
  const [serviceHistory, setServiceHistory] = useState("Partial service history");
  const [gvmKg, setGvmKg] = useState("");
  const [payloadKg, setPayloadKg] = useState("");
  const [rate, setRate] = useState("");
  const [offerMode, setOfferMode] = useState<OfferMode>("sale");
  const [rentalRate, setRentalRate] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>("month");
  const [specA, setSpecA] = useState("");
  const [specB, setSpecB] = useState("");
  const [specC, setSpecC] = useState("");
  const [specD, setSpecD] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const [packageType, setPackageType] = useState<"standard" | "pro" | "dealer">("standard");
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlanId | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [vehiclePreviews, setVehiclePreviews] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationFiles>(emptyVerificationFiles);
  const [confirmOwnership, setConfirmOwnership] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const submitLockRef = useRef(false);
  const submissionIdRef = useRef("");
  const vehiclePreviewUrlsRef = useRef<string[]>([]);

  const availableModels = useMemo(() => vehicleCategory === "truck" ? getTruckModels(brand, year) : [], [brand, vehicleCategory, year]);
  const selectedModel = useMemo(() => vehicleCategory === "truck" ? getTruckModel(brand, modelName, year) : null, [brand, modelName, vehicleCategory, year]);
  const transmissionCheck = useMemo(() => vehicleCategory === "truck" && transmission ? validateTruckTransmission(brand, modelName, year, transmission) : null, [brand, modelName, transmission, vehicleCategory, year]);
  const specSchema = useMemo(() => unitSpecSchema(vehicleCategory, bodyType || vehicleSubtype), [bodyType, vehicleCategory, vehicleSubtype]);

  useEffect(() => {
    async function requireAccount() {
      if (!isSupabaseConfigured) { setAuthReady(true); return; }
      const user = await getFreshAuthenticatedUser();
      if (!user) { setAuthReady(true); return; }
      setSignedIn(true);
      await syncAccountState().catch(() => undefined);
      setPostedBy(String(user.user_metadata?.full_name || user.user_metadata?.name || ""));

      const params = new URLSearchParams(window.location.search);
      const requestedPlan = params.get("plan");
      if (requestedPlan === "pro" || requestedPlan === "dealer") {
        setSelectedPlan(requestedPlan);
        setPackageType(requestedPlan);
      } else if (requestedPlan === "manual") {
        setSelectedPlan(null);
        setPackageType("standard");
      }
      const requestedDealer = params.get("dealership") || "";
      if (requestedDealer) {
        const { data, error } = await supabase.rpc("loadlink_dealer_listing_context", { p_dealership_id: requestedDealer });
        if (error) throw error;
        if (data) {
          setDealershipId(String(data.id));
          setDealershipName(String(data.name || ""));
          setPostedBy(String(data.name || postedBy));
          setContactNumber(String(data.phone_number || ""));
          setWhatsappNumber(String(data.whatsapp_number || ""));
          setSellerType("dealership");
          setDealerPost(true);
          setSelectedPlan("dealer");
          setPackageType("dealer");
        }
      }
      setAuthReady(true);
    }
    void requireAccount().catch(() => setAuthReady(true));
  }, [router]);

  useEffect(() => {
    try {
      submissionIdRef.current = localStorage.getItem("loadlink-vehicle-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
      const d = JSON.parse(localStorage.getItem("loadlink-vehicle-draft-v1") || "null");
      if (!d) return;
      setSellerType(d.sellerType || "private"); setVehicleCategory(d.vehicleCategory || null); setVehicleSubtype(d.vehicleSubtype || "");
      setYear(d.year || 2026); setBrand(d.brand || ""); setModelName(d.modelName || ""); setModelConfirmed(Boolean(d.modelConfirmed));
      setTitle(d.title || ""); setCity(d.city || "Johannesburg"); setBodyType(d.bodyType || ""); setTransmission(d.transmission || "");
      setFuelType(d.fuelType || ""); setAxleConfiguration(d.axleConfiguration || ""); setRegistrationNumber(d.registrationNumber || "");
      setVin(d.vin || ""); setEngineNumber(d.engineNumber || ""); setOdometerKm(d.odometerKm || ""); setPreviousOwners(d.previousOwners || "");
      setCondition(d.condition || "Good"); setServiceHistory(d.serviceHistory || "Partial service history"); setGvmKg(d.gvmKg || "");
      setPayloadKg(d.payloadKg || ""); setRate(d.rate || ""); setOfferMode(d.offerMode || "sale"); setRentalRate(d.rentalRate || ""); setRentalPeriod(d.rentalPeriod || "month"); setSpecA(d.specA || ""); setSpecB(d.specB || ""); setSpecC(d.specC || ""); setSpecD(d.specD || ""); setPostedBy(d.postedBy || ""); setContactNumber(d.contactNumber || "");
      setWhatsappNumber(d.whatsappNumber || ""); setDescription(d.description || ""); setConfirmOwnership(Boolean(d.confirmOwnership));
      setConfirmAccuracy(Boolean(d.confirmAccuracy)); setSelectedPlan(d.selectedPlan || null); setPackageType(d.packageType || "standard");
      submissionIdRef.current = String(d.submissionId || submissionIdRef.current);
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
    } catch {
      submissionIdRef.current = localStorage.getItem("loadlink-vehicle-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
    }
  }, []);

  useEffect(() => {
    const draft = { sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType, submissionId: submissionIdRef.current || localStorage.getItem("loadlink-vehicle-submission-id") || "" };
    const timer = window.setTimeout(() => localStorage.setItem("loadlink-vehicle-draft-v1", JSON.stringify(draft)), 150);
    return () => window.clearTimeout(timer);
  }, [sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType]);

  useEffect(() => {
    if (vehicleCategory !== "truck" || !brand || !modelName) return;
    let active = true;
    setImageLoading(true);
    fetch(`/api/truck-image?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(modelName)}&year=${year}`, { cache: "force-cache" })
      .then((response) => response.json()).then((data) => { if (active) setReferenceImage(data); })
      .catch(() => { if (active) setReferenceImage(null); }).finally(() => { if (active) setImageLoading(false); });
    return () => { active = false; };
  }, [brand, modelName, vehicleCategory, year]);

  function choosePlan(plan: BusinessPlanId) {
    setSelectedPlan(plan);
    setPackageType(plan);
    if (plan === "dealer") setSellerType("dealership");
    setMessage("");
    requestAnimationFrame(() => document.getElementById("vehicle-type")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function chooseCategory(category: VehicleCategory) {
    setVehicleCategory(category);
    setVehicleSubtype("");
    setBodyType(category === "truck" ? "Tractor unit / horse" : "");
    setBrand(""); setModelName(""); setModelConfirmed(false); setReferenceImage(null);
    setTransmission(category === "trailer" ? "Not applicable" : "");
    setFuelType(category === "trailer" ? "Not applicable" : "");
    setAxleConfiguration(""); setTitle(""); setMessage("");
  }

  function confirmSelectedModel() {
    if (!selectedModel) { setMessage("Choose a valid year, truck brand and model first."); return; }
    setTitle(`${year} ${brand} ${modelName}`);
    setTransmission(selectedModel.transmissions[0] || "");
    setFuelType(selectedModel.fuels[0] || "Diesel");
    setAxleConfiguration(selectedModel.axleConfigurations[0] || "4x2");
    setModelConfirmed(true);
    setMessage("");
  }

  async function handleVehiclePhotos(event: ChangeEvent<HTMLInputElement>) {
    const max = packageType === "pro" || packageType === "dealer" ? 15 : 5;
    const allSelected = Array.from(event.target.files ?? []) as File[];
    const candidates = allSelected.slice(0, max);
    event.target.value = "";
    setMessage("");
    if (!candidates.length) return;

    setPreparingVehiclePhotos(true);
    const selected: File[] = [];
    const previews: string[] = [];

    try {
      for (let index = 0; index < candidates.length; index += 1) {
        const source = candidates[index];
        const validation = validateImageFile(source, source.name || `Vehicle photo ${index + 1}`);
        if (validation) throw new Error(validation);
        const quality = await inspectLoadLinkImage(source);
        showLoadLinkImageQuality(quality.messages);
        setVehiclePhotoProgress(`Preparing vehicle photo ${index + 1} of ${candidates.length}…`);
        const prepared = await prepareImageFileForForm(source, {
          maxWidth: 1440,
          maxHeight: 1440,
          quality: 0.76,
          namePrefix: `loadlink-vehicle-${index + 1}`,
        });
        selected.push(prepared.file);
        previews.push(prepared.previewUrl);
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      }

      vehiclePreviewUrlsRef.current.forEach(revokePreviewUrl);
      vehiclePreviewUrlsRef.current = previews;
      setVehiclePhotos(selected);
      setVehiclePreviews(previews);
      if (allSelected.length > max) {
        setMessage(`We kept the first ${max} vehicle photos.`);
        if (max === 5) {
          setPhotoLimitToast(false);
          window.requestAnimationFrame(() => setPhotoLimitToast(true));
        }
      }
    } catch (error) {
      previews.forEach(revokePreviewUrl);
      setMessage(readableUploadError(error, "One selected vehicle photo could not be prepared."));
    } finally {
      setPreparingVehiclePhotos(false);
      setVehiclePhotoProgress("");
    }
  }

  useEffect(() => () => {
    vehiclePreviewUrlsRef.current.forEach(revokePreviewUrl);
  }, []);

  function currentSubmissionId() {
    if (!submissionIdRef.current) {
      submissionIdRef.current = localStorage.getItem("loadlink-vehicle-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
    }
    return submissionIdRef.current;
  }

  function setDocument(key: keyof VerificationFiles, file: File | null) { setDocuments((current) => ({ ...current, [key]: file })); }

  async function uploadVehiclePhoto(file: File, userId: string, submissionId: string, index: number) {
    const contentType = inferUploadContentType(file);
    const path = `${userId}/vehicles/${submissionId}/${index}.${imageExtension(contentType)}`;
    await withTransientRetry(async () => {
      const result = await supabase.storage.from("job-photos").upload(path, file, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });
      if (result.error) throw result.error;
    });
    const publicUrl = supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
    if (!publicUrl) throw new Error("The uploaded vehicle photo URL could not be created.");
    return publicUrl;
  }

  async function uploadVerificationDocument(file: File, userId: string, folder: string, label: string) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${label} must be smaller than 10 MB.`);
    const extension = safeFileName(file.name);
    const path = `${userId}/${folder}/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${extension}`;
    await withTransientRetry(async () => {
      const result = await supabase.storage.from("vehicle-verification").upload(path, file, {
        cacheControl: "3600",
        contentType: inferUploadContentType(file),
        upsert: true,
      });
      if (result.error) throw result.error;
    });
    return path;
  }

  function validateBeforeSubmit() {
    if (!vehicleCategory) return "Choose whether you are listing a truck, trailer or mobile unit.";
    if (vehicleCategory === "truck") {
      if (!modelConfirmed || !selectedModel) return "Confirm the exact truck model before continuing.";
      if (!transmissionCheck?.valid) return transmissionCheck?.message || "Choose a valid gearbox.";
    } else {
      if (!vehicleSubtype) return `Choose the ${vehicleCategory === "trailer" ? "trailer" : "mobile unit"} type.`;
      if (!brand.trim() || !modelName.trim()) return "Enter the make and model.";
    }
    if (!title.trim() || !postedBy.trim() || !description.trim()) return "Complete all required vehicle and listing fields.";
    if (offerMode !== "poa" && !rate.trim()) return offerMode === "rental" ? "Enter the advertised rental rate." : "Enter the advertised sale price.";
    if (offerMode === "sale_or_rental" && !rentalRate.trim()) return "Enter the advertised rental rate as well as the sale price.";
    if (!registrationNumber.trim() || vin.trim().length < 6) return "Enter the registration number and VIN/chassis number.";
    if (!odometerKm || Number(odometerKm) < 0) return "Enter a valid mileage or usage reading.";
    if (!isValidSouthAfricanPhone(contactNumber)) return "Enter a valid South African contact number.";
    if (whatsappNumber && !isValidSouthAfricanPhone(whatsappNumber)) return "Enter a valid WhatsApp number or leave it blank.";
    if (preparingVehiclePhotos) return "Wait for the selected photos to finish preparing.";
    if (sellerType === "dealership" && packageType === "dealer" && vehiclePhotos.length < 10) return "Dealer listings require at least 10 clear photos. Your Dealer package supports up to 15.";
    if (vehiclePhotos.length < 2) return "Upload at least two clear photos of the actual vehicle or unit.";
    if (!documents.idDocument || !documents.registrationPaper || !documents.ownershipProof) return "Upload your ID, registration paper and proof of ownership or authority to list.";
    if (vehicleCategory === "truck" && !documents.driverLicence) return "Upload the driver’s licence for the truck listing.";
    if (transmissionCheck?.requiresModificationProof && !documents.modificationProof) return "Upload gearbox conversion or engineering paperwork.";
    if (sellerType === "dealership" && !dealerPost) {
      if (!dealershipName.trim() || !companyRegistrationNumber.trim() || !taxNumber.trim()) return "Enter the dealership and registration information.";
      if (!documents.companyRegistration || !documents.taxDocument || !documents.businessAddress || !documents.representativeAuthority) return "Upload the dealership verification documents.";
    }
    if (!confirmOwnership || !confirmAccuracy) return "Confirm ownership authority and the accuracy of the information.";
    return "";
  }

  async function submitVehicle(event: FormEvent) {
    event.preventDefault();
    if (submitLockRef.current || saving || preparingVehiclePhotos) return;
    setMessage("");
    const validationMessage = validateBeforeSubmit();
    if (validationMessage) { setMessage(validationMessage); return; }
    submitLockRef.current = true;
    setSaving(true);
    let createdListingId = "";
    let createdOwnerKey = "";
    let createdThisAttempt = false;
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) throw new Error("Your sign-in session could not be confirmed.");
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.capabilities.can_post_vehicle) {
        if (["blocked","suspended"].includes(intelligence.account_status)) throw new Error(intelligence.account_reason || "You cannot post while this account is restricted.");
        if (intelligence.plan === "dealer" && !intelligence.dealer_ready) throw new Error("Your Dealer plan is active, but the dealership must be approved before stock can be published.");
        if (intelligence.plan_state === "under_review") throw new Error("Your plan request is still under review.");
        if (["approved_for_payment","payment_pending"].includes(String(intelligence.plan_state))) throw new Error("Complete your approved plan payment before publishing a vehicle.");
        throw new Error("Choose an active Pro or Dealer plan before publishing a vehicle.");
      }
      const submissionId = currentSubmissionId();
      const ownerKey = getAccountOwnerKey(user.id); createdOwnerKey = ownerKey;
      const folder = submissionId;
      const photoUrls: string[] = [];
      for (let index = 0; index < vehiclePhotos.length; index += 1) {
        photoUrls.push(await uploadVehiclePhoto(vehiclePhotos[index], user.id, submissionId, index));
      }

      const idPath = await uploadVerificationDocument(documents.idDocument!, user.id, folder, "ID document");
      const licencePath = documents.driverLicence ? await uploadVerificationDocument(documents.driverLicence, user.id, folder, "Driver's licence") : null;
      const registrationPath = await uploadVerificationDocument(documents.registrationPaper!, user.id, folder, "Vehicle registration paper");
      const ownershipPath = await uploadVerificationDocument(documents.ownershipProof!, user.id, folder, "Proof of ownership");
      const roadworthyPath = documents.roadworthy ? await uploadVerificationDocument(documents.roadworthy, user.id, folder, "Roadworthy certificate") : null;
      const operatingLicencePath = documents.operatingLicence ? await uploadVerificationDocument(documents.operatingLicence, user.id, folder, "Operating licence") : null;
      const modificationProofPath = documents.modificationProof ? await uploadVerificationDocument(documents.modificationProof, user.id, folder, "Modification paperwork") : null;
      const companyRegistrationPath = sellerType === "dealership" && !dealerPost && documents.companyRegistration ? await uploadVerificationDocument(documents.companyRegistration, user.id, folder, "Company registration") : null;
      const taxDocumentPath = sellerType === "dealership" && !dealerPost && documents.taxDocument ? await uploadVerificationDocument(documents.taxDocument, user.id, folder, "Tax document") : null;
      const businessAddressPath = sellerType === "dealership" && !dealerPost && documents.businessAddress ? await uploadVerificationDocument(documents.businessAddress, user.id, folder, "Business address proof") : null;
      const representativeAuthorityPath = sellerType === "dealership" && !dealerPost && documents.representativeAuthority ? await uploadVerificationDocument(documents.representativeAuthority, user.id, folder, "Representative authority") : null;

      const label = categoryLabel(vehicleCategory!);
      const subtype = vehicleCategory === "truck" ? bodyType : vehicleSubtype;
      const displayRate = offerMode === "poa" ? "POA" : offerMode === "rental" ? `${formatListingRate(rate)} / ${rentalPeriod}` : formatListingRate(rate);
      const storedDescription = [
        `Listing type: ${label}`,
        `Vehicle subtype: ${subtype}`,
        `Offer: ${offerLabel(offerMode)}`,
        offerMode === "sale" || offerMode === "sale_or_rental" ? `Sale price: ${formatListingRate(rate)}` : "",
        offerMode === "rental" ? `Rental rate: ${formatListingRate(rate)} / ${rentalPeriod}` : "",
        offerMode === "sale_or_rental" && rentalRate ? `Rental rate: ${formatListingRate(rentalRate)} / ${rentalPeriod}` : "",
        `Year: ${year}`,
        `Make: ${brand.trim()}`,
        `Model: ${modelName.trim()}`,
        `Mileage: ${Number(odometerKm).toLocaleString("en-ZA")} km`,
        previousOwners ? `Previous owners: ${previousOwners}` : "",
        transmission ? `Transmission: ${transmission}` : "",
        fuelType ? `Fuel: ${fuelType}` : "",
        axleConfiguration ? `Axle configuration: ${axleConfiguration}` : "",
        `Condition: ${condition}`,
        `Service history: ${serviceHistory}`,
        gvmKg ? `GVM: ${Number(gvmKg).toLocaleString("en-ZA")} kg` : "",
        payloadKg ? `Payload: ${Number(payloadKg).toLocaleString("en-ZA")} kg` : "",
        specA.trim() ? `${specSchema[0][0]}: ${specA.trim()}` : "",
        specB.trim() ? `${specSchema[1][0]}: ${specB.trim()}` : "",
        specC.trim() ? `${specSchema[2][0]}: ${specC.trim()}` : "",
        specD.trim() ? `${specSchema[3][0]}: ${specD.trim()}` : "",
        `Seller: ${sellerType === "dealership" ? dealershipName || postedBy : postedBy}`,
        "",
        "Description:",
        description.trim(),
      ].filter(Boolean).join("\n");

      const listingPayload = {
        title: title.trim(), city,
        vehicle_group: vehicleCategory === "mobile_unit" ? "Mobile Units" : "Trucks / Trailers",
        rate: displayRate, posted_by: postedBy.trim(), contact_number: contactNumber.trim(), whatsapp_number: whatsappNumber.trim(),
        description: storedDescription, photos: photoUrls,
        sponsored: packageType === "pro" || packageType === "dealer", package_type: packageType,
        listing_kind: "vehicle", display_tier: packageType === "dealer" ? 4 : packageType === "pro" ? 3 : 1,
        stock_status: "available", dealership_id: dealershipId || null, owner_key: ownerKey, user_id: user.id,
        status: "active", moderation_status: "pending", client_request_id: submissionId,
      };

      createdListingId = await submitListingDirect(listingPayload, user.id, submissionId);
      createdThisAttempt = Boolean(createdListingId);
      if (!createdListingId) throw new Error("The vehicle listing could not be created.");
      const listingId = createdListingId;

      if (vehicleCategory === "truck") {
        const detailsResult = await supabase.from("truck_listing_details").upsert({
          listing_id: listingId, user_id: user.id, vehicle_year: year, brand, model: modelName, body_type: bodyType,
          transmission, fuel_type: fuelType, axle_configuration: axleConfiguration,
          registration_number: registrationNumber.trim().toUpperCase(), vin: vin.trim().toUpperCase(), engine_number: engineNumber.trim().toUpperCase(),
          odometer_km: Number(odometerKm), gvm_kg: gvmKg ? Number(gvmKg) : null, payload_kg: payloadKg ? Number(payloadKg) : null,
          reference_image_url: referenceImage?.imageUrl || null, reference_image_source: referenceImage?.sourceUrl || null,
          factory_transmissions: selectedModel?.transmissions || [], specification_status: transmissionCheck?.requiresModificationProof ? "modified_pending_review" : "catalogue_match",
        }, { onConflict: "listing_id" });
        if (detailsResult.error) throw detailsResult.error;
      }

      const verificationResult = await supabase.from("vehicle_verifications").upsert({
        listing_id: listingId, user_id: user.id, id_document_path: idPath, licence_document_path: licencePath,
        registration_document_path: registrationPath, ownership_document_path: ownershipPath, roadworthy_document_path: roadworthyPath,
        operating_licence_document_path: operatingLicencePath, modification_document_path: modificationProofPath,
        dealership_application: sellerType === "dealership" && !dealerPost,
        dealership_name: sellerType === "dealership" ? dealershipName.trim() : null,
        company_registration_number: sellerType === "dealership" && !dealerPost ? companyRegistrationNumber.trim().toUpperCase() : null,
        tax_number: sellerType === "dealership" && !dealerPost ? taxNumber.trim().toUpperCase() : null,
        company_registration_document_path: companyRegistrationPath, tax_document_path: taxDocumentPath,
        business_address_document_path: businessAddressPath, representative_authority_document_path: representativeAuthorityPath, status: "pending",
      }, { onConflict: "listing_id" });
      if (verificationResult.error) throw verificationResult.error;

      const owned = getOwnedJobKeys(); owned[listingId] = ownerKey; setOwnedJobKeys(owned);
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      await recordUserActivity("vehicle_listing_posted", { entityType: "listing", entityId: listingId, metadata: { title: title.trim(), category: vehicleCategory, dealershipId: dealershipId || null } }).catch(() => undefined);
      await syncAccountState().catch(() => undefined);
      localStorage.removeItem("loadlink-vehicle-draft-v1");
      localStorage.removeItem("loadlink-vehicle-submission-id");
      submissionIdRef.current = createSafeRandomId();
      setSubmittedListingId(listingId);
      setSubmissionSuccess(true);
    } catch (error) {
      if (createdListingId && createdThisAttempt) {
        try { await supabase.rpc("delete_my_listing", { p_listing_id: createdListingId, p_owner_key: createdOwnerKey }); } catch {}
      }
      setMessage(postingErrorMessage(error, readableUploadError(error, "The vehicle listing could not be submitted.")));
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  }

  if (!authReady) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;

  const surface = darkMode ? "loadlink-glass border-white/12 bg-black/62 text-white backdrop-blur-xl" : "loadlink-glass border-white/75 bg-white/68 text-black backdrop-blur-xl";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-xl border px-4 font-semibold outline-none backdrop-blur-lg focus:border-[#f6b800] ${darkMode ? "border-white/14 bg-white/[.055] text-white placeholder:text-white/30" : "border-black/10 bg-white/72 text-black placeholder:text-black/35"}`;
  const textAreaClass = `${inputClass} min-h-32 py-4`;
  const categoryChosen = Boolean(vehicleCategory);
  const detailsReady = vehicleCategory === "truck" ? modelConfirmed : Boolean(vehicleSubtype && brand.trim() && modelName.trim());

  return (
    <main className={`min-h-screen transition-colors ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <PhotoLimitUpgradeToast open={photoLimitToast} onClose={() => setPhotoLimitToast(false)} limit={5} />
      <SubmissionSuccess
        open={submissionSuccess}
        title="Vehicle submission sent"
        message={dealershipId ? "Your vehicle was added to the dealership inventory and submitted for review." : "Your vehicle and verification documents were submitted securely."}
        listingId={submittedListingId}
        listingTitle={title.trim()}
        surface="vehicle"
        enableFeedback
        continueLabel={dealershipId ? "Open dealership" : "View my posts"}
        onContinue={() => router.push(dealershipId ? "/dealer?posted=vehicle" : "/my-posts?posted=vehicle")}
      />
      <Header darkMode={darkMode} sellerType={sellerType} dealerPost={dealerPost} onToggleTheme={toggleTheme} onToggleSellerType={() => {
        if (dealerPost) return;
        if (sellerType === "dealership") {
          setSellerType("private");
          if (selectedPlan === "dealer") { setSelectedPlan(null); setPackageType("standard"); }
        } else {
          setSellerType("dealership");
        }
        setMessage("");
      }} />

      <section className="relative min-h-[300px] overflow-hidden border-b border-[#f6b800]/35 md:min-h-[360px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial vehicles ready to be listed on LoadLink" className="absolute inset-0 h-full w-full scale-[1.03] object-cover object-center grayscale opacity-80 [mask-image:linear-gradient(to_bottom,black_0%,black_64%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/35 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]" />
        <div className="relative mx-auto flex min-h-[300px] max-w-5xl flex-col justify-end px-5 pb-9 pt-20 text-white md:min-h-[360px]">
          <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] md:text-7xl">{dealerPost ? `Add stock to ${dealershipName}` : "List your vehicle"}</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">Choose what you’re listing and add the vehicle details.</p>
        </div>
      </section>

      <section className={`border-b px-4 py-5 md:px-6 ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white/80"}`}>
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3">
          <a href="#vehicle-listing-form" className="flex min-h-16 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black">List your vehicle</a>
          <a href="#vehicle-marketplace-vehicles" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Vehicles available</a>
          <a href="#vehicle-marketplace-units" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Units available</a>
        </div>
      </section>

      {!signedIn ? <section id="vehicle-listing-form" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-8 md:px-6"><div className={`loadlink-glass rounded-[24px] border p-6 text-center ${surface}`}><h2 className="text-3xl font-black tracking-[-.04em]">Sign in to list a vehicle</h2><p className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Approved marketplace stock remains available below. Sign in when you are ready to create a truck, trailer or mobile-unit listing.</p><a href={loginHref(currentRelativePath())} className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.1em] text-black">Sign in or create account</a></div></section> : null}

      {signedIn && !dealerPost && !selectedPlan ? (
        <section id="vehicle-listing-form" className={`scroll-mt-24 border-b px-4 py-6 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className={`mx-auto max-w-6xl rounded-[24px] border p-5 md:flex md:items-center md:justify-between md:gap-8 md:p-6 ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-[#faf8f2]"}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b88900]">Seller type</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Are you a dealership?</h2>
              <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Choose dealership to submit the required business documents and link approved stock to your public dealership page. Choose private seller for an individual listing.</p>
            </div>
            <div className="mt-5 grid shrink-0 grid-cols-2 gap-2 md:mt-0 md:min-w-[330px]">
              <button type="button" onClick={() => { setSellerType("private"); if (selectedPlan === "dealer") { setSelectedPlan(null); setPackageType("standard"); } setMessage(""); }} className={`min-h-12 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.1em] transition ${sellerType === "private" ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`}>Private seller</button>
              <button type="button" onClick={() => { setSellerType("dealership"); setMessage(""); }} className={`min-h-12 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.1em] transition ${sellerType === "dealership" ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`}>Yes, dealership</button>
            </div>
          </div>
        </section>
      ) : null}

      {signedIn && !selectedPlan ? <BusinessPlans darkMode={darkMode} selectable selectedPlan={selectedPlan} onSelect={choosePlan} /> : null}

      {signedIn && selectedPlan ? <form id="vehicle-listing-form" onSubmit={submitVehicle} className="mx-auto grid max-w-5xl scroll-mt-24 gap-6 px-4 py-7 md:px-6 md:py-12">
        <section id="vehicle-type" className={`scroll-mt-24 overflow-hidden rounded-2xl border ${surface}`}>
          <SectionHeading step="01" title="Choose what you are listing" description="The form changes to show only the details relevant to the selected vehicle or mobile unit." />
          <div className="grid gap-3 p-5 sm:grid-cols-3 md:p-7">
            <CategoryButton label="Truck" description="Commercial trucks and tractor units" active={vehicleCategory === "truck"} onClick={() => chooseCategory("truck")} />
            <CategoryButton label="Trailer" description="All commercial trailer types" active={vehicleCategory === "trailer"} onClick={() => chooseCategory("trailer")} />
            <CategoryButton label="Mobile Unit" description="Mobile service and business units" active={vehicleCategory === "mobile_unit"} onClick={() => chooseCategory("mobile_unit")} />
          </div>
        </section>

        {categoryChosen ? <>
          <section className={`overflow-hidden rounded-2xl border ${surface}`}>
            <SectionHeading step="02" title={`${categoryLabel(vehicleCategory!)} identity`} description={vehicleCategory === "truck" ? "Select the registration year, manufacturer and exact truck model." : "Choose the unit type and enter the make and model exactly as shown on the registration papers."} />
            <div className="grid gap-5 p-5 md:grid-cols-3 md:p-7">
              {vehicleCategory !== "truck" ? <Field label={`${vehicleCategory === "trailer" ? "Trailer" : "Mobile unit"} type`}><select value={vehicleSubtype} onChange={(event) => { setVehicleSubtype(event.target.value); setBodyType(event.target.value); }} className={inputClass} required><option value="">Select type</option>{(vehicleCategory === "trailer" ? trailerTypes : mobileUnitTypes).map((item) => <option key={item}>{item}</option>)}</select></Field> : null}
              <Field label="Registration / model year"><select value={year} onChange={(event) => { setYear(Number(event.target.value)); setModelName(""); setModelConfirmed(false); }} className={inputClass}>{truckYears.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Make / manufacturer">{vehicleCategory === "truck" ? <select value={brand} onChange={(event) => { setBrand(event.target.value); setModelName(""); setModelConfirmed(false); }} className={inputClass} required><option value="">Choose manufacturer</option>{truckCatalog.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select> : <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Make or manufacturer" className={inputClass} required />}</Field>
              <Field label="Model">{vehicleCategory === "truck" ? <select value={modelName} onChange={(event) => { setModelName(event.target.value); setModelConfirmed(false); }} className={inputClass} disabled={!brand} required><option value="">Choose exact model</option>{availableModels.map((item) => <option key={item.name}>{item.name}</option>)}</select> : <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Model name or number" className={inputClass} required />}</Field>
            </div>
            {vehicleCategory === "truck" ? <div className="border-t border-current/10 p-5 md:p-7"><button type="button" onClick={confirmSelectedModel} className="h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Confirm truck model</button>{imageLoading ? <p className={`mt-3 text-sm ${muted}`}>Loading model reference…</p> : null}{referenceImage?.imageUrl ? <figure className="mt-4 max-w-xl"><img src={referenceImage.imageUrl} alt={referenceImage.title || "Truck reference"} className="aspect-[16/9] w-full rounded-xl object-cover" /><figcaption className={`mt-2 text-[11px] font-semibold leading-5 ${muted}`}>Model reference photo · {referenceImage.matchConfidence === "high" ? "high-confidence match" : referenceImage.matchConfidence === "medium" ? "model-family match" : "visual reference"}. Confirm your uploaded photos show the actual truck.{referenceImage.credit ? ` Credit: ${referenceImage.credit}.` : ""}{referenceImage.license ? ` ${referenceImage.license}.` : ""} {referenceImage.sourceUrl ? <a href={referenceImage.sourceUrl} target="_blank" rel="noreferrer" className="font-black underline underline-offset-2">Source</a> : null}</figcaption></figure> : null}</div> : <div className="border-t border-current/10 p-5 md:p-7"><button type="button" onClick={() => { setTitle(`${year} ${brand} ${modelName} ${vehicleSubtype}`.replace(/\s+/g, " ").trim()); setMessage(""); }} className="h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Confirm vehicle details</button></div>}
          </section>

          {detailsReady ? <>
            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="03" title="Vehicle details" description="Add the information buyers need before opening the full product view." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
                <Field label="Listing title" wide><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} required /></Field>
                <Field label={vehicleCategory === "truck" ? "Body type" : "Type"}><select value={bodyType || vehicleSubtype} onChange={(event) => setBodyType(event.target.value)} className={inputClass}>{(vehicleCategory === "truck" ? truckBodyTypes : vehicleCategory === "trailer" ? trailerTypes : mobileUnitTypes).map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Condition"><select value={condition} onChange={(event) => setCondition(event.target.value)} className={inputClass}><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option><option>Needs attention</option></select></Field>
                <Field label="Transmission"><select value={transmission} onChange={(event) => setTransmission(event.target.value)} className={inputClass}>{gearboxOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Fuel / power type"><input value={fuelType} onChange={(event) => setFuelType(event.target.value)} placeholder={vehicleCategory === "trailer" ? "Not applicable" : "Diesel, petrol, electric"} className={inputClass} /></Field>
                <Field label="Mileage / usage"><input type="number" min="0" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} placeholder="Kilometres or usage reading" className={inputClass} required /></Field>
                <Field label="Previous owners"><input type="number" min="0" value={previousOwners} onChange={(event) => setPreviousOwners(event.target.value)} placeholder="0" className={inputClass} /></Field>
                <Field label="Service history"><select value={serviceHistory} onChange={(event) => setServiceHistory(event.target.value)} className={inputClass}><option>Full service history</option><option>Partial service history</option><option>No service history</option><option>Not applicable</option></select></Field>
                <Field label="Registration number"><input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} className={inputClass} required /></Field>
                <Field label="VIN / chassis number"><input value={vin} onChange={(event) => setVin(event.target.value)} className={inputClass} required /></Field>
                <Field label="Engine / serial number"><input value={engineNumber} onChange={(event) => setEngineNumber(event.target.value)} className={inputClass} /></Field>
                <Field label="Axle configuration"><input value={axleConfiguration} onChange={(event) => setAxleConfiguration(event.target.value)} placeholder="4x2, tandem, tri-axle" className={inputClass} /></Field>
                <Field label="GVM kg"><input type="number" min="0" value={gvmKg} onChange={(event) => setGvmKg(event.target.value)} className={inputClass} /></Field>
                <Field label="Payload / capacity kg"><input type="number" min="0" value={payloadKg} onChange={(event) => setPayloadKg(event.target.value)} className={inputClass} /></Field>
                <Field label="How is this unit available?"><select value={offerMode} onChange={(event) => setOfferMode(event.target.value as OfferMode)} className={inputClass}><option value="sale">For sale only</option><option value="rental">Rental only</option><option value="sale_or_rental">Sale or rental</option><option value="poa">POA — price on application</option></select></Field>
                {offerMode !== "poa" ? <Field label={offerMode === "rental" ? "Rental rate" : "Sale price"}><input value={rate} onChange={(event) => setRate(event.target.value)} placeholder={offerMode === "rental" ? "Example: 25000" : "Example: 850000"} inputMode="decimal" className={inputClass} required /></Field> : <Field label="Price"><div className={`${inputClass} flex items-center`}>POA — interested users must contact the seller</div></Field>}
                {offerMode === "rental" || offerMode === "sale_or_rental" ? <Field label="Rental period"><select value={rentalPeriod} onChange={(event) => setRentalPeriod(event.target.value as RentalPeriod)} className={inputClass}><option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option></select></Field> : null}
                {offerMode === "sale_or_rental" ? <Field label="Rental rate"><input value={rentalRate} onChange={(event) => setRentalRate(event.target.value)} placeholder="Example: 25000" inputMode="decimal" className={inputClass} required /></Field> : null}
                <Field label={specSchema[0][0]}><input value={specA} onChange={(event) => setSpecA(event.target.value)} placeholder={specSchema[0][1]} className={inputClass} /></Field>
                <Field label={specSchema[1][0]}><input value={specB} onChange={(event) => setSpecB(event.target.value)} placeholder={specSchema[1][1]} className={inputClass} /></Field>
                <Field label={specSchema[2][0]}><input value={specC} onChange={(event) => setSpecC(event.target.value)} placeholder={specSchema[2][1]} className={inputClass} /></Field>
                <Field label={specSchema[3][0]}><input value={specD} onChange={(event) => setSpecD(event.target.value)} placeholder={specSchema[3][1]} className={inputClass} /></Field>
                <Field label="Location"><SouthAfricaLocationInput value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Vehicle location" className={inputClass} required /></Field>
                <Field label="Description" wide><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the vehicle, maintenance, features, faults and anything a buyer should know." className={textAreaClass} required /></Field>
              </div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="04" title="Photos and verification" description="Upload clear product photos and the critical documents required for review." />
              <div className="p-5 md:p-7"><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#f6b800]/50 bg-[#f6b800]/5 px-5 text-center"><span className="text-sm font-black uppercase">Upload vehicle photos</span><span className={`mt-2 text-xs ${muted}`}>{vehiclePhotoProgress || `Minimum 2 photos · up to ${packageType === "pro" || packageType === "dealer" ? 15 : 5}`}</span><input type="file" accept="image/*" multiple onChange={handleVehiclePhotos} disabled={preparingVehiclePhotos || saving} className="hidden" /></label>{vehiclePreviews.length ? <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">{vehiclePreviews.map((preview, index) => <img key={preview} src={preview} alt={`Vehicle preview ${index + 1}`} className="aspect-square w-32 shrink-0 snap-start rounded-xl object-cover" />)}</div> : null}</div>
              {sellerType === "dealership" && !dealerPost ? <div className="grid gap-4 border-t border-current/10 p-5 md:grid-cols-2 md:p-7"><Field label="Dealership name"><input value={dealershipName} onChange={(event) => setDealershipName(event.target.value)} className={inputClass} required /></Field><Field label="Company registration number"><input value={companyRegistrationNumber} onChange={(event) => setCompanyRegistrationNumber(event.target.value)} className={inputClass} required /></Field><Field label="SARS tax number"><input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} className={inputClass} required /></Field><DocumentInput label="CIPC company registration" required file={documents.companyRegistration} onChange={(file) => setDocument("companyRegistration", file)} /><DocumentInput label="SARS tax document" required file={documents.taxDocument} onChange={(file) => setDocument("taxDocument", file)} /><DocumentInput label="Proof of business address" required file={documents.businessAddress} onChange={(file) => setDocument("businessAddress", file)} /><DocumentInput label="Representative authority" required file={documents.representativeAuthority} onChange={(file) => setDocument("representativeAuthority", file)} /></div> : null}
              <div className="grid gap-4 border-t border-current/10 p-5 md:grid-cols-2 md:p-7"><DocumentInput label="South African ID or passport" required file={documents.idDocument} onChange={(file) => setDocument("idDocument", file)} />{vehicleCategory === "truck" ? <DocumentInput label="Driver’s licence" required file={documents.driverLicence} onChange={(file) => setDocument("driverLicence", file)} /> : null}<DocumentInput label="Vehicle registration certificate" required file={documents.registrationPaper} onChange={(file) => setDocument("registrationPaper", file)} /><DocumentInput label="Proof of ownership or authority to list" required file={documents.ownershipProof} onChange={(file) => setDocument("ownershipProof", file)} /><DocumentInput label="Roadworthy certificate" file={documents.roadworthy} onChange={(file) => setDocument("roadworthy", file)} /><DocumentInput label="Operating licence" file={documents.operatingLicence} onChange={(file) => setDocument("operatingLicence", file)} />{transmissionCheck?.requiresModificationProof ? <DocumentInput label="Gearbox conversion paperwork" required file={documents.modificationProof} onChange={(file) => setDocument("modificationProof", file)} /> : null}</div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="05" title="Contact and confirmation" description="Confirm the details before the product is added to LoadLink." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7"><Field label={sellerType === "dealership" ? "Dealership / contact name" : "Owner / company name"}><input value={postedBy} onChange={(event) => setPostedBy(event.target.value)} className={inputClass} required /></Field><Field label="Contact number"><input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="0821234567" className={inputClass} required /></Field><Field label="WhatsApp number — optional"><input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="0821234567" className={inputClass} /></Field><Field label="Selected plan"><div className={`${inputClass} flex items-center`}>{false ? "Manual listing — R15 per vehicle per day" : selectedPlan === "pro" ? "Pro listing — analytics enabled" : "Dealer package — dealership inventory"}</div></Field></div>
              <div className="grid gap-3 px-5 pb-5 md:px-7 md:pb-7"><CheckRow checked={confirmOwnership} onChange={setConfirmOwnership} label="I own this vehicle or have written authority from the owner to list it." /><CheckRow checked={confirmAccuracy} onChange={setConfirmAccuracy} label="I confirm that the details, mileage, ownership history and uploaded documents are accurate." /></div>
              <div className="border-t border-[#f6b800]/25 bg-black p-5 text-white md:p-7">{message ? <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-300">{message}</div> : null}<button type="submit" disabled={saving || preparingVehiclePhotos} className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-50">{saving ? "Submitting vehicle…" : dealershipId ? "Add to dealership inventory" : "Submit vehicle for verification"}</button><p className="mt-3 text-center text-xs leading-5 text-white/45">The product will appear in the dealership slider when linked to an approved dealership. Analytics remains available only on Pro listings.</p></div>
            </section>
          </> : null}
        </> : null}
      </form> : null}
      <VehicleMarketplaceHub darkMode={darkMode} />
    </main>
  );
}

function Header({ darkMode, sellerType, dealerPost, onToggleTheme, onToggleSellerType }: { darkMode: boolean; sellerType: SellerType; dealerPost: boolean; onToggleTheme: () => void; onToggleSellerType: () => void }) {
  return (
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={onToggleTheme} />
  );
}
function SectionHeading({ step, title, description }: { step: string; title: string; description: string }) { return <div className="border-b border-current/10 px-5 py-5 md:px-7"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b88900]">{step}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h2><p className="mt-2 text-sm leading-6 opacity-55">{description}</p></div>; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? "block md:col-span-2" : "block"}><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#b88900]">{label}</span>{children}</label>; }
function CategoryButton({ label, description, active, onClick }: { label: string; description: string; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`min-h-28 rounded-2xl border p-4 text-left transition ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/15"}`}><span className="text-lg font-black">{label}</span><span className={`mt-2 block text-xs leading-5 ${active ? "text-black/60" : "opacity-55"}`}>{description}</span></button>; }
function DocumentInput({ label, required = false, file, onChange }: { label: string; required?: boolean; file: File | null; onChange: (file: File | null) => void }) { return <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-2xl border border-[#f6b800]/35 bg-[#f6b800]/5 px-4 py-4"><span className="text-xs font-black uppercase tracking-[0.12em] text-[#b88900]">{label}{required ? " *" : ""}</span><span className="mt-2 truncate text-sm font-bold">{file ? file.name : "Choose image or PDF"}</span><span className="mt-1 text-[10px] opacity-45">JPG, PNG, WEBP or PDF · maximum 10 MB</span><input type="file" accept={acceptedDocuments} required={required && !file} onChange={(event) => onChange(event.target.files?.[0] || null)} className="hidden" /></label>; }
function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#f6b800]/30 p-4"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" /><span className="text-sm font-semibold leading-6">{label}</span></label>; }
