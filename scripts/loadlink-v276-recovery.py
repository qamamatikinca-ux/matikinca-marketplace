from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(rel: str, old: str, new: str) -> None:
    text = read(rel)
    if old not in text:
        raise SystemExit(f"Expected source not found in {rel}: {old[:90]!r}")
    write(rel, text.replace(old, new, 1))
    print(f"UPDATED {rel}")


def replace_all(rel: str, old: str, new: str) -> None:
    text = read(rel)
    count = text.count(old)
    if count == 0:
        raise SystemExit(f"Expected source not found in {rel}: {old[:90]!r}")
    write(rel, text.replace(old, new))
    print(f"UPDATED {rel} ({count} replacements)")


def replace_containing_parent_div_with_fragment(rel: str, marker: str) -> None:
    text = read(rel)
    marker_at = text.find(marker)
    if marker_at < 0:
        raise SystemExit(f"Marker not found in {rel}: {marker}")

    tag_re = re.compile(r"<div\b[^>]*>|</div>")
    stack = []
    for match in tag_re.finditer(text, 0, marker_at):
        token = match.group(0)
        if token.startswith("</div"):
            if stack:
                stack.pop()
        else:
            stack.append(match.start())

    if len(stack) < 2:
        raise SystemExit(f"Could not resolve hero parent div in {rel}")
    start = stack[-2]

    depth = 0
    end = None
    for match in tag_re.finditer(text, start):
        token = match.group(0)
        if token.startswith("</div"):
            depth -= 1
            if depth == 0:
                end = match.end()
                break
        else:
            depth += 1
    if end is None:
        raise SystemExit(f"Could not resolve closing hero div in {rel}")

    write(rel, text[:start] + "<></>" + text[end:])
    print(f"REMOVED messages hero from {rel}")


# 1. Lock the exact shared top bar geometry used across customer-facing LoadLink pages.
replace_once(
    "components/LoadLinkSiteHeader.tsx",
    'data-loadlink-site-header="locked-v275"',
    'data-loadlink-site-header="locked-v276"',
)
replace_once(
    "components/LoadLinkSiteHeader.tsx",
    'className="relative mx-auto flex h-full w-full max-w-[1500px] items-center px-4 sm:px-5"',
    'className="relative mx-auto flex h-full w-full max-w-[1500px] items-center px-5 sm:px-6"',
)
replace_once(
    "components/LoadLinkSiteHeader.tsx",
    'className="relative z-10 flex items-center gap-2"',
    'className="relative z-20 flex items-center gap-3"',
)
replace_once(
    "components/LoadLinkSiteHeader.tsx",
    'className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"',
    'className="loadlink-header-logo pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"',
)
replace_once(
    "components/LoadLinkSiteHeader.tsx",
    'className="relative z-10 ml-auto"',
    'className="relative z-20 ml-auto"',
)

# 2. Keep Cloudflare Turnstile. Preview Vercel auth URLs are redirected to the authorized production hostname before Turnstile mounts.
turnstile = read("components/TurnstileChallenge.tsx")
anchor = 'const NETWORK_GRACE_MS = 12000;\n'
insert = '''const NETWORK_GRACE_MS = 12000;\nconst LOADLINK_CANONICAL_HOST = "matikinca-marketplace.vercel.app";\n\nfunction redirectUnsupportedVercelHostname() {\n  if (typeof window === "undefined") return false;\n  const hostname = window.location.hostname.toLowerCase();\n  if (!hostname.endsWith(".vercel.app") || hostname === LOADLINK_CANONICAL_HOST) return false;\n  const target = new URL(window.location.href);\n  target.protocol = "https:";\n  target.host = LOADLINK_CANONICAL_HOST;\n  window.location.replace(target.toString());\n  return true;\n}\n'''
if anchor not in turnstile:
    raise SystemExit("Turnstile constants anchor not found")
turnstile = turnstile.replace(anchor, insert, 1)
needle = '  useEffect(() => {\n    if (!SITE_KEY) return;\n'
replacement = '  useEffect(() => {\n    if (!SITE_KEY) return;\n    if (redirectUnsupportedVercelHostname()) return;\n'
if needle not in turnstile:
    raise SystemExit("Turnstile effect anchor not found")
turnstile = turnstile.replace(needle, replacement, 1)
write("components/TurnstileChallenge.tsx", turnstile)
print("UPDATED components/TurnstileChallenge.tsx")

