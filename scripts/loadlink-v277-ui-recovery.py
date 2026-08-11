from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"V2.7.7 patch failed: {label} pattern not found")
    return text.replace(old, new, 1)

# 1) Restore the exact proven LoadLink header geometry from the pre-drift homepage.
header = '''"use client";

import { Suspense } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";

export default function LoadLinkSiteHeader({
  darkMode,
  onToggleTheme,
  sticky = true,
  className = "",
}: {
  darkMode: boolean;
  onToggleTheme: () => void;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <header
      data-loadlink-site-header="locked-v277"
      className={`${sticky ? "sticky top-0" : "relative"} z-[80] shrink-0 border-b transition-colors duration-300 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"} ${className}`}
    >
      <div className="grid h-20 w-full grid-cols-[92px_minmax(0,1fr)_60px] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
          </Suspense>
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <AuthStatusButton darkMode={darkMode} />
          </Suspense>
        </div>

        <HomeLogoLink
          theme={darkMode ? "dark" : "light"}
          showGlow={false}
          className="loadlink-header-logo flex min-w-0 items-center justify-center overflow-visible"
          logoClassName="loadlink-logo-dark-fix"
        />

        <LoadLinkThemeToggle darkMode={darkMode} onToggle={onToggleTheme} className="ml-auto" />
      </div>
    </header>
  );
}
'''
write("components/LoadLinkSiteHeader.tsx", header)

# 2) Make the chat tools a real top-layer state on iOS/Safari as well as desktop.
path = "components/LogisticsMessageTools.tsx"
text = read(path)
old = '''  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);'''
new = '''  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.dataset.loadlinkLogisticsOpen = "true";
    document.body.dataset.loadlinkLogisticsOpen = "true";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      delete document.documentElement.dataset.loadlinkLogisticsOpen;
      delete document.body.dataset.loadlinkLogisticsOpen;
    };
  }, [open]);'''
text = replace_once(text, old, new, "logistics overlay state")
text = text.replace('className={`text-[9px] font-black uppercase tracking-[.18em] ${darkMode ? "text-[#f6b800]" : "text-[#8b6800]"}`}>In conversation</p>', 'className="loadlink-ui-label">In conversation</p>', 1)
text = text.replace('className={`mb-2 text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Deal stage</p>', 'className="loadlink-ui-label mb-2">Deal stage</p>', 1)
write(path, text)

# 3) Apply the label system to package/status labels without touching LoadLink colours.
path = "components/BusinessPlans.tsx"
text = read(path)
text = text.replace('className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-black">Active</span>', 'className="loadlink-ui-label loadlink-ui-label--solid">Active</span>', 1)
text = text.replace('className="text-[9px] font-black uppercase tracking-[.08em] opacity-50">Current plan</span>', 'className="loadlink-ui-label">Current plan</span>', 1)
write(path, text)

# 4) Global, brand-safe precision rules. These deliberately do not introduce new colours.
path = "app/globals.css"
text = read(path)
marker = "/* LOADLINK_V277_HEADER_TOOLS_LABELS_START */"
if marker not in text:
    text += r'''

/* LOADLINK_V277_HEADER_TOOLS_LABELS_START */
/* Exact shared top-bar geometry: this mirrors the original LoadLink homepage header. */
[data-loadlink-site-header="locked-v277"] {
  min-height: 80px;
  overflow: visible;
}
[data-loadlink-site-header="locked-v277"] .loadlink-header-logo {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  transform: none !important;
}
[data-loadlink-site-header="locked-v277"] .loadlink-header-logo .loadlink-logo-wrap {
  width: clamp(128px, 30vw, 162px) !important;
  max-width: 100% !important;
}
@media (max-width: 360px) {
  [data-loadlink-site-header="locked-v277"] > div {
    grid-template-columns: 86px minmax(0, 1fr) 48px !important;
    gap: 8px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
  [data-loadlink-site-header="locked-v277"] .loadlink-header-logo .loadlink-logo-wrap {
    width: min(116px, 100%) !important;
  }
}

/* Chat Logistics Tools must be above every chat layer, including the fixed iOS composer. */
.loadlink-logistics-sheet {
  position: fixed !important;
  inset: 0 !important;
  width: 100dvw !important;
  height: 100dvh !important;
  min-height: 100dvh !important;
  max-width: none !important;
  max-height: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch !important;
  z-index: 2147483647 !important;
  isolation: isolate !important;
  transform: none !important;
  opacity: 1 !important;
}
html[data-loadlink-logistics-open="true"] .loadlink-chat-composer,
body[data-loadlink-logistics-open="true"] .loadlink-chat-composer,
body:has(.loadlink-logistics-sheet) .loadlink-chat-composer {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
html[data-loadlink-logistics-open="true"] .loadlink-chat-wallpaper,
body[data-loadlink-logistics-open="true"] .loadlink-chat-wallpaper,
body:has(.loadlink-logistics-sheet) .loadlink-chat-wallpaper {
  visibility: hidden !important;
}
html[data-loadlink-logistics-open="true"],
html[data-loadlink-logistics-open="true"] body {
  overflow: hidden !important;
  overscroll-behavior: none !important;
}

/* UI Design Tips-inspired labels: compact, contextual and accessible; LoadLink palette only. */
.loadlink-ui-label {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  border: 1px solid rgba(246, 184, 0, .30);
  border-radius: 6px;
  padding: 4px 7px;
  background: rgba(246, 184, 0, .08);
  color: #b98400;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: .025em;
  text-transform: uppercase;
}
html[data-loadlink-theme="dark"] .loadlink-ui-label {
  border-color: rgba(246, 184, 0, .34);
  background: rgba(246, 184, 0, .08);
  color: #f6b800;
}
.loadlink-ui-label--solid {
  border-color: #f6b800 !important;
  background: #f6b800 !important;
  color: #050505 !important;
}
/* LOADLINK_V277_HEADER_TOOLS_LABELS_END */
'''
write(path, text)

print("LoadLink V2.7.7 UI recovery patch applied")
