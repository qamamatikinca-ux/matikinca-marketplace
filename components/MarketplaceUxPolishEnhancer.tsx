"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type DealerPostingGate = { required?:boolean; complete?:boolean; missing?:string[] };
const STYLE_ID="loadlink-marketplace-polish-style";const DEALER_GATE_ID="loadlink-dealer-profile-posting-gate";
function clean(value:unknown){return String(value||"").trim()}

function installStyles(){if(document.getElementById(STYLE_ID))return;const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
html[data-loadlink-theme="dark"] [class*="bg-[#f6b800]/"]{background-color:rgba(246,184,0,.07)!important;border-color:rgba(246,184,0,.18)!important;-webkit-backdrop-filter:blur(10px) saturate(116%);backdrop-filter:blur(10px) saturate(116%)}
input[data-loadlink-future-date="true"]::-webkit-date-and-time-value{text-align:left}
`;document.head.appendChild(style)}
function hideSeenBadges(){document.querySelectorAll<HTMLElement>("button,span,div").forEach(node=>{if(clean(node.textContent).toLowerCase()==="seen")node.style.display="none"})}

export default function MarketplaceUxPolishEnhancer(){const pathname=usePathname();useEffect(()=>{
  if(!["/jobs","/my-posts","/jobs/list"].includes(pathname))return;installStyles();let cancelled=false;const timers:number[]=[];


  function myPostsFixes(){if(pathname!=="/my-posts")return;hideSeenBadges();document.querySelectorAll<HTMLDetailsElement>('details:has(summary[aria-label="More post actions"])').forEach(details=>{const menu=details.querySelector<HTMLElement>("div.absolute");if(!menu)return;if(window.innerWidth<768)Object.assign(menu.style,{position:"fixed",left:"12px",right:"12px",bottom:"calc(env(safe-area-inset-bottom) + 12px)",top:"auto",width:"auto",maxHeight:"64dvh",overflowY:"auto",zIndex:"2147483400"});if(details.dataset.loadlinkContractActionChecked==="true"||!isSupabaseConfigured)return;const article=details.closest("article");const view=article?.querySelector<HTMLAnchorElement>('a[href^="/listing/"]');const listingId=clean(view?.getAttribute("href")?.split("/listing/")[1]?.split(/[?#]/)[0]);if(!listingId)return;details.dataset.loadlinkContractActionChecked="true";void supabase.from("job_listings").select("listing_kind,status").eq("id",listingId).maybeSingle().then(({data,error})=>{if(cancelled||error||clean(data?.listing_kind).toLowerCase()!=="contract"||clean(data?.status||"active").toLowerCase()!=="active"||menu.querySelector('[data-loadlink-cancel-contract="true"]'))return;const button=document.createElement("button");button.type="button";button.dataset.loadlinkCancelContract="true";button.className="block w-full border-t border-[#f6b800]/25 px-4 py-3 text-left text-xs font-black text-[#c28e00]";button.textContent="Cancel contract listing";button.onclick=async event=>{event.preventDefault();event.stopPropagation();if(!window.confirm("Cancel this contract listing? It will stop appearing as an active contract."))return;button.disabled=true;button.textContent="Cancelling…";const result=await supabase.rpc("set_my_listing_status",{p_listing_id:listingId,p_status:"closed",p_owner_key:""});if(result.error||result.data!==true){button.disabled=false;button.textContent="Cancel contract listing";window.dispatchEvent(new CustomEvent("loadlink:toast",{detail:{kind:"error",title:"Contract not cancelled",message:result.error?.message||"LoadLink could not cancel this contract listing.",duration:5200}}));return}window.dispatchEvent(new CustomEvent("loadlink:toast",{detail:{kind:"success",title:"Contract cancelled",message:"The contract listing is now closed.",duration:4200}}));window.setTimeout(()=>window.location.reload(),450)};menu.insertBefore(button,menu.querySelector('button.text-red-500')||null)})})}
  function dateFix(){if(pathname!=="/jobs/list")return;document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(input=>{input.style.width="100%";input.style.minWidth="0";input.style.maxWidth="100%";input.style.fontSize="16px";input.style.boxSizing="border-box"})}
  async function dealerGate(){if(pathname!=="/jobs/list"||!isSupabaseConfigured||document.getElementById(DEALER_GATE_ID))return;const auth=await supabase.auth.getUser();if(!auth.data.user||cancelled)return;const result=await supabase.rpc("loadlink_dealer_profile_posting_gate",{p_user_id:auth.data.user.id});const gate=result.data as DealerPostingGate|null;if(result.error||!gate?.required||gate.complete||cancelled)return;const overlay=document.createElement("div");overlay.id=DEALER_GATE_ID;overlay.className="fixed inset-0 z-[2147483550] flex items-end bg-black/75 p-3 sm:items-center sm:justify-center";const panel=document.createElement("section");panel.className="w-full max-w-md rounded-[26px] border border-white/12 bg-[#0b0b0b] p-5 text-white shadow-2xl";const title=document.createElement("h2");title.className="text-2xl font-black tracking-[-.03em]";title.textContent="Finish your Dealer profile";const copy=document.createElement("p");copy.className="mt-3 text-sm font-semibold leading-6 text-white/60";copy.textContent=`Before this Dealer account can post, add: ${(gate.missing||[]).join(", ")||"the missing public dealership details"}.`;const actions=document.createElement("div");actions.className="mt-5 grid gap-2";const finish=document.createElement("a");finish.href="/dealer?section=showroom";finish.className="flex min-h-12 items-center justify-center rounded-[16px] bg-[#f6b800] px-4 text-sm font-black text-black";finish.textContent="Complete Dealer profile";const back=document.createElement("a");back.href="/jobs";back.className="flex min-h-12 items-center justify-center rounded-[16px] border border-white/12 px-4 text-sm font-black text-white";back.textContent="Back";actions.append(finish,back);panel.append(title,copy,actions);overlay.appendChild(panel);document.body.appendChild(overlay)}

  function initialise(){
    if(cancelled)return;
    // Jobs and its promoted slider are rendered by React. Do not rewrite
    // their layout, theme or click handlers through an old DOM patch.
    const scan=()=>{hideSeenBadges();myPostsFixes();dateFix()};
    scan();
    [100,300,700,1300,2200].forEach(delay=>timers.push(window.setTimeout(scan,delay)));
    void dealerGate();
  }
  void initialise();return()=>{cancelled=true;timers.forEach(window.clearTimeout);document.getElementById(DEALER_GATE_ID)?.remove();document.getElementById("loadlink-promoted-carousel-controls")?.remove()}
},[pathname]);return null}
