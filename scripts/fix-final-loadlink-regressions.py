from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"{label}: expected source was not found in {path}")
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print(f"updated: {label}")


# 1) Homepage portal buttons: restore strong LoadLink proportions, gold inactive text,
# and make quick-link taps navigate to the selected portal results again.
marketplace = Path("components/MarketplaceDiscovery.tsx")
replace_once(
    marketplace,
    '''  function chooseScope(value: SearchScope) {\n    setScope(value);\n    setActiveSearchField("query");\n    setShowSuggestions(true);\n    window.requestAnimationFrame(() => searchInputRef.current?.focus());\n  }''',
    '''  function chooseScope(value: SearchScope) {\n    setScope(value);\n    setShowSuggestions(false);\n    setActiveSearchField(null);\n    router.push(routeForScope(value, query, location));\n  }''',
    "restore quick-link navigation",
)
replace_once(
    marketplace,
    'min-h-[54px] min-w-[116px] shrink-0 rounded-full border px-6 py-3 text-[15px] font-semibold tracking-[-.01em]',
    'min-h-[62px] min-w-[142px] shrink-0 rounded-full border px-7 py-3.5 text-base font-black tracking-[-.015em]',
    "restore homepage portal button size",
)
replace_once(
    marketplace,
    '"border-white/[.14] bg-white/[.045] text-white/74 shadow-[0_8px_22px_rgba(0,0,0,.16)]"',
    '"border-[#f6b800]/35 bg-black/38 text-[#f6b800] shadow-[0_8px_22px_rgba(0,0,0,.16)]"',
    "restore gold portal text in dark mode",
)
replace_once(
    marketplace,
    '"border-black/[.08] bg-white/78 text-black/66 shadow-[0_8px_22px_rgba(0,0,0,.06)]"',
    '"border-[#b88900]/28 bg-white/82 text-[#8d6800] shadow-[0_8px_22px_rgba(0,0,0,.06)]"',
    "restore LoadLink portal treatment in light mode",
)

# 2) List Your Vehicle: default page must behave like Driver Portal.
vehicle_page = Path("app/list-your-vehicle/page.tsx")
replace_once(
    vehicle_page,
    '  const [signedIn, setSignedIn] = useState(false);',
    '  const [signedIn, setSignedIn] = useState(false);\n  const [listingFlowOpen, setListingFlowOpen] = useState(false);',
    "add vehicle portal landing state",
)
replace_once(
    vehicle_page,
    '          setDealerPost(true);',
    '          setDealerPost(true);\n          setListingFlowOpen(true);',
    "keep dealership add-stock flow direct",
)
replace_once(
    vehicle_page,
    '<h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] md:text-7xl">{dealerPost ? `Add stock to ${dealershipName}` : "List your vehicle"}</h1>',
    '<h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] md:text-7xl">{dealerPost ? `Add stock to ${dealershipName}` : "Find a vehicle or list your own"}</h1>',
    "match driver-portal vehicle hero",
)
replace_once(
    vehicle_page,
    '<p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">Choose what you’re listing and add the vehicle details.</p>',
    '<p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">Browse approved trucks, trailers and mobile units, or open the listing flow when you are ready to add your own.</p>',
    "improve vehicle portal hero copy",
)
replace_once(
    vehicle_page,
    '<a href="#vehicle-listing-form" className="flex min-h-16 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black">List your vehicle</a>',
    '<button type="button" onClick={() => { setListingFlowOpen(true); window.requestAnimationFrame(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className="flex min-h-16 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black">List your vehicle</button>',
    "make list action open the listing flow",
)
replace_once(
    vehicle_page,
    '<a href="#vehicle-marketplace-vehicles" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Vehicles available</a>',
    '<a href="#vehicle-marketplace-vehicles" onClick={() => setListingFlowOpen(false)} className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Vehicles available</a>',
    "vehicle marketplace navigation",
)
replace_once(
    vehicle_page,
    '<a href="#vehicle-marketplace-units" className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Units available</a>',
    '<a href="#vehicle-marketplace-units" onClick={() => setListingFlowOpen(false)} className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Units available</a>',
    "unit marketplace navigation",
)
for old, new, label in [
    ('      {!signedIn ? <section id="vehicle-listing-form"', '      {listingFlowOpen && !signedIn ? <section id="vehicle-listing-form"', "hide sign-in listing flow until requested"),
    ('      {signedIn && !dealerPost && !selectedPlan ? (', '      {listingFlowOpen && signedIn && !dealerPost && !selectedPlan ? (', "hide seller choice until listing requested"),
    ('      {signedIn && !selectedPlan ? <BusinessPlans', '      {listingFlowOpen && signedIn && !selectedPlan ? <BusinessPlans', "hide plans until listing requested"),
    ('      {signedIn && selectedPlan ? <form id="vehicle-listing-form"', '      {listingFlowOpen && signedIn && selectedPlan ? <form id="vehicle-listing-form"', "hide form until listing requested"),
]:
    replace_once(vehicle_page, old, new, label)

# 3) Menu and Tools naming: the user-facing name is simply Calculator.
site_menu = Path("components/SiteMenu.tsx")
replace_once(
    site_menu,
    '{ label: "Truck finance", href: "/tools/truck-finance", description: "Budget, repayments and live stock matches", icon: "tools" },',
    '{ label: "Calculator", href: "/tools/truck-finance", description: "Vehicle budget and approved stock matches", icon: "tools" },',
    "rename menu finance tool",
)

tools_page = Path("app/tools/page.tsx")
replace_once(
    tools_page,
    '<div className="p-5 md:p-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">Finance planning</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Truck finance calculator</h2><p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Set a monthly budget, term, deposit, trade-in and planning rate, then match the outcome against approved LoadLink trucks, trailers and units.</p><span className="mt-5 inline-flex rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Open calculator</span></div>',
    '<div className="p-5 md:p-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">Vehicle planning</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Calculator</h2><p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Enter your monthly budget, term, deposit, trade-in and interest rate, then see approved LoadLink stock that actually fits the result.</p><span className="mt-5 inline-flex rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Open calculator</span></div>',
    "rename and simplify tools calculator card",
)

print("LoadLink regression repair applied successfully.")
