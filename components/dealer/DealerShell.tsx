"use client";

import { useState, type ReactNode } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerGlobalSearch from "./DealerGlobalSearch";

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

const CORE: Array<{ id: DealerSection; label: string; icon: NavIcon }> = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "inventory", label: "Stock", icon: "stock" },
  { id: "leads", label: "Sales", icon: "sales" },
  { id: "messages", label: "Inbox", icon: "inbox" },
];

const MORE: Array<{ id: DealerSection; label: string; group: string }> = [
  { id: "showroom", label: "Dealer page", group: "Dealership" },
  { id: "marketing", label: "Status & updates", group: "Dealership" },
  { id: "customers", label: "Customers", group: "Sales" },
  { id: "analytics", label: "Performance", group: "Sales" },
  { id: "reviews", label: "Reviews", group: "Sales" },
  { id: "team", label: "Team", group: "Business" },
  { id: "activity", label: "Activity", group: "Business" },
  { id: "verification", label: "Verification", group: "Account" },
  { id: "billing", label: "Billing", group: "Account" },
  { id: "settings", label: "Settings", group: "Account" },
  { id: "support", label: "Support", group: "Account" },
];

type NavIcon = "home" | "stock" | "sales" | "inbox" | "more";

function statusText(context: DealerWorkspaceState) {
  if (context.account_status === "blocked") return "Account blocked";
  if (context.account_status === "suspended") return "Account suspended";
  if (context.subscription_status === "past_due") return "Payment attention required";
  if (context.verification_status === "changes_required") return "Verification needs attention";
  if (context.verification_status !== "approved") return "Setup in progress";
  return context.showroom_status === "live" ? "Live on LoadLink" : "Ready to publish";
}

