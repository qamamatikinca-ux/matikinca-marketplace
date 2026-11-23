"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import LoadLinkImage from "@/components/LoadLinkImage";
import {supabase} from "@/lib/supabaseClient";

type Vacancy={id:string;user_id:string;title:string;company_name:string;city:string;province:string;listing_term:string;employment_type:string;licence_code:string;min_years_experience:number;requires_prdp:boolean;vehicle_type:string;pay_terms:string;description:string;created_at:string};
type Profile={licence_code:string;years_experience:number;prdp_expiry:string|null;prdp_expires_at:string|null;status:string};
export default function DriverVacancyResults({term,keyword,city,darkMode}:{term:"job"|"contract";keyword:string;city:string;darkMode:boolean}){
 const [rows,setRows]=useState<Vacancy[]>([]);const [licence,setLicence]=useState("");
 const [page,setPage]=useState(0);const [total,setTotal]=useState(0);const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");const [profile,setProfile]=useState<Profile|null>(null);const pageSize=12;
 const surface=darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white";
 const control=darkMode?"border-white/20 bg-[#111] text-white":"border-black/15 bg-white text-black";
 useEffect(()=>{let active=true;(async()=>{const{data:{user}}=await supabase.auth.getUser();
   if(!user)return;const{data}=await supabase.from("driver_profiles").select("licence_code,years_experience,prdp_expiry,prdp_expires_at,status").eq("user_id",user.id).maybeSingle();
   if(active)setProfile(data as Profile|null);
 })();return()=>{active=false}},[]);
 useEffect(()=>{let active=true;const fetchPage=async()=>{
   setLoading(true);setError("");
   let query=supabase.from("driver_vacancies")
     .select("id,user_id,title,company_name,city,province,listing_term,employment_type,licence_code,min_years_experience,requires_prdp,vehicle_type,pay_terms,description,created_at",{count:"exact"})
     .eq("listing_term",term).eq("status","open").order("created_at",{ascending:false}).range(page*pageSize,page*pageSize+pageSize-1);
   if(licence)query=query.eq("licence_code",licence);
   const cleanKeyword=keyword.trim().replace(/[%_,;()]/g,"").slice(0,90);
   const cleanCity=city.trim().replace(/[%_,;()]/g,"").slice(0,90);
   if(cleanKeyword)query=query.ilike("title",`%${cleanKeyword}%`);
   if(cleanCity)query=query.ilike("city",`%${cleanCity}%`);
   const {data,count,error:dbError}=await query;
   if(!active)return;
   setRows((data||[]) as Vacancy[]);setTotal(count||0);setError(dbError?.message||"");setLoading(false);
 };void fetchPage();return()=>{active=false}},[term,keyword,city,licence,page]);
 function suitability(v:Vacancy){
  if(!profile)return null;
  const same=profile.licence_code?.trim().toUpperCase()===v.licence_code.toUpperCase();
  const exp=(profile.years_experience||0)>=v.min_years_experience;
  const expiry=profile.prdp_expires_at||profile.prdp_expiry;
  const prdp=!v.requires_prdp||Boolean(expiry&&expiry>=new Date().toISOString().slice(0,10));
  return same&&exp&&prdp?"Your recorded qualifications appear to meet these requirements":"Check your qualifications against this role";
 }
 const countLabel=`${total} driver ${total===1?term:term+"s"}`;
 return <section aria-label={term==="job"?"Professional driver vacancies":"Professional driver contracts"} className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-xl font-black">Professional Driver {term==="job"?"Jobs":"Contracts"}</h3><p className="mt-1 text-xs font-semibold opacity-60">{loading?"Loading opportunities…":countLabel}</p></div>
   <label className="block text-xs font-semibold">Licence category
    <select className={`mt-1.5 h-11 rounded-xl border px-3 text-sm ${control}`} value={licence} onChange={e=>{setLicence(e.target.value);setPage(0)}}>
     <option value="">All licence categories</option>{["B","EB","C1","C","EC1","EC"].map(x=><option key={x} value={x}>{x}</option>)}
    </select>
   </label>
  </div>
  {loading?<div className={`min-h-28 animate-pulse rounded-2xl border ${surface}`}/>:error?<p role="alert" className="rounded-xl border border-red-500/30 p-4 text-sm text-red-600">Could not load driver opportunities: {error}</p>
  :!rows.length?<p className={`rounded-2xl border p-6 text-sm opacity-70 ${surface}`}>No driver opportunities match these filters. Try another location, licence or search term.</p>
  :<div className="grid gap-4">{rows.map(v=><article key={v.id} className={`overflow-hidden rounded-[22px] border ${surface}`}>
    <div className="grid md:grid-cols-[200px_minmax(0,1fr)]">
     <div className="relative min-h-36 overflow-hidden bg-black">
      <LoadLinkImage src="/images/driver-profile-hero.jpg" alt="Professional driver opportunity" className="absolute inset-0 h-full w-full object-cover"/>
     </div>
     <div className="p-5">
      <h4 className="text-xl font-black tracking-tight">{v.title}</h4>
      <p className="mt-1 text-sm font-semibold opacity-65">{v.company_name} · {v.city}{v.province?", "+v.province:""}</p>
      <p className="mt-3 text-sm">Licence: <strong>{v.licence_code}</strong> · Minimum {v.min_years_experience} years · {v.requires_prdp?"PrDP required":"PrDP not specified as required"}</p>
      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 opacity-70">{v.description}</p>
      {profile?<p className="mt-2 text-xs font-semibold opacity-70">{suitability(v)}. This is not automatic employer approval.</p>:null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-3">
       <span className="text-xs font-semibold opacity-70">{v.pay_terms||"Rate discussed with employer"}</span>
       <Link href={`/jobs/driver/${v.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">View details</Link>
      </div>
     </div>
    </div>
   </article>)}</div>}
   <div className="flex items-center gap-3 pt-2">
    {page>0?<button type="button" onClick={()=>setPage(p=>Math.max(0,p-1))} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${control}`}>Previous</button>:null}
    <span className="text-xs font-semibold opacity-60">Page {page+1} of {Math.max(1,Math.ceil(total/pageSize))}</span>
    {(page+1)*pageSize<total?<button type="button" onClick={()=>setPage(p=>p+1)} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${control}`}>Next</button>:null}
   </div>
 </section>;
}
