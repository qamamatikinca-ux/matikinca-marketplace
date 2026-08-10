"use client";

import { useState, type ReactNode } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerGlobalSearch from "./DealerGlobalSearch";

const sectionPermission: Partial<Record<DealerSection, string>> = {
  inventory: "inventory.read", leads: "leads.read", customers: "customers.read", messages: "messages.read",
  analytics: "analytics.read", marketing: "marketing.read", team: "team.read", showroom: "showroom.read",
  verification: "verification.read", billing: "billing.read", reviews: "reviews.read", activity: "activity.read", settings: "showroom.write",
};

const CORE_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "overview", label: "Home" },
  { id: "inventory", label: "Stock" },
  { id: "leads", label: "Sales" },
  { id: "messages", label: "Inbox" },
];

const MORE_GROUPS: Array<{ label: string; items: Array<{ id: DealerSection; label: string }> }> = [
  { label: "Customers", items: [{ id: "customers", label: "Customers" }, { id: "analytics", label: "Performance" }, { id: "reviews", label: "Reviews" }] },
  { label: "Reach", items: [{ id: "marketing", label: "Status & updates" }, { id: "showroom", label: "Public showroom" }] },
  { label: "Dealership", items: [{ id: "team", label: "Team" }, { id: "activity", label: "Activity" }] },
  { label: "Account", items: [{ id: "verification", label: "Verification" }, { id: "billing", label: "Billing" }, { id: "settings", label: "Settings" }, { id: "support", label: "Support" }] },
];

function statusText(context: DealerWorkspaceState) {
  if (context.account_status === "blocked") return "Account blocked";
  if (context.account_status === "suspended") return "Account suspended";
  if (context.subscription_status === "past_due") return "Payment attention required";
  if (context.subscription_status === "grace_period") return "Billing grace period";
  if (context.subscription_status === "expired") return "Dealer access expired";
  if (context.verification_status === "changes_required") return "Verification action required";
  if (context.verification_status === "under_review" || context.verification_status === "submitted") return "Verification under review";
  if (context.verification_status !== "approved") return "Setup in progress";
  return context.showroom_status === "live" ? "Showroom live" : "Showroom ready";
}