# 3. Messages: remove the extra hero/sketch, remove the special chat loader, and use only the normal LoadLink loader when initial auth/data really needs it.
replace_once(
    "app/messages/page.tsx",
    'import MessageVisualScene from "@/components/MessageVisualScene";',
    'import LoadLinkLoading from "@/components/LoadLinkLoading";',
)
replace_all(
    "app/messages/page.tsx",
    '<MessageVisualScene mode="loading" darkMode={darkMode} />',
    '<LoadLinkLoading />',
)
replace_all(
    "app/messages/page.tsx",
    '<MessageVisualScene mode="inline" darkMode={darkMode} />',
    'null',
)
replace_containing_parent_div_with_fragment("app/messages/page.tsx", "LoadLink Messages")

# 4. Make route-to-Messages loading brief; the chat should not sit behind an artificial long transition.
global_loading = read("components/GlobalLoading.tsx")
old = '      startLoading(INITIAL_MINIMUM_LOADING_TIME);'
new = '      startLoading(pathname === "/messages" ? 220 : INITIAL_MINIMUM_LOADING_TIME);'
if old not in global_loading:
    raise SystemExit("GlobalLoading initial timing anchor not found")
global_loading = global_loading.replace(old, new, 1)
old = '      startLoading();\n    }'
new = '      startLoading(nextUrl.pathname === "/messages" ? 160 : ROUTE_MINIMUM_LOADING_TIME);\n    }'
if old not in global_loading:
    raise SystemExit("GlobalLoading route timing anchor not found")
global_loading = global_loading.replace(old, new, 1)
write("components/GlobalLoading.tsx", global_loading)
print("UPDATED components/GlobalLoading.tsx")

# 5. Menu: never advertise dealership application as a random account card. Existing dealership owners still keep their centre/pending entry.
site_menu = read("components/SiteMenu.tsx")
old = '''    const dealerLink: MenuLink = dealer?.verification_status === "approved"\n      ? { label: "Dealership centre", href: "/dealer", description: "Manage approved stock", icon: "dealer" }\n      : dealer\n        ? { label: "Dealership pending", href: "/dealer", description: "Review your application status", icon: "dealer" }\n        : { label: "Apply as a dealership", href: "/dealer", description: "Create a dealership application", icon: "dealer" };'''
new = '''    const dealerLink: MenuLink | null = dealer?.verification_status === "approved"\n      ? { label: "Dealership centre", href: "/dealer", description: "Manage approved stock", icon: "dealer" }\n      : dealer\n        ? { label: "Dealership pending", href: "/dealer", description: "Review your application status", icon: "dealer" }\n        : null;'''
if old not in site_menu:
    raise SystemExit("SiteMenu dealership block not found")
site_menu = site_menu.replace(old, new, 1)
old = '''    return [\n      { label: "Messages", href: "/messages", description: "Your conversations", icon: "messages" },\n      { label: "Notifications", href: "/notifications", description: "Reviews, messages and account updates", icon: "notifications" },\n      { label: "My posts", href: "/my-posts", description: "Manage your listings", icon: "posts" },\n      { label: "Activity & access", href: "/account/activity", description: "Logins, devices and payments", icon: "activity" },\n      { label: "Profile settings", href: "/account/settings", description: "Profile, account and alerts", icon: "settings" },\n      ...(account.driverProfile ? [{ label: "Driver profile", href: "/driver-profile", description: "Manage your driver profile", icon: "driver" as const }] : []),\n      dealerLink,\n      { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans", icon: "packages" },\n    ];'''
new = '''    return [\n      { label: "Messages", href: "/messages", description: "Your conversations", icon: "messages" },\n      { label: "Notifications", href: "/notifications", description: "Reviews, messages and account updates", icon: "notifications" },\n      { label: "My posts", href: "/my-posts", description: "Manage your listings", icon: "posts" },\n      { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans", icon: "packages" },\n      ...(account.driverProfile ? [{ label: "Driver profile", href: "/driver-profile", description: "Manage your driver profile", icon: "driver" as const }] : []),\n      ...(dealerLink ? [dealerLink] : []),\n      { label: "Activity & access", href: "/account/activity", description: "Logins, devices and payments", icon: "activity" },\n      { label: "Profile settings", href: "/account/settings", description: "Profile, account and alerts", icon: "settings" },\n    ];'''
if old not in site_menu:
    raise SystemExit("SiteMenu account ordering block not found")
site_menu = site_menu.replace(old, new, 1)
write("components/SiteMenu.tsx", site_menu)
print("UPDATED components/SiteMenu.tsx")

# 6. Manual package copy: R15 is per vehicle/day, with at most five Manual vehicle listings active at the same time.
replace_once(
    "components/BusinessPlans.tsx",
    'features: ["1 active vehicle listing", "Up to 5 photos", "Standard marketplace placement", "50 messages per day"],',
    'features: ["Up to 5 active vehicle listings at once", "Up to 5 photos per listing", "Standard marketplace placement", "50 messages per day"],',
)

