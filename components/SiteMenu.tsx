"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type MenuLink = {
  label: string;
  href: string;
  description: string;
  icon: "home" | "jobs" | "truck" | "contract" | "driver" | "message" | "posts" | "settings" | "dealer" | "package" | "help" | "network";
};

const marketplaceLinks: MenuLink[] = [
  { label: "Home", href: "/", description: "Main LoadLink marketplace", icon: "home" },
  { label: "Jobs", href: "/jobs", description: "Work for truck and mobile-unit owners", icon: "jobs" },
  { label: "Trucks", href: "/trucks", description: "Vehicles and mobile units", icon: "truck" },
  { label: "Contracts", href: "/contracts", description: "Recurring and project work", icon: "contract" },
  { label: "Drivers", href: "/drivers", description: "Approved drivers for hire", icon: "driver" },
  { label: "Featured dealership", href: "/dealership/loadlink-commercial-centurion", description: "View the dealer showroom", icon: "dealer" },
];

const accountLinks: MenuLink[] = [
  { label: "Messages", href: "/messages", description: "Your conversations", icon: "message" },
  { label: "My posts", href: "/my-posts", description: "Manage and resubmit posts", icon: "posts" },
  { label: "Profile settings", href: "/account/settings", description: "Account, profile and alerts", icon: "settings" },
  { label: "Driver profile", href: "/driver-profile", description: "Apply for driver opportunities", icon: "driver" },
  { label: "Dealership centre", href: "/dealer", description: "Manage approved dealership stock", icon: "dealer" },
  { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans", icon: "package" },
  { label: "Your network", href: "/#followed-network", description: "People and businesses you follow", icon: "network" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance", icon: "help" },
];

export default function SiteMenu({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setEmail(data.user?.email || "");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      setEmail(session?.user?.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "LL"), [email]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut();
      clearActiveAccountState();
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  }

  const panel = darkMode ? "bg-[#080808] text-white" : "bg-[#f8f5ed] text-black";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`flex h-10 w-10 items-center justify-center ${className}`} aria-label="Open LoadLink menu" aria-expanded={open}>
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10000]">
          <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close LoadLink menu" />
          <aside className={`absolute inset-y-0 left-0 flex w-[min(94vw,430px)] flex-col border-r shadow-[24px_0_80px_rgba(0,0,0,.28)] ${panel} ${border}`} role="dialog" aria-modal="true" aria-label="LoadLink navigation">
            <header className={`border-b px-5 pb-5 pt-4 ${border}`}>
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-3" aria-label="LoadLink home">
                  <img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-9 w-auto object-contain" />
                </Link>
                <button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${border}`} aria-label="Close menu">×</button>
              </div>

              <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3 ${border} ${darkMode ? "bg-white/[.04]" : "bg-white"}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-[#f6b800]">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{signedIn ? "Your LoadLink account" : "Welcome to LoadLink"}</p>
                  <p className={`mt-0.5 truncate text-xs font-semibold ${muted}`}>{signedIn ? email : "Sign in to post, follow and message"}</p>
                </div>
                <Link href={signedIn ? "/account/settings" : "/login"} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-label={signedIn ? "Open settings" : "Sign in"}><GearIcon /></Link>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <MenuSection title="Marketplace" links={marketplaceLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} />
              <MenuSection title="Account and tools" links={accountLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} />
            </div>

            <footer className={`border-t p-4 ${border}`}>
              {signedIn ? (
                <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex h-12 w-full items-center justify-center rounded-xl border border-red-500/45 text-xs font-black uppercase tracking-[.12em] text-red-500 disabled:opacity-50">{signingOut ? "Signing out…" : "Sign out"}</button>
              ) : (
                <Link href="/login" className="flex h-12 w-full items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.12em] text-black">Log in or sign up</Link>
              )}
              <p className={`mt-3 text-center text-[11px] font-semibold ${muted}`}>loadlinksouthafrica@gmail.com</p>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MenuSection({ title, links, pathname, darkMode, border, muted }: { title: string; links: MenuLink[]; pathname: string; darkMode: boolean; border: string; muted: string }) {
  return (
    <section className="mb-7">
      <h2 className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[.18em] ${muted}`}>{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {links.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && !item.href.includes("#") && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`min-h-[112px] rounded-2xl border p-3 transition ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : `${border} ${darkMode ? "bg-white/[.035] hover:bg-white/[.07]" : "bg-white hover:border-[#f6b800]"}`}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-black text-[#f6b800]" : darkMode ? "bg-white/10" : "bg-black/[.05]"}`}><NavIcon type={item.icon} /></span>
              <span className="mt-3 block text-sm font-black leading-4">{item.label}</span>
              <span className={`mt-1.5 block text-[10px] font-semibold leading-4 ${active ? "text-black/60" : muted}`}>{item.description}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MenuIcon() { return <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>; }
function GearIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9.5 4h5l.6 2a7 7 0 0 1 1.6.9l2-.5 2.5 4.3-1.4 1.5v1.7l1.4 1.5-2.5 4.3-2-.5a7 7 0 0 1-1.6.9l-.6 2h-5l-.6-2a7 7 0 0 1-1.6-.9l-2 .5-2.5-4.3 1.4-1.5v-1.7l-1.4-1.5 2.5-4.3 2 .5A7 7 0 0 1 8.9 6l.6-2Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="13" r="2.7" stroke="currentColor" strokeWidth="1.7"/></svg>; }
function NavIcon({ type }: { type: MenuLink["icon"] }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none" };
  if (type === "home") return <svg {...common}><path d="m4 11 8-7 8 7v9H4v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9.5 20v-6h5v6" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (type === "jobs") return <svg {...common}><path d="M5 7h14v13H5V7Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 7V4h6v3M5 12h14" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (type === "truck") return <svg {...common}><path d="M3 6h11v11H3V6Zm11 4h4l3 3v4h-7v-7Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (type === "contract") return <svg {...common}><path d="M7 3h8l3 3v15H7V3Z" stroke="currentColor" strokeWidth="1.8"/><path d="M10 10h5M10 14h5M10 18h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "driver") return <svg {...common}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "message") return <svg {...common}><path d="M4 5h16v12H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "posts") return <svg {...common}><path d="M5 4h14v16H5V4Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === "settings") return <GearIcon />;
  if (type === "dealer") return <svg {...common}><path d="M4 10h16v10H4V10Z" stroke="currentColor" strokeWidth="1.8"/><path d="m3 10 2-6h14l2 6M8 20v-5h4v5" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (type === "package") return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z" stroke="currentColor" strokeWidth="1.8"/><path d="m4 7v10l8 4 8-4V7M12 11v10" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (type === "network") return <svg {...common}><circle cx="7" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M2.5 20c.5-4 2-6 4.5-6s4 2 4.5 6M12.5 20c.5-4 2-6 4.5-6s4 2 4.5 6" stroke="currentColor" strokeWidth="1.8"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 1.8M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
