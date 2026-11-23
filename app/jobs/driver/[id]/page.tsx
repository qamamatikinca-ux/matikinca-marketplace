"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/auth";
type Vacancy={
  id:string;user_id:string;listing_term:string;title:string;company_name:string;city:string;province:string;
  employment_type:string;licence_code:string;requires_prdp:boolean;min_years_experience:number;vehicle_type:string;
  pay_terms:string;starts_on:string|null;duration:string;description:string;status:string;created_at:string;
};
type DriverProfile={
  id:string;full_name:string;licence_code:string;years_experience:number;vehicle_types:string[]|null;
  status:string;prdp_expires_at:string|null;prdp_expiry:string|null;
};
type Application={id:string;status:string;created_at:string;message:string};
export default function DriverVacancyDetail(){
 const params=useParams();const router=useRouter();const {darkMode,toggleTheme}=useLoadLinkTheme();
 const id=String(params.id||"");const [vacancy,setVacancy]=useState<Vacancy|null>(null);
 const [profile,setProfile]=useState<DriverProfile|null>(null);const [userId,setUserId]=useState("");
 const [application,setApplication]=useState<Application|null>(null);
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const page=darkMode?"bg-black text-white":"bg-[#f4efe3] text-black";
 const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 useEffect(()=>{let active=true;(async()=>{setLoading(true);
  const [v,{data:{user}}]=await Promise.all([supabase.from("driver_vacancies").select("*").eq("id",id).maybeSingle(),supabase.auth.getUser()]);
  if(!active)return;setVacancy(v.data as Vacancy|null);if(v.error)setError(v.error.message);
  if(user){setUserId(user.id);
    const {data:p}=await supabase.from("driver_profiles").select("id,full_name,licence_code,years_experience,vehicle_types,status,prdp_expires_at,prdp_expiry").eq("user_id",user.id).maybeSingle();
    if(!active)return;setProfile(p as DriverProfile|null);
    const {data:a}=await supabase.from("driver_vacancy_applications").select("id,status,created_at,message").eq("vacancy_id",id).eq("driver_user_id",user.id).maybeSingle();
    if(active)setApplication(a as Application|null);
  }
  if(active)setLoading(false);
 })();return()=>{active=false}},[id]);
 async function apply(e:FormEvent){e.preventDefault();if(busy||!vacancy)return;
  if(!userId){router.push(loginHref(`/jobs/driver/${id}`));return}
  if(!profile){router.push("/driver-profile");return}
  setBusy(true);setError("");
  const {data,error:dbError}=await supabase.from("driver_vacancy_applications").insert({
    vacancy_id:id,driver_user_id:userId,driver_profile_id:profile.id,message:message.trim()
  }).select("id,status,created_at,message").single();
  if(dbError){setError(dbError.code==="23505"?"You have already applied for this opportunity.":dbError.message);}
  else{setApplication(data as Application);setMessage("")}
  setBusy(false);
 }
 async function withdraw(){if(!application||busy)return;if(!window.confirm("Withdraw this application? The employer will see the withdrawn status."))return;setBusy(true);setError("");
  const {data,error:dbError}=await supabase.from("driver_vacancy_applications").update({status:"withdrawn"}).eq("id",application.id).select("id,status,created_at,message").single();
  if(dbError)setError(dbError.message);else setApplication(data as Application);setBusy(false);
 }
 const exactLicence=profile?.licence_code?.trim().toUpperCase()===vacancy?.licence_code?.trim().toUpperCase();
 const exp=(profile?.years_experience||0)>=(vacancy?.min_years_experience||0);
 const currentPrdp=profile?.prdp_expires_at||profile?.prdp_expiry;
 const prdpOk=!vacancy?.requires_prdp||(Boolean(currentPrdp)&&currentPrdp! >=new Date().toISOString().slice(0,10));
 return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
 <section className="mx-auto max-w-4xl px-4 py-10">
   <Link href="/jobs?category=professional-driver" className="text-sm font-semibold underline">Back to driver opportunities</Link>
   {loading?<p className="mt-8">Loading…</p>:!vacancy?<p className="mt-8" role="alert">This vacancy is unavailable.</p>:<>
    <div className={`mt-5 rounded-2xl border p-6 ${surface}`}>
      <p className="text-xs font-bold uppercase opacity-55">{vacancy.listing_term==="contract"?"Driver contract":"Driver job"}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{vacancy.title}</h1>
      <p className="mt-2 text-sm opacity-65">{vacancy.company_name} · {vacancy.city}{vacancy.province?", "+vacancy.province:""}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
       {([["Driving licence",vacancy.licence_code],["Minimum experience",vacancy.min_years_experience+" years"],["Professional permit",vacancy.requires_prdp?"PrDP required":"Check vacancy conditions"],["Vehicle",vacancy.vehicle_type||"See job description"],["Employment type",vacancy.employment_type.replace("_"," ")],["Salary / terms",vacancy.pay_terms||"Discuss with employer"],["Start date",vacancy.starts_on||"To be agreed"],["Contract duration",vacancy.duration||"Not specified"]] as const).map(([label,value])=><div key={label}><dt className="text-xs font-semibold opacity-55">{label}</dt><dd className="mt-1 text-sm font-bold">{value}</dd></div>)}
      </dl>
      <h2 className="mt-7 text-lg font-black">Responsibilities and requirements</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{vacancy.description}</p>
      <p className="mt-5 text-xs opacity-60">LoadLink provides the application record. The employer remains responsible for recruitment, document checks and employment decisions.</p>
    </div>
    {vacancy.user_id===userId?<div className={`mt-4 rounded-2xl border p-5 ${surface}`}><h2 className="font-black">Your opportunity</h2><p className="mt-1 text-sm opacity-65">Review applicants and their submitted professional profiles.</p><Link className="mt-4 inline-flex rounded-xl bg-[#f6b800] px-5 py-3 text-sm font-black text-black" href="/messages/recruitment">Review applications</Link></div>
    :<div className={`mt-4 rounded-2xl border p-5 sm:p-6 ${surface}`}>
      <h2 className="text-xl font-black">Apply with LoadLink Profile</h2>
      {application?<div className="mt-3"><p className="text-sm font-semibold">Your application: <strong>{application.status.replaceAll("_"," ")}</strong></p><p className="mt-1 text-xs opacity-65">Submitted {new Date(application.created_at).toLocaleDateString("en-ZA")}</p>{!["withdrawn","hired","unsuccessful"].includes(application.status)?<button onClick={()=>void withdraw()} disabled={busy} className="mt-3 rounded-xl border border-current/20 px-4 py-2 text-xs font-bold">Withdraw application</button>:null}</div>
      :vacancy.status!=="open"?<p className="mt-2 text-sm">This vacancy is closed for applications.</p>
      :!userId?<Link className="mt-3 inline-flex rounded-xl bg-[#f6b800] px-4 py-3 text-sm font-bold text-black" href={loginHref(`/jobs/driver/${id}`)}>Sign in to apply</Link>
      :!profile?<div><p className="mt-2 text-sm">Complete your existing Driver Profile to apply.</p><Link className="mt-3 inline-flex rounded-xl bg-[#f6b800] px-4 py-3 text-sm font-bold text-black" href="/driver-profile">Complete Driver Profile</Link></div>
      :<form onSubmit={apply} className="mt-4 space-y-3">
        <p className="text-sm">You are submitting your saved driver details. Review these before applying.</p>
        <div className="grid gap-2 rounded-xl border border-current/15 p-4 text-sm">
         <p><strong>Name:</strong> {profile.full_name}</p><p><strong>Licence:</strong> {profile.licence_code} {exactLicence?"(corresponds)":"(different to requested)"}</p>
         <p><strong>Experience:</strong> {profile.years_experience} years {exp?"(meets minimum)":"(below stated minimum)"}</p>
         <p><strong>PrDP:</strong> {vacancy.requires_prdp?(prdpOk?"Expiry record appears current":"Needs review"):"Not stated as required"}</p>
         <p><strong>Profile status:</strong> {profile.status}</p>
        </div>
        <label className="block text-sm font-bold">Message to employer (optional)<textarea className={`mt-2 min-h-24 w-full rounded-xl border border-current/20 bg-transparent p-3 text-sm`} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Introduce yourself and your availability."/></label>
        <p className="text-xs opacity-60">Only a snapshot of the professional fields above and your message is submitted. Private ID and licence scans are not sent automatically.</p>
        <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-[#f6b800] px-6 text-sm font-black text-black">{busy?"Submitting…":"Submit driver application"}</button>
      </form>}
      {error?<p className="mt-3 text-sm text-red-600" role="alert">{error}</p>:null}
    </div>}
   </>}
 </section></main>
}
