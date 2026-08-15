from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"{label}: target not found in {path}")
    p.write_text(s.replace(old, new, 1))


# Homepage portals: natural image, no artificial brightness, soft LoadLink gold glow.
p = Path("app/page.tsx")
s = p.read_text()
s = s.replace(
    'className="group relative block h-[360px] w-full overflow-hidden bg-black sm:h-[390px] md:h-[450px] lg:h-[500px]"',
    'className={`group relative block h-[360px] w-full overflow-hidden sm:h-[390px] md:h-[450px] lg:h-[500px] ${darkMode ? "bg-black" : "bg-[#fff6dc]"}`}',
    1,
)
s = s.replace('className="absolute inset-0 bg-black/36"', 'className="absolute inset-0 bg-black/24"', 1)
s = s.replace('className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/14 to-black/48"', 'className="absolute inset-0 bg-gradient-to-b from-black/8 via-black/12 to-black/42"', 1)
s = s.replace(
    'className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(246,184,0,0.08)]"',
    'className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(246,184,0,.055)_76%,rgba(246,184,0,.11)_100%)] shadow-[inset_0_0_92px_rgba(246,184,0,.20)]"',
    1,
)
p.write_text(s)

# Seen badge stays visible but sits to the LEFT of the save button instead of covering it.
p = Path("components/LoadLinkUiRepairV273.tsx")
s = p.read_text()
old_seen = '.loadlink-seen-post-badge{position:absolute!important;top:12px!important;right:12px!important;z-index:20!important;'
new_seen = '.loadlink-seen-post-badge{position:absolute!important;top:12px!important;right:64px!important;z-index:20!important;pointer-events:none!important;'
if old_seen not in s:
    raise SystemExit("seen badge CSS target not found")
p.write_text(s.replace(old_seen, new_seen, 1))

# Location suggestions: short, contained and subtly blurred rather than a large opaque overlay.
p = Path("components/SouthAfricaLocationInput.tsx")
s = p.read_text()
s = s.replace(
    'max-h-64 overflow-y-auto rounded-[16px] border p-2 shadow-[0_18px_48px_rgba(0,0,0,.34)] backdrop-blur-xl backdrop-saturate-125',
    'max-h-[230px] overflow-y-auto rounded-[16px] border p-2 shadow-[0_18px_44px_rgba(0,0,0,.24)] backdrop-blur-xl backdrop-saturate-125',
    1,
)
s = s.replace('"border-[#f6b800]/22 bg-[#090909]/98 text-white"', '"border-[#f6b800]/18 bg-[#090909]/84 text-white"', 1)
s = s.replace('"border-black/[.10] bg-white/98 text-black"', '"border-black/[.08] bg-white/84 text-black"', 1)
p.write_text(s)

# Finance calculator: make the ground shadow visible even if the image canvas itself is white.
p = Path("app/tools/truck-finance/page.tsx")
s = p.read_text()
old_shadow = '''            <div aria-hidden="true" className="absolute bottom-8 left-1/2 h-8 w-[66%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-xl sm:bottom-10" />
            <img
              src={TRUCK_IMAGE}
              alt="Real commercial truck"
              className="absolute inset-0 z-10 h-full w-full object-contain object-center p-4 drop-shadow-[0_16px_14px_rgba(0,0,0,.18)] sm:p-7"
            />'''
new_shadow = '''            <img
              src={TRUCK_IMAGE}
              alt="Real commercial truck"
              className="absolute inset-0 z-10 h-full w-full object-contain object-center p-4 drop-shadow-[0_16px_14px_rgba(0,0,0,.18)] sm:p-7"
            />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-7 left-1/2 z-20 h-5 w-[58%] -translate-x-1/2 rounded-[50%] bg-black/22 blur-xl sm:bottom-9" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-8 left-1/2 z-20 h-2.5 w-[43%] -translate-x-1/2 rounded-[50%] bg-black/30 blur-md sm:bottom-10" />'''
if old_shadow not in s:
    raise SystemExit("finance shadow target not found")
p.write_text(s.replace(old_shadow, new_shadow, 1))

