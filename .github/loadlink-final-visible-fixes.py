from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"{label}: target not found in {path}")
    p.write_text(s.replace(old, new, 1))


# Homepage portals: one real image, natural fade, no duplicate blur/brightness layers.
p = Path("app/page.tsx")
s = p.read_text()
s = s.replace(
    'className="group relative block h-[290px] w-full overflow-hidden bg-black sm:h-[330px] md:h-[380px] lg:h-[420px]"',
    'className="group relative block h-[360px] w-full overflow-hidden bg-black sm:h-[390px] md:h-[450px] lg:h-[500px]"',
    1,
)
anchor_at = s.index("aria-label={card.buttonText}")
start = s.index('                <img\n                  src={activeImage.src}', anchor_at)
end = s.index('                <div className="relative z-10 flex h-full', start)
new_visual = '''                <img
                  src={activeImage.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700"
                  style={{ objectPosition: activeImage.position }}
                />
                <div className="absolute inset-0 bg-black/36" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/14 to-black/48" />
                <div
                  data-loadlink-portal-glow
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(246,184,0,0.08)]"
                />
'''
s = s[:start] + new_visual + s[end:]
s = s.replace(
    'className={`flex min-h-[58px] w-[min(76vw,430px)] items-center justify-center rounded-full border px-5 py-3 text-[15px] font-black uppercase leading-[1.15] tracking-[.045em] transition active:scale-[.99] md:min-h-[68px] md:w-[min(48vw,520px)] md:px-8 md:py-4 md:text-[18px] ${',
    'className={`flex min-h-[52px] w-[min(76vw,400px)] items-center justify-center rounded-full border px-5 py-3 text-[14px] font-black uppercase leading-[1.15] tracking-[.045em] transition active:scale-[.99] md:min-h-[58px] md:w-[min(44vw,440px)] md:px-7 md:py-3 md:text-[16px] ${',
    1,
)
p.write_text(s)

# Homepage search shell: jobs-style glass surface, compact controls.
replace_once(
    "components/MarketplaceDiscovery.tsx",
    '<div data-loadlink-marketplace-search-shell className="relative z-[181] mx-auto max-w-7xl overflow-visible border-0">',
    '''<div
          data-loadlink-marketplace-search-shell
          className={`loadlink-glass relative z-[181] mx-auto max-w-5xl overflow-visible rounded-[24px] border p-4 shadow-[0_18px_45px_rgba(0,0,0,.18)] md:p-5 ${
            darkMode ? "border-[#f6b800]/18 bg-[#0d0d0d]/94 text-white" : "border-black/10 bg-white/96 text-black"
          }`}
        >''',
    "homepage glass search shell",
)
replace_once(
    "components/MarketplaceDiscovery.tsx",
    'className={`flex min-h-14 items-center overflow-hidden rounded-[18px] border shadow-sm ${',
    'className={`flex min-h-14 items-center overflow-hidden rounded-[16px] border shadow-none ${',
    "homepage search input shape",
)
replace_once(
    "components/MarketplaceDiscovery.tsx",
    'className={`h-14 w-full rounded-[18px] border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${',
    'className={`h-14 w-full rounded-[16px] border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${',
    "homepage location input shape",
)

# Location suggestions: no full-screen modal backdrop or page blur.
p = Path("components/SouthAfricaLocationInput.tsx")
s = p.read_text()
backdrop = '''      {open && !disabled ? (
        <button
          type="button"
          aria-label="Close location menu"
          onClick={closeMenu}
          className={`fixed inset-0 z-[110] cursor-default ${
            darkMode ? "bg-black/12 backdrop-blur-[2px]" : "bg-black/[.035] backdrop-blur-[2px]"
          }`}
        />
      ) : null}

'''
if backdrop not in s:
    raise SystemExit("location backdrop target not found")
s = s.replace(backdrop, "", 1)
s = s.replace(
    "max-h-72 overflow-y-auto rounded-[20px] border p-2 shadow-[0_26px_80px_rgba(0,0,0,.38)] backdrop-blur-2xl backdrop-saturate-150",
    "max-h-64 overflow-y-auto rounded-[16px] border p-2 shadow-[0_18px_48px_rgba(0,0,0,.34)] backdrop-blur-xl backdrop-saturate-125",
    1,
)
s = s.replace('"border-white/13 bg-black/72 text-white"', '"border-[#f6b800]/22 bg-[#090909]/98 text-white"', 1)
s = s.replace('"border-black/[.08] bg-white/78 text-black"', '"border-black/[.10] bg-white/98 text-black"', 1)
s = s.replace("rounded-[14px] px-3 py-3", "rounded-[11px] px-3 py-3", 1)
p.write_text(s)

