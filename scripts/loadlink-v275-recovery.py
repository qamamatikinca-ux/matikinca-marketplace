from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

HEADER_FILES = [
    "app/search/SearchResultsClient.tsx",
    "app/help/page.tsx",
    "app/driver-portal/page.tsx",
    "app/account/settings/page.tsx",
    "app/account/packages/page.tsx",
    "app/account/activity/page.tsx",
    "app/messages/page.tsx",
    "app/list-your-vehicle/page.tsx",
    "app/drivers/page.tsx",
    "app/notifications/page.tsx",
    "app/dealer/quote/share/[token]/page.tsx",
    "app/dealer/invite/page.tsx",
    "app/packages/page.tsx",
    "app/my-posts/page.tsx",
    "app/jobs/list/page.tsx",
    "app/jobs/page.tsx",
    "app/page.tsx",
    "app/tools/page.tsx",
    "app/dealership/[slug]/page.tsx",
    "app/verification-status/page.tsx",
    "app/listing/[id]/page.tsx",
    "app/verify/page.tsx",
    "components/LoadLinkCommercialDealership.tsx",
    "components/dealer/DealerShell.tsx",
    "components/DriverProfileWizardV273.tsx",
]


def read(rel: str) -> str:
    return (ROOT / rel).read_text()


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text)


def add_import(text: str, statement: str) -> str:
    if statement in text:
        return text
    marker = '"use client";\n'
    if marker in text:
        return text.replace(marker, marker + "\n" + statement + "\n", 1)
    first_import = text.find("import ")
    if first_import >= 0:
        return text[:first_import] + statement + "\n" + text[first_import:]
    return statement + "\n" + text


def replace_site_header(rel: str) -> None:
    path = ROOT / rel
    if not path.exists():
        print(f"HEADER missing: {rel}")
        return
    text = path.read_text()
    if 'data-loadlink-site-header="locked-v275"' in text or "<LoadLinkSiteHeader" in text:
        print(f"HEADER already shared: {rel}")
        return

    pos = 0
    chosen = None
    while True:
        start = text.find("<header", pos)
        if start < 0:
            break
        end = text.find("</header>", start)
        if end < 0:
            break
        end += len("</header>")
        chunk = text[start:end]
        if "HomeLogoLink" in chunk and "LoadLinkThemeToggle" in chunk:
            chosen = (start, end, chunk)
            break
        pos = end

    if not chosen:
        print(f"HEADER no matching site header: {rel}")
        return

    start, end, chunk = chosen
    toggle_match = re.search(r"onToggle=\{([^}\n]+)\}", chunk)
    if not toggle_match:
        raise RuntimeError(f"Cannot determine theme toggle for {rel}")
    toggle = toggle_match.group(1).strip()
    sticky = "sticky" in chunk
    replacement = f'<LoadLinkSiteHeader darkMode={{darkMode}} onToggleTheme={{{toggle}}}' + (" />" if sticky else " sticky={false} />")
    text = text[:start] + replacement + text[end:]
    text = add_import(text, 'import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";')
    path.write_text(text)
    print(f"HEADER shared: {rel}")


for rel in HEADER_FILES:
    replace_site_header(rel)

# Make active-plan detection resilient to valid Dealer/Pro capability state.
business_rel = "components/BusinessPlans.tsx"
business = read(business_rel)
old_active = '  const activePlan = state && entitled.has(String(state.plan_state)) && (state.plan === "pro" || state.plan === "dealer") ? state.plan : null;'
new_active = '''  const activePlan =\n    state?.plan === "dealer" && (entitled.has(String(state.plan_state)) || Boolean(state.capabilities?.dealer_tools) || Boolean(state.dealer_profile_id))\n      ? "dealer"\n      : state?.plan === "pro" && (entitled.has(String(state.plan_state)) || Boolean(state.capabilities?.analytics))\n        ? "pro"\n        : null;'''
if old_active not in business:
    raise RuntimeError("BusinessPlans active-plan marker not found")
business = business.replace(old_active, new_active, 1)
write(business_rel, business)
print("PACKAGES active plan detection repaired")

# Dealer: remove the obsolete setup page. A paid Dealer account gets its private workspace created automatically.
dealer_rel = "components/dealer/DealerWorkspace.tsx"
dealer = read(dealer_rel)
dealer = add_import(dealer, 'import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";')
old_boot = '''      const data = await dealerFetch<{ context: DealerWorkspaceState | null; profile: DealerProfile | null }>("/api/dealer/context");\n      setContext(data.context); setProfile(data.profile);\n      if (data.context?.dealership_id) await refreshCore();'''
new_boot = '''      let data = await dealerFetch<{ context: DealerWorkspaceState | null; profile: DealerProfile | null }>("/api/dealer/context");\n      if (!data.context?.dealership_id || !data.profile) {\n        const intelligence = await getLoadLinkIntelligence();\n        if (intelligence.plan !== "dealer" && !intelligence.capabilities?.dealer_tools) {\n          window.location.assign("/packages");\n          return;\n        }\n        const metadata = (user.user_metadata || {}) as Record<string, unknown>;\n        const inferredName = String(metadata.dealership_name || metadata.business_name || metadata.company_name || metadata.full_name || user.email?.split("@")[0] || "My dealership").trim();\n        const inferredLocation = String(metadata.city || metadata.location || metadata.business_location || "").trim();\n        await dealerFetch("/api/dealer/context", { method: "POST", body: JSON.stringify({ action: "create_profile", name: inferredName || "My dealership", location: inferredLocation }) });\n        data = await dealerFetch<{ context: DealerWorkspaceState | null; profile: DealerProfile | null }>("/api/dealer/context");\n      }\n      setContext(data.context); setProfile(data.profile);\n      if (data.context?.dealership_id) await refreshCore();'''
if old_boot not in dealer:
    raise RuntimeError("Dealer boot marker not found")
