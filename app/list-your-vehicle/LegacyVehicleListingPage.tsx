"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import dynamic from "next/dynamic";

import LoadLinkIcon from "@/components/LoadLinkIcon";
import LoadLinkVehicleWizardController20260825 from "@/components/LoadLinkVehicleWizardController20260825";
import { VEHICLE_DRAFT_OWNER_KEY, readVehicleDraft, clearVehicleDraft, scopeVehicleDraft } from "@/lib/vehicleDraft";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import type { BusinessPlanId } from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
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
import { getVehicleListingAccess } from "@/lib/packageAccess";
import { inspectLoadLinkImage, showLoadLinkImageQuality } from "@/lib/loadlinkImageQuality";
import { submitListingDirect } from "@/lib/listingSubmission";
import { assessVehicleListing } from "@/lib/vehiclePostingIntelligence";

const BusinessPlans = dynamic(() => import("@/components/BusinessPlans"), { ssr: false, loading: () => <div className="mx-auto my-6 h-28 max-w-6xl animate-pulse rounded-2xl bg-current/[.05]" /> });
const VehicleMarketplaceHub = dynamic(() => import("@/components/VehicleMarketplaceHub"), { ssr: false, loading: () => <div className="mx-auto my-8 h-64 max-w-6xl animate-pulse rounded-2xl bg-current/[.05]" /> });
import { findTruckReference, truckReferenceResponse } from "@/lib/truckModelReferences";
import { getTruckModel, getTruckModels, truckCatalog, truckYears, validateTruckTransmission } from "@/lib/truckCatalog";
import { getLightCommercialModels, getLightCommercialModelYearStatus, lightCommercialCatalog, lightCommercialYears } from "@/lib/southAfricanLightCommercialCatalog";
import { storedLightCommercialPhotos, type LightCommercialPhoto } from "@/lib/lightCommercialModelPhotos";


const truckBodyTypes = [
  "Tractor unit / horse", "Side tipper", "Dropside", "Flat deck", "Tautliner", "Refrigerated body", "Closed box body",
  "Lowbed", "Mixer", "Tipper", "Tanker", "Curtainsider", "Car carrier", "Refuse truck", "Tow truck", "Fire truck",
  "Crane truck", "Logging truck", "Other",
];
const trailerTypes = ["Flatbed", "Tautliner", "Side Tipper", "End Tipper", "Refrigerated", "Tanker", "Lowbed", "Livestock", "Car Carrier", "Container", "Other"];
const bakkieVanTypes = ["Single cab bakkie", "Extended cab bakkie", "Double cab bakkie", "Panel van", "Crew van", "Passenger van", "Minibus / people carrier", "Pickup / light commercial", "Other"];
const mobileUnitTypes = ["Mobile Toilet", "Mobile Fridge", "Food Truck", "Mobile Kitchen", "Mobile Clinic", "Mobile Office", "Mobile Workshop", "Mobile Classroom", "Mobile Accommodation", "Mobile Shower", "Cold Room", "Other"];
const gearboxOptions = ["Manual", "Automatic", "Automated manual", "Electric direct drive", "Not applicable", "Converted / custom"];
const acceptedDocuments = ".jpg,.jpeg,.png,.webp,.pdf";

type VehicleCategory = "truck" | "bakkie_van" | "trailer" | "mobile_unit";
type ListingIntent = "vehicle" | "mobile_unit";
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
type ReferenceImage = { brand?: string; model?: string; verifiedFuel?: string | null; verifiedTransmission?: string | null; specSourceUrl?: string | null; imageUrl: string | null; title: string; exactMatch: boolean; sourceUrl?: string; credit?: string; license?: string; matchConfidence?: "high" | "medium" | "reference" };

const emptyVerificationFiles: VerificationFiles = {
  idDocument: null, driverLicence: null, registrationPaper: null, ownershipProof: null,
  roadworthy: null, operatingLicence: null, modificationProof: null,
  companyRegistration: null, taxDocument: null, businessAddress: null, representativeAuthority: null,
};

function normalizePhone(value: string) { return value.replace(/[^\d+]/g, ""); }
function isValidSouthAfricanPhone(value: string) { const clean = normalizePhone(value); return /^0\d{9}$/.test(clean) || /^\+27\d{9}$/.test(clean); }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "document"; }

