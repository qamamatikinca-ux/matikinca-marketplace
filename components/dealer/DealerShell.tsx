"use client";

import type { ReactNode } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerGlobalSearch from "./DealerGlobalSearch";
import { PrimaryButton, SecondaryButton } from "./ui";

const sectionPermission: Partial<Record<DealerSection, string>> = {
  inventory: "inventory.read", leads: "leads.read", customers: "customers.read", messages: "messages.read", analytics: "analytics.read", marketing: "marketing.read", team: "team.read", showroom: "showroom.read", verification: "verification.read", billing: "billing.read", reviews: "reviews.read", activity: "activity.read", settings: "showroom.write",
};

const DAILY_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "inventory", label: "Stock" },
  { id: "leads", label: "Sales" },
  { id: "messages", label: "Inbox" },
  { id: "marketing", label: "Updates" },
];

const BUSINESS_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "customers", label: "Customers" }, { id: "analytics", label: "Analytics" }, { id: "showroom", label: "Showroom" }, { id: "team", label: "Team" }, { id: "reviews", label: "Reviews" },
];

const ACCOUNT_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "verification", label: "Verification" }, { id: "billing", label: "Billing" }, { id: "activity", label: "Activity" }, { id: "settings", label: "Settings" }, { id: "support", label: "Support" },
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
  return context.showroom_status === "live" ? "Showroom live" : "Showroom ready to publish";
}

export default function DealerShell({ darkMode, toggleTheme, profile, context, section, setSection, onAddVehicle, onCreateStatus, children }: {
  darkMode: boolean; toggleTheme: () => void; profile: DealerProfile; context: DealerWorkspaceState; section: DealerSection; setSection: (section: DealerSection) => void; onAddVehicle: () => void; onCreateStatus: () => void; children: ReactNode;
}) {
  const can = (id: DealerSection) => { const permission = sectionPermission[id]; return !permission || context.permissions.includes(permission as never); };
  const daily = DAILY_NAV.filter((item) => can(item.id));
  const business = BUSINESS_NAV.filter((item) => can(item.id));
  const account = ACCOUNT_NAV.filter((item) => can(item.id));
  const more = [...business, ...account];

  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`} data-loadlink-dealer-control-centre="v263-modern">
    <header className={`sticky top-0 z-50 h-[64px] border-b backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/90" : "border-black/10 bg-[#f7f4ec]/92"}`}>
      <div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 sm:px-5">
        <div className="flex items-center gap-1.5"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="pointer-events-auto"><HomeLogoLink className="w-[104px] sm:w-[118px]" /></div></div>
        <div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1500px] px-3 pb-24 pt-4 sm:px-5 lg:grid lg:grid-cols-[205px_minmax(0,1fr)] lg:gap-5 lg:pb-10 lg:pt-5">
      <aside className={`hidden h-[calc(100vh-84px)] self-start overflow-y-auto border lg:sticky lg:top-[76px] lg:block ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
        <div className="border-b border-current/10 p-4"><div className="truncate text-sm font-black">{profile.name}</div><div className="mt-1 flex items-center gap-2 text-xs opacity-60"><span className={`h-2 w-2 rounded-full ${context.showroom_status === "live" && context.subscription_status === "active" ? "bg-emerald-500" : "bg-[#f6b800]"}`} />{statusText(context)}</div></div>
        <NavGroup title="Work" items={daily} section={section} setSection={setSection} />
        <NavGroup title="Business" items={business} section={section} setSection={setSection} />
        <NavGroup title="Account" items={account} section={section} setSection={setSection} />
      </aside>

      <div className="min-w-0">
        <section className={`mb-4 border px-4 py-4 sm:px-5 ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-full border ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#f7f4ec]"}`}>{profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black">{profile.name.slice(0, 2).toUpperCase()}</div>}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-[20px] font-black tracking-[-.035em] sm:text-[24px]">{profile.name}</h1>{context.verification_status === "approved" ? <span className="rounded-full border border-current/15 px-2 py-1 text-[10px] font-black">Verified</span> : null}</div><div className="mt-1 text-xs opacity-55">{statusText(context)}{context.renewal_at ? ` · Renews ${new Date(context.renewal_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}` : ""}</div></div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto"><PrimaryButton type="button" onClick={onAddVehicle}>Add vehicle</PrimaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={onCreateStatus}>Post update</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" className="col-span-2 sm:col-auto" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>{context.showroom_status === "live" ? "View showroom" : "Preview showroom"}</SecondaryButton></div>
          </div>
          <div className="mt-4 max-w-xl"><DealerGlobalSearch darkMode={darkMode} setSection={setSection} /></div>
        </section>

        <nav className={`no-scrollbar mb-4 flex gap-1 overflow-x-auto border p-1 lg:hidden ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white"}`} aria-label="Dealer navigation">
          {daily.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-black ${section === item.id ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-58"}`}>{item.label}</button>)}
          <select aria-label="More dealer sections" value={more.some((item) => item.id === section) ? section : ""} onChange={(e) => { if (e.target.value) setSection(e.target.value as DealerSection); }} className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-black ${darkMode ? "border-white/10 bg-[#141414] text-white" : "border-black/10 bg-[#faf8f3] text-black"}`}><option value="">More</option>{more.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </nav>
        {children}
      </div>
    </div>
  </main>;
}

function NavGroup({ title, items, section, setSection }: { title: string; items: Array<{ id: DealerSection; label: string }>; section: DealerSection; setSection: (section: DealerSection) => void }) {
  if (!items.length) return null;
  return <div className="border-b border-current/10 p-2"><div className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.12em] opacity-35">{title}</div>{items.map((item) => <NavButton key={item.id} active={section === item.id} onClick={() => setSection(item.id)}>{item.label}</NavButton>)}</div>;
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`mb-1 flex min-h-10 w-full items-center rounded-lg px-3 text-left text-[13px] font-black transition ${active ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-60 hover:bg-current/[.05] hover:opacity-100"}`}>{children}</button>;
}
