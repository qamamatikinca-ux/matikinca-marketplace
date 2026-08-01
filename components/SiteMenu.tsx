"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";

type MenuLink = { label: string; href: string; description: string };

const marketplaceLinks: MenuLink[] = [
  { label: "Home", href: "/", description: "LoadLink marketplace" },
  { label: "Find jobs", href: "/jobs", description: "Available logistics work" },
  { label: "Find contracts", href: "/contracts", description: "Recurring and project work" },
  { label: "Driver profiles", href: "/drivers", description: "Approved drivers for hire" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance" },
];

const accountLinks: MenuLink[] = [
  { label: "Messages", href: "/messages", description: "Your conversations" },
  { label: "My posts", href: "/my-posts", description: "Manage your listings" },
  { label: "Profile settings", href: "/account/settings", description: "Profile, account and alerts" },
  { label: "Driver profile", href: "/driver-profile", description: "Create or update your profile" },
  { label: "Dealership centre", href: "/dealer", description: "Manage approved stock" },
  { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans" },
];

export default function SiteMenu({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try { setGuestMode(localStorage.getItem("loadlink-guest-mode") === "true"); } catch {}
    if (!isSupabaseConfigured) return;

    let active = true;
    async function applyUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) {
      if (!active) return;
      setSignedIn(Boolean(user));
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user || null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
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

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`flex h-10 w-10 items-center justify-center ${className}`} aria-label="Open LoadLink menu"><MenuIcon /></button>
    {open ? <div className="fixed inset-0 z-[10000]">
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu" />
      <aside className={`absolute inset-y-0 left-0 flex w-[min(94vw,430px)] flex-col border-r shadow-[24px_0_80px_rgba(0,0,0,.28)] ${panel} ${border}`}>
        <header className={`border-b px-5 pb-5 pt-4 ${border}`}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="LoadLink home"><img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-9 w-auto" /></Link>
            <button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${border}`} aria-label="Close menu">×</button>
          </div>
          {signedIn ? <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3 ${border} ${darkMode ? "bg-white/[.04]" : "bg-white"}`}>
            <div className="h-12 w-12 overflow-hidden rounded-full bg-black text-[#f6b800]">
              {avatar ? <img src={avatar} alt="Your profile" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-black">{initials}</span>}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{name || "Your LoadLink account"}</p><p className={`truncate text-xs font-semibold ${muted}`}>{email}</p></div>
            <Link href="/account/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[#f6b800] ring-1 ring-[#f6b800]/45" aria-label="Profile settings"><LoadLinkGearIcon /></Link>
          </div> : null}
        </header>

        {!menuUnlocked ? <div className="flex flex-1 flex-col justify-center px-5 py-8">
          <div className={`rounded-[24px] border p-6 ${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}>
            <h2 className="text-3xl font-black tracking-[-.04em]">Welcome to LoadLink</h2>
            <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Sign in to post, message and manage your account, or continue browsing as a guest.</p>
            <Link href="/login" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-black">Sign in or create account</Link>
            <button type="button" onClick={continueAsGuest} className={`mt-3 h-12 w-full rounded-xl border text-xs font-black uppercase tracking-[.12em] ${border}`}>Continue as guest</button>
          </div>
        </div> : <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <MenuSection title="Marketplace" links={marketplaceLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} />
          {signedIn ? <MenuSection title="Account and tools" links={accountLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} /> : <div className={`rounded-2xl border p-4 ${border}`}><p className="text-sm font-black">Browsing as guest</p><p className={`mt-1 text-xs leading-5 ${muted}`}>Sign in when you want to post, follow, message or save account activity.</p><Link href="/login" className="mt-4 flex h-11 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Sign in</Link></div>}
        </div>}

        {signedIn ? <footer className={`border-t p-4 ${border}`}><button type="button" onClick={() => void signOut()} disabled={signingOut} className="h-12 w-full rounded-xl border border-red-500/45 text-xs font-black uppercase tracking-[.12em] text-red-500">{signingOut ? "Signing out…" : "Sign out"}</button></footer> : null}
      </aside>
    </div> : null}
  </>;
}

function MenuSection({ title, links, pathname, darkMode, border, muted }: { title: string; links: MenuLink[]; pathname: string; darkMode: boolean; border: string; muted: string }) {
  return <section className="mb-7"><h2 className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[.18em] ${muted}`}>{title}</h2><div className="grid grid-cols-2 gap-2">{links.map((item) => {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    return <Link key={item.href} href={item.href} className={`min-h-[106px] rounded-2xl border p-4 transition ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : `${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}`}><span className="block text-sm font-black leading-4">{item.label}</span><span className={`mt-2 block text-[10px] font-semibold leading-4 ${active ? "text-black/60" : muted}`}>{item.description}</span></Link>;
  })}</div></section>;
}

function MenuIcon() { return <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>; }
