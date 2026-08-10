"use client";

import { useState, type ReactNode } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerGlobalSearch from "./DealerGlobalSearch";
import { PrimaryButton, SecondaryButton } from "./ui";

const sectionPermission: Partial<Record<DealerSection, string>> = {
  inventory: "inventory.read",
  leads: "leads.read",
  customers: "customers.read",
  messages: "messages.read",
  analytics: "analytics.read",
  marketing: "marketing.read",
  team: "team.read",
  showroom: "showroom.read",
  verification: "verification.read",
  billing: "billing.read",
  reviews: "reviews.read",
  activity: "activity.read",
  settings: "showroom.write",
};

const coreNav: Array<{ id: DealerSection; label: string; short: string }> = [
  { id: "overview", label: "Home", short: "Home" },
  { id: "inventory", label: "Stock", short: "Stock" },
  { id: "leads", label: "Sales", short: "Sales" },
  { id: "messages", label: "Messages", short: "Messages" },
  { id: "analytics", label: "Performance", short: "Performance" },
];

const businessNav: Array<{ label: string; items: Array<{ id: DealerSection; label: string }> }> = [
  { label: "Sales & customers", items: [{ id: "customers", label: "Customers" }, { id: "marketing", label: "Marketing" }, { id: "reviews", label: "Reviews" }] },
  { label: "Dealership", items: [{ id: "showroom", label: "Showroom" }, { id: "team", label: "Team" }, { id: "activity", label: "Activity" }] },
  { label: "Account", items: [{ id: "verification", label: "Verification" }, { id: "billing", label: "Billing" }, { id: "settings", label: "Dealer settings" }, { id: "support", label: "Support" }] },
];

function statusText(context: DealerWorkspaceState) {
  if (context.account_status === "blocked") return "Account blocked";
  if (context.account_status === "suspended") return "Account suspended";
  if (context.subscription_status === "past_due") return "Payment attention required";
  if (context.subscription_status === "grace_period") return "Billing grace period";
  if (context.subscription_status === "expired") return "Dealer access expired";
  if (context.verification_status === "changes_required") return "Verification action required";
  if (context.verification_status === "under_review" || context.verification_status === "submitted") return "Verification under review";
  if (context.verification_status !== "approved") return "Dealer setup in progress";
  if (context.showroom_status === "live") return "Showroom live";
  return "Showroom not public";
}

