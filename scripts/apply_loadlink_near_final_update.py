from pathlib import Path
import re

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def replace_regex(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{path}: regex expected one occurrence, found {count}: {pattern[:120]!r}')
    write(path, next_text)


def append_once(path: str, marker: str, addition: str) -> None:
    text = read(path)
    if marker in text:
        return
    write(path, text.rstrip() + '\n\n' + addition.strip() + '\n')


replace_regex(
    'components/LoadLinkLoading.tsx',
    r'''\.track-mark \{.*?\.track-two \{ bottom: -7px; \}''',
    '''.track-mark {
  position: absolute;
  left: -190px;
  width: 235px;
  height: 5px;
  border-radius: 999px;
  opacity: 0.88;
  background: repeating-linear-gradient(
    90deg,
    rgba(246,184,0,0) 0 7px,
    rgba(246,184,0,.92) 7px 27px,
    rgba(246,184,0,.22) 27px 35px
  );
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 20%, #000 82%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 20%, #000 82%, transparent 100%);
  filter: drop-shadow(0 0 5px rgba(246,184,0,.4));
  transform: skewX(-18deg) translateZ(0);
  will-change: background-position, opacity;
  animation: skid-flow .62s linear infinite, track-fade 1.55s ease-in-out infinite;
}
.track-one { bottom: 15px; }
.track-two { bottom: 4px; left: -168px; width: 210px; opacity: .72; animation-delay: -.18s, -.18s; }''',
    re.S,
)
replace_once(
    'components/LoadLinkLoading.tsx',
    '''@keyframes track-fade {
  0% { opacity: 0; }
  18% { opacity: 0.86; }
  75% { opacity: 0.72; }
  100% { opacity: 0; }
}''',
    '''@keyframes skid-flow {
  from { background-position: 0 0; }
  to { background-position: -70px 0; }
}
@keyframes track-fade {
  0% { opacity: 0; }
  18% { opacity: 0.9; }
  76% { opacity: 0.74; }
  100% { opacity: 0; }
}''',
)

replace_once(
    'app/account/settings/page.tsx',
    '''<button type="button" onClick={() => void signOut()} className="h-11 rounded-xl border border-red-500 px-5 text-xs font-semibold text-red-500">Sign out</button><button type="button" onClick={requestDeletion} className="h-11 rounded-xl border border-current/20 px-5 text-xs font-semibold">Request deletion</button>''',
    '''<button type="button" onClick={() => void signOut()} className="loadlink-account-neutral-action h-11 rounded-xl border px-5 text-xs font-semibold">Sign out</button><button type="button" onClick={requestDeletion} className="loadlink-account-danger-action h-11 rounded-xl border px-5 text-xs font-semibold">Request deletion</button>''',
)

replace_once(
    'app/page.tsx',
    '''                <div
                  className={`absolute inset-x-0 bottom-0 h-40 blur-3xl transition ${
                    darkMode ? "bg-[#5c4300]/20" : "bg-[#f6b800]/18"
                  }`}
                />''',
    '''                <div
                  data-loadlink-portal-glow
                  className="pointer-events-none absolute inset-x-[3%] -bottom-12 h-56 transform-gpu"
                  style={{
                    background: darkMode
                      ? "radial-gradient(ellipse at 50% 72%, rgba(246,184,0,.21) 0%, rgba(92,67,0,.18) 40%, rgba(0,0,0,0) 76%)"
                      : "radial-gradient(ellipse at 50% 72%, rgba(246,184,0,.26) 0%, rgba(246,184,0,.16) 40%, rgba(246,184,0,0) 76%)",
                    filter: "blur(34px)",
                    transform: "translate3d(0,0,0)",
                    willChange: "transform, opacity",
                  }}
                />''',
)

replace_once(
    'components/MarketplaceDiscovery.tsx',
    '''  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);''',
    '''  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);''',
)
replace_once(
    'components/MarketplaceDiscovery.tsx',
    '''  function chooseScope(value: SearchScope) {
    setScope(value);
    setShowSuggestions(false);
    setActiveSearchField(null);
    router.push(routeForScope(value, query, location));
  }''',
    '''  function chooseScope(value: SearchScope) {
    setScope(value);
    setActiveSearchField("query");
    setShowSuggestions(true);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }''',
)
replace_once(
    'components/MarketplaceDiscovery.tsx',
    '''      <div className="mx-auto max-w-7xl">''',
    '''      <div data-loadlink-marketplace-search-shell className={`loadlink-glass relative mx-auto max-w-7xl rounded-[28px] border p-3 shadow-[0_18px_48px_rgba(0,0,0,.08)] md:p-4 ${darkMode ? "border-white/12 bg-black/55" : "border-white/75 bg-white/68"}`}>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-black tracking-[-.02em]">Search LoadLink</p>
            <p className={`mt-1 text-[11px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>Choose a portal first. Search stays inside that portal.</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "border-white/12 bg-black/45 text-white/65" : "border-black/8 bg-white/70 text-black/55"}`}>{scopeLabel(scope)}</span>
        </div>''',
)
replace_once(
    'components/MarketplaceDiscovery.tsx',
    '''                value={query}
                onChange={(event) => {''',
    '''                ref={searchInputRef}
                value={query}
                onChange={(event) => {''',
)
replace_once(
    'components/MarketplaceDiscovery.tsx',
    '''              Search
            </button>''',
    '''              {scope === "all" ? "Search" : `Search ${scopeLabel(scope)}`}
            </button>''',
)

replace_once(
    'app/jobs/page.tsx',
    '''import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";''',
    '''import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import VehicleFullDetails from "@/components/VehicleFullDetails";''',
)
replace_once(
    'app/jobs/page.tsx',
    '''  priorityLevel?: "flexible" | "standard" | "urgent";
};''',
    '''  priorityLevel?: "flexible" | "standard" | "urgent";
  listingKind?: string | null;
  dealershipId?: string | null;
};''',
)
replace_once(
    'app/jobs/page.tsx',
    '''  last_viewed_at?: string | null;
  user_id?: string | null;
};''',
    '''  last_viewed_at?: string | null;
  user_id?: string | null;
  listing_kind?: string | null;
  dealership_id?: string | null;
};''',
)
replace_once(
    'app/jobs/page.tsx',
    '''    priorityLevel: details.priorityLevel,
  };''',
    '''    priorityLevel: details.priorityLevel,
    listingKind: row.listing_kind || null,
    dealershipId: row.dealership_id || null,
  };''',
)
replace_once(
    'app/jobs/page.tsx',
    '''function buildGreeting(job: JobListing, requesterNumber = "") {
  const subject =
    job.group === "Trucks / Trailers"
      ? "this truck"
      : job.group === "Catering / Event"
        ? "this event or catering service"
        : "this farming or mining transport service";

  return `Hey, I’m interested in ${subject} on LoadLink. Please call me on ${requesterNumber || "my number"} when you are available.`;
}''',
    '''function descriptionValue(description: string, label: string) {
  return description.match(new RegExp(`^${label}:\\\\s*([^\\\\n]+)`, "im"))?.[1]?.trim() || "";
}

function buildMessageSuggestion(job: JobListing) {
  if (job.listingType === "asset") {
    const offer = descriptionValue(job.description, "Offer");
    const mileage = descriptionValue(job.description, "Mileage");
    const terms = formatListingRate(job.rate);
    return `Hi, I’m interested in ${job.title} in ${job.city} on LoadLink. Is it still available? Please confirm ${offer ? `${offer.toLowerCase()}, ` : ""}${terms !== "POA" ? `the advertised ${terms} terms, ` : ""}${mileage ? `the current ${mileage} mileage/usage, ` : ""}condition and when I can arrange a viewing or inspection.`;
  }
  if (job.listingType === "contract") {
    return `Hi, I’m interested in ${job.title} on LoadLink. Please confirm the contract duration, route or operating area, required vehicle/unit, start date, expected frequency, rate structure, VAT position and payment terms.`;
  }
  return `Hi, I’m interested in ${job.title} on LoadLink. Please confirm the collection and delivery points, cargo or load details, required vehicle, needed date, loading time, rate and payment terms.`;
}

function buildGreeting(job: JobListing, requesterNumber = "") {
  const message = buildMessageSuggestion(job);
  return requesterNumber ? `${message} You can reach me on ${requesterNumber}.` : message;
}''',
)
replace_once(
    'app/jobs/page.tsx',
    '''          <div className="mt-6 rounded-2xl border border-[#f6b800] bg-black/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-5">''',
    '''          <div data-loadlink-jobs-search-shell className="loadlink-glass mt-6 rounded-2xl border border-[#f6b800] bg-black/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-5">''',
)
replace_once(
    'app/jobs/page.tsx',
    '''            <label className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white"}`}>''',
    '''            <label className={`loadlink-sort-control flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white"}`}>''',
)
replace_once(
    'app/jobs/page.tsx',
    '''          <div className={`border-t p-4 ${darkMode?"border-white/10":"border-black/10"}`}><p className={`text-sm leading-7 ${darkMode?"text-white/70":"text-black/65"}`}>{job.description}</p><ContactSellerStack job={job} darkMode={darkMode}/></div>''',
    '''          <div className={`border-t p-4 ${darkMode?"border-white/10":"border-black/10"}`}>
            {job.listingType === "asset" ? <VehicleFullDetails description={job.description} city={job.city} dealershipId={job.dealershipId || null} darkMode={darkMode} /> : <p className={`text-sm leading-7 ${darkMode?"text-white/70":"text-black/65"}`}>{job.description}</p>}
            <ContactSellerStack job={job} darkMode={darkMode}/>
          </div>''',
)
replace_once(
    'app/jobs/page.tsx',
    '''<RequireAuthLink href={`/messages?listing=${encodeURIComponent(job.id)}&suggest=1`} className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><MessageIcon /> Message</RequireAuthLink>''',
    '''<RequireAuthLink href={`/messages?listing=${encodeURIComponent(job.id)}&suggest=1&draft=${encodeURIComponent(buildMessageSuggestion(job))}`} className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><MessageIcon /> Message</RequireAuthLink>''',
)

replace_once(
    'app/messages/page.tsx',
    '''function starterMessages(conversation: Conversation) {
  const title = conversation.listing_title || "this listing";
  if (conversation.role === "owner") {
    return [
      `Thanks for your interest in ${title}. Please confirm the vehicle you have available and your earliest collection time.`,
      `Please send your proposed rate, vehicle details and availability for ${title}.`,
      "Before we proceed, please confirm the collection area, delivery requirements and the documents you can provide.",
    ];
  }
  return [
    `Hi, I’m interested in ${title}. Is it still available?`,
    `Please confirm the rate, collection details, delivery requirements and availability for ${title}.`,
    "I may have a suitable vehicle available. Please share the route, cargo details, loading time and payment terms.",
  ];
}''',
    '''function starterMessages(conversation: Conversation) {
  const title = conversation.listing_title || "this listing";
  if (conversation.role === "owner") {
    return [
      `Thanks for your interest in ${title}. Please confirm the exact vehicle or unit you have available, its capacity and your earliest collection or viewing time.`,
      `Please send your proposed rate for ${title}, whether VAT is included, your availability and the payment terms you require.`,
      "Before we proceed, please confirm the registration or unit details, route capability, required documents and any loading or site restrictions.",
    ];
  }
  return [
    `Hi, I’m interested in ${title} on LoadLink. Is it still available? Please confirm the advertised terms, current condition and the earliest viewing or collection time.`,
    `Please confirm the route or location, rate, VAT position, availability, payment terms and any documents required for ${title}.`,
    "I may have a suitable vehicle or unit. Please share the cargo or operating requirement, weight or capacity needed, loading time and collection/delivery details.",
  ];
}''',
)
replace_once(
    'app/messages/page.tsx',
    '''  const recordingCancelledRef = useRef(false);''',
    '''  const recordingCancelledRef = useRef(false);
  const initialMessageDraftRef = useRef("");
  const draftSeededForThreadRef = useRef("");''',
)
replace_once(
    'app/messages/page.tsx',
    '''  useEffect(() => {
    if (!selectedId) return;
    try {
      setText(window.localStorage.getItem(`loadlink-message-draft:${selectedId}`) || "");
    } catch {
      setText("");
    }
  }, [selectedId]);''',
    '''  useEffect(() => {
    if (!selectedId || draftSeededForThreadRef.current === selectedId) return;
    try {
      const saved = window.localStorage.getItem(`loadlink-message-draft:${selectedId}`) || "";
      const conversation = conversations.find((item) => item.id === selectedId);
      const suggested = initialMessageDraftRef.current || (conversation && showStarterSuggestions ? starterMessages(conversation)[0] || "" : "");
      setText(saved || suggested);
      draftSeededForThreadRef.current = selectedId;
      initialMessageDraftRef.current = "";
    } catch {
      setText("");
      draftSeededForThreadRef.current = selectedId;
    }
  }, [conversations, selectedId, showStarterSuggestions]);''',
)
replace_once(
    'app/messages/page.tsx',
    '''        const params = new URLSearchParams(window.location.search);
        let listingId = params.get("listing");''',
    '''        const params = new URLSearchParams(window.location.search);
        initialMessageDraftRef.current = String(params.get("draft") || "").trim();
        let listingId = params.get("listing");''',
)

replace_once(
    'app/list-your-vehicle/page.tsx',
    '''import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";''',
    '''import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''type VehicleCategory = "truck" | "trailer" | "mobile_unit";
type SellerType = "private" | "dealership";''',
    '''type VehicleCategory = "truck" | "trailer" | "mobile_unit";
type SellerType = "private" | "dealership";
type OfferMode = "sale" | "rental" | "sale_or_rental" | "poa";
type RentalPeriod = "day" | "week" | "month";''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''type ReferenceImage = { imageUrl: string; title: string; exactMatch: boolean; sourceUrl?: string };''',
    '''type ReferenceImage = { imageUrl: string; title: string; exactMatch: boolean; sourceUrl?: string; credit?: string; license?: string; matchConfidence?: "high" | "medium" | "reference" };''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''function categoryLabel(category: VehicleCategory) { return category === "truck" ? "Truck" : category === "trailer" ? "Trailer" : "Mobile Unit"; }''',
    '''function categoryLabel(category: VehicleCategory) { return category === "truck" ? "Truck" : category === "trailer" ? "Trailer" : "Mobile Unit"; }
function offerLabel(mode: OfferMode) { return mode === "sale" ? "For sale only" : mode === "rental" ? "Rental only" : mode === "sale_or_rental" ? "Sale or rental" : "Price on application (POA)"; }
function unitSpecSchema(category: VehicleCategory | null, subtype: string): Array<[string, string]> {
  const clean = subtype.toLowerCase();
  if (category === "truck") return [["Engine / power", "Engine displacement, output or power rating"], ["Cab configuration", "Sleeper cab, day cab, crew cab"], ["Braking / retarder", "Retarder, engine brake, EBS or ABS"], ["Suspension", "Air, steel or mixed suspension"]];
  if (category === "trailer") return [["Braking system", "EBS, ABS, drum or disc"], ["Suspension", "Air or mechanical suspension"], ["Body / deck dimensions", "Length, width and usable body/deck size"], ["Loading configuration", "Rear doors, side access, ramps, tipper setup, etc."]];
  if (clean.includes("fridge") || clean.includes("cold room") || clean.includes("refrigerated")) return [["Temperature range", "Operating temperature range"], ["Refrigeration system", "Unit brand/model and cooling setup"], ["Power supply", "Mains, generator, solar or hybrid"], ["Internal capacity", "Usable refrigerated space / volume"]];
  if (clean.includes("kitchen") || clean.includes("food truck")) return [["Power supply", "Electrical, generator or gas setup"], ["Water system", "Fresh/grey water capacity and pumps"], ["Included kitchen equipment", "Cooking, refrigeration and prep equipment"], ["Extraction / ventilation", "Extraction hood and ventilation setup"]];
  return [["Power supply", "Electrical, generator, solar or other"], ["Internal dimensions", "Usable internal dimensions"], ["Fit-out / equipment", "Installed fixtures and equipment"], ["Operating capability", "What this unit is ready to do"]];
}''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''  const [authReady, setAuthReady] = useState(false);''',
    '''  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''  const [rate, setRate] = useState("");''',
    '''  const [rate, setRate] = useState("");
  const [offerMode, setOfferMode] = useState<OfferMode>("sale");
  const [rentalRate, setRentalRate] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>("month");
  const [specA, setSpecA] = useState("");
  const [specB, setSpecB] = useState("");
  const [specC, setSpecC] = useState("");
  const [specD, setSpecD] = useState("");''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''  const transmissionCheck = useMemo(() => vehicleCategory === "truck" && transmission ? validateTruckTransmission(brand, modelName, year, transmission) : null, [brand, modelName, transmission, vehicleCategory, year]);''',
    '''  const transmissionCheck = useMemo(() => vehicleCategory === "truck" && transmission ? validateTruckTransmission(brand, modelName, year, transmission) : null, [brand, modelName, transmission, vehicleCategory, year]);
  const specSchema = useMemo(() => unitSpecSchema(vehicleCategory, bodyType || vehicleSubtype), [bodyType, vehicleCategory, vehicleSubtype]);''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      if (!isSupabaseConfigured) { router.replace(loginHref(currentRelativePath())); return; }
      const user = await getFreshAuthenticatedUser();
      if (!user) { router.replace(loginHref(currentRelativePath())); return; }
      await syncAccountState().catch(() => undefined);''',
    '''      if (!isSupabaseConfigured) { setAuthReady(true); return; }
      const user = await getFreshAuthenticatedUser();
      if (!user) { setAuthReady(true); return; }
      setSignedIn(true);
      await syncAccountState().catch(() => undefined);''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''    void requireAccount().catch(() => router.replace(loginHref(currentRelativePath())));''',
    '''    void requireAccount().catch(() => setAuthReady(true));''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      setPayloadKg(d.payloadKg || ""); setRate(d.rate || ""); setPostedBy(d.postedBy || ""); setContactNumber(d.contactNumber || "");''',
    '''      setPayloadKg(d.payloadKg || ""); setRate(d.rate || ""); setOfferMode(d.offerMode || "sale"); setRentalRate(d.rentalRate || ""); setRentalPeriod(d.rentalPeriod || "month"); setSpecA(d.specA || ""); setSpecB(d.specB || ""); setSpecC(d.specC || ""); setSpecD(d.specD || ""); setPostedBy(d.postedBy || ""); setContactNumber(d.contactNumber || "");''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''    const draft = { sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType, submissionId: submissionIdRef.current || localStorage.getItem("loadlink-vehicle-submission-id") || "" };''',
    '''    const draft = { sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType, submissionId: submissionIdRef.current || localStorage.getItem("loadlink-vehicle-submission-id") || "" };''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''  }, [sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType]);''',
    '''  }, [sellerType, vehicleCategory, vehicleSubtype, year, brand, modelName, modelConfirmed, title, city, bodyType, transmission, fuelType, axleConfiguration, registrationNumber, vin, engineNumber, odometerKm, previousOwners, condition, serviceHistory, gvmKg, payloadKg, rate, offerMode, rentalRate, rentalPeriod, specA, specB, specC, specD, postedBy, contactNumber, whatsappNumber, description, confirmOwnership, confirmAccuracy, selectedPlan, packageType]);''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''    if (!title.trim() || !postedBy.trim() || !rate.trim() || !description.trim()) return "Complete all required vehicle and listing fields.";''',
    '''    if (!title.trim() || !postedBy.trim() || !description.trim()) return "Complete all required vehicle and listing fields.";
    if (offerMode !== "poa" && !rate.trim()) return offerMode === "rental" ? "Enter the advertised rental rate." : "Enter the advertised sale price.";
    if (offerMode === "sale_or_rental" && !rentalRate.trim()) return "Enter the advertised rental rate as well as the sale price.";''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      const label = categoryLabel(vehicleCategory!);
      const subtype = vehicleCategory === "truck" ? bodyType : vehicleSubtype;
      const storedDescription = [''',
    '''      const label = categoryLabel(vehicleCategory!);
      const subtype = vehicleCategory === "truck" ? bodyType : vehicleSubtype;
      const displayRate = offerMode === "poa" ? "POA" : offerMode === "rental" ? `${formatListingRate(rate)} / ${rentalPeriod}` : formatListingRate(rate);
      const storedDescription = [''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''        `Vehicle subtype: ${subtype}`,
        `Year: ${year}`,''',
    '''        `Vehicle subtype: ${subtype}`,
        `Offer: ${offerLabel(offerMode)}`,
        offerMode === "sale" || offerMode === "sale_or_rental" ? `Sale price: ${formatListingRate(rate)}` : "",
        offerMode === "rental" ? `Rental rate: ${formatListingRate(rate)} / ${rentalPeriod}` : "",
        offerMode === "sale_or_rental" && rentalRate ? `Rental rate: ${formatListingRate(rentalRate)} / ${rentalPeriod}` : "",
        `Year: ${year}`,''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''        payloadKg ? `Payload: ${Number(payloadKg).toLocaleString("en-ZA")} kg` : "",
        `Seller: ${sellerType === "dealership" ? dealershipName || postedBy : postedBy}`,''',
    '''        payloadKg ? `Payload: ${Number(payloadKg).toLocaleString("en-ZA")} kg` : "",
        specA.trim() ? `${specSchema[0][0]}: ${specA.trim()}` : "",
        specB.trim() ? `${specSchema[1][0]}: ${specB.trim()}` : "",
        specC.trim() ? `${specSchema[2][0]}: ${specC.trim()}` : "",
        specD.trim() ? `${specSchema[3][0]}: ${specD.trim()}` : "",
        `Seller: ${sellerType === "dealership" ? dealershipName || postedBy : postedBy}`,''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''        rate: formatListingRate(rate), posted_by: postedBy.trim(), contact_number: contactNumber.trim(), whatsapp_number: whatsappNumber.trim(),''',
    '''        rate: displayRate, posted_by: postedBy.trim(), contact_number: contactNumber.trim(), whatsapp_number: whatsappNumber.trim(),''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''  const surface = darkMode ? "border-white/10 bg-[#101010] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-xl border px-4 font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#171717] text-white placeholder:text-white/30" : "border-black/10 bg-[#faf8f2] text-black placeholder:text-black/35"}`;''',
    '''  const surface = darkMode ? "loadlink-glass border-white/12 bg-black/62 text-white backdrop-blur-xl" : "loadlink-glass border-white/75 bg-white/68 text-black backdrop-blur-xl";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const inputClass = `h-14 w-full rounded-xl border px-4 font-semibold outline-none backdrop-blur-lg focus:border-[#f6b800] ${darkMode ? "border-white/14 bg-white/[.055] text-white placeholder:text-white/30" : "border-black/10 bg-white/72 text-black placeholder:text-black/35"}`;''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      </section>

      {!dealerPost && !selectedPlan ? (''',
    '''      </section>

      <section className={`border-b px-4 py-5 md:px-6 ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white/80"}`}>
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3">
          <a href="#vehicle-listing-form" className="flex min-h-16 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black">List your vehicle</a>
          <a href="#vehicle-marketplace-vehicles" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Vehicles available</a>
          <a href="#vehicle-marketplace-units" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Units available</a>
        </div>
      </section>

      {!signedIn ? <section id="vehicle-listing-form" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-8 md:px-6"><div className={`loadlink-glass rounded-[24px] border p-6 text-center ${surface}`}><h2 className="text-3xl font-black tracking-[-.04em]">Sign in to list a vehicle</h2><p className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Approved marketplace stock remains available below. Sign in when you are ready to create a truck, trailer or mobile-unit listing.</p><a href={loginHref(currentRelativePath())} className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.1em] text-black">Sign in or create account</a></div></section> : null}

      {signedIn && !dealerPost && !selectedPlan ? (''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''        <section className={`border-b px-4 py-6 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>''',
    '''        <section id="vehicle-listing-form" className={`scroll-mt-24 border-b px-4 py-6 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      {!selectedPlan ? <BusinessPlans darkMode={darkMode} selectable selectedPlan={selectedPlan} onSelect={choosePlan} /> : null}

      {selectedPlan ? <form onSubmit={submitVehicle} className="mx-auto grid max-w-5xl gap-6 px-4 py-7 md:px-6 md:py-12">''',
    '''      {signedIn && !selectedPlan ? <BusinessPlans darkMode={darkMode} selectable selectedPlan={selectedPlan} onSelect={choosePlan} /> : null}

      {signedIn && selectedPlan ? <form id="vehicle-listing-form" onSubmit={submitVehicle} className="mx-auto grid max-w-5xl scroll-mt-24 gap-6 px-4 py-7 md:px-6 md:py-12">''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''{referenceImage?.imageUrl ? <img src={referenceImage.imageUrl} alt={referenceImage.title || "Truck reference"} className="mt-4 aspect-[16/9] w-full max-w-xl rounded-xl object-cover" /> : null}''',
    '''{referenceImage?.imageUrl ? <figure className="mt-4 max-w-xl"><img src={referenceImage.imageUrl} alt={referenceImage.title || "Truck reference"} className="aspect-[16/9] w-full rounded-xl object-cover" /><figcaption className={`mt-2 text-[11px] font-semibold leading-5 ${muted}`}>Model reference photo · {referenceImage.matchConfidence === "high" ? "high-confidence match" : referenceImage.matchConfidence === "medium" ? "model-family match" : "visual reference"}. Confirm your uploaded photos show the actual truck.{referenceImage.credit ? ` Credit: ${referenceImage.credit}.` : ""}{referenceImage.license ? ` ${referenceImage.license}.` : ""} {referenceImage.sourceUrl ? <a href={referenceImage.sourceUrl} target="_blank" rel="noreferrer" className="font-black underline underline-offset-2">Source</a> : null}</figcaption></figure> : null}''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''                <Field label="Price" wide><input value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Example: 850000" inputMode="decimal" className={inputClass} required /></Field>
                <Field label="Location"><SouthAfricaLocationInput value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Vehicle location" className={inputClass} required /></Field>''',
    '''                <Field label="How is this unit available?"><select value={offerMode} onChange={(event) => setOfferMode(event.target.value as OfferMode)} className={inputClass}><option value="sale">For sale only</option><option value="rental">Rental only</option><option value="sale_or_rental">Sale or rental</option><option value="poa">POA — price on application</option></select></Field>
                {offerMode !== "poa" ? <Field label={offerMode === "rental" ? "Rental rate" : "Sale price"}><input value={rate} onChange={(event) => setRate(event.target.value)} placeholder={offerMode === "rental" ? "Example: 25000" : "Example: 850000"} inputMode="decimal" className={inputClass} required /></Field> : <Field label="Price"><div className={`${inputClass} flex items-center`}>POA — interested users must contact the seller</div></Field>}
                {offerMode === "rental" || offerMode === "sale_or_rental" ? <Field label="Rental period"><select value={rentalPeriod} onChange={(event) => setRentalPeriod(event.target.value as RentalPeriod)} className={inputClass}><option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option></select></Field> : null}
                {offerMode === "sale_or_rental" ? <Field label="Rental rate"><input value={rentalRate} onChange={(event) => setRentalRate(event.target.value)} placeholder="Example: 25000" inputMode="decimal" className={inputClass} required /></Field> : null}
                <Field label={specSchema[0][0]}><input value={specA} onChange={(event) => setSpecA(event.target.value)} placeholder={specSchema[0][1]} className={inputClass} /></Field>
                <Field label={specSchema[1][0]}><input value={specB} onChange={(event) => setSpecB(event.target.value)} placeholder={specSchema[1][1]} className={inputClass} /></Field>
                <Field label={specSchema[2][0]}><input value={specC} onChange={(event) => setSpecC(event.target.value)} placeholder={specSchema[2][1]} className={inputClass} /></Field>
                <Field label={specSchema[3][0]}><input value={specD} onChange={(event) => setSpecD(event.target.value)} placeholder={specSchema[3][1]} className={inputClass} /></Field>
                <Field label="Location"><SouthAfricaLocationInput value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Vehicle location" className={inputClass} required /></Field>''',
)
replace_once(
    'app/list-your-vehicle/page.tsx',
    '''      </form> : null}
    </main>''',
    '''      </form> : null}
      <VehicleMarketplaceHub darkMode={darkMode} />
    </main>''',
)

replace_once(
    'components/phase2/DriversAvailableForWork.tsx',
    '''          <label className={styles.sortControl}>''',
    '''          <label className={`${styles.sortControl} loadlink-sort-control`}>''',
)

replace_once(
    'components/SiteMenu.tsx',
    '''  { label: "Tools", href: "/tools", description: "Quotes and logistics helpers", icon: "tools" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance", icon: "help" },''',
    '''  { label: "Tools", href: "/tools", description: "Quotes and logistics helpers", icon: "tools" },
  { label: "Truck finance", href: "/tools/truck-finance", description: "Budget, repayments and live stock matches", icon: "tools" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance", icon: "help" },''',
)
replace_once(
    'app/tools/page.tsx',
    '''import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";''',
    '''import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";
import Link from "next/link";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";''',
)
replace_once(
    'app/tools/page.tsx',
    '''      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">''',
    '''      <Link href="/tools/truck-finance" className={`loadlink-glass mt-7 grid overflow-hidden rounded-[28px] border md:grid-cols-[1.05fr_.95fr] ${card}`}>
        <div className="p-5 md:p-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">Finance planning</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Truck finance calculator</h2><p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Set a monthly budget, term, deposit, trade-in and planning rate, then match the outcome against approved LoadLink trucks, trailers and units.</p><span className="mt-5 inline-flex rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Open calculator</span></div>
        <div className="relative min-h-[190px] overflow-hidden bg-black"><img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial trucks" className="absolute inset-0 h-full w-full object-cover opacity-75"/><div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent"/></div>
      </Link>

      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">''',
)

append_once(
    'app/loadlink-final-polish-20260814.css',
    '/* Near-final marketplace update — 2026-08-15 */',
    '''/* Near-final marketplace update — 2026-08-15 */
[data-loadlink-marketplace-search-shell],
[data-loadlink-jobs-search-shell] {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  max-width: 100%;
  isolation: isolate;
  transform: translateZ(0);
}

[data-loadlink-marketplace-search-shell] {
  overflow: visible !important;
}

[data-loadlink-portal-glow] {
  backface-visibility: hidden;
  contain: paint;
  transform: translate3d(0,0,0);
}

body[data-loadlink-path="/list-your-vehicle"] select,
body[data-loadlink-path="/list-your-vehicle"] input,
body[data-loadlink-path="/list-your-vehicle"] textarea,
body[data-loadlink-path="/tools/truck-finance"] select,
body[data-loadlink-path="/tools/truck-finance"] input {
  -webkit-backdrop-filter: blur(10px) saturate(112%);
  backdrop-filter: blur(10px) saturate(112%);
}

@media (max-width: 767px) {
  [data-loadlink-marketplace-search-shell] {
    border-radius: 22px !important;
  }
  body[data-loadlink-path="/list-your-vehicle"] select,
  body[data-loadlink-path="/list-your-vehicle"] input,
  body[data-loadlink-path="/list-your-vehicle"] textarea,
  body[data-loadlink-path="/tools/truck-finance"] select,
  body[data-loadlink-path="/tools/truck-finance"] input {
    -webkit-backdrop-filter: blur(7px) saturate(108%);
    backdrop-filter: blur(7px) saturate(108%);
  }
}
''',
)

print('Near-final LoadLink marketplace update applied.')