/** Local category photography: reveal each image only after it has finished loading. */
function VehicleCategoryPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = photoRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [src]);

  return (
    <span className="relative mb-3 block h-28 w-full overflow-hidden rounded-[16px] bg-white/[.045] sm:h-36">
      {!loaded ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-pulse bg-current/[.045]" /> : null}
      <LoadLinkImage
        ref={photoRef}
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover object-center transition-[opacity,transform] duration-700 ease-out ${loaded ? "scale-100 opacity-100" : "scale-[1.025] opacity-0"}`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
    </span>
  );
}

function categoryLabel(category: VehicleCategory) { return category === "truck" ? "Truck" : category === "bakkie_van" ? "Bakkie or Van" : category === "trailer" ? "Trailer" : "Mobile Unit"; }
function offerLabel(mode: OfferMode) { return mode === "sale" ? "For sale only" : mode === "rental" ? "Rental only" : mode === "sale_or_rental" ? "Sale or rental" : "Price on application (POA)"; }
function unitSpecSchema(category: VehicleCategory | null, subtype: string): Array<[string, string]> {
  const clean = subtype.toLowerCase();
  if (category === "bakkie_van") return [["Engine / power", "Engine size, output or power rating"], ["Cab / seating", "Single cab, double cab or passenger seats"], ["Cargo dimensions", "Load bin, panel dimensions or cargo volume"], ["Features", "Canopy, towbar, refrigeration or safety equipment"]];
  if (category === "truck") return [["Engine / power", "Engine displacement, output or power rating"], ["Cab configuration", "Sleeper cab, day cab, crew cab"], ["Braking / retarder", "Retarder, engine brake, EBS or ABS"], ["Suspension", "Air, steel or mixed suspension"]];
  if (category === "trailer") return [["Braking system", "EBS, ABS, drum or disc"], ["Suspension", "Air or mechanical suspension"], ["Body / deck dimensions", "Length, width and usable body/deck size"], ["Loading configuration", "Rear doors, side access, ramps, tipper setup, etc."]];
  if (clean.includes("fridge") || clean.includes("cold room") || clean.includes("refrigerated")) return [["Temperature range", "Operating temperature range"], ["Refrigeration system", "Unit brand/model and cooling setup"], ["Power supply", "Mains, generator, solar or hybrid"], ["Internal capacity", "Usable refrigerated space / volume"]];
  if (clean.includes("kitchen") || clean.includes("food truck")) return [["Power supply", "Electrical, generator or gas setup"], ["Water system", "Fresh/grey water capacity and pumps"], ["Included kitchen equipment", "Cooking, refrigeration and prep equipment"], ["Extraction / ventilation", "Extraction hood and ventilation setup"]];
  return [["Power supply", "Electrical, generator, solar or other"], ["Internal dimensions", "Usable internal dimensions"], ["Fit-out / equipment", "Installed fixtures and equipment"], ["Operating capability", "What this unit is ready to do"]];
}
export default function ListYourVehiclePage({ entryMode, initialPackage = "standard", resumeDraft = false, embedded = false }: { entryMode?: "vehicle" | "mobile-unit"; initialPackage?: "standard" | "pro" | "dealer"; resumeDraft?: boolean; embedded?: boolean } = {}) {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [listingFlowOpen, setListingFlowOpen] = useState(Boolean(entryMode));
  const [listingIntent, setListingIntent] = useState<ListingIntent | null>(entryMode === "mobile-unit" ? "mobile_unit" : null);
  const [saving, setSaving] = useState(false);
  const [preparingVehiclePhotos, setPreparingVehiclePhotos] = useState(false);
  const [vehiclePhotoProgress, setVehiclePhotoProgress] = useState("");
  const [message, setMessage] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [photoLimitToast, setPhotoLimitToast] = useState(false);
  const [listingQuotaToast, setListingQuotaToast] = useState("");
  const [quotaSnapshot, setQuotaSnapshot] = useState<{monthly_used:number;monthly_limit:number|null;photo_limit:number}|null>(null);
  const [submittedListingId, setSubmittedListingId] = useState<string | null>(null);
  const [sellerType, setSellerType] = useState<SellerType>("private");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | null>(entryMode === "mobile-unit" ? "mobile_unit" : null);
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
  const [lightCommercialPhotos, setLightCommercialPhotos] = useState<LightCommercialPhoto[]>([]);
  const [lightCommercialPhotoLoading, setLightCommercialPhotoLoading] = useState(false);
  const [lightCommercialPhotoUnavailable, setLightCommercialPhotoUnavailable] = useState(false);
  const [lightCommercialPhotoFailed, setLightCommercialPhotoFailed] = useState<string[]>([]);
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
  const [requestBoost, setRequestBoost] = useState(false);
  const [boostRequestNotice, setBoostRequestNotice] = useState("");
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
  const [packageType, setPackageType] = useState<"standard" | "pro" | "dealer">(initialPackage);
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlanId | "standard" | null>(entryMode ? initialPackage : null);
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [vehiclePreviews, setVehiclePreviews] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationFiles>(emptyVerificationFiles);
  const [confirmOwnership, setConfirmOwnership] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const submitLockRef = useRef(false);
  const draftOwnerRef = useRef("");
  const listingSubmittedRef = useRef(false);
  const submissionIdRef = useRef("");
  const vehiclePreviewUrlsRef = useRef<string[]>([]);

  const availableModels = useMemo(() => vehicleCategory === "truck" ? getTruckModels(brand, year) : [], [brand, vehicleCategory, year]);
  const lightCommercialYearStatus = useMemo(() => vehicleCategory === "bakkie_van" ? getLightCommercialModelYearStatus(brand, modelName, year) : null, [brand, modelName, year, vehicleCategory]);
  const bakkieVanModels = useMemo(() => vehicleCategory === "bakkie_van" ? getLightCommercialModels(brand, year) : [], [brand, vehicleCategory, year]);
  const selectedModel = useMemo(() => vehicleCategory === "truck" ? getTruckModel(brand, modelName, year) : null, [brand, modelName, vehicleCategory, year]);
  const transmissionCheck = useMemo(() => vehicleCategory === "truck" && transmission ? validateTruckTransmission(brand, modelName, year, transmission) : null, [brand, modelName, transmission, vehicleCategory, year]);
  const smartChecks = useMemo(() => assessVehicleListing({
    category:vehicleCategory||"",year,make:brand,model:modelName,bodyType,condition,
    transmission,fuel:fuelType,mileage:odometerKm,gvm:gvmKg,payload:payloadKg,
    offer:offerMode,salePrice:rate,rentalPrice:rentalRate,rentalPeriod,
    serviceHistory,description,photoCount:vehiclePhotos.length,packageType
  }),[vehicleCategory,year,brand,modelName,bodyType,condition,transmission,fuelType,odometerKm,gvmKg,payloadKg,offerMode,rate,rentalRate,rentalPeriod,serviceHistory,description,vehiclePhotos.length,packageType]);
  const specSchema = useMemo(() => unitSpecSchema(vehicleCategory, bodyType || vehicleSubtype), [bodyType, vehicleCategory, vehicleSubtype]);

  useEffect(() => {
    if (!signedIn || !selectedPlan || !vehicleCategory) {setQuotaSnapshot(null);return;}
    let active=true;
    void supabase.rpc("loadlink_vehicle_preflight",{p_vin:"",p_registration:""})
      .then(({data,error}) => {
        if (!active || error || !data) return;
        setQuotaSnapshot(data as {monthly_used:number;monthly_limit:number|null;photo_limit:number});
      }).catch(()=>{});
    return ()=>{active=false;};
  },[signedIn,selectedPlan,vehicleCategory]);

  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    async function requireAccount() {
      if (!isSupabaseConfigured) { setAuthReady(true); return; }
      const user = await getFreshAuthenticatedUser();
      if (!user) { setAuthReady(true); return; }
      scopeVehicleDraft(user.id);
      draftOwnerRef.current = user.id;
      setSignedIn(true);
      void syncAccountState().catch(() => undefined);
      setPostedBy(String(user.user_metadata?.full_name || user.user_metadata?.name || ""));

      const params = new URLSearchParams(window.location.search);
      const requestedPlan = params.get("plan");
      if (requestedPlan === "pro" || requestedPlan === "dealer") {
        setSelectedPlan(requestedPlan);
        setPackageType(requestedPlan);
      } else if (requestedPlan === "manual" || requestedPlan === "standard") {
        setSelectedPlan("standard");
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
          setListingIntent("vehicle");
          setListingFlowOpen(true);
          setSelectedPlan("dealer");
          setPackageType("dealer");
        }
      }
      setAuthReady(true);
    }
    void requireAccount().catch(() => setAuthReady(true));
  }, [router]);

  useEffect(() => {
    if (!authReady || !signedIn) return;
    try {
      submissionIdRef.current = localStorage.getItem("loadlink-vehicle-submission-id") || createSafeRandomId();
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
      const d = resumeDraft ? readVehicleDraft() as Record<string, any> | null : null;
      if (!d) { setDraftHydrated(true); return; }
      setSellerType(d.sellerType || "private"); setVehicleCategory(d.vehicleCategory || null); setVehicleSubtype(d.vehicleSubtype || "");
      setYear(d.year || 2026); setBrand(d.brand || ""); setModelName(d.modelName || ""); setModelConfirmed(Boolean(d.modelConfirmed));
      setTitle(d.title || ""); setCity(d.city || "Johannesburg"); setBodyType(d.bodyType || ""); setTransmission(d.transmission || "");
      setFuelType(d.fuelType || ""); setAxleConfiguration(d.axleConfiguration || ""); setRegistrationNumber(d.registrationNumber || "");
      setVin(d.vin || ""); setEngineNumber(d.engineNumber || ""); setOdometerKm(d.odometerKm || ""); setPreviousOwners(d.previousOwners || "");
      setCondition(d.condition || "Good"); setServiceHistory(d.serviceHistory || "Partial service history"); setGvmKg(d.gvmKg || "");
      setPayloadKg(d.payloadKg || ""); setRate(d.rate || ""); setOfferMode(d.offerMode || "sale"); setRentalRate(d.rentalRate || ""); setRentalPeriod(d.rentalPeriod || "month"); setSpecA(d.specA || ""); setSpecB(d.specB || ""); setSpecC(d.specC || ""); setSpecD(d.specD || ""); setPostedBy(d.postedBy || ""); setContactNumber(d.contactNumber || "");
      setWhatsappNumber(d.whatsappNumber || ""); setDescription(d.description || ""); setConfirmOwnership(Boolean(d.confirmOwnership));
      setConfirmAccuracy(Boolean(d.confirmAccuracy)); setSelectedPlan(entryMode ? initialPackage : d.selectedPlan || initialPackage); setPackageType(entryMode ? initialPackage : d.packageType || "standard");
      setListingIntent(d.vehicleCategory === "mobile_unit" ? "mobile_unit" : "vehicle");
      setListingFlowOpen(true);
      submissionIdRef.current = String(d.submissionId || submissionIdRef.current);
      localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current);
    } catch {
      submissionIdRef.current ||= createSafeRandomId();
    }
    finally { setDraftHydrated(true); }
  }, [resumeDraft, authReady, signedIn]);

  useEffect(() => {
    if (!listingFlowOpen || !vehicleCategory || !draftHydrated || !signedIn) return;
    const draft = { updatedAt: Date.now(), entryMode: entryMode || "vehicle", sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType, submissionId: submissionIdRef.current || "" };
    const persist = () => {
      try {
        if (!listingSubmittedRef.current && localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY) === draftOwnerRef.current)
          localStorage.setItem("loadlink-vehicle-draft-v1", JSON.stringify(draft));
      } catch {}
    };
    const timer = window.setTimeout(persist, 150);
    window.addEventListener("pagehide", persist);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", persist); persist(); };
  }, [draftHydrated, signedIn, sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType]);

  useEffect(() => {
    if (vehicleCategory !== "truck" || !brand || !modelName) { setReferenceImage(null); return; }
    const reference = findTruckReference(brand, modelName);
    setReferenceImage(reference ? truckReferenceResponse(reference, year) as ReferenceImage : null);
    setImageLoading(false);
  }, [brand, modelName, vehicleCategory, year]);

  useEffect(() => {
    setLightCommercialPhotoFailed([]);
    if (vehicleCategory !== "bakkie_van" || !brand.trim() || !modelName.trim() || (lightCommercialYearStatus && !lightCommercialYearStatus.valid)) {
      setLightCommercialPhotos([]); setLightCommercialPhotoLoading(false); setLightCommercialPhotoUnavailable(false); return;
    }
    const stored = storedLightCommercialPhotos(brand, modelName);
    if (stored.length) {
      setLightCommercialPhotos(stored); setLightCommercialPhotoLoading(false); setLightCommercialPhotoUnavailable(false); return;
    }
    setLightCommercialPhotos([]);
    setLightCommercialPhotoLoading(true);
    setLightCommercialPhotoUnavailable(false);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({make:brand.trim(), model:modelName.trim(), year:String(year), v:"2"});
        const response = await fetch(`/api/light-commercial-reference?${query}`, {signal:AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])});
        if(!response.ok) throw new Error("reference lookup failed");
        const data = await response.json() as {photos?:LightCommercialPhoto[]};
        if(controller.signal.aborted) return;
        setLightCommercialPhotos(data.photos || []); setLightCommercialPhotoFailed([]);
        setLightCommercialPhotoUnavailable(!(data.photos || []).length);
      } catch {
        if(!controller.signal.aborted) {setLightCommercialPhotos([]);setLightCommercialPhotoUnavailable(true);}
      } finally {if(!controller.signal.aborted) setLightCommercialPhotoLoading(false);}
    },420);
    return () => {window.clearTimeout(timer);controller.abort();};
  }, [vehicleCategory,brand,modelName,year,lightCommercialYearStatus]);

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
    setBodyType(category === "truck" ? "Tractor unit / horse" : category === "bakkie_van" ? "Single cab bakkie" : "");
    setBrand(""); setModelName(""); setModelConfirmed(false); setReferenceImage(null);
    setTransmission(category === "trailer" ? "Not applicable" : "");
    setFuelType(category === "trailer" ? "Not applicable" : "");
    setAxleConfiguration(""); setTitle(""); setMessage("");
  }

  function selectTruckModel(name: string) {
    setModelName(name); setModelConfirmed(false);
    const reference = findTruckReference(brand, name);
    setTransmission(reference?.verified_transmission || "");
    setFuelType(reference?.verified_fuel || "");
    setAxleConfiguration(reference?.axle_options.length === 1 ? reference.axle_options[0] : "");
  }

  function confirmSelectedModel() {
    if (!selectedModel) { setMessage("Choose a valid year, truck brand and model first."); return; }
    setTitle(`${year} ${brand} ${modelName}`);
    const reference = findTruckReference(brand, modelName);
    setTransmission(reference?.verified_transmission || "");
    setFuelType(reference?.verified_fuel || "");
    setAxleConfiguration(selectedModel.axleConfigurations.length === 1 ? selectedModel.axleConfigurations[0] : "");
    setModelConfirmed(true);
    setMessage("");
  }

  function confirmBakkieVanModel() {
    if (year < 2009 || year > new Date().getFullYear()) { setMessage("Select a model year from 2009 to the current year."); return; }
    if (lightCommercialYearStatus && !lightCommercialYearStatus.valid) { setMessage(`The ${brand} ${lightCommercialYearStatus.model} is not listed for ${year}. Check the year or exact model variant before continuing.`); return; }
    if (!brand.trim() || !modelName.trim() || !bodyType.trim()) { setMessage("Enter the make, model and body type as shown on the papers."); return; }
    setTitle(`${year} ${brand.trim()} ${modelName.trim()}`);
    setModelConfirmed(true);
    setMessage("");
  }

  async function handleVehiclePhotos(event: ChangeEvent<HTMLInputElement>) {
    const max = packageType === "dealer" ? 30 : packageType === "pro" ? 10 : 2;
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
        const quality = await inspectLoadLinkImage(source, {vehicle:true});
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
        if (true) {
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
      submissionIdRef.current = createSafeRandomId();
      try { localStorage.setItem("loadlink-vehicle-submission-id", submissionIdRef.current); } catch {}
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
    if (!vehicleCategory) return "Choose a truck, bakkie or van, trailer, or mobile unit.";
    if (vehicleCategory === "truck") {
      if (!modelConfirmed || !selectedModel) return "Confirm the exact truck model before continuing.";
      if (!transmissionCheck?.valid) return transmissionCheck?.message || "Choose a valid gearbox.";
    } else if (vehicleCategory === "bakkie_van") {
      if (year < 2009 || year > new Date().getFullYear()) return "Bakkie and van listings support model years from 2009 onwards.";
      if (lightCommercialYearStatus && !lightCommercialYearStatus.valid) return "This model is not listed for the selected year. Check the registration year and model variant.";
      if (!brand.trim() || !modelName.trim() || !bodyType.trim() || !modelConfirmed) return "Enter make, model and body type, then confirm the vehicle details.";
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
    const blocking = smartChecks.find(item=>item.level==="warning");
    if (blocking) return blocking.message;
    if (sellerType === "dealership" && packageType === "dealer" && vehiclePhotos.length < 10) return "Dealer listings require at least 10 clear photos. Your Dealer package supports up to 30.";
    if (vehiclePhotos.length < 2) return "Upload at least two clear photos of the actual vehicle or unit.";
    if (!documents.idDocument || !documents.registrationPaper || !documents.ownershipProof) return "Upload your ID, registration paper and proof of ownership or authority to list.";
    if ((vehicleCategory === "truck" || vehicleCategory === "bakkie_van") && !documents.driverLicence) return "Upload the driver’s licence for this vehicle listing.";
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
      const standardAccess = !intelligence.capabilities.can_post_vehicle ? await getVehicleListingAccess() : null;
      if (!intelligence.capabilities.can_post_vehicle && !(standardAccess?.allowed && standardAccess.plan === "manual")) {
        if (["blocked","suspended"].includes(intelligence.account_status)) throw new Error(intelligence.account_reason || "You cannot post while this account is restricted.");
        if (intelligence.plan === "dealer" && !intelligence.dealer_ready) throw new Error("Your Dealer plan is active, but the dealership must be approved before stock can be published.");
        if (intelligence.plan_state === "under_review") throw new Error("Your plan request is still under review.");
        if (["approved_for_payment","payment_pending"].includes(String(intelligence.plan_state))) throw new Error("Complete your approved plan payment before publishing a vehicle.");
        throw new Error("Standard requires R14 paid daily listing access. Visit Packages to purchase access, or upgrade to Pro or Dealer.");
      }
      const preflight = await supabase.rpc("loadlink_vehicle_preflight",{
        p_vin:vin.trim(),p_registration:registrationNumber.trim()
      });
      if(preflight.error) throw preflight.error;
      const pre = preflight.data as {owned_duplicate?:boolean;monthly_used?:number;monthly_limit?:number|null;photo_limit?:number} | null;
      if(pre?.owned_duplicate) throw new Error("This vehicle is already listed on your account. Edit the existing listing instead.");
      if(pre?.monthly_limit!==null&&pre?.monthly_limit!==undefined&&Number(pre.monthly_used||0)>=pre.monthly_limit) {
        const notice = `You have reached ${pre.monthly_limit} new vehicle listings this month. You can compare packages for more listings.`;
        setListingQuotaToast(notice);throw new Error(notice);
      }
      if(pre?.photo_limit && vehiclePhotos.length>pre.photo_limit)throw new Error(`Your package allows ${pre.photo_limit} photos per listing.`);
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
      const subtype = vehicleCategory === "truck" || vehicleCategory === "bakkie_van" ? bodyType : vehicleSubtype;
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
        vehicle_group: vehicleCategory === "mobile_unit" ? "Mobile Units" : vehicleCategory === "bakkie_van" ? "Vehicles" : "Trucks / Trailers",
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

      if (vehicleCategory === "truck" || vehicleCategory === "bakkie_van") {
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

      // Private identity claim covers trucks, bakkies, trailers and mobile units.
      // Supabase applies owner-only access and securely flags cross-account matches.
      const claim = await supabase.from("vehicle_identity_claims").insert({
        listing_id:listingId,user_id:user.id,
        vin_normalized:vin.trim().toUpperCase(),
        plate_normalized:registrationNumber.trim().toUpperCase(),
        vehicle_category:vehicleCategory!
      });
      if(claim.error) throw claim.error;

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
      listingSubmittedRef.current = true;
      await syncAccountState().catch(() => undefined);
      clearVehicleDraft();
      submissionIdRef.current = createSafeRandomId();
      if (requestBoost) {
        // An opt-in request generates a manual R14 payment reference. The boost
        // is NOT activated until payment is confirmed by the existing backend.
        const boost = await supabase.from("job_boosts").insert({
          listing_id: listingId, user_id: user.id,
          amount_cents: 1400, currency: "ZAR", status: "pending_payment",
          metadata: { listing_type: "vehicle", source: "vehicle_posting_flow" },
        }).select("payment_reference").single();
        if (boost.error) {
          setBoostRequestNotice("Your listing was submitted, but its optional promotion request could not be created. You can still manage the listing in My Posts.");
        } else {
          setBoostRequestNotice(`Promotion requested. R14 payment reference: ${boost.data?.payment_reference || "Check your notifications"}. It activates only after payment is confirmed.`);
        }
      }
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

  const surface = darkMode ? "loadlink-glass border-white/12 bg-black/62 text-white backdrop-blur-xl" : "loadlink-glass border-white/75 bg-white/68 text-black backdrop-blur-xl";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-xl border px-4 font-semibold outline-none backdrop-blur-lg focus:border-[#f6b800] ${darkMode ? "border-white/14 bg-white/[.055] text-white placeholder:text-white/30" : "border-black/10 bg-white/72 text-black placeholder:text-black/35"}`;
  const textAreaClass = `${inputClass} min-h-32 py-4`;
  const categoryChosen = Boolean(vehicleCategory);
  const detailsReady = vehicleCategory === "truck" || vehicleCategory === "bakkie_van" ? modelConfirmed : Boolean(vehicleSubtype && brand.trim() && modelName.trim());

  return (
    <main className={`min-h-screen transition-colors ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      {boostRequestNotice ? <div role="status" className="fixed inset-x-4 top-4 z-[9999] mx-auto max-w-xl rounded-2xl border border-[#f6b800]/40 bg-[#131313] px-5 py-4 text-sm font-semibold text-white shadow-xl"><button type="button" onClick={() => setBoostRequestNotice("")} className="float-right ml-2 text-[#f6b800]">Close</button>{boostRequestNotice}</div> : null}
      {listingQuotaToast ? <div role="status" className="fixed inset-x-4 bottom-20 z-[12010] mx-auto max-w-md rounded-2xl border border-[#f6b800]/35 bg-[#101010] p-4 text-sm text-white shadow-xl">
        <p className="font-black">Monthly listing limit reached</p>
        <p className="mt-2 text-xs leading-5 text-white/70">{listingQuotaToast}</p>
        <div className="mt-4 flex gap-3"><a href="/account/packages" className="inline-flex min-h-10 items-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">View packages</a>
        <button type="button" onClick={()=>setListingQuotaToast("")} className="rounded-xl border border-white/20 px-4 text-xs font-bold">Dismiss</button></div></div> : null}
      <PhotoLimitUpgradeToast open={photoLimitToast} onClose={() => setPhotoLimitToast(false)} limit={packageType === "dealer" ? 30 : packageType === "pro" ? 10 : 2} plan={packageType} />
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
      {!embedded ? <Header darkMode={darkMode} sellerType={sellerType} dealerPost={dealerPost} onToggleTheme={toggleTheme} onToggleSellerType={() => {
        if (dealerPost) return;
        if (sellerType === "dealership") {
          setSellerType("private");
          if (selectedPlan === "dealer") { setSelectedPlan(null); setPackageType("standard"); }
        } else {
          setSellerType("dealership");
        }
        setMessage("");
      }} /> : null}

      {!entryMode ? <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">
        <LoadLinkImage
          src="/images/jobs/jobs-hero-fleet.jpg"
          alt="Approved LoadLink commercial vehicles and mobile units"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/90" />

        <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 text-center text-white md:min-h-[620px] md:pb-12">
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-.055em] md:text-7xl">
            {dealerPost ? `Add stock to ${dealershipName}` : "Find a vehicle or list your own"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
            Browse approved trucks, trailers and mobile units or create your own LoadLink vehicle listing.
          </p>

          {!dealerPost ? (
            <div className="mx-auto mt-6 grid w-full max-w-md gap-3">
              <a href="#vehicle-marketplace-vehicles" onClick={() => { setListingFlowOpen(false); setListingIntent(null); setSelectedPlan(null); }} className="flex min-h-14 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[.1em] text-black shadow-[0_12px_32px_rgba(0,0,0,.28)] transition active:scale-[.99]">
                View available vehicles
              </a>
              <button type="button" onClick={() => {
                setListingFlowOpen(true);
                setListingIntent(null);
                setVehicleCategory(null);
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-choice")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]">
                List your vehicle
              </button>
            </div>
          ) : null}
        </div>
      </section> : null}

      {listingFlowOpen && !listingIntent && !dealerPost ? (
        <section id="vehicle-listing-choice" className={`scroll-mt-24 border-b px-4 py-8 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className="ll-vehicle-entry-choice mx-auto max-w-5xl text-left">
            <h2 className="ll-vehicle-entry-title text-3xl font-black tracking-[-.04em]">List a vehicle</h2>
            <p className={`mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Choose your vehicle type to get started.</p>
            <div className="ll-vehicle-type-choices mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => {
                setListingIntent("vehicle");
                chooseCategory("truck");
                setSelectedPlan(entryMode ? initialPackage : null);
                setPackageType(entryMode ? initialPackage : "standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`ll-vehicle-type-card min-h-28 rounded-[24px] border px-6 py-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <VehicleCategoryPhoto src="/images/vehicle-types/truck.webp" alt="Truck at a warehouse loading dock" /><span className="block text-xl font-black">Truck</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Commercial trucks and tractor units.</span>
              </button>
              <button type="button" onClick={() => {
                setListingIntent("vehicle"); chooseCategory("bakkie_van");
                setYear(Math.min(new Date().getFullYear(), 2026));
                setSelectedPlan(entryMode ? initialPackage : null);
                setPackageType(entryMode ? initialPackage : "standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`ll-vehicle-type-card min-h-28 rounded-[24px] border px-6 py-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <VehicleCategoryPhoto src="/images/vehicle-types/bakkie-van.webp" alt="Red pickup bakkie driving through a shallow river" />
                <span className="block text-xl font-black">Bakkie &amp; Van</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Bakkies and vans for business and work use.</span>
              </button>
              <button type="button" onClick={() => {
                setListingIntent("vehicle");
                chooseCategory("trailer");
                setSelectedPlan(entryMode ? initialPackage : null);
                setPackageType(entryMode ? initialPackage : "standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`ll-vehicle-type-card min-h-28 rounded-[24px] border px-6 py-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <VehicleCategoryPhoto src="/images/vehicle-types/trailer.webp" alt="Galvanised utility trailer parked on paving" /><span className="block text-xl font-black">Trailer</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Commercial trailer listings.</span>
              </button>
              {!entryMode ?               <button type="button" onClick={() => {
                setListingIntent("mobile_unit");
                chooseCategory("mobile_unit");
                setSelectedPlan(entryMode ? initialPackage : null);
                setPackageType(entryMode ? initialPackage : "standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`ll-vehicle-type-card min-h-28 rounded-[24px] border px-6 py-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">Mobile Unit</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Mobile fridge, kitchen, clinic, office and other units.</span>
              </button> : null}
            </div>
          </div>
        </section>
      ) : null}

      {listingFlowOpen && listingIntent && !signedIn ? <section id="vehicle-listing-form" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-8 md:px-6"><div className={`loadlink-glass rounded-[24px] border p-6 text-center ${surface}`}><h2 className="text-3xl font-black tracking-[-.04em]">Sign in to list a vehicle</h2><p className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Approved marketplace stock remains available below. Sign in when you are ready to create a truck, trailer or mobile-unit listing.</p><a href={loginHref(currentRelativePath())} className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.1em] text-black">Sign in or create account</a></div></section> : null}

      {listingFlowOpen && signedIn && listingIntent && !dealerPost && !selectedPlan ? (
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

      {listingFlowOpen && signedIn && listingIntent && !selectedPlan ? <>
        <section className="mx-auto max-w-6xl px-4 pt-5"><button type="button" onClick={() => {setSelectedPlan("standard");setPackageType("standard");setSellerType("private");}} className="flex min-h-12 w-full items-center justify-center rounded-full border border-[#f6b800] bg-[#f6b800] px-4 text-sm font-black text-black">Standard — R14 per listing day</button><p className={`mt-2 text-center text-xs ${muted}`}>Two photos and five new listings monthly. Paid daily access required before submission.</p></section>
        <BusinessPlans darkMode={darkMode} selectable selectedPlan={null} onSelect={choosePlan} />
      </> : null}

      {listingFlowOpen && signedIn && listingIntent && selectedPlan ? <LoadLinkVehicleWizardController20260825 darkMode={darkMode} listingKind={entryMode === "mobile-unit" ? "mobile-unit" : "vehicle"}/> : null}
      {listingFlowOpen && signedIn && listingIntent && selectedPlan ? <form id="vehicle-listing-form" onSubmit={submitVehicle} className="mx-auto grid max-w-5xl scroll-mt-24 gap-6 px-4 py-7 md:px-6 md:py-12">
        {categoryChosen ? <>
          <section className={`overflow-hidden rounded-2xl border ${surface}`}>
            <SectionHeading step="01" title={`${categoryLabel(vehicleCategory!)} identity`} description={vehicleCategory === "truck" ? "Select the registration year, manufacturer and exact truck model." : vehicleCategory === "bakkie_van" ? "Choose a bakkie or van make and model, or enter one manually." : "Choose the unit type and enter the make and model exactly as shown on the registration papers."} />
            <div className="grid gap-5 p-5 md:grid-cols-3 md:p-7">
              {vehicleCategory !== "truck" && vehicleCategory !== "bakkie_van" ? <Field label={`${vehicleCategory === "trailer" ? "Trailer" : "Mobile unit"} type`}><select value={vehicleSubtype} onChange={(event) => { setVehicleSubtype(event.target.value); setBodyType(event.target.value); }} className={inputClass} required><option value="">Select type</option>{(vehicleCategory === "trailer" ? trailerTypes : mobileUnitTypes).map((item) => <option key={item}>{item}</option>)}</select></Field> : null}
              <Field label="Registration / model year"><select value={year} onChange={(event) => { setYear(Number(event.target.value)); setModelName(""); setModelConfirmed(false); }} className={inputClass}>{(vehicleCategory === "bakkie_van" ? lightCommercialYears : truckYears).map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Make / manufacturer">{vehicleCategory === "truck" ? <select value={brand} onChange={(e) => {setBrand(e.target.value);setModelName("");setModelConfirmed(false);}} className={inputClass} required><option value="">Choose manufacturer</option>{truckCatalog.map((item)=><option key={item.name} value={item.name}>{item.name}</option>)}</select> : vehicleCategory === "bakkie_van" ? <><input list="loadlink-light-commercial-makes" value={brand} onChange={e=>{setBrand(e.target.value);setModelName("");setModelConfirmed(false);}} placeholder="Choose or enter any make" className={inputClass} required /><datalist id="loadlink-light-commercial-makes">{lightCommercialCatalog.map(item=><option key={item.name} value={item.name}/>)}</datalist></> : <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Make or manufacturer" className={inputClass} required />}</Field>
              <Field label="Model">{vehicleCategory === "truck" ? <select value={modelName} onChange={e=>selectTruckModel(e.target.value)} className={inputClass} disabled={!brand} required><option value="">Choose model family</option>{availableModels.map(item=><option key={item.name}>{item.name}</option>)}</select> : vehicleCategory === "bakkie_van" ? <><input list="loadlink-light-commercial-models" value={modelName} onChange={e=>{setModelName(e.target.value);setModelConfirmed(false);}} placeholder="Select or type your exact model" className={inputClass} required /><datalist id="loadlink-light-commercial-models">{bakkieVanModels.map(name=><option key={name} value={name}/>)}</datalist><p className={`mt-2 text-xs ${muted}`}>Enter the exact make and model from the registration papers.</p></> : <input value={modelName} onChange={e=>setModelName(e.target.value)} placeholder="Model name or number" className={inputClass} required />}</Field>

            </div>
            {vehicleCategory === "truck" ? <div className="border-t border-current/10 p-5 md:p-7"><button type="button" onClick={confirmSelectedModel} className="h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Confirm truck model</button>{imageLoading ? <p className={`mt-3 text-sm ${muted}`}>Loading model reference…</p> : null}{referenceImage?.imageUrl ? <figure className="mt-4 max-w-xl"><LoadLinkImage loading="eager" fetchPriority="high" src={referenceImage.imageUrl} alt={referenceImage.title || "Truck reference"} className="aspect-[16/9] w-full rounded-xl bg-current/[.025] object-contain" /><figcaption className={`mt-2 text-[11px] font-semibold leading-5 ${muted}`}>Model-family reference: {referenceImage.title}. Your truck’s year and specification may differ. Upload photos of your actual vehicle.{referenceImage.credit ? ` Credit: ${referenceImage.credit}.` : ""}{referenceImage.license ? ` ${referenceImage.license}.` : ""}</figcaption></figure> : <p className={`mt-3 text-xs ${muted}`}>A verified photograph is not available for this model and year yet.</p>}{referenceImage?.specSourceUrl ? <p className={`mt-3 text-xs ${muted}`}>{referenceImage.verifiedFuel || referenceImage.verifiedTransmission ? "Verified specifications have been filled in. Confirm your vehicle’s gearbox and fuel type." : "Specifications vary by version. Select the gearbox and fuel type fitted to your vehicle."}</p> : null}</div> : vehicleCategory === "bakkie_van" ? <div className="border-t border-current/10 p-5 md:p-7"><button type="button" onClick={confirmBakkieVanModel} className="inline-flex min-h-12 max-w-full items-center justify-center whitespace-nowrap rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase text-black transition-transform duration-150 active:scale-[.98]">Confirm vehicle</button><p className={`mt-2 text-xs ${muted}`}>Verify the exact make, model and year against the registration papers.</p>
              {lightCommercialYearStatus && !lightCommercialYearStatus.valid ? <p role="alert" className="mt-3 rounded-xl border border-amber-500/40 p-3 text-sm font-semibold text-amber-500">This {brand} {lightCommercialYearStatus.model} is not listed as produced in {year}. Check the model variant or registration year before confirming.</p> : null}
              {lightCommercialPhotoLoading ? <div className={`mt-4 flex min-h-32 items-center justify-center rounded-xl border text-sm font-semibold ${muted}`}>Looking for model-family photos…</div> : null}
              {lightCommercialPhotos.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {lightCommercialPhotos.map(photo => <figure key={photo.url} className="min-w-0 overflow-hidden rounded-xl border border-current/10">
                  <LoadLinkImage src={lightCommercialPhotoFailed.includes(photo.url) && photo.fallbackUrl ? photo.fallbackUrl : photo.url} onError={() => setLightCommercialPhotoFailed(current => current.includes(photo.url) ? current : [...current, photo.url])} alt={photo.title} loading="eager" className="aspect-[16/10] w-full bg-current/[.025] object-contain" />
                  <figcaption className={`p-3 text-xs leading-5 ${muted}`}>Illustrative model-family reference only. Upload photographs of the actual vehicle.</figcaption>
                </figure>)}
              </div> : null}
              {!lightCommercialPhotoLoading && lightCommercialPhotoUnavailable ? <p className={`mt-3 text-xs ${muted}`}>No reliably identified, licensed reference photos were found for this model. You can still continue and upload photos of your actual vehicle.</p> : null}
              </div> : <div className="border-t border-current/10 p-5 md:p-7"><button type="button" onClick={() => { setTitle(`${year} ${brand} ${modelName} ${vehicleSubtype}`.replace(/\s+/g, " ").trim()); setMessage(""); }} className="h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Confirm vehicle details</button></div>}
          </section>

          {detailsReady ? <>
            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="02" title="Vehicle details" description="Add the information buyers need before opening the full product view." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
                <Field label="Listing title" wide><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} required /></Field>
                <Field label={vehicleCategory === "truck" ? "Body type" : "Type"}><select value={bodyType || vehicleSubtype} onChange={(event) => setBodyType(event.target.value)} className={inputClass}>{(vehicleCategory === "truck" ? truckBodyTypes : vehicleCategory === "bakkie_van" ? bakkieVanTypes : vehicleCategory === "trailer" ? trailerTypes : mobileUnitTypes).map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Condition"><select value={condition} onChange={(event) => setCondition(event.target.value)} className={inputClass}><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option><option>Needs attention</option></select></Field>
                <Field label="Transmission"><select value={transmission} onChange={(event) => setTransmission(event.target.value)} className={inputClass} required><option value="">Choose gearbox</option>{gearboxOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Fuel / power type"><input value={fuelType} onChange={(event) => setFuelType(event.target.value)} placeholder={vehicleCategory === "trailer" ? "Not applicable" : "Confirm fuel / power type"} className={inputClass} required /></Field>
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
              <SectionHeading step="03" title="Photos and verification" description="Upload clear product photos and the critical documents required for review." />
              <div className="p-5 md:p-7">
                {quotaSnapshot ? <div className="mb-4 rounded-xl border border-current/10 px-4 py-3">
                  <p className="text-xs font-black">Your package allowance</p>
                  <p className={`mt-1 text-xs ${muted}`}>{quotaSnapshot.monthly_limit===null?"Unlimited monthly listings":`${quotaSnapshot.monthly_used} of ${quotaSnapshot.monthly_limit} listings used this month`} · Up to {quotaSnapshot.photo_limit} photos per listing</p>
                  {quotaSnapshot.monthly_limit!==null && quotaSnapshot.monthly_used>=quotaSnapshot.monthly_limit ?
                    <a href="/account/packages" className="mt-2 inline-flex text-xs font-black text-[#f6b800] underline underline-offset-4">Monthly limit reached — view packages</a> : null}
                </div>:null}
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#f6b800]/50 bg-[#f6b800]/5 px-5 text-center"><span className="text-sm font-black uppercase">Upload vehicle photos</span><span className={`mt-2 text-xs ${muted}`}>{vehiclePhotoProgress || `Minimum 2 photos · up to ${packageType === "dealer" ? 30 : packageType === "pro" ? 10 : 2}`}</span><input type="file" accept="image/*" multiple onChange={handleVehiclePhotos} disabled={preparingVehiclePhotos || saving} className="hidden" /></label>{vehiclePreviews.length ? <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">{vehiclePreviews.map((preview, index) => <LoadLinkImage key={preview} src={preview} alt={`Vehicle preview ${index + 1}`} className="aspect-square w-32 shrink-0 snap-start rounded-xl object-cover" />)}</div> : null}</div>
              {sellerType === "dealership" && !dealerPost ? <div className="grid gap-4 border-t border-current/10 p-5 md:grid-cols-2 md:p-7"><Field label="Dealership name"><input value={dealershipName} onChange={(event) => setDealershipName(event.target.value)} className={inputClass} required /></Field><Field label="Company registration number"><input value={companyRegistrationNumber} onChange={(event) => setCompanyRegistrationNumber(event.target.value)} className={inputClass} required /></Field><Field label="SARS tax number"><input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} className={inputClass} required /></Field><DocumentInput label="CIPC company registration" required file={documents.companyRegistration} onChange={(file) => setDocument("companyRegistration", file)} /><DocumentInput label="SARS tax document" required file={documents.taxDocument} onChange={(file) => setDocument("taxDocument", file)} /><DocumentInput label="Proof of business address" required file={documents.businessAddress} onChange={(file) => setDocument("businessAddress", file)} /><DocumentInput label="Representative authority" required file={documents.representativeAuthority} onChange={(file) => setDocument("representativeAuthority", file)} /></div> : null}
              <div className="grid gap-4 border-t border-current/10 p-5 md:grid-cols-2 md:p-7"><DocumentInput label="South African ID or passport" required file={documents.idDocument} onChange={(file) => setDocument("idDocument", file)} />{(vehicleCategory === "truck" || vehicleCategory === "bakkie_van") ? <DocumentInput label="Driver’s licence" required file={documents.driverLicence} onChange={(file) => setDocument("driverLicence", file)} /> : null}<DocumentInput label="Vehicle registration certificate" required file={documents.registrationPaper} onChange={(file) => setDocument("registrationPaper", file)} /><DocumentInput label="Proof of ownership or authority to list" required file={documents.ownershipProof} onChange={(file) => setDocument("ownershipProof", file)} /><DocumentInput label="Roadworthy certificate" file={documents.roadworthy} onChange={(file) => setDocument("roadworthy", file)} /><DocumentInput label="Operating licence" file={documents.operatingLicence} onChange={(file) => setDocument("operatingLicence", file)} />{transmissionCheck?.requiresModificationProof ? <DocumentInput label="Gearbox conversion paperwork" required file={documents.modificationProof} onChange={(file) => setDocument("modificationProof", file)} /> : null}</div>
            </section>

            <section className={`overflow-hidden rounded-2xl border ${surface}`}>
              <SectionHeading step="04" title="Contact and confirmation" description="Confirm the details before the product is added to LoadLink." />
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7"><Field label={sellerType === "dealership" ? "Dealership / contact name" : "Owner / company name"}><input value={postedBy} onChange={(event) => setPostedBy(event.target.value)} className={inputClass} required /></Field><Field label="Contact number"><input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="0821234567" className={inputClass} required /></Field><Field label="WhatsApp number — optional"><input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="0821234567" className={inputClass} /></Field><Field label="Selected plan"><div className={`${inputClass} flex items-center`}>{packageType === "standard" ? "Standard — R14 per active listing day" : selectedPlan === "pro" ? "Pro — daily vehicle charge included" : "Dealer — daily vehicle charge included"}</div></Field></div>
              <div className="border-t border-current/10 p-5 md:p-7">
                <h3 className="text-base font-black">Listing checks</h3>
                <p className={`mt-1 text-xs ${muted}`}>These checks help improve accuracy. They do not verify ownership or guarantee the vehicle's condition.</p>
                {smartChecks.length ? <ul className="mt-3 space-y-2">{smartChecks.slice(0,6).map((check,index)=><li key={index} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${check.level==="warning"?"border-amber-500/30":"border-current/10"}`}>{check.message}</li>)}</ul> : <p className="mt-2 text-sm font-semibold">All basic listing checks passed.</p>}
              </div>
              <div className="border-t border-current/10 p-5 md:p-7">
                <h3 className="text-lg font-black">Promote your listing</h3>
                <p className={`mt-2 text-xs leading-5 ${muted}`}>Optional R14 promotion request. Your listing is reviewed normally; if approved and payment is confirmed, it receives a 7-day placement in Promoted Listings. No payment is taken when you submit this form.</p>
                <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${darkMode ? "border-white/15 bg-white/[.035]" : "border-black/10 bg-black/[.02]"}`}>
                  <input type="checkbox" checked={requestBoost} onChange={e => setRequestBoost(e.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" />
                  <span className="text-sm font-bold">Request a 7-day promoted placement — R14 (payment required)</span>
                </label>
              </div>
              <div className="grid gap-3 px-5 pb-5 md:px-7 md:pb-7"><CheckRow checked={confirmOwnership} onChange={setConfirmOwnership} label="I own this vehicle or have written authority from the owner to list it." /><CheckRow checked={confirmAccuracy} onChange={setConfirmAccuracy} label="I confirm that the details, mileage, ownership history and uploaded documents are accurate." /></div>
              <div className="border-t border-[#f6b800]/25 bg-black p-5 text-white md:p-7">{message ? <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-300">{message}</div> : null}<button type="submit" disabled={saving || preparingVehiclePhotos} className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-50">{saving ? "Submitting vehicle…" : dealershipId ? "Add to dealership inventory" : "Submit vehicle for verification"}</button><p className="mt-3 text-center text-xs leading-5 text-white/45">The product will appear in the dealership slider when linked to an approved dealership. Analytics remains available only on Pro listings.</p></div>
            </section>
          </> : null}
        </> : null}
      </form> : null}
      {!listingFlowOpen && !entryMode && !dealerPost ? <VehicleMarketplaceHub darkMode={darkMode} /> : null}
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
