"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { DEALER_MORE_NAV, DEALER_PRIMARY_NAV } from "@/lib/dealer/constants";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { supabase } from "@/lib/supabaseClient";
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
  settings: "settings.read",
};

function statusText(context: DealerWorkspaceState) {
  if (context.account_status === "blocked") return "Account blocked";
  if (context.account_status === "suspended") return "Account suspended";
  if (context.subscription_status === "past_due") return "Payment attention required";
  if (context.subscription_status === "expired") return "Dealer access expired";
  if (context.verification_status === "changes_required") return "Verification changes required";
  if (context.verification_status !== "approved") return "Dealership review in progress";
  return context.showroom_status === "live" ? "Dealer page live" : "Dealer page not public";
}

const groups: Array<{ title: string; ids: DealerSection[] }> = [
  { title: "Business", ids: ["analytics", "customers", "marketing", "reviews"] },
  { title: "Dealership", ids: ["showroom", "team", "verification"] },
  { title: "Account", ids: ["billing", "activity", "settings", "support"] },
];

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
  const [accountOpen, setAccountOpen] = useState(false);
  const account = useLoadLinkAccount();

  const can = (id: DealerSection) => {
    const permission = sectionPermission[id];
    return !permission || context.permissions.includes(permission as never);
  };

  const primary = DEALER_PRIMARY_NAV.filter((item) => can(item.id));
  const more = DEALER_MORE_NAV.filter((item) => can(item.id));
  const moreIds = new Set(more.map((item) => item.id));
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/48" : "text-black/48";
  const adminName = account.profile.full_name || profile.name || "LoadLink dealer";
  const adminEmail = account.user?.email || profile.contact_email || "";
  const initials = useMemo(
    () => adminName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LL",
    [adminName],
  );

  function go(next: DealerSection) {
    setSection(next);
    setMoreOpen(false);
    setAccountOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearActiveAccountState();
    window.location.assign("/");
  }

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`} data-loadlink-dealer-workspace="simple-v1">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <div className="mx-auto w-full max-w-[1380px] px-3 pb-28 pt-4 sm:px-5 lg:pb-10 lg:pt-6">
        <section className={`rounded-[26px] border ${surface}`}>
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#f6b800]/35 bg-current/[.035] text-xs font-black">
                {profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-[-.04em] sm:text-2xl">{profile.name}</h1>
                <p className={`mt-1 text-[10px] font-semibold ${muted}`}>{statusText(context)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrimaryButton type="button" onClick={onAddVehicle}>Add vehicle</PrimaryButton>
              <SecondaryButton darkMode={darkMode} type="button" onClick={() => window.open(`/dealership/${profile.slug}`, "_blank")}>View dealer page</SecondaryButton>
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className={`flex h-11 items-center gap-2 rounded-full border px-2.5 pr-3 ${surface}`}
                aria-expanded={accountOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-black text-[9px] font-black text-[#f6b800]">
                  {account.profile.avatar_url ? <img src={account.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                </span>
                <span className="hidden max-w-[130px] truncate text-[10px] font-black sm:block">{adminName}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-t border-current/10 p-2 no-scrollbar" aria-label="Dealer workspace navigation">
            {primary.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-[11px] font-black transition ${section === item.id ? "bg-[#f6b800] text-black" : "hover:bg-current/[.05]"}`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-[11px] font-black transition ${moreIds.has(section) ? "bg-[#f6b800]/15 text-[#b88600]" : "hover:bg-current/[.05]"}`}
            >
              More
            </button>
          </div>
        </section>

        <div className="mt-4">{children}</div>
      </div>

      <nav className={`fixed inset-x-0 bottom-0 z-50 border-t pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden ${darkMode ? "border-white/10 bg-[#090909]/98" : "border-black/10 bg-white/98"}`} aria-label="Dealer mobile navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2">
          {primary.slice(0, 4).map((item) => (
            <button key={item.id} type="button" onClick={() => go(item.id)} className={`min-h-[54px] rounded-xl text-[10px] font-black ${section === item.id ? "text-[#b88600]" : "opacity-55"}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => setMoreOpen(true)} className={`min-h-[54px] rounded-xl text-[10px] font-black ${moreIds.has(section) || moreOpen ? "text-[#b88600]" : "opacity-55"}`}>More</button>
        </div>
      </nav>

      {moreOpen ? (
        <>
          <button type="button" aria-label="Close dealer menu" className="fixed inset-0 z-[100] bg-black/55" onClick={() => setMoreOpen(false)} />
          <section className={`fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[110] mx-auto max-h-[75vh] max-w-xl overflow-y-auto rounded-[28px] border p-4 shadow-2xl lg:bottom-auto lg:left-1/2 lg:right-auto lg:top-1/2 lg:w-[620px] lg:-translate-x-1/2 lg:-translate-y-1/2 ${surface}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-[-.04em]">More dealer tools</h2>
                <p className={`mt-1 text-[10px] font-semibold ${muted}`}>Advanced tools stay here so daily work remains simple.</p>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} className="h-10 w-10 rounded-full border border-current/10 text-lg font-black">×</button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {groups.map((group) => {
                const items = group.ids.map((id) => more.find((item) => item.id === id)).filter(Boolean) as typeof more;
                if (!items.length) return null;
                return (
                  <div key={group.title}>
                    <p className={`px-1 text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>{group.title}</p>
                    <div className="mt-2 grid gap-1.5">
                      {items.map((item) => (
                        <button key={item.id} type="button" onClick={() => go(item.id)} className={`min-h-11 rounded-xl px-3 text-left text-[11px] font-black ${section === item.id ? "bg-[#f6b800] text-black" : "bg-current/[.035] hover:bg-current/[.06]"}`}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {accountOpen ? (
        <>
          <button type="button" aria-label="Close account menu" className="fixed inset-0 z-[120] bg-transparent" onClick={() => setAccountOpen(false)} />
          <section className={`fixed right-3 top-[82px] z-[130] w-[min(92vw,330px)] rounded-[24px] border p-2 shadow-2xl ${surface}`}>
            <div className="p-3">
              <div className="truncate text-sm font-black">{adminName}</div>
              <div className={`mt-1 truncate text-[10px] font-semibold ${muted}`}>{adminEmail}</div>
            </div>
            <div className="grid gap-1 border-t border-current/10 pt-2">
              <Link href="/account/settings" onClick={() => setAccountOpen(false)} className="rounded-xl px-3 py-3 text-[11px] font-black hover:bg-current/[.04]">Account settings</Link>
              <button type="button" onClick={() => go("showroom")} className="rounded-xl px-3 py-3 text-left text-[11px] font-black hover:bg-current/[.04]">Dealer page</button>
              <button type="button" onClick={() => go("billing")} className="rounded-xl px-3 py-3 text-left text-[11px] font-black hover:bg-current/[.04]">Plan & billing</button>
              <button type="button" onClick={toggleTheme} className="rounded-xl px-3 py-3 text-left text-[11px] font-black hover:bg-current/[.04]">{darkMode ? "Use light mode" : "Use dark mode"}</button>
              <button type="button" onClick={() => void signOut()} className="rounded-xl px-3 py-3 text-left text-[11px] font-black text-red-500 hover:bg-red-500/[.05]">Sign out</button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
