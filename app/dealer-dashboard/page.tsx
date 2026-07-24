"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const OWNER_EMAIL = "loadlinksouthafrica@gmail.com";

export default function DealerDashboardPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { window.location.href = loginHref("/dealer-dashboard"); return; }
      const owner = user.email?.toLowerCase() === OWNER_EMAIL;
      const result = await supabase.from("dealership_profiles").select("*").eq("owner_user_id", user.id).maybeSingle();
      setProfile((result.data as Record<string, unknown> | null) || null);
      setAllowed(owner || Boolean(result.data));
      setReady(true);
    }
    void load();
  }, []);
  if (!ready) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;
  if (!allowed) return <main className="min-h-screen bg-[#f4efe3] p-6"><div className="mx-auto mt-20 max-w-xl rounded-3xl border border-black/10 bg-white p-7"><h1 className="text-3xl font-black">Dealer access required</h1><p className="mt-3 text-sm leading-6 text-black/55">This dashboard is available to approved Dealer-package accounts.</p><Link href="/packages" className="mt-5 inline-flex rounded-xl bg-black px-5 py-3 text-xs font-black uppercase text-[#f6b800]">View packages</Link></div></main>;
  const dealershipName = String(profile?.display_name || "LoadLink Test Dealership");
  return (
    <main className="min-h-screen bg-[#f4efe3] text-black">
      <header className="border-b border-black/10 bg-white"><div className="grid h-20 grid-cols-[110px_1fr_110px] items-center px-4"><Link href="/" className="text-xs font-black uppercase">Home</Link><HomeLogoLink theme="light"/><Link href="/dealership/truckstore-centurion-demo" className="justify-self-end text-xs font-black uppercase">Public page</Link></div></header>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9d7300]">Dealer control panel</p><h1 className="mt-2 text-5xl font-black tracking-[-0.055em]">{dealershipName}</h1><p className="mt-3 text-sm text-black/55">Manage stock, leads, followers, promotions and public dealership visibility.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Active stock','12'],['New leads','7'],['Profile followers','1 824'],['Views this month','8 460']].map(([label,value]) => <div key={label} className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong></div>)}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {[['Inventory management','Add, edit, archive and monitor every dealership vehicle.'],['Lead inbox','Keep enquiries together and assign them to sales staff.'],['Dealer promotions','Publish updates and promote selected vehicles to followers.'],['Team access','Give sales staff controlled access without sharing the owner login.'],['Performance analytics','Track showroom views, vehicle interest and response performance.'],['Public showroom','Control branding, contact details, business hours and stock order.']].map(([title,copy]) => <article key={title} className="rounded-[24px] border border-black/10 bg-white p-6"><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-black/55">{copy}</p><button className="mt-5 rounded-xl border border-[#f6b800] px-4 py-2 text-xs font-black uppercase text-[#8a6500]">Open</button></article>)}
        </div>
      </section>
    </main>
  );
}
