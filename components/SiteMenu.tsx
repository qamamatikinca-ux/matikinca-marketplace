"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type MenuLink = {
  label: string;
  href: string;
  description: string;
};

const primaryLinks: MenuLink[] = [
  { label: "Home", href: "/", description: "Return to the LoadLink homepage" },
  { label: "Available jobs", href: "/jobs", description: "Browse paid logistics work" },
  { label: "Available trucks", href: "/trucks", description: "Browse vehicles and mobile units" },
  { label: "Contracts", href: "/contracts", description: "Browse logistics contracts" },
  { label: "Drivers available for work", href: "/drivers", description: "View approved driver profiles" },
];

const accountLinks: MenuLink[] = [
  { label: "Messages", href: "/messages", description: "Open your LoadLink conversations" },
  { label: "My posts", href: "/my-posts", description: "Edit and manage your listings" },
  { label: "Profile settings", href: "/account/settings", description: "Manage your profile, privacy and notifications" },
  { label: "Driver profile", href: "/driver-profile", description: "Create or update your work profile" },
  { label: "Dealership centre", href: "/dealer", description: "Manage an approved dealership" },
  { label: "Packages", href: "/packages", description: "Review LoadLink package options" },
  { label: "Help centre", href: "/help", description: "Get support and safety guidance" },
];

export default function SiteMenu({
  darkMode,
  className = "",
}: {
  darkMode: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut();
      clearActiveAccountState();
      setSignedIn(false);
      setOpen(false);
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  }

  const panel = darkMode ? "bg-[#080808] text-white" : "bg-[#fffaf0] text-black";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-10 w-10 items-center justify-center ${className}`}
        aria-label="Open LoadLink menu"
        aria-expanded={open}
      >
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10000]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close LoadLink menu"
          />
          <aside className={`absolute inset-y-0 left-0 flex w-[min(92vw,390px)] flex-col border-r shadow-2xl ${panel} ${border}`} role="dialog" aria-modal="true" aria-label="LoadLink menu">
            <header className={`flex min-h-20 items-center justify-between border-b px-5 ${border}`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b88900]">LoadLink</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Menu</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center border text-2xl font-black ${border}`} aria-label="Close menu">×</button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <MenuSection title="Explore" links={primaryLinks} pathname={pathname} border={border} muted={muted} />
              <MenuSection title="Your LoadLink" links={accountLinks} pathname={pathname} border={border} muted={muted} />

              <div className={`mt-6 border-t pt-5 ${border}`}>
                {signedIn ? (
                  <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex min-h-12 w-full items-center justify-center border border-red-500/40 px-4 text-xs font-black uppercase tracking-[0.14em] text-red-500 disabled:opacity-50">
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                ) : (
                  <Link href="/login" className="flex min-h-12 w-full items-center justify-center bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[0.14em] text-black">Log in or sign up</Link>
                )}
              </div>
            </div>

            <footer className={`border-t px-5 py-4 text-xs font-semibold ${border} ${muted}`}>
              loadlinksouthafrica@gmail.com
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MenuSection({ title, links, pathname, border, muted }: { title: string; links: MenuLink[]; pathname: string; border: string; muted: string }) {
  return (
    <section className="mb-7">
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#b88900]">{title}</p>
      <div className={`border-y ${border}`}>
        {links.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`flex items-center justify-between gap-4 border-b px-2 py-4 last:border-b-0 ${border} ${active ? "bg-[#f6b800] text-black" : ""}`}>
              <span className="min-w-0">
                <span className="block text-sm font-black">{item.label}</span>
                <span className={`mt-1 block text-[11px] font-semibold leading-4 ${active ? "text-black/60" : muted}`}>{item.description}</span>
              </span>
              <span className="text-xl font-black" aria-hidden="true">›</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
