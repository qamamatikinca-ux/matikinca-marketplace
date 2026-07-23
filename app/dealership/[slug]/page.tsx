"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Dealer = { id:string; slug:string; name:string; profile_image_url?:string|null; cover_image_url?:string|null; short_bio?:string|null; business_description?:string|null; physical_location?:string|null; contact_email?:string|null; phone_number?:string|null; whatsapp_number?:string|null; website_url?:string|null; trading_hours?:string|null; year_established?:number|null; verification_status:string; average_response_minutes?:number|null; trust_score?:number|null; is_featured?:boolean; };
type Listing = { id:string; title:string; city:string; rate:string; photos?:string[]|null; stock_status?:string; created_at:string; description?:string|null };
type Update = { id:string; update_type:string; title:string; body:string; image_url?:string|null; created_at:string };

export default function DealershipPublicPage() {
  const params = useParams<{slug:string}>();
  const slug = decodeURIComponent(String(params?.slug || ""));
  const [darkMode,setDarkMode]=useState(false);
  const [dealer,setDealer]=useState<Dealer|null>(null);
  const [listings,setListings]=useState<Listing[]>([]);
  const [updates,setUpdates]=useState<Update[]>([]);
  const [followers,setFollowers]=useState(0);
  const [following,setFollowing]=useState(false);
  const [userId,setUserId]=useState("");
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("available");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  useEffect(()=>{queueMicrotask(()=>setDarkMode(localStorage.getItem("loadlink-theme")==="dark"));},[]);
  useEffect(()=>{ if(!slug)return; void load(); },[slug]);

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    setUserId(isAuthenticatedUser(user)?user.id:"");
    const profile=await supabase.from("dealership_profiles").select("*").eq("slug",slug).maybeSingle();
    if(profile.error || !profile.data){setMessage(profile.error?.message||"This dealership page is not available.");setLoading(false);return;}
    const d=profile.data as Dealer; setDealer(d);
    const [stock,feed,follows]=await Promise.all([
      supabase.from("job_listings").select("id,title,city,rate,photos,stock_status,created_at,description").eq("dealership_id",d.id).eq("listing_kind","vehicle").order("created_at",{ascending:false}),
      supabase.from("dealership_updates").select("id,update_type,title,body,image_url,created_at").eq("dealership_id",d.id).eq("status","approved").order("created_at",{ascending:false}).limit(20),
      supabase.rpc("loadlink_dealership_social_status",{p_dealership_id:d.id}),
    ]);
    setListings((stock.data||[]) as Listing[]); setUpdates((feed.data||[]) as Update[]);
    const social = (follows.data || {}) as { follower_count?: number; is_following?: boolean };
    setFollowers(Number(social.follower_count || 0)); setFollowing(Boolean(social.is_following));
    setLoading(false);
  }

  async function toggleFollow(){
    if(!dealer)return;
    if(!userId){window.location.assign(loginHref(`/dealership/${dealer.slug}`));return;}
    if(following){const result=await supabase.from("dealership_followers").delete().eq("dealership_id",dealer.id).eq("user_id",userId);if(!result.error){setFollowing(false);setFollowers(v=>Math.max(0,v-1));}}
    else{const result=await supabase.from("dealership_followers").insert({dealership_id:dealer.id,user_id:userId});if(!result.error){setFollowing(true);setFollowers(v=>v+1);}}
  }

  async function share(){
    const url=window.location.href;
    try{if(navigator.share)await navigator.share({title:dealer?.name||"LoadLink dealership",url});else{await navigator.clipboard.writeText(url);setMessage("Dealership link copied.");}}catch{}
  }

  async function report(){
    if(!dealer)return;
    if(!userId){window.location.assign(loginHref(`/dealership/${dealer.slug}`));return;}
    const reason=window.prompt("Briefly describe why you are reporting this dealership.");
    if(!reason?.trim())return;
    const result=await supabase.from("dealership_reports").insert({dealership_id:dealer.id,reporter_user_id:userId,reason:reason.trim()});
    setMessage(result.error?result.error.message:"Report submitted for review.");
  }

  const filtered=useMemo(()=>listings.filter(item=>(status==="all"||item.stock_status===status)&&`${item.title} ${item.city} ${item.rate}`.toLowerCase().includes(query.toLowerCase())),[listings,query,status]);
  const surface=darkMode?"border-white/10 bg-[#0b0b0b] text-white":"border-black/10 bg-white text-black";
  const muted=darkMode?"text-white/55":"text-black/55";

  if(loading)return <main className="min-h-screen bg-black text-white"><div className="flex min-h-screen items-center justify-center text-sm font-black uppercase tracking-wide text-[#f6b800]">Loading dealership…</div></main>;
  if(!dealer)return <main className={`min-h-screen p-6 ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}><p className="font-black">{message||"Dealership unavailable"}</p><Link href="/trucks" className="mt-4 inline-block text-[#b88900]">Browse trucks</Link></main>;

  return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}>
    <header className={`sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-xl ${darkMode?"border-white/10 bg-black/90":"border-black/10 bg-[#f4efe3]/90"}`}><div className="mx-auto grid max-w-6xl grid-cols-[40px_1fr_40px] items-center"><Link href="/trucks" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f6b800]">‹</Link><HomeLogoLink theme={darkMode?"dark":"light"}/><AuthStatusButton darkMode={darkMode}/></div></header>

    <section className="relative h-52 overflow-hidden bg-black md:h-72">{dealer.cover_image_url?<img src={dealer.cover_image_url} alt="" className="h-full w-full object-cover opacity-75"/>:<div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(246,184,0,.32),transparent_60%)]"/>}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent"/></section>

    <section className="relative mx-auto max-w-6xl px-5 pb-12">
      <div className="-mt-16 flex flex-col gap-5 md:-mt-20 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end gap-4"><div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#f6b800] bg-black md:h-36 md:w-36">{dealer.profile_image_url?<img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-3xl font-black text-[#f6b800]">{dealer.name.slice(0,2).toUpperCase()}</div>}</div><div className="pb-2"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-[-0.04em] md:text-5xl">{dealer.name}</h1><span className="border border-[#f6b800] bg-[#f6b800] px-2 py-1 text-[10px] font-black uppercase text-black">Verified Dealer</span></div><p className={`mt-2 text-sm font-semibold ${muted}`}>{dealer.short_bio||"Commercial vehicle dealership on LoadLink"}</p></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={()=>void toggleFollow()} className={`rounded-full border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide ${following?"bg-transparent text-[#b88900]":"bg-[#f6b800] text-black"}`}>{following?"Following":"Follow dealership"}</button><button onClick={()=>void share()} className="rounded-full border border-current/20 px-4 py-3 text-xs font-black uppercase">Share</button><button onClick={()=>void report()} className="rounded-full border border-current/20 px-4 py-3 text-xs font-black uppercase">Report</button></div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-4"><Stat label="Active listings" value={String(listings.filter(x=>x.stock_status==="available").length)} surface={surface}/><Stat label="Followers" value={String(followers)} surface={surface}/><Stat label="Response time" value={dealer.average_response_minutes?`About ${dealer.average_response_minutes} min`:"Not available"} surface={surface}/><Stat label="Trust score" value={dealer.trust_score?`${Number(dealer.trust_score).toFixed(1)}/5`:"Verified"} surface={surface}/></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className={`border p-5 ${surface}`}><h2 className="text-2xl font-black">About the dealership</h2><p className={`mt-3 whitespace-pre-line text-sm font-semibold leading-7 ${muted}`}>{dealer.business_description||"No business description has been added yet."}</p><div className="mt-5 grid gap-3 text-sm md:grid-cols-2"><Info label="Location" value={dealer.physical_location||"Not provided"}/><Info label="Trading hours" value={dealer.trading_hours||"Contact dealership"}/><Info label="Established" value={dealer.year_established?String(dealer.year_established):"Not provided"}/><Info label="Email" value={dealer.contact_email||"Not provided"}/></div></section>
        <section className={`border p-5 ${surface}`}><h2 className="text-2xl font-black">Contact</h2><div className="mt-4 grid gap-3">{dealer.whatsapp_number?<a href={`https://wa.me/${dealer.whatsapp_number.replace(/\D/g,"").replace(/^0/,"27")}`} className="flex h-12 items-center justify-center rounded-full bg-[#f6b800] text-xs font-black uppercase text-black">WhatsApp dealership</a>:null}{dealer.phone_number?<a href={`tel:${dealer.phone_number}`} className="flex h-12 items-center justify-center rounded-full border border-[#f6b800] text-xs font-black uppercase text-[#b88900]">Call dealership</a>:null}<Link href={`/messages?dealership=${dealer.id}`} className="flex h-12 items-center justify-center rounded-full border border-current/20 text-xs font-black uppercase">Message on LoadLink</Link>{dealer.website_url?<a target="_blank" rel="noreferrer" href={dealer.website_url} className="text-center text-xs font-black uppercase text-[#b88900]">Visit website</a>:null}</div></section>
      </div>

      {updates.length?<section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[#b88900]">Dealership updates</p><h2 className="mt-1 text-3xl font-black">Latest from {dealer.name}</h2></div></div><div className="flex snap-x gap-4 overflow-x-auto pb-3 no-scrollbar">{updates.map(item=><article key={item.id} className={`min-w-[82%] snap-center border p-5 md:min-w-[360px] ${surface}`}>{item.image_url?<img src={item.image_url} alt="" className="mb-4 aspect-[16/9] w-full object-cover"/>:null}<p className="text-[10px] font-black uppercase tracking-wide text-[#b88900]">{item.update_type.replaceAll("_"," ")}</p><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{item.body}</p><p className={`mt-4 text-xs font-bold ${muted}`}>{date(item.created_at)}</p></article>)}</div></section>:null}

      <section className="mt-9"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[#b88900]">Inventory</p><h2 className="mt-1 text-4xl font-black">All dealership listings</h2></div><div className="grid gap-2 sm:grid-cols-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search dealership stock" className={`h-12 border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}/><select value={status} onChange={e=>setStatus(e.target.value)} className={`h-12 border px-4 text-sm font-bold outline-none ${darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="all">All stock</option></select></div></div>
        {filtered.length?<div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{filtered.map(item=><Link href={`/jobs?listing=${item.id}`} key={item.id} className={`overflow-hidden border ${surface}`}><div className="relative aspect-square bg-black/10">{item.photos?.[0]?<img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center font-black text-[#b88900]">LOADLINK</div>}<span className="absolute left-2 top-2 bg-black/85 px-2 py-1 text-[9px] font-black uppercase text-[#f6b800]">{item.stock_status||"available"}</span></div><div className="p-3"><h3 className="line-clamp-2 text-sm font-black">{item.title}</h3><p className={`mt-1 text-xs font-bold ${muted}`}>{item.city}</p><p className="mt-2 text-sm font-black text-[#b88900]">{item.rate}</p></div></Link>)}</div>:<div className={`mt-5 border p-8 text-center ${surface}`}><p className="font-black">No listings match this search.</p></div>}
      </section>
      {message?<p className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-black px-5 py-3 text-sm font-bold text-white shadow-2xl">{message}</p>:null}
    </section>
  </main>;
}
function Stat({label,value,surface}:{label:string;value:string;surface:string}){return <article className={`border p-4 ${surface}`}><p className="text-[10px] font-black uppercase tracking-wide text-[#b88900]">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>}
function Info({label,value}:{label:string;value:string}){return <div><p className="text-[10px] font-black uppercase tracking-wide text-[#b88900]">{label}</p><p className="mt-1 font-bold">{value}</p></div>}
function date(value:string){return new Date(value).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}