dealer = dealer.replace(old_boot, new_boot, 1)
old_onboarding_return = '  if (!context || !profile) return <DealerOnboarding darkMode={darkMode} toggleTheme={toggleTheme} onCreated={boot} />;'
new_onboarding_return = '  if (!context || !profile) return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`}><div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4"><Surface darkMode={darkMode} className="w-full p-8 text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><div className="mt-4 text-sm font-black">Preparing Dealer workspace</div></Surface></div></main>;'
if old_onboarding_return not in dealer:
    raise RuntimeError("Dealer onboarding return marker not found")
dealer = dealer.replace(old_onboarding_return, new_onboarding_return, 1)
start = dealer.find("function DealerOnboarding(")
end = dealer.find("export function DealerWorkspaceSuspense()", start)
if start >= 0 and end >= 0:
    dealer = dealer[:start] + dealer[end:]
else:
    raise RuntimeError("Dealer onboarding function block not found")
write(dealer_rel, dealer)
print("DEALER obsolete setup page removed; workspace auto-provisions")

# Logistics tools: full-screen portal above chat and proper icons instead of placeholder letters/symbols.
log_rel = "components/LogisticsMessageTools.tsx"
log = read(log_rel)
clean_marker = '''function clean(value: string) {\n  return value.trim().replace(/\\s+/g, " ");\n}\n'''
icon_code = r'''
function ToolGlyph({ type }: { type: "quote" | "trip" | "incident" | "planning" | "documents" | "operations" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (type === "quote") return <svg {...common}><path d="M6 3h9l3 3v15H6V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "trip") return <svg {...common}><circle cx="6" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 16c4 0 3-7 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.5 2.5"/></svg>;
  if (type === "incident") return <svg {...common}><path d="M12 3 22 20H2L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 9v5M12 17.3v.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type === "planning") return <svg {...common}><path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "documents") return <svg {...common}><path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 3v5h5M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  return <svg {...common}><path d="M3 8h11v8H3V8Zm11 3h3.5L21 14v2h-7v-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="7" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8"/></svg>;
}
'''
if "function ToolGlyph(" not in log:
    if clean_marker not in log:
        raise RuntimeError("Logistics clean marker not found")
    log = log.replace(clean_marker, clean_marker + icon_code, 1)

old_section = 'className={`loadlink-logistics-sheet fixed inset-x-0 bottom-0 z-[2147483640] max-h-[86dvh] overflow-y-auto rounded-t-[30px] border-t shadow-[0_-18px_50px_rgba(0,0,0,.30)] ${panel}`}'
new_section = 'className={`loadlink-logistics-sheet fixed inset-0 overflow-y-auto overscroll-contain border-0 shadow-none ${panel}`} style={{ zIndex: 2147483647 }}'
if old_section not in log:
    raise RuntimeError("Logistics sheet class marker not found")
log = log.replace(old_section, new_section, 1)
log = log.replace('className="fixed inset-0 z-[2147483600] bg-black/50"', 'className="fixed inset-0 bg-black/70" style={{ zIndex: 2147483646 }}', 1)
log = log.replace('className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"', 'className="mx-auto min-h-full max-w-3xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"', 1)
log = log.replace('<span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black text-[#f6b800]">R</span>', '<span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black text-[#f6b800]"><ToolGlyph type="quote" /></span>', 1)
log = log.replace('<span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black text-[#f6b800]">{tool.id === "trip-brief" ? "↗" : "!"}</span>', '<span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black text-[#f6b800]"><ToolGlyph type={tool.id === "trip-brief" ? "trip" : "incident"} /></span>', 1)
log = log.replace('<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-black text-[#f6b800]">{group.id === "planning" ? "P" : group.id === "documents" ? "D" : "O"}</span>', '<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-[#f6b800]"><ToolGlyph type={group.id === "planning" ? "planning" : group.id === "documents" ? "documents" : "operations"} /></span>', 1)
log = log.replace('<span className={`text-sm transition-transform group-open:rotate-180 ${muted}`}>⌄</span>', '<span className={`transition-transform group-open:rotate-180 ${muted}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>', 1)
write(log_rel, log)
print("LOGISTICS tools promoted above chat and placeholder symbols replaced")

print("V2.7.5 recovery patch complete")
