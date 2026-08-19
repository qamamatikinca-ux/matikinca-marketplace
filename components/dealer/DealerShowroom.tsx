"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dealerFetch, removeDealerUpload, uploadDealerFile } from "@/lib/dealer/client";
import type { DealerProfile, DealerWorkspaceState } from "@/lib/dealer/types";
import { Input, PrimaryButton, SecondaryButton, Surface, Textarea } from "./ui";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type DayHours = { closed: boolean; open: string; close: string };
type HoursState = Record<DayKey, DayHours>;
type ShowroomForm = {
  name: string; slug: string; short_bio: string; business_description: string; physical_location: string;
  contact_email: string; phone_number: string; whatsapp_number: string; website_url: string;
  year_established: string; is_public: boolean;
};

const days: DayKey[] = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const defaultHours: HoursState = {
  Monday:{closed:false,open:"08:00",close:"17:00"}, Tuesday:{closed:false,open:"08:00",close:"17:00"}, Wednesday:{closed:false,open:"08:00",close:"17:00"},
  Thursday:{closed:false,open:"08:00",close:"17:00"}, Friday:{closed:false,open:"08:00",close:"17:00"}, Saturday:{closed:false,open:"08:00",close:"13:00"}, Sunday:{closed:true,open:"",close:""},
};

function toForm(profile: DealerProfile): ShowroomForm {
  return { name:profile.name,slug:profile.slug,short_bio:profile.short_bio||"",business_description:profile.business_description||"",physical_location:profile.physical_location||"",contact_email:profile.contact_email||"",phone_number:profile.phone_number||"",whatsapp_number:profile.whatsapp_number||"",website_url:profile.website_url||"",year_established:profile.year_established?String(profile.year_established):"",is_public:Boolean(profile.is_public) };
}

function parseHours(raw?: string | null): HoursState {
  if (!raw) return defaultHours;
  try {
    const parsed = JSON.parse(raw) as Partial<HoursState>;
    return days.reduce((acc, day) => ({...acc,[day]:{...defaultHours[day],...(parsed[day]||{})}}), {} as HoursState);
  } catch {
    return defaultHours;
  }
}

function serialiseHours(hours: HoursState) { return JSON.stringify(hours); }

function readableHours(hours: HoursState) {
  const mondayToFridaySame = days.slice(0,5).every((day)=>JSON.stringify(hours[day as DayKey])===JSON.stringify(hours.Monday));
  const rows:string[]=[];
  if (mondayToFridaySame) rows.push(hours.Monday.closed?"Monday–Friday: Closed":`Monday–Friday: ${hours.Monday.open}–${hours.Monday.close}`);
  else days.slice(0,5).forEach((day)=>rows.push(hours[day as DayKey].closed?`${day}: Closed`:`${day}: ${hours[day as DayKey].open}–${hours[day as DayKey].close}`));
  ["Saturday","Sunday"].forEach((day)=>rows.push(hours[day as DayKey].closed?`${day}: Closed`:`${day}: ${hours[day as DayKey].open}–${hours[day as DayKey].close}`));
  return rows.join(" · ");
}

