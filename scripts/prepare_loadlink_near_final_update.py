from pathlib import Path

# Idempotent final-audit polish for the already-applied near-final LoadLink update.
# This script deliberately does NOT replay the large update. It only fixes the
# remaining audited UI details, verifies them, then lets the workflow run a
# production build before anything is committed.


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write_if_changed(path: str, before: str, after: str) -> None:
    if before != after:
        Path(path).write_text(after, encoding="utf-8")
        print(f"Updated {path}")


# 1. Loader: the tire/skid trail animation references skid-flow, so guarantee
# the keyframe exists and stays behind the truck rather than failing silently.
loader_path = "components/LoadLinkLoading.tsx"
loader = read(loader_path)
next_loader = loader
if "@keyframes skid-flow" not in next_loader:
    marker = "        @keyframes track-fade {"
    skid = """        @keyframes skid-flow {\n          from { background-position: 0 0; }\n          to { background-position: -70px 0; }\n        }\n\n"""
    if marker not in next_loader:
        raise SystemExit("LoadLink loader keyframe insertion point was not found.")
    next_loader = next_loader.replace(marker, skid + marker, 1)
write_if_changed(loader_path, loader, next_loader)

# 2. Account actions: deletion is the destructive action. Sign out remains
# neutral while Request deletion owns the red outline/text treatment.
settings_path = "app/account/settings/page.tsx"
settings = read(settings_path)
next_settings = settings.replace(
    'className="loadlink-account-neutral-action h-11 rounded-xl border px-5 text-xs font-semibold">Sign out</button>',
    'className="h-11 rounded-xl border border-current/20 px-5 text-xs font-semibold">Sign out</button>',
    1,
).replace(
    'className="loadlink-account-danger-action h-11 rounded-xl border px-5 text-xs font-semibold">Request deletion</button>',
    'className="h-11 rounded-xl border border-red-500 px-5 text-xs font-semibold text-red-500">Request deletion</button>',
    1,
)
write_if_changed(settings_path, settings, next_settings)

# 3. Homepage marketplace search: scope buttons select a portal and focus the
# real search field. Search stays on the homepage until the user actually
# submits or picks a ranked suggestion.
discovery_path = "components/MarketplaceDiscovery.tsx"
discovery = read(discovery_path)
next_discovery = discovery
if 'ref={searchInputRef}' not in next_discovery:
    target = '                  id="loadlink-marketplace-search"\n                  value={query}'
    replacement = '                  id="loadlink-marketplace-search"\n                  ref={searchInputRef}\n                  value={query}'
    if target not in next_discovery:
        raise SystemExit("Marketplace search input insertion point was not found.")
    next_discovery = next_discovery.replace(target, replacement, 1)

# The first redesign made the homepage search look like a second page inside
# the homepage: a large outer card, duplicate active-scope badge and an
# oversized portal-specific CTA. Restore the approved compact proportions and
# keep only the smarter portal-scoped behaviour underneath.
old_shell = '''        <div data-loadlink-marketplace-search-shell className={`loadlink-glass relative mx-auto max-w-7xl rounded-[28px] border p-3 shadow-[0_18px_48px_rgba(0,0,0,.08)] md:p-4 ${darkMode ? "border-white/12 bg-black/55" : "border-white/75 bg-white/68"}`}>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-black tracking-[-.02em]">Search LoadLink</p>
            <p className={`mt-1 text-[11px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>Choose a portal first. Search stays inside that portal.</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "border-white/12 bg-black/45 text-white/65" : "border-black/8 bg-white/70 text-black/55"}`}>{scopeLabel(scope)}</span>
        </div>'''
new_shell = '''        <div data-loadlink-marketplace-search-shell className="relative mx-auto max-w-7xl">'''
if old_shell in next_discovery:
    next_discovery = next_discovery.replace(old_shell, new_shell, 1)
elif new_shell not in next_discovery:
    raise SystemExit("Marketplace compact search shell could not be verified.")

