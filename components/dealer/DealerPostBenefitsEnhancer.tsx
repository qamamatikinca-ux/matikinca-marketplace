"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ListingMeta = {
  id?: string | null;
  user_id?: string | null;
  posted_by?: string | null;
  poster_photo?: string | null;
  package_type?: string | null;
  dealer_package_active?: boolean | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_trading_hours?: string | null;
  dealership_location?: string | null;
  dealership_logo?: string | null;
  dealership_verified?: boolean | null;
  dealership_showroom_available?: boolean | null;
  dealership_active_listing_count?: number | null;
  dealership_review_count?: number | null;
  dealership_review_average?: number | null;
};

type DayHours = { closed?: boolean; open?: string; close?: string };
type ReviewSummary = { count: number; average: number };
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
const BENEFIT_SELECTOR = "[data-loadlink-dealer-benefits='true']";

function listingIdFromHref(href:string){const match=href.match(/^\/(?:listing|vehicles)\/([^/?#]+)/i);return match?.[1]?decodeURIComponent(match[1]):""}
function text(tag:string,value:string,className:string){const node=document.createElement(tag);node.textContent=value;node.className=className;return node}

function formatHours(raw?:string|null){
  if(!raw)return "Not added";
  try{
    const parsed=JSON.parse(raw) as Record<string,DayHours>;
    const mon=parsed.Monday;
    const weekdays=days.slice(0,5).every(day=>JSON.stringify(parsed[day])===JSON.stringify(mon));
    if(weekdays&&mon)return mon.closed?"Mon–Fri closed":`Mon–Fri ${mon.open}–${mon.close}`;
    if(mon)return mon.closed?"Mon closed":`Mon ${mon.open}–${mon.close}`;
    return "View hours";
  }catch{return raw.length>34?`${raw.slice(0,31)}…`:raw}
}

export default function DealerPostBenefitsEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!(pathname==="/jobs"||pathname.startsWith("/listing/")||pathname.startsWith("/vehicles/")))return;
    let cancelled=false;const timers:number[]=[];const rows=new Map<string,ListingMeta>();const reviews=new Map<string,ReviewSummary>();

    function reviewFor(row:ListingMeta){
      if(row.dealer_package_active){
        const count=Number(row.dealership_review_count||0);const avg=Number(row.dealership_review_average||0);
        return {count,average:avg};
      }
      return row.user_id?reviews.get(String(row.user_id))||{count:0,average:0}:{count:0,average:0};
    }

    function decorate(host:HTMLElement,id:string){
      if(!id||host.querySelector(BENEFIT_SELECTOR))return;
      const row=rows.get(id);if(!row)return;
      const dealer=Boolean(row.dealer_package_active&&row.dealership_slug&&row.dealership_name);
      const premium=dealer||["pro","dealer"].includes(String(row.package_type||"").toLowerCase());
      const review=reviewFor(row);
      const reviewLabel=review.count>0&&review.average>0?`★ ${review.average.toFixed(1)} · ${review.count}`:"No reviews yet";
      const displayName=dealer?String(row.dealership_name):String(row.posted_by||"LoadLink member");
      const avatarUrl=dealer?row.dealership_logo:row.poster_photo;
      const hasShowroom=dealer&&(Boolean(row.dealership_showroom_available)||Number(row.dealership_active_listing_count||0)>0);

      const bar=document.createElement("div");bar.dataset.loadlinkDealerBenefits="true";
      bar.className="m-3 mt-0 grid w-[calc(100%-1.5rem)] gap-2 rounded-[18px] border p-2.5";
      const dark=document.documentElement.getAttribute("data-loadlink-theme")==="dark";
      Object.assign(bar.style,dark?{background:"rgba(255,255,255,.045)",borderColor:"rgba(255,255,255,.1)",color:"#fff"}:{background:"rgba(255,255,255,.96)",borderColor:"rgba(0,0,0,.09)",color:"#111"});

      const identity=document.createElement("div");identity.className="flex min-w-0 items-center gap-2.5";
      const avatar=document.createElement("span");avatar.className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current/10 bg-[#111] text-[8px] font-black uppercase text-[#f6b800]";
      if(avatarUrl){const image=document.createElement("img");image.src=String(avatarUrl);image.alt="";image.loading="lazy";image.className="h-full w-full object-cover";avatar.appendChild(image)}else avatar.textContent=displayName.split(/\s+/).slice(0,2).map(p=>p[0]).join("").slice(0,2)||"LL";
      const nameWrap=document.createElement("span");nameWrap.className="min-w-0 flex-1";nameWrap.appendChild(text("strong",displayName,"block truncate text-[11px] font-black"));
      nameWrap.appendChild(text("small",dealer?(row.dealership_location||"Verified dealership"):(premium?"Pro account":"LoadLink account"),"mt-0.5 block truncate text-[8.5px] font-semibold opacity-45"));
      identity.append(avatar,nameWrap);
      if(dealer&&row.dealership_verified)identity.appendChild(text("span","Verified","shrink-0 rounded-full border border-current/10 px-2 py-1 text-[7.5px] font-black uppercase opacity-55"));

      const tabs=document.createElement("div");tabs.className=`grid gap-2 ${premium?"grid-cols-2":"grid-cols-1"}`;
      const reviewTab=document.createElement(dealer?"a":"div");
      if(dealer)(reviewTab as HTMLAnchorElement).href=`/dealership/${encodeURIComponent(String(row.dealership_slug))}#reviews`;
      reviewTab.className="flex min-h-11 items-center justify-between rounded-[13px] border border-current/10 px-3 no-underline text-current";
      reviewTab.append(text("span","Reviews","text-[9px] font-black uppercase tracking-[.05em] opacity-48"),text("strong",reviewLabel,"text-[9.5px] font-black"));
      tabs.appendChild(reviewTab);

      if(premium){
        const hoursTab=document.createElement(dealer?"a":"div");
        if(dealer)(hoursTab as HTMLAnchorElement).href=`/dealership/${encodeURIComponent(String(row.dealership_slug))}`;
        hoursTab.className="flex min-h-11 items-center justify-between gap-2 rounded-[13px] border border-current/10 px-3 no-underline text-current";
        hoursTab.append(text("span","Opening hours","text-[9px] font-black uppercase tracking-[.04em] opacity-48"),text("strong",formatHours(row.dealership_trading_hours),"max-w-[120px] truncate text-right text-[9px] font-black"));
        tabs.appendChild(hoursTab);
      }

      if(dealer){
        const action=document.createElement("a");action.href=`/dealership/${encodeURIComponent(String(row.dealership_slug))}${hasShowroom?"#showroom":""}`;action.className="flex h-9 items-center justify-center rounded-[12px] bg-[#f6b800] px-3 text-[9px] font-black uppercase tracking-[.05em] text-black no-underline";action.textContent=hasShowroom?"View showroom":"Dealer profile";tabs.appendChild(action);
      }
      bar.append(identity,tabs);host.appendChild(bar);
    }

    function scan(){if(cancelled||!rows.size)return;document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach(article=>decorate(article,article.id.replace(/^job-/,"")));document.querySelectorAll<HTMLAnchorElement>('a[href^="/listing/"],a[href^="/vehicles/"]').forEach(anchor=>{const id=listingIdFromHref(anchor.getAttribute("href")||"");const host=anchor.closest<HTMLElement>("article")||anchor;decorate(host,id)})}

    async function load(){
      try{
        const response=await fetch(`/api/job-listings?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)return;
        const payload=await response.json();const list=(payload?.rows||[]) as ListingMeta[];list.forEach(row=>{if(row.id)rows.set(String(row.id),row)});
        const userIds=[...new Set(list.map(row=>String(row.user_id||"")).filter(Boolean))];
        if(userIds.length){
          const result=await supabase.from("profile_reviews").select("target_user_id,rating,status").in("target_user_id",userIds).eq("status","approved");
          if(!result.error){
            const grouped=new Map<string,number[]>();(result.data||[]).forEach((item:any)=>{const id=String(item.target_user_id||"");if(!id)return;const values=grouped.get(id)||[];values.push(Number(item.rating||0));grouped.set(id,values)});
            grouped.forEach((values,id)=>reviews.set(id,{count:values.length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:0}));
          }
        }
        if(cancelled)return;[0,120,320,700,1400,2400].forEach(delay=>timers.push(window.setTimeout(scan,delay)));
      }catch{}
    }
    void load();
    return()=>{cancelled=true;timers.forEach(timer=>window.clearTimeout(timer))};
  },[pathname]);
  return null;
}