# 7. Chat Logistics Tools: same clean two-column card language as the standalone Tools page, not grouped accordion blocks.
logistics = read("components/LogisticsMessageTools.tsx")
logistics = logistics.replace(
    'className={`loadlink-logistics-sheet fixed inset-0 overflow-y-auto overscroll-contain border-0 shadow-none ${panel}`} style={{ zIndex: 2147483647 }}',
    'className={`loadlink-logistics-sheet fixed inset-0 isolate overflow-y-auto overscroll-contain border-0 shadow-none ${panel}`} style={{ zIndex: 2147483647, transform: "translateZ(0)" }}',
    1,
)
start_marker = '''            <div className="mt-5">\n              <div className="mb-2 flex items-end justify-between gap-3">\n                <div>\n                  <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Logistics tools</p>\n                  <p className={`mt-1 text-[10px] font-medium ${muted}`}>Start with a common action or open a grouped toolkit.</p>\n                </div>\n              </div>'''
start = logistics.find(start_marker)
end = logistics.find('            {editorTool ? (', start)
if start < 0 or end < 0:
    raise SystemExit("Logistics tool grid block anchors not found")
new_grid = '''            <div className="mt-6">\n              <div>\n                <h3 className="text-2xl font-black tracking-[-.035em]">Tools</h3>\n                <p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Choose a tool, complete the details, then place the result back into this conversation.</p>\n              </div>\n\n              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">\n                <button type="button" disabled={disabled} onClick={() => { setEditorTool(null); setEditorText(""); setQuoteOpen((current) => !current); }} className={`group min-h-[150px] rounded-[24px] border p-4 text-left transition disabled:opacity-40 ${quoteOpen ? "border-[#f6b800] bg-[#f6b800] text-black" : control}`}>\n                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${quoteOpen ? "bg-black text-[#f6b800]" : "bg-black text-[#f6b800]"}`}><ToolGlyph type="quote" /></span>\n                  <span className="mt-5 block text-base font-black tracking-[-.02em]">Rate quote</span>\n                  <span className={`mt-1 block text-xs font-semibold leading-5 ${quoteOpen ? "text-black/60" : muted}`}>Build a clean transport quote</span>\n                </button>\n                {workflowTools.map((tool) => {\n                  const active = editorTool?.id === tool.id;\n                  const glyph = tool.id === "trip-brief" ? "trip" : tool.id === "incident-update" ? "incident" : tool.id.includes("document") || tool.id.includes("pod") ? "documents" : tool.id.includes("checklist") || tool.id.includes("collection") || tool.id.includes("delivery") ? "planning" : "operations";\n                  return (\n                    <button key={tool.id} type="button" disabled={disabled} onClick={() => openToolEditor(tool)} className={`group min-h-[150px] rounded-[24px] border p-4 text-left transition disabled:opacity-40 ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : control}`}>\n                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-[#f6b800]"><ToolGlyph type={glyph} /></span>\n                      <span className="mt-5 block text-base font-black tracking-[-.02em]">{tool.label}</span>\n                      <span className={`mt-1 block text-xs font-semibold leading-5 ${active ? "text-black/60" : muted}`}>{tool.summary}</span>\n                    </button>\n                  );\n                })}\n              </div>\n            </div>\n\n'''
logistics = logistics[:start] + new_grid + logistics[end:]
write("components/LogisticsMessageTools.tsx", logistics)
print("UPDATED components/LogisticsMessageTools.tsx")

# 8. Global CSS guardrails: exact-centre header and make the chat tools an opaque top-most Safari layer.
globals_rel = "app/globals.css"
globals = read(globals_rel)
css = '''\n\n/* LoadLink V2.7.6 locked header + chat tools layering */\n[data-loadlink-site-header="locked-v276"] .loadlink-header-logo {\n  left: 50% !important;\n  top: 50% !important;\n  transform: translate(-50%, -50%) !important;\n  margin: 0 !important;\n}\n[data-loadlink-site-header="locked-v276"] .loadlink-header-logo .loadlink-logo-wrap {\n  width: clamp(128px, 30vw, 162px) !important;\n}\n.loadlink-logistics-sheet {\n  position: fixed !important;\n  inset: 0 !important;\n  z-index: 2147483647 !important;\n  isolation: isolate !important;\n  opacity: 1 !important;\n}\nhtml[data-loadlink-theme="dark"] .loadlink-logistics-sheet { background: #0b0b0b !important; }\nhtml[data-loadlink-theme="light"] .loadlink-logistics-sheet { background: #ffffff !important; }\nbody:has(.loadlink-logistics-sheet) .loadlink-chat-wallpaper { visibility: hidden !important; }\n'''
if "LoadLink V2.7.6 locked header + chat tools layering" not in globals:
    globals += css
write(globals_rel, globals)
print("UPDATED app/globals.css")

print("V2.7.6 source recovery patch complete")