export default function DealerShell({ darkMode, toggleTheme, profile, context, section, setSection, onAddVehicle, children }: {
  darkMode: boolean; toggleTheme: () => void; profile: DealerProfile; context: DealerWorkspaceState; section: DealerSection;
  setSection: (section: DealerSection) => void; onAddVehicle: () => void; children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const can = (id: DealerSection) => { const permission = sectionPermission[id]; return !permission || context.permissions.includes(permission as never); };
  const core = CORE_NAV.filter((item) => can(item.id));
  const groups = MORE_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => can(item.id)) })).filter((group) => group.items.length);
  const inMore = groups.some((group) => group.items.some((item) => item.id === section));

  function go(next: DealerSection) { setSection(next); setMoreOpen(false); setSearchOpen(false); }

  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`} data-loadlink-dealer-control-centre="v263-modern">
    <header className={`sticky top-0 z-50 h-[64px] border-b backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/90" : "border-black/10 bg-[#f7f4ec]/92"}`}>
      <div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 sm:px-5">
        <div className="flex items-center gap-1.5"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="pointer-events-auto"><HomeLogoLink className="w-[104px] sm:w-[118px]" /></div></div>
        <div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1480px] px-3 pb-28 pt-3 sm:px-5 lg:grid lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-5 lg:pb-10 lg:pt-5">
      <aside className={`hidden h-[calc(100vh-84px)] self-start overflow-y-auto rounded-2xl border lg:sticky lg:top-[76px] lg:block ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
        <div className="p-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar darkMode={darkMode} profile={profile} />
            <div className="min-w-0"><div className="truncate text-[13px] font-black">{profile.name}</div><div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-semibold opacity-50"><StatusDot context={context} />{statusText(context)}</div></div>
          </div>
        </div>
        <div className="mx-2 border-t border-current/10" />
        <nav className="p-2" aria-label="Dealer dashboard">
          {core.map((item) => <SideButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.label}</SideButton>)}
          <div className="my-2 border-t border-current/10" />
          {groups.map((group) => <div key={group.label} className="mb-2"><div className="px-3 pb-1 pt-2 text-[9px] font-black uppercase tracking-[.12em] opacity-30">{group.label}</div>{group.items.map((item) => <SideButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.label}</SideButton>)}</div>)}
        </nav>
      </aside>

      <div className="min-w-0">
        <div className={`mb-3 rounded-2xl border px-3 py-3 sm:px-4 ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white"}`}>
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden"><Avatar darkMode={darkMode} profile={profile} /></div>
            <div className="min-w-0 flex-1 lg:hidden"><div className="truncate text-[15px] font-black tracking-[-.02em]">{profile.name}</div><div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-semibold opacity-50"><StatusDot context={context} />{statusText(context)}</div></div>
            <div className="hidden min-w-0 flex-1 lg:block"><div className="text-[11px] font-black uppercase tracking-[.1em] opacity-35">Dealer workspace</div></div>
            <button type="button" onClick={() => setSearchOpen((value) => !value)} className={`h-9 rounded-full border px-3 text-[11px] font-black ${darkMode ? "border-white/12 bg-white/[.03]" : "border-black/10 bg-[#faf8f3]"}`}>Search</button>
            <button type="button" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")} className={`hidden h-9 rounded-full border px-3 text-[11px] font-black sm:block ${darkMode ? "border-white/12" : "border-black/10"}`}>{context.showroom_status === "live" ? "Showroom" : "Preview"}</button>
            <button type="button" onClick={onAddVehicle} className="h-9 rounded-full bg-[#f6b800] px-4 text-[11px] font-black text-black">+ Vehicle</button>
          </div>
          {searchOpen ? <div className="mt-3"><DealerGlobalSearch darkMode={darkMode} setSection={go} /></div> : null}
        </div>

        {children}
      </div>
    </div>

    <nav className={`fixed inset-x-0 bottom-0 z-50 border-t px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden ${darkMode ? "border-white/10 bg-[#080808]/95" : "border-black/10 bg-white/95"}`} aria-label="Dealer mobile navigation">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {core.map((item) => <MobileButton key={item.id} active={section === item.id} onClick={() => go(item.id)}>{item.label}</MobileButton>)}
        <div className="relative"><MobileButton active={inMore} onClick={() => setMoreOpen((value) => !value)}>More</MobileButton>{moreOpen ? <div className={`absolute bottom-[60px] right-0 w-[236px] max-h-[62vh] overflow-y-auto rounded-2xl border p-2 shadow-2xl ${darkMode ? "border-white/10 bg-[#111]" : "border-black/10 bg-white"}`}>{groups.map((group) => <div key={group.label} className="mb-1"><div className="px-3 pb-1 pt-2 text-[9px] font-black uppercase tracking-[.1em] opacity-30">{group.label}</div>{group.items.map((item) => <button type="button" key={item.id} onClick={() => go(item.id)} className={`mb-0.5 min-h-10 w-full rounded-xl px-3 text-left text-xs font-black ${section === item.id ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-65"}`}>{item.label}</button>)}</div>)}</div> : null}</div>
      </div>
    </nav>
  </main>;
}

function Avatar({ darkMode, profile }: { darkMode: boolean; profile: DealerProfile }) {
  return <div className={`h-9 w-9 shrink-0 overflow-hidden rounded-full border ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#f7f4ec]"}`}>{profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] font-black">{profile.name.slice(0, 2).toUpperCase()}</div>}</div>;
}
function StatusDot({ context }: { context: DealerWorkspaceState }) { return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${context.showroom_status === "live" && context.subscription_status === "active" ? "bg-emerald-500" : "bg-[#f6b800]"}`} />; }
function SideButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`mb-0.5 flex min-h-9 w-full items-center rounded-xl px-3 text-left text-[12px] font-black transition ${active ? "bg-current/[.08] opacity-100" : "opacity-55 hover:bg-current/[.04] hover:opacity-100"}`}>{children}</button>; }
function MobileButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-[50px] rounded-xl px-1 text-[10px] font-black transition ${active ? "bg-current/[.08] opacity-100" : "opacity-45"}`}>{children}</button>; }