# Finance calculator: remove redundant eyebrow and ground truck cutout with shadow.
replace_once(
    "app/tools/truck-finance/page.tsx",
    '          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88700]">LoadLink truck finance</p>\n',
    "",
    "finance eyebrow removal",
)
replace_once(
    "app/tools/truck-finance/page.tsx",
    '''            <img
              src={TRUCK_IMAGE}
              alt="Real commercial truck"
              className="absolute inset-0 h-full w-full object-contain object-center p-4 sm:p-7"
            />''',
    '''            <div aria-hidden="true" className="absolute bottom-8 left-1/2 h-8 w-[66%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-xl sm:bottom-10" />
            <img
              src={TRUCK_IMAGE}
              alt="Real commercial truck"
              className="absolute inset-0 z-10 h-full w-full object-contain object-center p-4 drop-shadow-[0_16px_14px_rgba(0,0,0,.18)] sm:p-7"
            />''',
    "finance truck shadow",
)

# Menu corner: remove bordered circular close treatment.
p = Path("components/SiteMenu.tsx")
s = p.read_text()
old = 'className={`flex h-10 w-10 items-center justify-center rounded-full border outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${border}`}'
new = 'className="flex h-10 w-10 items-center justify-center bg-transparent outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"'
if old not in s:
    raise SystemExit("menu close button target not found")
p.write_text(s.replace(old, new, 1))

# Messages: parallel conversation RPCs, non-blocking account/privacy startup, fully visible mobile search/folders.
p = Path("app/messages/page.tsx")
s = p.read_text()
start = s.index("    const buyerRows: Conversation[] = [];", s.index("const loadConversations"))
end = s.index("    const locallyArchived = readLocalArchivedIds();", start)
parallel = '''    const [buyerGroups, ownerGroups] = await Promise.all([
      Promise.all(buyerKeys.map(async (buyerKey) => {
        const result = await supabase.rpc("get_buyer_guest_threads", { p_buyer_key: buyerKey });
        if (result.error) throw result.error;
        return ((result.data || []) as ConversationRow[]).map((row) => ({
          ...row,
          accessKey: buyerKey,
          role: "buyer" as const,
          unreadCount: toCount(row.unread_count),
        }));
      })),
      Promise.all(ownerKeys.map(async (ownerKey) => {
        const result = await supabase.rpc("get_owner_guest_threads", { p_owner_key: ownerKey });
        if (result.error) throw result.error;
        return ((result.data || []) as ConversationRow[]).map((row) => ({
          ...row,
          accessKey: ownerKey,
          role: "owner" as const,
          unreadCount: toCount(row.unread_count),
        }));
      })),
    ]);
    const buyerRows: Conversation[] = buyerGroups.flat();
    const ownerRows: Conversation[] = ownerGroups.flat();

'''
s = s[:start] + parallel + s[end:]
init_start = s.index("        const { data: privacyRow } = await supabase")
init_end_marker = "        await syncAccountState().catch(() => undefined);"
init_end = s.index(init_end_marker, init_start) + len(init_end_marker)
startup = '''        const privacyPromise = supabase
          .from("profiles")
          .select("message_activity_visible,message_typing_indicators,message_requests_enabled,message_notification_previews")
          .eq("id", user.id)
          .maybeSingle();

        void Promise.allSettled(
          Array.from(new Set([getBuyerKey(), ...getOwnerKeys()])).map((accessKey) =>
            supabase.rpc("loadlink_register_chat_access_key", { p_access_key: accessKey }),
          ),
        );
        void syncAccountState().catch(() => undefined);
        void privacyPromise.then(({ data: privacyRow }) => {
          if (!privacyRow) return;
          const nextPrivacy = profileRowToMessagePrivacy(privacyRow as Record<string, unknown>);
          writeMessagePrivacy(nextPrivacy);
          setMessagePrivacy(nextPrivacy);
        });'''
s = s[:init_start] + startup + s[init_end:]
s = s.replace("await syncAccountState().catch(() => undefined);", "void syncAccountState().catch(() => undefined);")
s = s.replace(
    "if (loading || (messagesLoading && Boolean(selectedId) && messages.length === 0)) {",
    "if (loading) {",
    1,
)
s = s.replace(
    'className="loadlink-folder-tabs no-scrollbar mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1"',
    'className="loadlink-folder-tabs mt-3 grid min-w-0 grid-cols-[0.8fr_1.35fr_0.9fr] gap-2"',
    1,
)
s = s.replace(
    "shrink-0 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[11px] font-black transition",
    "min-w-0 whitespace-nowrap rounded-xl border px-2 py-2.5 text-[10px] font-black transition",
    3,
)
s = s.replace("          10000,\n        );", "          15000,\n        );", 1)
p.write_text(s)

# List Your Vehicle: show page immediately, match Driver Portal hierarchy, then ask listing type before plans.
p = Path("app/list-your-vehicle/page.tsx")
s = p.read_text()
if 'import dynamic from "next/dynamic";' not in s:
    s = s.replace(
        'import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";\n',
        'import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";\nimport dynamic from "next/dynamic";\n',
        1,
    )
