"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Profile = { full_name?: string; avatar_url?: string; verification_status?: string; subscription_plan?: string; role?: string };

const cards = [
  ["My posts", "Manage listings, review status, analytics and renewals.", "/my-posts"],
  ["Saved", "Return to vehicles, jobs and profiles you saved.", "/saved"],
  ["Saved searches", "Reopen vehicle filters and manage matching-stock alerts.", "/account/saved-searches"],
  ["Messages", "Continue listing and dealership conversations.", "/messages"],
  ["Verification", "Review your identity and trust status.", "/verification-status"],
  ["Packages", "View plan limits, payments and package history.", "/account/packages"],
  ["Driver profile", "Create or update your professional driver profile.", "/driver-profile"],
  ["Dealership centre", "Apply, publish approved stock and manage leads.", "/dealer"],
  ["Settings", "Update profile, theme and communication preferences.", "/account/settings"],
] as const;

export default function AccountHubPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const user = data.user;
      if (!isAuthenticatedUser(user)) { setSignedIn(false); return; }
      setSignedIn(true);
      const [profileResult, unreadResult] = await Promise.all([
        supabase.from("profiles").select("full_name,avatar_url,verification_status,subscription_plan,role").eq("id", user.id).maybeSingle(),
        supabase.rpc("get_unread_chat_count"),
      ]);
      if (active) { setProfile(profileResult.data || { full_name: user.user_metadata?.full_name || user.email || "LoadLink member" }); setUnread(Number(unreadResult.data || 0)); }
    });
    return () => { active = false; };
  }, []);

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  if (signedIn === false) return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="mx-auto max-w-xl px-5 py-16 text-center"><h1 className="text-4xl font-black">Your LoadLink account</h1><p className={`mt-4 text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Sign in to manage listings, messages, packages, verification and professional profiles from one place.</p><Link href={loginHref("/account")} className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Sign in</Link></section><ProfessionalFooter darkMode={darkMode} /></main>;

  return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="px-5 py-10 md:px-12"><div className="mx-auto max-w-7xl"><div className={`rounded-[26px] border p-6 md:p-8 ${surface}`}><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Account hub</p><div className="mt-4 flex flex-wrap items-center gap-4"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-xl font-black text-[#f6b800]">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : String(profile?.full_name || "L").slice(0, 2).toUpperCase()}</div><div><h1 className="text-3xl font-black md:text-5xl">{profile?.full_name || "Loading your account…"}</h1><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">{profile?.subscription_plan || "Standard"}</span><span className="rounded-full border border-current/15 px-3 py-1 text-[10px] font-black uppercase">{profile?.verification_status || "Not verified"}</span>{unread ? <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase text-red-600">{unread} unread message{unread === 1 ? "" : "s"}</span> : null}</div></div></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([title, body, href]) => <Link href={href} key={href} className={`rounded-[22px] border p-5 transition hover:-translate-y-0.5 hover:border-[#f6b800] ${surface}`}><h2 className="text-xl font-black">{title}</h2><p className={`mt-2 text-sm leading-6 ${darkMode ? "text-white/50" : "text-black/50"}`}>{body}</p><span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">Open →</span></Link>)}</div></div></section><ProfessionalFooter darkMode={darkMode} /></main>;
}
