"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { isAuthenticatedUser } from "@/lib/auth";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";

type IconName = "home" | "briefcase" | "contract" | "vehicles" | "drivers" | "help" | "messages" | "posts" | "settings" | "driver" | "dealer" | "packages" | "saved" | "account";
type MenuLink = { label: string; href: string; description: string; icon: IconName };

const marketplaceLinks: MenuLink[] = [
  { label: "Home", href: "/", description: "LoadLink marketplace", icon: "home" },
  { label: "Work", href: "/jobs?portal=job", description: "Logistics work opportunities", icon: "briefcase" },
  { label: "Contracts", href: "/contracts", description: "Recurring and project work", icon: "contract" },
  { label: "Vehicles", href: "/vehicles", description: "Commercial vehicles and units", icon: "vehicles" },
  { label: "Dealerships", href: "/dealerships", description: "Verified business inventory", icon: "dealer" },
  { label: "Drivers", href: "/drivers", description: "Approved drivers for hire", icon: "drivers" },
  { label: "Messages", href: "/messages", description: "Listing and business enquiries", icon: "messages" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance", icon: "help" },
];

const accountLinks: MenuLink[] = [
  { label: "Account hub", href: "/account", description: "All account tools in one place", icon: "account" },
  { label: "My posts", href: "/my-posts", description: "Manage listings and status", icon: "posts" },
  { label: "Saved", href: "/saved", description: "Saved vehicles and opportunities", icon: "saved" },
  { label: "Profile settings", href: "/account/settings", description: "Profile, account and alerts", icon: "settings" },
  { label: "Driver profile", href: "/driver-profile", description: "Create or update your profile", icon: "driver" },
  { label: "Dealership centre", href: "/dealer", description: "Apply and manage stock", icon: "dealer" },
  { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans", icon: "packages" },
];

export default function SiteMenu({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try { setGuestMode(localStorage.getItem("loadlink-guest-mode") === "true"); } catch {}
    if (!isSupabaseConfigured) return;
    let active = true;
    async function applyUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) {
      if (!active) return;
      setSignedIn(isAuthenticatedUser(user));
      setEmail(user?.email || "");
      const metadata = user?.user_metadata || {};
      setAvatar(String(metadata.avatar_url || metadata.picture || ""));
      setName(String(metadata.full_name || metadata.name || ""));
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url,full_name").eq("id", user.id).maybeSingle();
      if (!active || !data) return;
      if (data.avatar_url) setAvatar(String(data.avatar_url));
      if (data.full_name) setName(String(data.full_name));
    }
    void supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => void applyUser(session?.user || null));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const initials = useMemo(() => {
    const source = name || email || "LoadLink";
    return source.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }, [name, email]);

  function continueAsGuest() {
    try { localStorage.setItem("loadlink-guest-mode", "true"); } catch {}
    setGuestMode(true);
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut();
      clearActiveAccountState();
      try { localStorage.removeItem("loadlink-guest-mode"); } catch {}
      window.location.href = "/";
    } finally { setSigningOut(false); }
  }

  const panel = darkMode ? "bg-[#080808] text-white" : "bg-[#f8f5ed] text-black";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const menuUnlocked = signedIn || guestMode;

  const overlay = open ? (
    <div className="fixed inset-0 z-[10000]" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu" />
      <aside className={`absolute inset-y-0 left-0 flex w-[min(94vw,430px)] flex-col border-r shadow-[24px_0_80px_rgba(0,0,0,.28)] ${panel} ${border}`} role="dialog" aria-modal="true" aria-label="LoadLink menu">
        <header className={`border-b px-5 pb-5 pt-4 ${border}`}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="LoadLink home"><img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-9 w-auto" /></Link>
            <button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${border}`} aria-label="Close menu">×</button>
          </div>
          {signedIn ? <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3 ${border} ${darkMode ? "bg-white/[.04]" : "bg-white"}`}>
            <div className="h-12 w-12 overflow-hidden rounded-full bg-black text-[#f6b800]">{avatar ? <img src={avatar} alt="Your profile" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-black">{initials}</span>}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{name || "Your LoadLink account"}</p><p className={`truncate text-xs font-semibold ${muted}`}>{email}</p></div>
            <Link href="/account/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[#f6b800] ring-1 ring-[#f6b800]/45" aria-label="Profile settings"><LoadLinkGearIcon /></Link>
          </div> : null}
        </header>

        {!menuUnlocked ? <div className="flex flex-1 flex-col justify-center px-5 py-8"><div className={`rounded-[24px] border p-6 ${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}><h2 className="text-3xl font-black tracking-[-.04em]">Welcome to LoadLink</h2><p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Sign in to post, message and manage your account, or continue browsing as a guest.</p><Link href="/login" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-black">Sign in or create account</Link><button type="button" onClick={continueAsGuest} className={`mt-3 h-12 w-full rounded-xl border text-xs font-black uppercase tracking-[.12em] ${border}`}>Continue as guest</button></div></div> : <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <MenuSection title="Marketplace" links={marketplaceLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} />
          {signedIn ? <MenuSection title="Account and tools" links={accountLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} /> : <div className={`rounded-2xl border p-4 ${border}`}><p className="text-sm font-black">Browsing as guest</p><p className={`mt-1 text-xs leading-5 ${muted}`}>Sign in when you want to post, follow, message or save account activity.</p><Link href="/login" className="mt-4 flex h-11 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Sign in</Link></div>}
        </div>}
        {signedIn ? <footer className={`border-t p-4 ${border}`}><button type="button" onClick={() => void signOut()} disabled={signingOut} className="h-12 w-full rounded-xl border border-red-500/45 text-xs font-black uppercase tracking-[.12em] text-red-500">{signingOut ? "Signing out…" : "Sign out"}</button></footer> : null}
      </aside>
    </div>
  ) : null;

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`flex h-10 w-10 items-center justify-center ${className}`} aria-label="Open LoadLink menu" aria-expanded={open}><MenuIcon /></button>
    {mounted && overlay ? createPortal(overlay, document.body) : null}
  </>;
}

function MenuSection({ title, links, pathname, darkMode, border, muted }: { title: string; links: MenuLink[]; pathname: string; darkMode: boolean; border: string; muted: string }) {
  return <section className="mb-7"><h2 className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[.18em] ${muted}`}>{title}</h2><div className="grid grid-cols-2 gap-2">{links.map((item) => {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    return <Link key={item.href} href={item.href} className={`min-h-[118px] rounded-2xl border p-4 transition ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : `${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}`}><span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-black text-[#f6b800]" : darkMode ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}><MenuItemIcon name={item.icon} /></span><span className="block text-sm font-black leading-4">{item.label}</span><span className={`mt-2 block text-[10px] font-semibold leading-4 ${active ? "text-black/60" : muted}`}>{item.description}</span></Link>;
  })}</div></section>;
}

function MenuIcon() { return <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>; }
function MenuItemIcon({ name }: { name: IconName }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  switch (name) {
    case "home": return <svg {...common}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "briefcase": return <svg {...common}><path d="M4 7h16v13H4V7Zm5 0V4h6v3M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "contract": return <svg {...common}><path d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "vehicles": return <svg {...common}><path d="M4 15V9l2-4h12l2 4v6M6 15h12M7 15v3M17 15v3M6 11h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7" cy="13" r="1" fill="currentColor" /><circle cx="17" cy="13" r="1" fill="currentColor" /></svg>;
    case "saved": return <svg {...common}><path d="M6 3h12v18l-6-4-6 4V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "account": return <svg {...common}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "drivers": return <svg {...common}><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21a6 6 0 0 1 12 0m1-7a5 5 0 0 1 7 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "help": return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.9.5-1.3 1-1.3 2M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "messages": return <svg {...common}><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "posts": return <svg {...common}><path d="M4 4h16v16H4V4Zm4 5h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "settings": return <LoadLinkGearIcon />;
    case "driver": return <svg {...common}><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "dealer": return <svg {...common}><path d="M3 9h18l-2-5H5L3 9Zm2 0v11h14V9M8 20v-6h8v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    default: return <svg {...common}><path d="M4 7h16v13H4V7Zm4-3h8v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  }
}