# A short CTA keeps the actual query visible on narrow iPhones. The selected
# portal is already obvious from the highlighted pill and still controls the
# ranked results and destination.
next_discovery = next_discovery.replace(
    '                  {scope === "all" ? "Search" : `Search ${scopeLabel(scope)}`}\n',
    '                  Search\n',
    1,
)
next_discovery = next_discovery.replace(
    'className="mr-1.5 h-11 rounded-[14px] bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black"',
    'className="mr-1.5 h-11 min-w-[88px] shrink-0 rounded-[14px] bg-[#f6b800] px-3 text-[11px] font-black uppercase tracking-wide text-black sm:px-4 sm:text-xs"',
    1,
)
next_discovery = next_discovery.replace(
    'className={`flex min-h-14 items-center overflow-hidden rounded-[18px] border shadow-sm ${',
    'className={`flex min-h-14 items-center overflow-hidden rounded-[18px] border shadow-sm backdrop-blur-xl backdrop-saturate-150 ${',
    1,
)
next_discovery = next_discovery.replace(
    'className={`h-14 w-full rounded-[18px] border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${',
    'className={`h-14 w-full rounded-[18px] border px-4 text-sm font-bold outline-none backdrop-blur-xl backdrop-saturate-150 focus:border-[#f6b800] ${',
    1,
)
write_if_changed(discovery_path, discovery, next_discovery)

# 4. Vehicle portal copy must reflect the actual marketplace: sale, rental and
# POA, not imply the whole portal is rental-only.
jobs_path = "app/jobs/page.tsx"
jobs = read(jobs_path)
old_asset_copy = '? { title: "Find equipment for hire", description: "Browse trucks, trailers, mobile toilets, mobile fridges, food trucks and other mobile units.", searchButton: "Search listings", listLabel: "List vehicle", listHref: "/jobs/list?mode=asset", results: "Available vehicles and mobile units" }'
new_asset_copy = '? { title: "Find commercial vehicles and units", description: "Browse approved trucks, trailers, mobile fridges, mobile kitchens and other commercial units for sale, rental or POA.", searchButton: "Search vehicles", listLabel: "List vehicle", listHref: "/jobs/list?mode=asset", results: "Available vehicles and mobile units" }'
next_jobs = jobs.replace(old_asset_copy, new_asset_copy, 1)
write_if_changed(jobs_path, jobs, next_jobs)

# 5. Mobile Fridge is a first-class listing choice. Dynamic spec fields already
# adapt refrigerated units to temperature range, refrigeration system, power
# supply and internal capacity.
vehicle_path = "app/list-your-vehicle/page.tsx"
vehicle = read(vehicle_path)
next_vehicle = vehicle
if '"Mobile Fridge"' not in next_vehicle:
    target = 'const mobileUnitTypes = ["Mobile Toilet", "Food Truck", "Mobile Kitchen", "Mobile Clinic",'
    replacement = 'const mobileUnitTypes = ["Mobile Toilet", "Mobile Fridge", "Food Truck", "Mobile Kitchen", "Mobile Clinic",'
    if target not in next_vehicle:
        raise SystemExit("Mobile unit type insertion point was not found.")
    next_vehicle = next_vehicle.replace(target, replacement, 1)
write_if_changed(vehicle_path, vehicle, next_vehicle)

# Release-gate assertions. If any audited detail is missing, stop before build
# and before the workflow can push an incomplete application commit.
checks = {
    loader_path: ["@keyframes skid-flow", "animation: skid-flow"],
    settings_path: ["border-current/20 px-5 text-xs font-semibold\">Sign out", "border-red-500 px-5 text-xs font-semibold text-red-500\">Request deletion"],
    discovery_path: ['ref={searchInputRef}', 'data-loadlink-marketplace-search-shell className="relative mx-auto max-w-7xl"', 'min-w-[88px] shrink-0', 'backdrop-blur-xl backdrop-saturate-150'],
    jobs_path: ["Find commercial vehicles and units", "sale, rental or POA", "VehicleFullDetails"],
    vehicle_path: ["Mobile Fridge", "VehicleMarketplaceHub", 'value={offerMode}', "unitSpecSchema"],
}

for file_path, required_fragments in checks.items():
    current = read(file_path)
    missing = [fragment for fragment in required_fragments if fragment not in current]
    if missing:
        raise SystemExit(f"Final LoadLink audit failed for {file_path}: missing {missing}")

final_discovery = read(discovery_path)
if "Choose a portal first. Search stays inside that portal." in final_discovery or '>Search LoadLink</p>' in final_discovery:
    raise SystemExit("Oversized duplicate homepage search heading is still present.")
if '`Search ${scopeLabel(scope)}`' in final_discovery:
    raise SystemExit("Portal-specific CTA is still too wide for the compact mobile search.")

print("Near-final LoadLink audit polish is complete and ready for production build validation.")