export default function DealerShell({ darkMode, toggleTheme, profile, context, section, setSection, onAddVehicle, children }: {
  darkMode: boolean;
  toggleTheme: () => void;
  profile: DealerProfile;
  context: DealerWorkspaceState;
  section: DealerSection;
  setSection: (section: DealerSection) => void;
  onAddVehicle: () => void;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const can = (id: DealerSection) => {
    const permission = sectionPermission[id];
    return !permission || context.permissions.includes(permission as never);
  };
  const primary = coreNav.filter((item) => can(item.id));
  const groups = businessNav.map((group) => ({ ...group, items: group.items.filter((item) => can(item.id)) })).filter((group) => group.items.length);
  const isBusinessSection = groups.some((group) => group.items.some((item) => item.id === section));

  function go(next: DealerSection) {
    setSection(next);
    setMoreOpen(false);
  }

  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`} data-loadlink-dealer-control-centre="v2623-clean">
    <header className={`sticky top-0 z-50 h-[64px] border-b backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/90" : "border-black/10 bg-[#f7f4ec]/92"}`}>
      <div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 sm:px-5">
        <div className="flex items-center gap-1.5"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="pointer-events-auto"><HomeLogoLink className="w-[104px] sm:w-[118px]" /></div></div>
        <div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1500px] px-3 pb-28 pt-3 sm:px-5 lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-5 lg:pb-10 lg:pt-5">
      <aside className={`hidden h-[calc(100vh-84px)] self-start overflow-y-auto border lg:sticky lg:top-[76px] lg:block ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
        <div className="border-b border-current/10 p-4">
          <div className="truncate text-sm font-black">{profile.name}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold opacity-60"><span className={`h-2 w-2 rounded-full ${context.showroom_status === "live" && context.subscription_status === "active" ? "bg-emerald-500" : "bg-[#f6b800]"}`} />{statusText(context)}</div>
        </div>
        <nav className="p-2" aria-label="Dealer dashboard">
          <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[.1em] opacity-35">Workspace</div>
          {primary.map((item) => <NavButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.label}</NavButton>)}
          <button type="button" onClick={() => setMoreOpen((value) => !value)} className={`mt-2 flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-black transition ${isBusinessSection ? "bg-current/[.06]" : "opacity-60 hover:bg-current/[.05] hover:opacity-100"}`}><span>Business tools</span><span className="text-base font-medium opacity-50">{moreOpen || isBusinessSection ? "−" : "+"}</span></button>
          {(moreOpen || isBusinessSection) ? <div className="mt-2 border-t border-current/10 pt-2">{groups.map((group) => <div key={group.label} className="mb-3"><div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] opacity-30">{group.label}</div>{group.items.map((item) => <NavButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.label}</NavButton>)}</div>)}</div> : null}
        </nav>
      </aside>

      <div className="min-w-0">
        <section className={`mb-3 border px-4 py-3.5 sm:px-5 ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-full border ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#f7f4ec]"}`}>
              {profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-black">{profile.name.slice(0, 2).toUpperCase()}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-[18px] font-black tracking-[-.03em] sm:text-[20px]">{profile.name}</h1>{context.verification_status === "approved" ? <span className="hidden rounded-full border border-current/15 px-2 py-0.5 text-[9px] font-black sm:inline">Verified</span> : null}</div>
              <div className="mt-0.5 truncate text-[11px] font-semibold opacity-50">{statusText(context)}</div>
            </div>
            <div className="hidden items-center gap-2 sm:flex"><SecondaryButton darkMode={darkMode} type="button" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>{context.showroom_status === "live" ? "Showroom" : "Preview"}</SecondaryButton><PrimaryButton type="button" onClick={onAddVehicle}>Add vehicle</PrimaryButton></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden"><SecondaryButton darkMode={darkMode} type="button" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>{context.showroom_status === "live" ? "Showroom" : "Preview"}</SecondaryButton><PrimaryButton type="button" onClick={onAddVehicle}>Add vehicle</PrimaryButton></div>
          <div className="mt-3"><DealerGlobalSearch darkMode={darkMode} setSection={go} /></div>
        </section>

        {children}
      </div>
    </div>

    <nav className={`fixed inset-x-0 bottom-0 z-50 border-t px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden ${darkMode ? "border-white/10 bg-[#090909]/95" : "border-black/10 bg-white/95"}`} aria-label="Dealer mobile navigation">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {primary.slice(0, 4).map((item) => <MobileNavButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.short}</MobileNavButton>)}
        <div className="relative"><MobileNavButton active={section === "analytics" || isBusinessSection} onClick={() => setMoreOpen((value) => !value)}>More</MobileNavButton>{moreOpen ? <div className={`absolute bottom-[58px] right-0 w-[220px] max-h-[60vh] overflow-y-auto border p-2 shadow-2xl ${darkMode ? "border-white/10 bg-[#111]" : "border-black/10 bg-white"}`}><button type="button" onClick={() => go("analytics")} className={`mb-1 min-h-10 w-full rounded-lg px-3 text-left text-xs font-black ${section === "analytics" ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-65"}`}>Performance</button>{groups.flatMap((group) => group.items).map((item) => <button type="button" key={item.id} onClick={() => go(item.id)} className={`mb-1 min-h-10 w-full rounded-lg px-3 text-left text-xs font-black ${section === item.id ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-65"}`}>{item.label}</button>)}</div> : null}</div>
      </div>
    </nav>
  </main>;
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`mb-1 flex min-h-10 w-full items-center rounded-lg px-3 text-left text-[13px] font-black transition ${active ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-60 hover:bg-current/[.05] hover:opacity-100"}`}>{children}</button>;
}

function MobileNavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-[48px] w-full rounded-lg px-1 text-[10px] font-black ${active ? "bg-current/[.08] opacity-100" : "opacity-50"}`}>{children}</button>;
}
