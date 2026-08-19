"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type DealerListing = {
  id?: string | null;
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
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
const BENEFIT_SELECTOR = "[data-loadlink-dealer-benefits='true']";

function listingIdFromHref(href:string){const match=href.match(/^\/(?:listing|vehicles)\/([^/?#]+)/i);return match?.[1]?decodeURIComponent(match[1]):""}
function makeText(tag:string,value:string,className:string){const node=document.createElement(tag);node.textContent=value;node.className=className;return node}

function formatHours(raw?:string|null){
  if(!raw)return "Hours not added";
  try{
    const parsed=JSON.parse(raw) as Record<string,DayHours>;
    const mon=parsed.Monday;
    const weekdays=days.slice(0,5).every(day=>JSON.stringify(parsed[day])===JSON.stringify(mon));
    const bits:string[]=[];
    if(weekdays&&mon)bits.push(mon.closed?"Mon–Fri closed":`Mon–Fri ${mon.open}–${mon.close}`);
    else if(mon)bits.push(mon.closed?"Mon closed":`Mon ${mon.open}–${mon.close}`);
    const sat=parsed.Saturday;if(sat)bits.push(sat.closed?"Sat closed":`Sat ${sat.open}–${sat.close}`);
    const sun=parsed.Sunday;if(sun&&!sun.closed)bits.push(`Sun ${sun.open}–${sun.close}`);
    return bits.join(" · ")||"Hours available on showroom";
  }catch{return raw}
}

export default function DealerPostBenefitsEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!(pathname==="/jobs"||pathname.startsWith("/listing/")||pathname.startsWith("/vehicles/")))return;
    let cancelled=false;const timers:number[]=[];const rows=new Map<string,DealerListing>();

    function decorate(host:HTMLElement,id:string){
      if(!id||host.querySelector(BENEFIT_SELECTOR))return;
      const row=rows.get(id);if(!row?.dealer_package_active||!row.dealership_slug||!row.dealership_name)return;
      const hasShowroom=Boolean(row.dealership_showroom_available)||Number(row.dealership_active_listing_count||0)>0;
      const count=Number(row.dealership_review_count||0);const avg=Number(row.dealership_review_average||0);
      const review=count>0&&avg>0?`★ ${avg.toFixed(1)} · ${count}`:"No reviews yet";

      const bar=document.createElement("a");
      bar.dataset.loadlinkDealerBenefits="true";
      bar.href=`/dealership/${encodeURIComponent(row.dealership_slug)}${hasShowroom?"#showroom":""}`;
      bar.className="m-3 mt-0 flex min-h-[68px] w-[calc(100%-1.5rem)] items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left no-underline";
      const dark=document.documentElement.getAttribute("data-loadlink-theme")==="dark";
      Object.assign(bar.style,dark?{background:"rgba(255,255,255,.055)",borderColor:"rgba(255,255,255,.11)",color:"#fff"}:{background:"rgba(255,255,255,.96)",borderColor:"rgba(0,0,0,.1)",color:"#111"});

      const avatar=document.createElement("span");avatar.className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current/10 bg-[#111] text-[9px] font-black uppercase text-[#f6b800]";
      if(row.dealership_logo){const image=document.createElement("img");image.src=row.dealership_logo;image.alt="";image.loading="lazy";image.className="h-full w-full object-cover";avatar.appendChild(image)}else avatar.textContent=row.dealership_name.split(/\s+/).slice(0,2).map(p=>p[0]).join("").slice(0,2)||"LL";

      const copy=document.createElement("span");copy.className="min-w-0 flex-1";
      const top=document.createElement("span");top.className="flex min-w-0 items-center gap-2";top.appendChild(makeText("strong",row.dealership_name,"min-w-0 truncate text-[12px] font-black"));
      if(row.dealership_verified)top.appendChild(makeText("span","Verified","shrink-0 rounded-full border border-current/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[.04em] opacity-60"));
      copy.appendChild(top);
      const detail=[formatHours(row.dealership_trading_hours),row.dealership_location||""].filter(Boolean).join(" · ");copy.appendChild(makeText("small",detail,"mt-1 block truncate text-[9.5px] font-semibold opacity-55"));

      const right=document.createElement("span");right.className="flex shrink-0 flex-col items-end gap-1 text-right";right.appendChild(makeText("strong",review,"max-w-[110px] truncate text-[9.5px] font-black"));right.appendChild(makeText("span",hasShowroom?"View showroom →":"Dealer profile →","text-[9.5px] font-black opacity-70"));
      bar.append(avatar,copy,right);host.appendChild(bar);
    }

    function scan(){if(cancelled||!rows.size)return;document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach(article=>decorate(article,article.id.replace(/^job-/,"")));document.querySelectorAll<HTMLAnchorElement>('a[href^="/listing/"],a[href^="/vehicles/"]').forEach(anchor=>{const id=listingIdFromHref(anchor.getAttribute("href")||"");const host=anchor.closest<HTMLElement>("article")||anchor;decorate(host,id)})}

    fetch(`/api/job-listings?t=${Date.now()}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(payload=>{if(cancelled)return;((payload?.rows||[]) as DealerListing[]).forEach(row=>{if(row.id&&row.dealer_package_active&&row.dealership_slug&&row.dealership_name)rows.set(String(row.id),row)});[0,150,450,900,1600].forEach(delay=>timers.push(window.setTimeout(scan,delay)))}).catch(()=>undefined);
    return()=>{cancelled=true;timers.forEach(window.clearTimeout)};
  },[pathname]);
  return null;
}
