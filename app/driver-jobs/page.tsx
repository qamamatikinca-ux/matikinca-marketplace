"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
type Vacancy={id:string;title:string;company_name:string;city:string;province:string;listing_term:"job"|"contract";employment_type:string;licence_code:string;requires_prdp:boolean;min_years_experience:number;vehicle_type:string;pay_terms:string;created_at:string;};
type Profile={licence_code:string;years_experience:number;prdp_expires_at:string|null;prdp_expiry:string|null;vehicle_types:string[]|null;status:string};
function DriverJobSearch(){
 const query=useSearchParams();const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [term,setTerm]=useState(query.get("term")==="contract"?"contract":"job");
 const [licence,setLicence]=useState("");const [city,setCity]=useState("");
 const [rows,setRows]=useState<Vacancy[]>([]);const [profile,setProfile]=useState<Profile|null>(null);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [page,setPage]=useState(0);
 const pageClass=darkMode?"bg-black text-white":"bg-[#f4efe3] text-black",surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 useEffect(()=>{let alive=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const{data}=await supabase.from("driver_profiles").select("licence_code,years_experience,prdp_expires_at,prdp_expiry,vehicle_types,status").eq("user_id",user.id).maybeSingle();if(alive)setProfile(data as Profile|null)})();return()=>{alive=false}},[]);
 useEffect(()=>{let alive=true;const fetchRows=async()=>{
   let request=supabase.from("driver_vacancies").select("id,title,company_name,city,province,listing_term,employment_type,licence_code,requires_prdp,min_years_experience,vehicle_type,pay_terms,created_at",{count:"exact"}).eq("status","open").eq("listing_term",term).order("created_at",{ascending:false}).range(page*12,page*12+11);
   if(licence)request=request.eq("licence_code",licence);
   if(city.trim())request=request.ilike("city",`%${city.trim().replace(/[%_]/g,"")}%`);
   const{data,error:dbError}=await request;if(!alive)return;setRows((data||[]) as Vacancy[]);setError(dbError?.message||"");setLoading(false);
 };void fetchRows();return()=>{alive=false}},[term,licence,city,page]);
 function match(v:Vacancy){if(!profile)return null;const licOk=profile.licence_code?.trim().toUpperCase()===v.licence_code.trim().toUpperCase();
   const expOk=(profile.years_experience||0)>=v.min_years_experience;
   const prdpExpiry=profile.prdp_expires_at||profile.prdp_expiry;
   const prdpOk=!v.requires_prdp||(prdpExpiry?prdpExpiry>=new Date().toISOString().slice(0,10):false);
   return licOk&&expOk&&prdpOk?"Potential match":(!licOk?"Different licence recorded":"Review requirements");
 }
 return <main className={`min-h-screen ${pageClass}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
 <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
  <p className="text-xs font-black uppercase tracking-wider opacity-60">LoadLink employment opportunities</p>
  <h1 className="mt-2 text-4xl font-black tracking-tight">Find driving work</h1>
  <p className="mt-2 max-w-3xl text-sm leading-6 opacity-65">Jobs for professional drivers, not loads requiring you to own a truck. Employers set the requirements; your Driver Profile can help you apply.</p>
  <div className="mt-6 flex flex-wrap gap-3"><Link href="/driver-jobs/post?term=job" className="rounded-xl bg-[#f6b800] px-5 py-3 text-sm font-black text-black">Post driver job</Link><Link href="/driver-jobs/post?term=contract" className={`rounded-xl border px-5 py-3 text-sm font-bold ${surface}`}>Post driver contract</Link><Link href="/driver-jobs/applications" className={`rounded-xl border px-5 py-3 text-sm font-bold ${surface}`}>Applications</Link></div>
  <div className={`mt-7 grid gap-4 rounded-2xl border p-4 sm:grid-cols-3 ${surface}`}>
   <label className="text-xs font-bold">Opportunity type<select className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm" value={term} onChange={e=>{setTerm(e.target.value as "job"|"contract");setPage(0)}}><option value="job">Driver jobs</option><option value="contract">Driver contracts</option></select></label>
   <label className="text-xs font-bold">Licence category<select className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm" value={licence} onChange={e=>{setLicence(e.target.value);setPage(0)}}><option value="">All licences</option>{["B","EB","C1","C","EC1","EC"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-xs font-bold">Location<input className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm" placeholder="Search city" value={city} onChange={e=>{setCity(e.target.value);setPage(0)}}/></label>
  </div>
  <div className="mt-6 grid gap-3 md:grid-cols-2">
   {loading?<p>Loading opportunities…</p>:error?<p role="alert" className="text-sm text-red-600">Could not load vacancies: {error}. <button className="underline" onClick={()=>setPage(p=>p)}>Retry</button></p>:rows.length===0?<p className="text-sm">No driver opportunities match these filters.</p>:rows.map(v=><article className={`rounded-2xl border p-5 ${surface}`} key={v.id}>
    <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black">{v.title}</h2><span className="rounded-lg border border-current/15 px-2 py-1 text-[10px] font-semibold">{v.listing_term==="contract"?"Contract":"Job"}</span></div>
    <p className="mt-1 text-sm opacity-65">{v.company_name} · {v.city}{v.province?", "+v.province:""}</p>
    <p className="mt-3 text-sm">Licence {v.licence_code} · {v.min_years_experience}+ years · {v.vehicle_type||"Vehicle type specified in details"}</p>
    {profile?<p className="mt-2 text-xs font-bold">{match(v)} <span className="font-medium opacity-60">— based on your profile, not an employment decision.</span></p>:null}
    <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold opacity-75">{v.pay_terms||"Terms discussed with employer"}</p><Link className="rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black" href={`/driver-jobs/${v.id}`}>View & apply</Link></div>
   </article>)}
  </div>
  <div className="mt-6 flex gap-3"><button type="button" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="rounded-xl border border-current/15 px-5 py-2 text-sm disabled:opacity-40">Previous</button><span className="self-center text-sm opacity-65">Page {page+1}</span><button type="button" disabled={rows.length<12} onClick={()=>setPage(p=>p+1)} className="rounded-xl border border-current/15 px-5 py-2 text-sm disabled:opacity-40">Next</button></div>
 </section></main>;
}
export default function DriverJobsPage(){return <Suspense fallback={<p>Loading opportunities…</p>}><DriverJobSearch/></Suspense>}
