"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PublicStatus = {
  id: string; dealership_id: string; content_type: "photo"|"video"|"vehicle"|"text"|"promotion";
  title?: string|null; body?: string|null; media_url?: string|null; listing_id?: string|null; cta_label?: string|null;
  action_url?: string|null; display_seconds?: number|null; starts_at: string; expires_at: string; created_at: string;
};

function viewerKey() {
  if (typeof window === "undefined") return "";
  const key = "loadlink-public-status-viewer-v1";
  let value = window.localStorage.getItem(key);
  if (!value) { value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; window.localStorage.setItem(key,value); }
  return value;
}

export default function PublicDealerStatus({ dealerId, dealerSlug, darkMode }: { dealerId: string; dealerSlug: string; darkMode: boolean }) {
  const [items,setItems]=useState<PublicStatus[]>([]); const [active,setActive]=useState<number|null>(null); const [progress,setProgress]=useState(0);
  const startedAt=useRef(0); const completed=useRef(false); const timer=useRef<number|null>(null);
  useEffect(()=>{ void supabase.from("public_dealership_statuses").select("*").eq("dealership_id",dealerId).order("created_at",{ascending:false}).limit(20).then(({data})=>setItems((data||[]) as PublicStatus[])); },[dealerId]);
  const current=active===null?null:items[active]||null;

  async function event(item:PublicStatus,kind:"view"|"complete"|"vehicle_open"|"message",watch=0){ try{await supabase.rpc("loadlink_public_dealer_status_event",{p_status_id:item.id,p_viewer_hash:viewerKey(),p_event:kind,p_watch_seconds:watch});}catch{} }
  function close(){ if(timer.current) window.clearInterval(timer.current); timer.current=null; if(current && startedAt.current) void event(current,completed.current?"complete":"view",Math.max(0,(Date.now()-startedAt.current)/1000)); setActive(null); setProgress(0); }
  function open(index:number){ const item=items[index]; if(!item)return; completed.current=false; startedAt.current=Date.now(); setProgress(0); setActive(index); void event(item,"view",0); }
  function next(){ if(active===null)return; if(active<items.length-1){ if(current) void event(current,completed.current?"complete":"view",Math.max(0,(Date.now()-startedAt.current)/1000)); open(active+1); } else close(); }

  useEffect(()=>{
    if(!current)return; if(timer.current)window.clearInterval(timer.current); const seconds=Math.max(3,current.content_type==="video"?Number(current.display_seconds||60):Number(current.display_seconds||30));
    if(current.content_type!=="video"){ timer.current=window.setInterval(()=>{const elapsed=(Date.now()-startedAt.current)/1000;setProgress(Math.min(100,(elapsed/seconds)*100));if(elapsed>=seconds){completed.current=true;void event(current,"complete",elapsed);next();}},250); }
    return()=>{if(timer.current)window.clearInterval(timer.current);timer.current=null;};
  },[current?.id]);

  const live=useMemo(()=>items.filter(x=>new Date(x.expires_at).getTime()>Date.now()),[items]);
  if(!live.length)return null;

  return <section className={`mt-5 overflow-hidden border ${darkMode?"border-white/10 bg-[#0c0c0c] text-white":"border-black/10 bg-white text-black"}`}>
    <div className="flex items-center justify-between border-b border-current/10 px-4 py-3.5 sm:px-5"><div><h2 className="text-base font-black">Dealer Status</h2><p className="mt-0.5 text-[11px] font-semibold opacity-45">Live for 24 hours</p></div><span className="text-[10px] font-black uppercase opacity-40">{live.length} live</span></div>
    <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">{live.map((item,index)=><button key={item.id} type="button" onClick={()=>open(index)} className="w-[82px] shrink-0 text-left"><div className="aspect-[4/5] overflow-hidden rounded-xl border-2 border-[#f6b800] bg-black/10">{item.media_url?(item.content_type==="video"?<video src={item.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={item.media_url} alt="" className="h-full w-full object-cover"/>):<div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-black uppercase">{item.content_type}</div>}</div><div className="mt-1.5 truncate text-[10px] font-black">{item.title||item.content_type}</div></button>)}</div>

    {current?<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3" role="dialog" aria-modal="true" aria-label="Dealer Status"><div className="relative flex h-[min(760px,92vh)] w-full max-w-[430px] flex-col overflow-hidden rounded-[20px] bg-[#090909] text-white shadow-2xl"><div className="absolute left-3 right-3 top-3 z-20 flex gap-1">{items.map((_,i)=><div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-white" style={{width:i<(active??0)?"100%":i===(active??0)?`${progress}%`:"0%"}}/></div>)}</div><button type="button" onClick={close} className="absolute right-3 top-7 z-30 h-9 w-9 rounded-full bg-black/50 text-lg font-black">×</button><div className="min-h-0 flex-1 bg-black">{current.media_url?(current.content_type==="video"?<video src={current.media_url} autoPlay playsInline controls onTimeUpdate={e=>{const v=e.currentTarget;if(v.duration){setProgress(Math.min(100,(v.currentTime/v.duration)*100));}}} onEnded={()=>{completed.current=true;void event(current,"complete",(Date.now()-startedAt.current)/1000);next();}} className="h-full w-full object-contain"/>:<img src={current.media_url} alt="" className="h-full w-full object-contain"/>):<div className="flex h-full items-center justify-center p-8 text-center text-2xl font-black">{current.title||current.body||"Dealership Status"}</div>}</div><div className="border-t border-white/10 bg-[#0c0c0c] p-4"><div className="text-base font-black">{current.title||"Dealer Status"}</div>{current.body?<p className="mt-1.5 text-sm leading-5 text-white/60">{current.body}</p>:null}<div className="mt-4 grid grid-cols-2 gap-2">{current.action_url?<a href={current.action_url} onClick={()=>void event(current,"vehicle_open",(Date.now()-startedAt.current)/1000)} className="flex min-h-11 items-center justify-center rounded-lg bg-[#f6b800] px-3 text-xs font-black text-black">{current.cta_label||"View"}</a>:null}<a href={`/messages?dealer=${encodeURIComponent(dealerId)}&returnTo=${encodeURIComponent(`/dealership/${dealerSlug}`)}`} onClick={()=>void event(current,"message",(Date.now()-startedAt.current)/1000)} className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-black">Message dealer</a></div></div></div></div>:null}
  </section>;
}