# List Your Vehicle: direct Driver Portal-style choices in the hero. No intermediate choice screen.
p = Path("app/list-your-vehicle/page.tsx")
s = p.read_text()
hero_start = s.index('      <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">')
action_start = s.index('          {!dealerPost ? (', hero_start)
action_end = s.index('          ) : null}', action_start) + len('          ) : null}')
new_actions = '''          {!dealerPost ? (
            <div className="mx-auto mt-6 grid w-full max-w-md gap-3">
              <a
                href="#vehicle-marketplace-vehicles"
                onClick={() => { setListingFlowOpen(false); setListingIntent(null); setSelectedPlan(null); }}
                className="flex min-h-14 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[.1em] text-black shadow-[0_12px_32px_rgba(0,0,0,.28)] transition active:scale-[.99]"
              >
                View available vehicles
              </a>
              <button
                type="button"
                onClick={() => {
                  setListingFlowOpen(true);
                  setListingIntent("vehicle");
                  setVehicleCategory(null);
                  setSelectedPlan(null);
                  setPackageType("standard");
                  window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
                }}
                className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
              >
                List your vehicle
              </button>
              <button
                type="button"
                onClick={() => {
                  setListingFlowOpen(true);
                  setListingIntent("mobile_unit");
                  setVehicleCategory("mobile_unit");
                  setSelectedPlan(null);
                  setPackageType("standard");
                  window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
                }}
                className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
              >
                List a mobile unit
              </button>
            </div>
          ) : null}'''
s = s[:action_start] + new_actions + s[action_end:]
choice_start = s.find('      {listingFlowOpen && !listingIntent && !dealerPost ? (', action_start)
if choice_start != -1:
    choice_end = s.index('      {listingFlowOpen && !signedIn ?', choice_start)
    s = s[:choice_start] + s[choice_end:]
p.write_text(s)

# Global loader must not cover the two pages where it causes the most visible startup delay.
replace_once(
    "components/GlobalLoading.tsx",
    '  return loading ? <LoadLinkLoading /> : null;',
    '  const skipOverlay = pathname === "/messages" || pathname.startsWith("/list-your-vehicle");\n  return loading && !skipOverlay ? <LoadLinkLoading /> : null;',
    "global loading route exclusions",
)

# Jobs/search light mode: no giant black panel or choppy black block behind the inputs.
p = Path("app/jobs/page.tsx")
s = p.read_text()
old_shell = '<div data-loadlink-jobs-search-shell className="loadlink-glass mt-6 rounded-2xl border border-[#f6b800] bg-black/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-5">'
new_shell = '''<div data-loadlink-jobs-search-shell className={`loadlink-glass mt-6 rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-5 ${darkMode ? "border-[#f6b800]/55 bg-black/72" : "border-white/55 bg-white/68"}`}>'''
if old_shell not in s:
    raise SystemExit("jobs search shell target not found")
p.write_text(s.replace(old_shell, new_shell, 1))

# Messages: mobile inbox/search gets enough inner width and cannot clip horizontally.
p = Path("app/messages/page.tsx")
s = p.read_text()
s = s.replace('<div className="border-b border-black/10 p-5">', '<div className="min-w-0 border-b border-black/10 p-4 sm:p-5">', 1)
s = s.replace('className="h-12 w-full rounded-xl border border-black/10 bg-[#f5f3ed] px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] focus:bg-white"', 'className="h-12 w-full min-w-0 rounded-xl border border-black/10 bg-[#f5f3ed] px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] focus:bg-white"', 1)
p.write_text(s)

# Hard-stop legacy menu corner treatments and add a little more protection around the mobile inbox.
p = Path("app/globals.css")
s = p.read_text()
append = '''

/* LOADLINK 2026-08-15 FINAL VISIBLE CORRECTIONS */
[data-loadlink-menu-panel],
[data-loadlink-menu-close] {
  border-radius: 0 !important;
}
[data-loadlink-menu-close] {
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}
@media (max-width: 767px) {
  .loadlink-messages .loadlink-inbox-panel {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .loadlink-messages .loadlink-inbox-panel input,
  .loadlink-messages .loadlink-folder-tabs {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
}
'''
if "LOADLINK 2026-08-15 FINAL VISIBLE CORRECTIONS" not in s:
    s += append
p.write_text(s)
