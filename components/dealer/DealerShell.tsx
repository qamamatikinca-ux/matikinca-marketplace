"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { clearActiveAccountState } from "@/lib/accountState";
import { DEALER_MORE_NAV, DEALER_PRIMARY_NAV } from "@/lib/dealer/constants";
import type { DealerProfile, DealerSection, DealerWorkspaceState } from "@/lib/dealer/types";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { supabase } from "@/lib/supabaseClient";
import DealerGlobalSearch from "./DealerGlobalSearch";
import { PrimaryButton, SecondaryButton } from "./ui";

const sectionPermission: Partial<Record<DealerSection,string>> = {inventory:"inventory.read",leads:"leads.read",customers:"customers.read",messages:"messages.read",analytics:"analytics.read",marketing:"marketing.read",team:"team.read",showroom:"showroom.read",verification:"verification.read",billing:"billing.read",reviews:"reviews.read",activity:"activity.read",settings:"showroom.write"};
function statusText(c:DealerWorkspaceState){if(c.account_status==="blocked")return"Account blocked";if(c.account_status==="suspended")return"Account suspended";if(c.subscription_status==="past_due")return"Payment attention required";if(c.subscription_status==="expired")return"Dealer access expired";if(c.verification_status==="changes_required")return"Verification action required";if(c.verification_status!=="approved")return"Dealer setup in progress";return c.showroom_status==="live"?"Showroom live":"Showroom not public"}

