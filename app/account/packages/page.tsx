"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Subscription = { id:string; plan_code:string; status:string; starts_at?:string|null; renews_at?:string|null; ends_at?:string|null; created_at:string };
type Manual = { id:string; days:number; amount_cents:number; status:string; created_at:string; paid_at?:string|null };
type Access = { id:string; expires_at:string; consumed_at?:string|null; consumed_listing_id?:string|null };
type Bill = { id:string; item_type:string; item_code?:string|null; amount_cents:number; status:string; reference?:string|null; created_at:string };

export default function PackageStatusPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription|null>(null);
  const [manual, setManual] = useState<Manual[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [billing, setBilling] = useState<Bill[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => setDarkMode(localStorage.getItem("loadlink-theme") === "dark"));
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { window.location.assign(loginHref("/account/packages")); return; }
      const [subs, manualRows, accessRows, billRows] = await Promise.all([
        supabase.from("user_subscriptions").select("*").order("created_at",{ascending:false}).limit(1),
        supabase.from("manual_listing_payments").select("*").order("created_at",{ascending:false}).limit(20),
        supabase.from("listing_access_periods").select("*").order("created_at",{ascending:false}).limit(20),
        supabase.from("billing_history").select("*").order("created_at",{ascending:false}).limit(30),
      ]);
      const firstError = [subs.error,manualRows.error,accessRows.error,billRows.error].find(Boolean);
      if (firstError) setMessage(firstError.message);
      setSubscription((subs.data?.[0] as Subscription|undefined)||null);
      setManual((manualRows.data||[]) as Manual[]);
      setAccess((accessRows.data||[]) as Access[]);
      setBilling((billRows.data||[]) as Bill[]);
      setLoading(false);
    })();
  }, []);

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const activeAccess = access.find((row)=>!row.consumed_at && new Date(row.expires_at)>new Date());
  const currentName = subscription?.status === "active" ? subscription.plan_code === "dealer" ? "Dealer" : "Pro" : activeAccess ? "Manual listing" : "No active vehicle package";
  const photoLimit = subscription?.status === "active" ? 15 : activeAccess ? 5 : 0;
  const messageLimit = subscription?.status === "active" ? "Unlimited" : activeAccess ? "50 per day" : "No vehicle listing access";

  return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}>
    <header className={`border-b px-4 py-3 ${darkMode?"border-white/10 bg-black":"border-black/10 bg-[#f4efe3]"}`}><div className="mx-auto grid max-w-5xl grid-cols-[40px_1fr_40px] items-center"><Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f6b800]">‹</Link><HomeLogoLink theme={darkMode?"dark":"light"}/><span/></div></header>
    <section className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b88900]">Account package</p><h1 className="mt-2 text-5xl font-black tracking-[-0.06em]">Your LoadLink access</h1>
      {loading?<p className={`mt-7 ${muted}`}>Loading package details…</p>:<>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Card surface={surface} label="Current package" value={currentName}/><Card surface={surface} label="Photo allowance" value={String(photoLimit)}/><Card surface={surface} label="Messages" value={messageLimit}/>
        </div>
        <section className={`mt-5 border p-5 ${surface}`}><div className="grid gap-4 md:grid-cols-3"><Detail label="Status" value={subscription?.status === "active" || activeAccess ? "Active" : "Inactive"}/><Detail label="Start date" value={subscription?.starts_at?date(subscription.starts_at):activeAccess?"Paid manual access":"—"}/><Detail label="Renewal or expiry" value={subscription?.renews_at?date(subscription.renews_at):activeAccess?date(activeAccess.expires_at):"—"}/></div><div className="mt-5 flex flex-wrap gap-3"><Link href="/packages" className="rounded-full bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-black">Upgrade</Link><Link href="/list-your-truck" className="rounded-full border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#b88900]">List a vehicle</Link></div></section>
        <section className={`mt-5 overflow-hidden border ${surface}`}><div className="border-b border-current/10 p-5"><h2 className="text-2xl font-black">Billing history</h2></div>{billing.length?<div className="divide-y divide-current/10">{billing.map(row=><div key={row.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto_auto]"><div><p className="font-black">{row.item_type.replaceAll("_"," ")}{row.item_code?` — ${row.item_code}`:""}</p><p className={`mt-1 text-xs ${muted}`}>{row.reference||"No reference"} · {date(row.created_at)}</p></div><strong>R{(row.amount_cents/100).toFixed(2)}</strong><span className="text-xs font-black uppercase text-[#b88900]">{row.status}</span></div>)}</div>:<p className={`p-5 text-sm ${muted}`}>No package payments yet.</p>}</section>
        {manual.length?<p className={`mt-4 text-xs ${muted}`}>Manual payment records: {manual.length}</p>:null}
      </>}
      {message?<p className="mt-5 border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold">{message}</p>:null}
    </section>
  </main>;
}
function Card({surface,label,value}:{surface:string;label:string;value:string}){return <article className={`border p-5 ${surface}`}><p className="text-xs font-black uppercase tracking-wide text-[#b88900]">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>}
function Detail({label,value}:{label:string;value:string}){return <div><p className="text-[10px] font-black uppercase tracking-wide text-[#b88900]">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>}
function date(value:string){return new Date(value).toLocaleString("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