export default function DealerShell({
  darkMode,
  toggleTheme,
  profile,
  context,
  section,
  setSection,
  onAddVehicle,
  children,
}: {
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
  const [searchOpen, setSearchOpen] = useState(false);

  const can = (id: DealerSection) => {
    const permission = sectionPermission[id];
    return !permission || context.permissions.includes(permission as never);
  };
  const core = CORE.filter((item) => can(item.id));
  const more = MORE.filter((item) => can(item.id));
  const moreActive = more.some((item) => item.id === section);
  const groups = ["Dealership", "Sales", "Business", "Account"];

  const go = (next: DealerSection) => {
    setSection(next);
    setMoreOpen(false);
    setSearchOpen(false);
  };

  return (
    <main
      className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f3efe6] text-black"}`}
      data-loadlink-dealer-control-centre="modern-v3"
    >
      <header
        className={`sticky top-0 z-50 h-[62px] border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-black/92"
            : "border-black/10 bg-[#f8f5ee]/95"
        }`}
      >
        <div className="relative mx-auto flex h-full max-w-[1460px] items-center px-3 sm:px-5">
          <div className="flex items-center gap-1">
            <SiteMenu darkMode={darkMode} />
            <div className="hidden sm:block">
              <AuthStatusButton darkMode={darkMode} />
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="pointer-events-auto">
              <HomeLogoLink className="w-[108px] sm:w-[118px]" />
            </div>
          </div>

          <div className="ml-auto">
            <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1460px] px-3 pb-[92px] pt-3 sm:px-5 lg:grid lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-4 lg:pb-10 lg:pt-5">
        <aside
          className={`hidden h-[calc(100vh-82px)] self-start overflow-hidden rounded-[18px] border lg:sticky lg:top-[74px] lg:block ${
            darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/[.08] bg-white"
          }`}
        >
          <div className="flex items-center gap-2.5 border-b border-current/10 p-3">
            <Avatar darkMode={darkMode} profile={profile} />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-black">{profile.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[9px] font-semibold opacity-45">
                <Dot context={context} />
                {statusText(context)}
              </div>
            </div>
          </div>

          <nav className="p-2">
            {core.map((item) => (
              <Side key={item.id} active={section === item.id} onClick={() => go(item.id)} icon={item.icon}>
                {item.label}
              </Side>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              className={`mt-1 flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[11px] font-black transition ${
                moreActive ? "bg-current/[.07]" : "opacity-50 hover:bg-current/[.04] hover:opacity-100"
              }`}
            >
              <NavGlyph kind="more" />
              <span className="flex-1">More</span>
              <span className="opacity-35">{moreOpen || moreActive ? "−" : "+"}</span>
            </button>

            {moreOpen || moreActive ? (
              <div className="mt-2 max-h-[calc(100vh-340px)] overflow-y-auto border-t border-current/10 pt-1">
                {groups.map((group) => {
                  const items = more.filter((item) => item.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group} className="mb-1">
                      <div className="px-3 pb-1 pt-2 text-[8px] font-black uppercase tracking-[.1em] opacity-25">
                        {group}
                      </div>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => go(item.id)}
                          className={`mb-0.5 min-h-9 w-full rounded-lg px-3 text-left text-[10px] font-black transition ${
                            section === item.id
                              ? "bg-current/[.07]"
                              : "opacity-48 hover:bg-current/[.035] hover:opacity-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0">
          <div
            className={`mb-3 rounded-[18px] border px-3 py-2.5 ${
              darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/[.08] bg-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="lg:hidden">
                <Avatar darkMode={darkMode} profile={profile} />
              </div>
              <div className="min-w-0 flex-1 lg:hidden">
                <div className="truncate text-[13px] font-black">{profile.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-[9px] font-semibold opacity-45">
                  <Dot context={context} />
                  {statusText(context)}
                </div>
              </div>
              <div className="hidden min-w-0 flex-1 lg:block">
                <div className="text-[9px] font-black uppercase tracking-[.12em] opacity-30">
                  Dealer workspace
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                aria-label="Search dealership workspace"
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-black transition ${
                  searchOpen ? "bg-current/[.06]" : ""
                } ${darkMode ? "border-white/10" : "border-black/10"}`}
              >
                <SearchIcon />
                <span className="hidden sm:inline">Search</span>
              </button>
              <button
                type="button"
                onClick={onAddVehicle}
                aria-label="Add vehicle"
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#f6b800] px-2.5 text-[10px] font-black text-black transition active:scale-[.97] sm:px-3"
              >
                <span className="text-sm leading-none">＋</span>
                <span className="hidden sm:inline">Add vehicle</span>
              </button>
            </div>

            {searchOpen ? (
              <div className="mt-2 border-t border-current/10 pt-2">
                <DealerGlobalSearch darkMode={darkMode} setSection={go} />
              </div>
            ) : null}
          </div>

          {children}
        </div>
      </div>

      {moreOpen ? (
        <button
          type="button"
          aria-label="Close More menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-[55] bg-black/35 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      {moreOpen ? (
        <section
          className={`fixed inset-x-3 bottom-[76px] z-[60] max-h-[66dvh] overflow-y-auto rounded-[22px] border p-2.5 shadow-2xl lg:hidden ${
            darkMode ? "border-white/10 bg-[#101010]" : "border-black/10 bg-white"
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <div>
              <div className="text-[13px] font-black">More</div>
              <div className="text-[9px] font-semibold opacity-35">Dealership tools and settings</div>
            </div>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="h-8 w-8 rounded-full border border-current/10 text-sm font-black"
            >
              ×
            </button>
          </div>
          {groups.map((group) => {
            const items = more.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mt-1 border-t border-current/10 pt-1.5">
                <div className="px-2 pb-1 pt-1 text-[8px] font-black uppercase tracking-[.1em] opacity-30">
                  {group}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={`min-h-11 rounded-xl px-3 py-2 text-left text-[10px] font-black ${
                        section === item.id ? "bg-[#f6b800] text-black" : "bg-current/[.045]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <nav
        className={`fixed inset-x-0 bottom-0 z-[70] border-t px-2 pb-[max(7px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden ${
          darkMode ? "border-white/10 bg-[#080808]/96" : "border-black/10 bg-white/96"
        }`}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {core.map((item) => (
            <Mobile
              key={item.id}
              active={section === item.id}
              onClick={() => go(item.id)}
              icon={item.icon}
            >
              {item.label}
            </Mobile>
          ))}
          <Mobile
            active={moreActive || moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
            icon="more"
          >
            More
          </Mobile>
        </div>
      </nav>
    </main>
  );
}

function Avatar({ darkMode, profile }: { darkMode: boolean; profile: DealerProfile }) {
  return (
    <div
      className={`h-9 w-9 shrink-0 overflow-hidden rounded-full border ${
        darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-[#f7f4ec]"
      }`}
    >
      {profile.profile_image_url ? (
        <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[9px] font-black">
          {profile.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function Dot({ context }: { context: DealerWorkspaceState }) {
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        context.showroom_status === "live" && context.subscription_status === "active"
          ? "bg-emerald-500"
          : "bg-[#f6b800]"
      }`}
    />
  );
}

function Side({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: NavIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[11px] font-black transition ${
        active ? "bg-current/[.075]" : "opacity-50 hover:bg-current/[.04] hover:opacity-100"
      }`}
    >
      <NavGlyph kind={icon} />
      {children}
    </button>
  );
}

function Mobile({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: NavIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9px] font-black transition ${
        active ? "opacity-100" : "opacity-42"
      }`}
    >
      {active ? <span className="absolute top-0 h-[2px] w-5 rounded-full bg-[#f6b800]" /> : null}
      <NavGlyph kind={icon} />
      <span>{children}</span>
    </button>
  );
}

function NavGlyph({ kind }: { kind: NavIcon }) {
  const cls = "h-[18px] w-[18px]";
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z" />
      </svg>
    );
  }
  if (kind === "stock") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h16l-1.5-3h-13L4 8Zm1 0v10h14V8M8 18v-5h8v5" />
      </svg>
    );
  }
  if (kind === "sales") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18V9m7 9V5m7 13v-6" />
        <path d="M3 20h18" />
      </svg>
    );
  }
  if (kind === "inbox") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v12H9l-5 3V5Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