s = s.replace(
    'import BusinessPlans, { type BusinessPlanId } from "@/components/BusinessPlans";',
    'import type { BusinessPlanId } from "@/components/BusinessPlans";',
    1,
)
s = s.replace('import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";\n', "", 1)
dynamic_marker = 'import { submitListingDirect } from "@/lib/listingSubmission";\n'
if dynamic_marker not in s:
    raise SystemExit("list vehicle dynamic import marker not found")
dynamic_code = dynamic_marker + '''
const BusinessPlans = dynamic(() => import("@/components/BusinessPlans"), { ssr: false, loading: () => <div className="mx-auto my-6 h-28 max-w-6xl animate-pulse rounded-2xl bg-current/[.05]" /> });
const VehicleMarketplaceHub = dynamic(() => import("@/components/VehicleMarketplaceHub"), { ssr: false, loading: () => <div className="mx-auto my-8 h-64 max-w-6xl animate-pulse rounded-2xl bg-current/[.05]" /> });
'''
s = s.replace(dynamic_marker, dynamic_code, 1)
s = s.replace("      await syncAccountState().catch(() => undefined);", "      void syncAccountState().catch(() => undefined);", 1)
s = s.replace('  if (!authReady) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;\n\n', "", 1)
header_pos = s.index("      <Header darkMode={darkMode}")
hero_start = s.index('      <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">', header_pos)
hero_end = s.index("      {listingFlowOpen && !signedIn ?", hero_start)
hero = '''      <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">
        <img
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
            Browse approved trucks, trailers and mobile units, or choose what you want to list and continue through the correct LoadLink flow.
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
                List a vehicle or mobile unit
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {listingFlowOpen && !listingIntent && !dealerPost ? (
        <section id="vehicle-listing-choice" className={`scroll-mt-24 border-b px-4 py-8 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-black tracking-[-.04em]">What do you want to list?</h2>
            <p className={`mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Choose first. LoadLink will only show the plan guide and form for that listing route after you make this selection.</p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => {
                setListingIntent("vehicle");
                setVehicleCategory(null);
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`min-h-28 rounded-2xl border p-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">List a vehicle</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Truck or trailer listing.</span>
              </button>
              <button type="button" onClick={() => {
                setListingIntent("mobile_unit");
                setVehicleCategory("mobile_unit");
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`min-h-28 rounded-2xl border p-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">List a mobile unit</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Mobile fridge, kitchen, clinic, office and other units.</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

'''
s = s[:hero_start] + hero + s[hero_end:]
s = s.replace("{listingFlowOpen && !signedIn ?", "{listingFlowOpen && listingIntent && !signedIn ?", 1)
p.write_text(s)

# Remove stale CSS that was still zooming/brightening portal images and re-enlarging tabs.
Path("app/loadlink-search-glass.css").write_text('''/* LoadLink homepage search layering and compact portal navigation. */
main > section:has([data-loadlink-marketplace-search-shell]) {
  position: relative !important;
  z-index: 180 !important;
  overflow: visible !important;
  isolation: isolate;
  border-top: 0 !important;
  box-shadow: none !important;
}
[data-loadlink-marketplace-search-shell] {
  position: relative !important;
  z-index: 181 !important;
  overflow: visible !important;
  border-top: 0 !important;
}
[data-loadlink-marketplace-search-shell]::before,
[data-loadlink-marketplace-search-shell]::after { display: none !important; content: none !important; }
[data-loadlink-marketplace-search-shell] .absolute { z-index: 220 !important; }
[data-loadlink-marketplace-search-shell] [role="listbox"] {
  z-index: 230 !important;
  max-height: 16rem !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
[aria-label="Search category"] > div { gap: 8px !important; padding: 1px !important; }
[aria-label="Search category"] > div > button {
  min-height: 44px !important;
  min-width: 100px !important;
  border-radius: 9999px !important;
  padding: 8px 16px !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  box-shadow: none !important;
}
html[data-loadlink-theme="dark"] [aria-label="Search category"] > div > button[aria-pressed="false"] {
  background: rgba(8,8,8,.96) !important;
  border-color: #4b5563 !important;
  color: rgba(255,255,255,.84) !important;
}
html[data-loadlink-theme="light"] [aria-label="Search category"] > div > button[aria-pressed="false"] {
  background: #fff !important;
  border-color: #d1d5db !important;
  color: #4b5563 !important;
}
[aria-label="Search category"] > div > button[aria-pressed="true"] {
  background: #f6b800 !important;
  border-color: #f6b800 !important;
  color: #050505 !important;
  box-shadow: 0 8px 22px rgba(246,184,0,.16) !important;
}
a[href="/tools/truck-finance"] > div:first-child > p:first-child { display: none !important; }
''')