export default function DealerShell({darkMode,toggleTheme,profile,context,section,setSection,onAddVehicle,children}:{darkMode:boolean;toggleTheme:()=>void;profile:DealerProfile;context:DealerWorkspaceState;section:DealerSection;setSection:(s:DealerSection)=>void;onAddVehicle:()=>void;children:ReactNode}){
  const [moreOpen,setMoreOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const account=useLoadLinkAccount();
  const can=(id:DealerSection)=>{const p=sectionPermission[id];return !p||context.permissions.includes(p as never)};
  const all=[...DEALER_PRIMARY_NAV,...DEALER_MORE_NAV].filter((item,index,array)=>can(item.id)&&array.findIndex(x=>x.id===item.id)===index);
  const primaryIds:DealerSection[]=["overview","inventory","leads","messages"];
  const primary=primaryIds.map(id=>all.find(x=>x.id===id)).filter(Boolean) as typeof all;
  const more=all.filter(x=>!primaryIds.includes(x.id));
  const go=(id:DealerSection)=>{setSection(id);setMoreOpen(false);setAccountOpen(false)};
  const surface=darkMode?"border-white/10 bg-[#0a0a0a]":"border-black/10 bg-white";
  const muted=darkMode?"text-white/45":"text-black/45";
  const adminName=account.profile.full_name||profile.name||"LoadLink dealer";
  const adminEmail=account.user?.email||profile.contact_email||"";
  const initials=useMemo(()=>adminName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"LL",[adminName]);

  async function signOut(){
    await supabase.auth.signOut();
    clearActiveAccountState();
    window.location.assign("/");
  }

  return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f4f0e7] text-black"}`} data-loadlink-dealer-control-centre="v2714-dashboard">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <div className="mx-auto max-w-[1500px] px-3 pb-28 pt-4 sm:px-5 lg:grid lg:grid-cols-[238px_minmax(0,1fr)] lg:gap-5 lg:pb-10 lg:pt-5">
      <aside className={`hidden h-[calc(100vh-102px)] self-start overflow-y-auto rounded-[26px] border lg:sticky lg:top-[92px] lg:flex lg:flex-col ${surface}`}>
        <div className="border-b border-current/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#f6b800]/35 bg-current/[.04]">{profile.profile_image_url?<img src={profile.profile_image_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-xs font-black">{profile.name.slice(0,2).toUpperCase()}</div>}</div>
            <div className="min-w-0"><div className="truncate text-sm font-black">{profile.name}</div><div className="mt-1 text-[9px] font-semibold opacity-42">{statusText(context)}</div></div>
          </div>
        </div>
        <nav className="flex-1 p-2.5">{all.map(i=><Nav key={i.id} item={i} active={section===i.id} onClick={()=>go(i.id)}/>)}</nav>
        <div className="m-3 rounded-[18px] border border-[#f6b800]/20 bg-[#f6b800]/[.045] p-3.5">
          <div className="text-[10px] font-black text-[#c79300]">Dealer workspace</div>
          <p className={`mt-1.5 text-[9px] font-semibold leading-4 ${muted}`}>Stock, leads, messages, analytics and dealership controls stay in one place.</p>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="relative mb-4 flex items-center justify-end gap-2" data-loadlink-dealer-topbar="true">
          <button type="button" onClick={()=>go("team")} className={`hidden h-10 items-center gap-2 rounded-full border px-4 text-[10px] font-black sm:flex ${darkMode?"border-[#f6b800]/55 bg-[#f6b800]/[.04] text-[#ffd259]":"border-[#c08d00]/45 bg-white text-[#8a6500]"}`}><span className="text-base leading-none">＋</span> Invite member</button>
          <Link href="/notifications" aria-label="Notifications" className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${darkMode?"border-white/10 bg-white/[.035]":"border-black/10 bg-white"}`}><BellIcon/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#f6b800]"/></Link>
          <button type="button" onClick={()=>go("settings")} aria-label="Dealership settings" className={`flex h-10 w-10 items-center justify-center rounded-full border ${darkMode?"border-white/10 bg-white/[.035]":"border-black/10 bg-white"}`}><Icon name="settings"/></button>
          <button type="button" onClick={()=>setAccountOpen(value=>!value)} className={`flex h-11 min-w-0 max-w-[260px] items-center gap-2 rounded-[14px] border px-2.5 text-left ${darkMode?"border-white/10 bg-white/[.035]":"border-black/10 bg-white shadow-sm"}`} aria-expanded={accountOpen} aria-label="Dealership account menu">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6b800]/50 bg-black text-[9px] font-black text-[#f6b800]">{account.profile.avatar_url?<img src={account.profile.avatar_url} alt="" className="h-full w-full object-cover"/>:initials}</span>
            <span className="hidden min-w-0 flex-1 sm:block"><span className="block truncate text-[10px] font-black">{adminName}</span><span className={`mt-0.5 block truncate text-[8px] font-semibold ${muted}`}>{profile.name}</span></span>
            <span className="hidden text-xs opacity-35 sm:block">⌄</span>
          </button>

          {accountOpen?<><button type="button" aria-label="Close account menu" className="fixed inset-0 z-[88] bg-transparent" onClick={()=>setAccountOpen(false)}/><section className={`absolute right-0 top-12 z-[90] w-[min(92vw,330px)] overflow-hidden rounded-[24px] border p-2 shadow-[0_24px_70px_rgba(0,0,0,.32)] backdrop-blur-xl ${darkMode?"border-white/10 bg-[#101010]/98":"border-black/10 bg-white/98"}`}>
            <div className="flex items-center gap-3 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6b800]/45 bg-black text-[10px] font-black text-[#f6b800]">{account.profile.avatar_url?<img src={account.profile.avatar_url} alt="" className="h-full w-full object-cover"/>:initials}</span>
              <div className="min-w-0"><div className="truncate text-sm font-black">{adminName}</div><div className={`mt-0.5 truncate text-[10px] font-semibold ${muted}`}>{adminEmail}</div></div>
            </div>
            <Link href="/account/packages" onClick={()=>setAccountOpen(false)} className={`mx-1 mb-2 flex items-center gap-3 rounded-[18px] border p-3 ${darkMode?"border-[#f6b800]/25 bg-[#f6b800]/[.07]":"border-[#b88900]/18 bg-[#fff8df]"}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6b800] text-black"><CrownIcon/></span>
              <span className="min-w-0 flex-1"><strong className="block text-[11px] font-black">Dealer Plan</strong><span className={`mt-0.5 block text-[9px] font-semibold ${muted}`}>Manage plan</span></span>
              <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[8px] font-black text-emerald-500">ACTIVE</span>
            </Link>
            <div className="grid gap-1 border-t border-current/10 p-1 pt-2">
              <Link href="/account/settings" onClick={()=>setAccountOpen(false)} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[10px] font-bold hover:bg-current/[.04]"><Icon name="settings"/>Account settings</Link>
              <button type="button" onClick={()=>go("showroom")} className="flex h-10 items-center gap-3 rounded-xl px-3 text-left text-[10px] font-bold hover:bg-current/[.04]"><Icon name="showroom"/>Dealership profile</button>
              <button type="button" onClick={()=>go("support")} className="flex h-10 items-center gap-3 rounded-xl px-3 text-left text-[10px] font-bold hover:bg-current/[.04]"><HelpIcon/>Help centre</button>
              <button type="button" onClick={toggleTheme} className="flex h-10 items-center gap-3 rounded-xl px-3 text-left text-[10px] font-bold hover:bg-current/[.04]"><MoonIcon/><span className="flex-1">Dark mode</span><span className={`relative h-6 w-10 rounded-full ${darkMode?"bg-[#f6b800]":"bg-current/10"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${darkMode?"left-5":"left-1"}`}/></span></button>
            </div>
            <button type="button" onClick={()=>void signOut()} className="mt-1 flex h-11 w-full items-center gap-3 rounded-xl border border-red-500/15 px-3 text-left text-[10px] font-black text-red-500 hover:bg-red-500/[.05]"><SignOutIcon/>Sign out</button>
          </section></>:null}
        </div>

        <section className={`mb-4 rounded-[26px] border p-4 sm:p-5 ${surface}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[16px] border border-[#f6b800]/45 bg-current/[.04]">{profile.profile_image_url?<img src={profile.profile_image_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-sm font-black">{profile.name.slice(0,2).toUpperCase()}</div>}</div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-[20px] font-black tracking-[-.04em] sm:text-[24px]">{profile.name}</h1><div className="mt-1 text-[10px] font-semibold opacity-45">{statusText(context)}</div></div>
            <div className="hidden gap-2 sm:flex"><PrimaryButton type="button" onClick={onAddVehicle}>Add vehicle</PrimaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={()=>window.open(`/dealership/${profile.slug}`,"_blank")}>Dealer page</SecondaryButton></div>
          </div>
          <div className="mt-4 max-w-2xl"><DealerGlobalSearch darkMode={darkMode} setSection={setSection}/></div>
        </section>
        {children}
      </div>
    </div>

    <nav className={`fixed inset-x-0 bottom-0 z-50 border-t px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden ${darkMode?"border-white/10 bg-[#090909]/97":"border-black/10 bg-white/97"}`} aria-label="Dealer navigation"><div className="mx-auto grid max-w-md grid-cols-5">{primary.map(i=><Mobile key={i.id} label={i.id==="overview"?"Home":i.id==="inventory"?"Stock":i.id==="leads"?"Sales":"Inbox"} item={i} active={section===i.id} onClick={()=>go(i.id)}/>) }<button type="button" onClick={()=>setMoreOpen(true)} className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-[9px] font-black"><Icon name="more" active={moreOpen}/><span className={moreOpen?"text-[#b88600]":"opacity-55"}>More</span></button></div></nav>
    {moreOpen?<><button aria-label="Close More" className="fixed inset-0 z-[110] bg-black/50 lg:hidden" onClick={()=>setMoreOpen(false)}/><section className={`fixed inset-x-2 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[120] mx-auto max-h-[78vh] max-w-md overflow-hidden rounded-[26px] border shadow-2xl lg:hidden ${surface}`}><div className="flex items-center justify-between border-b border-current/10 px-4 py-3.5"><div><div className="text-sm font-black">More</div><div className="mt-0.5 text-[9px] font-semibold opacity-40">Dealership workspace</div></div><button onClick={()=>setMoreOpen(false)} className="h-9 w-9 rounded-xl border border-current/10 text-sm font-black">×</button></div><div className="max-h-[calc(78vh-64px)] overflow-y-auto p-3"><button type="button" onClick={()=>go("team")} className="mb-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#f6b800] text-[10px] font-black text-black">＋ Invite member</button><div className="grid grid-cols-2 gap-2">{more.map(i=><button key={i.id} type="button" onClick={()=>go(i.id)} className={`flex min-h-[72px] items-center gap-3 rounded-[18px] border p-3 text-left ${section===i.id?"border-[#f6b800] bg-[#f6b800]/10":"border-current/10 bg-current/[.025]"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/10"><Icon name={String(i.id)} active={section===i.id}/></span><span className="min-w-0"><span className="block truncate text-[10px] font-black">{i.label}</span><span className="mt-1 block text-[8px] font-semibold opacity-38">Open section</span></span></button>)}</div></div></section></>:null}
  </main>
}

function Nav({item,active,onClick}:{item:any;active:boolean;onClick:()=>void}){return <button type="button" onClick={onClick} className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-black transition ${active?"border border-[#f6b800]/45 bg-[#f6b800]/12 text-[#c79300] shadow-[inset_-3px_0_0_#f6b800]":"opacity-58 hover:bg-current/[.04] hover:opacity-100"}`}><Icon name={String(item.id)} active={active}/>{item.label}</button>}
function Mobile({item,label,active,onClick}:{item:any;label:string;active:boolean;onClick:()=>void}){return <button type="button" onClick={onClick} className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-[9px] font-black"><Icon name={String(item.id)} active={active}/><span className={active?"text-[#b88600]":"opacity-55"}>{label}</span></button>}
function Icon({name,active=false}:{name:string;active?:boolean}){const cls=`h-[18px] w-[18px] ${active?"text-[#b88600]":"opacity-55"}`;const c={viewBox:"0 0 24 24",className:cls,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};if(name==="overview")return <svg {...c}><path d="M4 11 12 4l8 7v9H4z"/><path d="M9 20v-6h6v6"/></svg>;if(name==="inventory")return <svg {...c}><path d="M4 8.5h16v10H4z"/><path d="M6 8.5 7.5 5h9L18 8.5"/><path d="M8 18.5v1.5M16 18.5v1.5"/></svg>;if(name==="leads"||name==="customers")return <svg {...c}><path d="M5 6h14v10H9l-4 3z"/><path d="M8 10h8M8 13h5"/></svg>;if(name==="messages")return <svg {...c}><path d="M4 6h16v12H4z"/><path d="m4 8 8 6 8-6"/></svg>;if(name==="analytics"||name==="activity")return <svg {...c}><path d="M5 19V10M10 19V5M15 19v-7M20 19V8"/></svg>;if(name==="showroom")return <svg {...c}><path d="M4 10h16v10H4z"/><path d="m3 10 2-5h14l2 5"/></svg>;if(name==="verification")return <svg {...c}><path d="M12 3.5 19 6v5.5c0 4.4-2.7 7.7-7 9-4.3-1.3-7-4.6-7-9V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;if(name==="billing")return <svg {...c}><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/></svg>;if(name==="settings")return <svg {...c}><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>;if(name==="team")return <svg {...c}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M4 19c.6-3.2 2.5-5 5-5s4.4 1.8 5 5M14 15c2.6 0 4.3 1.3 5 4"/></svg>;return <svg {...c}><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg>}
function BellIcon(){return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z"/><path d="M9.5 19a2.8 2.8 0 0 0 5 0"/></svg>}
function CrownIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Z"/><path d="M7 21h10"/></svg>}
function HelpIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.9.5-1.3 1-1.3 2M12 17h.01"/></svg>}
function MoonIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 15.2A8 8 0 0 1 8.8 4 8.3 8.3 0 1 0 20 15.2Z"/></svg>}
function SignOutIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>}
