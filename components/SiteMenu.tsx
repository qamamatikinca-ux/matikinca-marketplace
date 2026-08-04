"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";
import LoadLinkLogo from "@/components/LoadLinkLogo";

type IconName = "home" | "briefcase" | "contract" | "drivers" | "help" | "messages" | "notifications" | "posts" | "settings" | "driver" | "dealer" | "packages";
type MenuLink = { label: string; href: string; description: string; icon: IconName };

const marketplaceLinks: MenuLink[] = [
  { label: "Home", href: "/", description: "LoadLink marketplace", icon: "home" },
  { label: "Find jobs", href: "/jobs", description: "Available logistics work", icon: "briefcase" },
  { label: "Find contracts", href: "/contracts", description: "Recurring and project work", icon: "contract" },
  { label: "Driver profiles", href: "/drivers", description: "Approved drivers for hire", icon: "drivers" },
  { label: "Help centre", href: "/help", description: "Support and safety guidance", icon: "help" },
];

export default function SiteMenu({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const account = useLoadLinkAccount();
  const signedIn = Boolean(account.user);
  const { unread: unreadMessages } = useUnreadMessages(signedIn);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { try { setGuestMode(localStorage.getItem("loadlink-guest-mode") === "true"); } catch {} }, []);

  const loadUnreadNotifications = useCallback(async () => {
    if (!isSupabaseConfigured || !account.user?.id) { setUnreadNotifications(null); return; }
    const { count, error } = await supabase.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", account.user.id).eq("is_read", false);
    setUnreadNotifications(error ? null : count || 0);
  }, [account.user?.id]);

  useEffect(() => {
    const userId = account.user?.id;
    if (!userId || !isSupabaseConfigured) { setUnreadNotifications(null); return; }
    void loadUnreadNotifications();
    const channel = supabase.channel(`menu-notifications-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${userId}` }, () => void loadUnreadNotifications()).subscribe();
    const timer = window.setInterval(() => void loadUnreadNotifications(), 300_000);
    const refresh = () => void loadUnreadNotifications();
    window.addEventListener("focus", refresh);
    window.addEventListener("loadlink-notifications-updated", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("loadlink-notifications-updated", refresh);
      void supabase.removeChannel(channel);
    };
  }, [account.user?.id, loadUnreadNotifications]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      window.setTimeout(() => openButtonRef.current?.focus(), 0);
    };
  }, [open]);

  const initials = useMemo(() => {
    const source = account.profile.full_name || account.user?.email || "LoadLink";
    return source.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }, [account.profile.full_name, account.user?.email]);

  const accountLinks = useMemo<MenuLink[]>(() => {
    const dealer = account.dealer;
    const dealerLink: MenuLink = dealer?.verification_status === "approved"
      ? { label: "Dealership centre", href: "/dealer", description: "Manage approved stock", icon: "dealer" }
      : dealer
        ? { label: "Dealership pending", href: "/dealer", description: "Review your application status", icon: "dealer" }
        : { label: "Apply as a dealership", href: "/dealer", description: "Create a dealership application", icon: "dealer" };
    return [
      { label: "Messages", href: "/messages", description: "Your conversations", icon: "messages" },
      { label: "Notifications", href: "/notifications", description: "Reviews, messages and account updates", icon: "notifications" },
      { label: "My posts", href: "/my-posts", description: "Manage your listings", icon: "posts" },
      { label: "Profile settings", href: "/account/settings", description: "Profile, account and alerts", icon: "settings" },
      ...(account.driverProfile ? [{ label: "Driver profile", href: "/driver-profile", description: "Manage your driver profile", icon: "driver" as const }] : []),
      dealerLink,
      { label: "Packages", href: "/packages", description: "Manual, Pro and Dealer plans", icon: "packages" },
    ];
  }, [account.dealer, account.driverProfile]);

  function continueAsGuest() { try { localStorage.setItem("loadlink-guest-mode", "true"); } catch {} setGuestMode(true); }
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
    <div className="fixed inset-0 z-[10000]" role="presentation" data-loadlink-menu-overlay>
      <button type="button" data-loadlink-menu-backdrop className="absolute inset-0 bg-black/65 backdrop-blur-sm outline-none [-webkit-tap-highlight-color:transparent]" onClick={() => setOpen(false)} aria-label="Close menu" />
      <aside ref={panelRef} data-loadlink-menu-panel className={`absolute inset-y-0 left-0 flex w-[min(94vw,430px)] flex-col border-r outline-none shadow-[24px_0_80px_rgba(0,0,0,.28)] ${panel} ${border}`} role="dialog" aria-modal="true" aria-label="LoadLink menu">
        <header className={`border-b px-5 pb-5 pt-4 ${border}`}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="LoadLink home"><LoadLinkLogo theme={darkMode ? "dark" : "light"} showGlow={false} containerClassName="!w-[150px]" className="h-9 w-auto" /></Link>
            <button ref={closeButtonRef} data-loadlink-menu-close type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${border}`} aria-label="Close menu"><CloseIcon /></button>
          </div>
          {signedIn ? (
            <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3 ${border} ${darkMode ? "bg-white/[.04]" : "bg-white"}`}>
              <div className="h-12 w-12 overflow-hidden rounded-full bg-black text-[#f6b800]">{account.profile.avatar_url ? <img src={account.profile.avatar_url} alt="Your profile" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-black">{initials}</span>}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{account.profile.full_name || "Your LoadLink account"}</p><p className={`truncate text-xs font-semibold ${muted}`}>{account.user?.email}</p></div>
              <Link href="/account/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[#f6b800] ring-1 ring-[#f6b800]/45" aria-label="Profile settings"><LoadLinkGearIcon /></Link>
            </div>
          ) : null}
        </header>

        {!menuUnlocked ? (
          <div className="flex flex-1 flex-col justify-center px-5 py-8"><div className={`rounded-[24px] border p-6 ${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}><h2 className="text-3xl font-black tracking-[-.04em]">Welcome to LoadLink</h2><p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Sign in to post, message and manage your account, or continue browsing as a guest.</p><Link href="/login" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-black">Sign in or create account</Link><button type="button" onClick={continueAsGuest} className={`mt-3 h-12 w-full rounded-xl border text-xs font-black uppercase tracking-[.12em] ${border}`}>Continue as guest</button></div></div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <MenuSection title="Marketplace" links={marketplaceLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} />
            {signedIn ? <MenuSection title="Account and tools" links={accountLinks} pathname={pathname} darkMode={darkMode} border={border} muted={muted} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} /> : <div className={`rounded-2xl border p-4 ${border}`}><p className="text-sm font-black">Browsing as guest</p><p className={`mt-1 text-xs leading-5 ${muted}`}>Sign in when you want to post, follow, message or save account activity.</p><Link href="/login" className="mt-4 flex h-11 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Sign in</Link></div>}
          </div>
        )}
        {signedIn ? <footer className={`border-t p-4 ${border}`}><button type="button" onClick={() => void signOut()} disabled={signingOut} className="h-12 w-full rounded-xl border border-red-500/45 text-xs font-black uppercase tracking-[.12em] text-red-500">{signingOut ? "Signing out…" : "Sign out"}</button></footer> : null}
      </aside>
    </div>
  ) : null;

  return <><button ref={openButtonRef} data-loadlink-menu-trigger type="button" onClick={() => setOpen(true)} className={`flex h-10 w-10 items-center justify-center outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${className}`} aria-label="Open LoadLink menu" aria-expanded={open}><MenuIcon /></button>{mounted && overlay ? createPortal(overlay, document.body) : null}</>;
}

function MenuSection({ title, links, pathname, darkMode, border, muted, unreadNotifications = null, unreadMessages = 0 }: { title: string; links: MenuLink[]; pathname: string; darkMode: boolean; border: string; muted: string; unreadNotifications?: number | null; unreadMessages?: number }) {
  return <section className="mb-7"><h2 className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[.18em] ${muted}`}>{title}</h2><div className="grid grid-cols-2 gap-2">{links.map((item, index) => {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    const badge = item.icon === "notifications" ? unreadNotifications : item.icon === "messages" ? unreadMessages : 0;
    const unpaired = links.length % 2 === 1 && index === links.length - 1;
    return <Link key={`${item.href}-${item.label}`} href={item.href} className={`relative min-h-[118px] rounded-2xl border p-4 transition ${unpaired ? "col-span-2" : ""} ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : `${border} ${darkMode ? "bg-white/[.035]" : "bg-white"}`}`}><span className={`relative mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-black text-[#f6b800]" : darkMode ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}><MenuItemIcon name={item.icon} />{typeof badge === "number" && badge > 0 ? <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-[#f6b800] px-1 text-[9px] font-black text-black">{badge > 99 ? "99+" : badge}</span> : null}</span><span className="block text-sm font-black leading-4">{item.label}</span><span className={`mt-2 block text-[10px] font-semibold leading-4 ${active ? "text-black/60" : muted}`}>{item.description}</span></Link>;
  })}</div></section>;
}

function CloseIcon() { return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>; }

function MenuIcon() {
  return (
    <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function MenuItemIcon({ name }: { name: IconName }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "briefcase":
      return <svg {...common}><path d="M4 7h16v13H4V7Zm5 0V4h6v3M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "contract":
      return <svg {...common}><path d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "drivers":
      return <svg {...common}><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21a6 6 0 0 1 12 0m1-7a5 5 0 0 1 7 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "help":
      return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.9.5-1.3 1-1.3 2M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "messages":
      return <svg {...common}><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "notifications":
      return <svg {...common}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "posts":
      return <svg {...common}><path d="M4 4h16v16H4V4Zm4 5h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "settings":
      return <LoadLinkGearIcon />;
    case "driver":
      return <svg {...common}><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "dealer":
      return <svg {...common}><path d="M3 9h18l-2-5H5L3 9Zm2 0v11h14V9M8 20v-6h8v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    default:
      return <svg {...common}><path d="M4 7h16v13H4V7Zm4-3h8v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  }
}
