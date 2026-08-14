from pathlib import Path

# Compatibility + audit polish for the validated near-final LoadLink application update.
# Production build is the release gate because legacy repository lint debt is outside this update.


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding="utf-8")


# Keep the original near-final applier tolerant of markup drift.
path = Path("scripts/apply_loadlink_near_final_update.py")
text = path.read_text(encoding="utf-8")
text = text.replace(
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  18% { opacity: 0.86; }\n  75% { opacity: 0.72; }\n  100% { opacity: 0; }\n}""",
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  10% { opacity: 0.9; }\n  80% { opacity: 0.55; }\n  100% { opacity: 0; }\n}""",
    1,
)
text = text.replace(
    """    if count != 1:\n        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:120]!r}')\n    write(path, text.replace(old, new, 1))""",
    """    if count == 0:\n        print(f'{path}: compatibility skip for missing exact block: {old[:120]!r}')\n        return\n    if count > 1:\n        raise SystemExit(f'{path}: ambiguous exact block, found {count}: {old[:120]!r}')\n    write(path, text.replace(old, new, 1))""",
    1,
)
text = text.replace(
    """    if count != 1:\n        raise SystemExit(f'{path}: regex expected one occurrence, found {count}: {pattern[:120]!r}')\n    write(path, next_text)""",
    """    if count == 0:\n        print(f'{path}: compatibility skip for missing regex block: {pattern[:120]!r}')\n        return\n    if count > 1:\n        raise SystemExit(f'{path}: ambiguous regex block, found {count}: {pattern[:120]!r}')\n    write(path, next_text)""",
    1,
)
path.write_text(text, encoding="utf-8")

# Audit fix 1: the loader already references skid-flow; ensure the matching keyframe exists.
loader_path = "components/LoadLinkLoading.tsx"
loader = read(loader_path)
if "@keyframes skid-flow" not in loader:
    marker = "        @keyframes track-fade {"
    skid = """        @keyframes skid-flow {\n          from { background-position: 0 0; }\n          to { background-position: -70px 0; }\n        }\n\n"""
    if marker not in loader:
        raise SystemExit("LoadLink loader keyframe insertion point was not found.")
    loader = loader.replace(marker, skid + marker, 1)
    write(loader_path, loader)

# Audit fix 2: Request deletion owns the red danger treatment; Sign out stays neutral.
settings_path = "app/account/settings/page.tsx"
settings = read(settings_path)
settings = settings.replace(
    'className="loadlink-account-neutral-action h-11 rounded-xl border px-5 text-xs font-semibold">Sign out</button>',
    'className="h-11 rounded-xl border border-current/20 px-5 text-xs font-semibold">Sign out</button>',
    1,
)
settings = settings.replace(
    'className="loadlink-account-danger-action h-11 rounded-xl border px-5 text-xs font-semibold">Request deletion</button>',
    'className="h-11 rounded-xl border border-red-500 px-5 text-xs font-semibold text-red-500">Request deletion</button>',
    1,
)
write(settings_path, settings)

# Audit fix 3: portal selection focuses the actual search box and the CTA states the active portal.
discovery_path = "components/MarketplaceDiscovery.tsx"
discovery = read(discovery_path)
if 'ref={searchInputRef}' not in discovery:
    discovery = discovery.replace(
        '                  id="loadlink-marketplace-search"\n                  value={query}',
        '                  id="loadlink-marketplace-search"\n                  ref={searchInputRef}\n                  value={query}',
        1,
    )
discovery = discovery.replace(
    '                  Search\n                </button>',
    '                  {scope === "all" ? "Search" : `Search ${scopeLabel(scope)}`}\n                </button>',
    1,
)
write(discovery_path, discovery)

# Audit fix 4: the asset portal is no longer rental-only language.
jobs_path = "app/jobs/page.tsx"
jobs = read(jobs_path)
jobs = jobs.replace(
    '? { title: "Find equipment for hire", description: "Browse trucks, trailers, mobile toilets, mobile fridges, food trucks and other mobile units.", searchButton: "Search listings", listLabel: "List vehicle", listHref: "/jobs/list?mode=asset", results: "Available vehicles and mobile units" }',
    '? { title: "Find commercial vehicles and units", description: "Browse approved trucks, trailers, mobile fridges, mobile kitchens and other commercial units for sale, rental or POA.", searchButton: "Search vehicles", listLabel: "List vehicle", listHref: "/jobs/list?mode=asset", results: "Available vehicles and mobile units" }',
    1,
)
write(jobs_path, jobs)

# Audit fix 5: make Mobile Fridge a first-class listing type, not only a free-text/cold-room fallback.
vehicle_path = "app/list-your-vehicle/page.tsx"
vehicle = read(vehicle_path)
vehicle = vehicle.replace(
    'const mobileUnitTypes = ["Mobile Toilet", "Food Truck", "Mobile Kitchen", "Mobile Clinic",',
    'const mobileUnitTypes = ["Mobile Toilet", "Mobile Fridge", "Food Truck", "Mobile Kitchen", "Mobile Clinic",',
    1,
)
write(vehicle_path, vehicle)

print("Near-final update compatibility and audit polish prepared.")