async function imageSize(file:File){return await new Promise<{width:number;height:number}>((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{resolve({width:image.naturalWidth,height:image.naturalHeight});URL.revokeObjectURL(url)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image could not be checked."))};image.src=url})}

export default function DealerShowroom({darkMode,profile,context,onProfile}:{darkMode:boolean;profile:DealerProfile;context:DealerWorkspaceState;onProfile:(profile:DealerProfile)=>void}){
  const logoRef=useRef<HTMLInputElement>(null); const coverRef=useRef<HTMLInputElement>(null);
  const [form,setForm]=useState<ShowroomForm>(()=>toForm(profile));
  const [hours,setHours]=useState<HoursState>(()=>parseHours(profile.trading_hours));
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [detailsOpen,setDetailsOpen]=useState(false); const [hoursOpen,setHoursOpen]=useState(false);

  useEffect(()=>{setForm(toForm(profile));setHours(parseHours(profile.trading_hours));},[profile]);

  const hoursValid=useMemo(()=>days.every((day)=>hours[day].closed||(Boolean(hours[day].open)&&Boolean(hours[day].close)&&hours[day].open<hours[day].close)),[hours]);
  const yearValid=useMemo(()=>{if(!form.year_established.trim())return true;const year=Number(form.year_established);return Number.isInteger(year)&&year>=1800&&year<=new Date().getFullYear()+1},[form.year_established]);
  const missingRequired=useMemo(()=>{
    const missing:string[]=[];
    if(!form.name.trim())missing.push("dealership name");
    if(!form.physical_location.trim())missing.push("location");
    if(!profile.profile_image_url)missing.push("profile picture");
    if(!(form.phone_number.trim()||form.whatsapp_number.trim()||form.contact_email.trim()))missing.push("customer contact");
    if(!hoursValid)missing.push("valid opening hours");
    if(!yearValid)missing.push("valid establishment year");
    return missing;
  },[form.contact_email,form.name,form.phone_number,form.physical_location,form.whatsapp_number,hoursValid,profile.profile_image_url,yearValid]);

  const profileComplete=missingRequired.length===0;
  const canPublish=context.verification_status==="approved"&&["active","past_due","grace_period"].includes(context.subscription_status)&&context.account_status==="active";
  const status=form.is_public&&context.showroom_status==="live"?"Live on LoadLink":profileComplete&&canPublish?"Ready to go live":"Setup in progress";

  async function save(){
    if(!hoursValid){setHoursOpen(true);setMessage("Fix the highlighted opening hours first. Every open day needs a closing time later than its opening time.");return;}
    if(!yearValid){setDetailsOpen(true);setMessage(`Enter an establishment year between 1800 and ${new Date().getFullYear()+1}.`);return;}
    const slugChanged=form.slug.trim()!==profile.slug;
    if(slugChanged&&!window.confirm(`Change your dealership link to /${form.slug.trim()}?`))return;
    const publishNow=profileComplete&&canPublish;
    setBusy(true); setMessage("");
    try{
      const payload={
        action:"save",
        ...form,
        name:form.name.trim(),
        slug:form.slug.trim(),
        physical_location:form.physical_location.trim(),
        contact_email:form.contact_email.trim(),
        phone_number:form.phone_number.trim(),
        whatsapp_number:form.whatsapp_number.trim(),
        website_url:form.website_url.trim(),
        year_established:form.year_established.trim(),
        trading_hours:serialiseHours(hours),
        is_public:publishNow,
      };
      const data=await dealerFetch<{profile:DealerProfile}>("/api/dealer/showroom",{method:"POST",body:JSON.stringify(payload)});
      onProfile(data.profile); setForm(toForm(data.profile)); setHours(parseHours(data.profile.trading_hours));
      if(publishNow){setMessage("Saved. Your public showroom has been updated with these changes.");}
      else if(!profileComplete){setDetailsOpen(true);setMessage(`Changes saved privately. To publish your showroom, still add: ${missingRequired.join(", ")}.`);}
      else{setMessage("Changes saved. Your showroom will stay private until Dealer access and verification are approved.");}
    }catch(error){
      const detail=error instanceof Error?error.message:"";
      setMessage(detail||"Your Dealer profile could not be saved. Check the form and try again.");
    }finally{setBusy(false)}
  }

  async function media(kind:"logo"|"cover",file?:File){
    if(!file)return; setMessage("");
    try{
      const size=await imageSize(file);
      if(kind==="logo"&&(size.width<600||size.height<600))setMessage("Profile picture uploaded. A square image of at least 600 × 600 will look sharper.");
      if(kind==="cover"&&(size.width<1400||size.width/Math.max(1,size.height)<2))setMessage("Cover uploaded. A wider image of at least 1400 px will look sharper.");
      const uploaded=await uploadDealerFile({bucket:"dealership-assets",dealershipId:context.dealership_id,file,allowedTypes:["image/jpeg","image/png","image/webp"],maxBytes:8*1024*1024,folder:kind});
      try{const data=await dealerFetch<{profile:DealerProfile}>("/api/dealer/showroom",{method:"POST",body:JSON.stringify({action:"media",kind,filename:file.name,mime:uploaded.mime,storage_path:uploaded.storage_path})});onProfile(data.profile);setMessage(kind==="logo"?"Profile picture updated.":"Cover picture updated.");}
      catch(error){await removeDealerUpload("dealership-assets",uploaded.storage_path);throw error}
    }catch(error){setMessage(error instanceof Error?error.message:"That image could not be uploaded. Check the file and try again.")}
  }

  const surface=darkMode?"border-white/10 bg-[#0c0c0c]":"border-black/10 bg-white";

  return <div className="mx-auto grid max-w-[1040px] gap-4 pb-28">
    <section className={`overflow-hidden rounded-[26px] border ${surface}`}>
      <div className="relative aspect-[16/6] min-h-[180px] overflow-hidden bg-[#111]">
        {profile.cover_image_url?<img src={profile.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70"/>:null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"/>
        <div className="absolute inset-x-5 bottom-5 flex items-end gap-4 text-white">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white/50 bg-black">{profile.profile_image_url?<img src={profile.profile_image_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center font-black">{form.name.slice(0,2).toUpperCase()}</div>}</div>
          <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black tracking-[-.04em]">{form.name||"Your dealership"}</h1><p className="mt-1 truncate text-xs font-semibold text-white/62">{form.short_bio||"Add a short line customers will see."}</p></div>
          <span className="rounded-full border border-white/16 bg-black/45 px-3 py-1.5 text-[10px] font-black">{status}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:flex"><input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void media("logo",e.target.files?.[0])}/><input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void media("cover",e.target.files?.[0])}/><SecondaryButton darkMode={darkMode} type="button" onClick={()=>logoRef.current?.click()}>Profile picture</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={()=>coverRef.current?.click()}>Cover picture</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" className="col-span-2 sm:ml-auto" onClick={()=>window.open(`/dealership/${profile.slug}`,"_blank")}>Open showroom</SecondaryButton></div>
    </section>

    {!profileComplete?<Surface darkMode={darkMode} className="rounded-[22px] p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">Finish your Dealer profile</h2><p className="mt-2 text-sm font-semibold leading-6 opacity-55">You can save at any time. These details are only required before the public showroom goes live.</p></div><span className="shrink-0 rounded-full border border-current/12 px-3 py-1.5 text-[10px] font-black">{missingRequired.length} missing</span></div><div className="mt-4 flex flex-wrap gap-2">{missingRequired.map(item=><button type="button" onClick={()=>{if(/hour/i.test(item))setHoursOpen(true);else setDetailsOpen(true)}} key={item} className="rounded-full border border-current/12 px-3 py-2 text-[10px] font-black capitalize">{item}</button>)}</div></Surface>:null}

    <Surface darkMode={darkMode} className="rounded-[22px] p-5"><h2 className="text-lg font-black">Public profile</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Dealership name<Input darkMode={darkMode} className="mt-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="text-xs font-black">Location<Input darkMode={darkMode} className="mt-1" value={form.physical_location} onChange={e=>setForm({...form,physical_location:e.target.value})} placeholder="Centurion, Gauteng"/></label><label className="text-xs font-black sm:col-span-2">Short bio<Input darkMode={darkMode} className="mt-1" maxLength={120} value={form.short_bio} onChange={e=>setForm({...form,short_bio:e.target.value})}/></label><label className="text-xs font-black sm:col-span-2">About<Textarea darkMode={darkMode} className="mt-1" value={form.business_description} onChange={e=>setForm({...form,business_description:e.target.value})}/></label></div></Surface>

    <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]"><button type="button" onClick={()=>setHoursOpen(v=>!v)} className="flex min-h-16 w-full items-center justify-between px-5 text-left"><div className="min-w-0"><div className="text-base font-black">Opening hours</div><div className="mt-1 max-w-[72vw] truncate text-xs opacity-45">{readableHours(hours)}</div></div><span className="text-xl opacity-40">{hoursOpen?"−":"+"}</span></button>{hoursOpen?<div className="border-t border-current/10 p-4 sm:p-5"><div className="grid gap-2">{days.map(day=>{const value=hours[day];return <div key={day} className="grid gap-2 rounded-[16px] border border-current/10 p-3 sm:grid-cols-[120px_1fr] sm:items-center"><div className="text-xs font-black">{day}</div><div className="grid min-w-0 grid-cols-[auto_1fr_auto_1fr] items-center gap-2"><button type="button" onClick={()=>setHours({...hours,[day]:{...value,closed:!value.closed}})} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black ${value.closed?"border-current/20 opacity-55":"border-[#f6b800] bg-[#f6b800] text-black"}`}>{value.closed?"Closed":"Open"}</button>{!value.closed?<><input aria-label={`${day} opening time`} type="time" value={value.open} onChange={e=>setHours({...hours,[day]:{...value,open:e.target.value}})} className={`min-w-0 rounded-xl border px-2 py-2 text-xs font-bold ${darkMode?"border-white/10 bg-white/[.04]":"border-black/10 bg-white"}`}/><span className="opacity-35">–</span><input aria-label={`${day} closing time`} type="time" value={value.close} onChange={e=>setHours({...hours,[day]:{...value,close:e.target.value}})} className={`min-w-0 rounded-xl border px-2 py-2 text-xs font-bold ${darkMode?"border-white/10 bg-white/[.04]":"border-black/10 bg-white"}`}/></>:<><span/><span/><span/></>}</div></div>})}</div>{!hoursValid?<p className="mt-3 text-xs font-bold text-red-500">Closing time must be later than opening time for every open day.</p>:null}</div>:null}</Surface>

    <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]"><button type="button" onClick={()=>setDetailsOpen(v=>!v)} className="flex min-h-16 w-full items-center justify-between px-5 text-left"><div><div className="text-base font-black">Contact & business details</div><div className="mt-1 text-xs opacity-45">Phone, WhatsApp, email, website and establishment year</div></div><span className="text-xl opacity-40">{detailsOpen?"−":"+"}</span></button>{detailsOpen?<div className="grid gap-3 border-t border-current/10 p-4 sm:grid-cols-2 sm:p-5"><label className="text-xs font-black">Phone<Input darkMode={darkMode} className="mt-1" type="tel" inputMode="tel" autoComplete="tel" value={form.phone_number} onChange={e=>setForm({...form,phone_number:e.target.value})}/></label><label className="text-xs font-black">WhatsApp<Input darkMode={darkMode} className="mt-1" type="tel" inputMode="tel" value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})}/></label><label className="text-xs font-black">Email<Input darkMode={darkMode} className="mt-1" type="email" value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})}/></label><label className="text-xs font-black">Website<Input darkMode={darkMode} className="mt-1" type="url" value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})}/></label><label className="text-xs font-black">Established<Input darkMode={darkMode} className={`mt-1 ${!yearValid?"!border-red-500":""}`} type="number" inputMode="numeric" min="1800" max={String(new Date().getFullYear()+1)} value={form.year_established} onChange={e=>setForm({...form,year_established:e.target.value.replace(/\D/g,"").slice(0,4)})}/></label><label className="text-xs font-black sm:col-span-2">Dealer page link<div className={`mt-1 flex h-11 items-center rounded-lg border px-3 ${darkMode?"border-white/10 bg-white/[.035]":"border-black/10 bg-white"}`}><span className="text-xs opacity-35">/dealership/</span><input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"/></div></label></div>:null}</Surface>

    {message?<div role="status" className={`rounded-[18px] border px-4 py-3 text-sm font-bold ${/fix|invalid|could not|not approved|required|between/i.test(message)?"border-red-500/25 bg-red-500/[.05] text-red-500":darkMode?"border-white/10 bg-white/[.03]":"border-black/10 bg-white"}`}>{message}</div>:null}

    <section className={`rounded-[22px] border p-4 ${darkMode?"border-white/10 bg-[#0c0c0c]":"border-black/10 bg-white"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-sm font-black">{profileComplete?"Ready to update your showroom":"Save your progress"}</div><div className="mt-1 text-xs opacity-45">{profileComplete?"Saving updates the public showroom immediately.":"Your changes can be saved now; the showroom stays private until the required details are complete."}</div></div><PrimaryButton type="button" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":"Save changes"}</PrimaryButton></div></section>
  </div>;
}
