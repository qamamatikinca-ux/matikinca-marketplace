"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {supabase} from "@/lib/supabaseClient";
import {loginHref} from "@/lib/auth";
type Profile={
 id:string;full_name:string;headline:string|null;city:string|null;province:string|null;licence_code:string|null;licence_expiry:string|null;
 prdp_expiry:string|null;licence_expires_at:string|null;prdp_expires_at:string|null;years_experience:number|null;
 vehicle_types:string[]|null;route_experience:string[]|null;languages:string[]|null;previous_roles:string|null;
 availability:string|null;verification_level:string|null;status:string;bio:string|null;
};
type Reference={id:string;referee_name:string|null;referee_company:string|null;verification_status:string;verified_at:string|null};
type Assignment={id:string;driver_display_name:string;vehicle_registration:string;assignment_date:string|null;status:string;created_at:string;listing_id:string};
export default function DriverCareerPassport(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [profile,setProfile]=useState<Profile|null>(null);const [references,setReferences]=useState<Reference[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [includeDeclared,setIncludeDeclared]=useState(true);const [includeAssignments,setIncludeAssignments]=useState(true);
 const page=darkMode?"bg-black text-white":"bg-[#f4efe3] text-black";
 const panel=darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white";
 useEffect(()=>{let active=true;(async()=>{const{data:{user}}=await supabase.auth.getUser();
  if(!active)return;if(!user){location.assign(loginHref("/driver-career-passport"));return;}
  const {data:p,error:pe}=await supabase.from("driver_profiles").select("id,full_name,headline,city,province,licence_code,licence_expiry,prdp_expiry,licence_expires_at,prdp_expires_at,years_experience,vehicle_types,route_experience,languages,previous_roles,availability,verification_level,status,bio").eq("user_id",user.id).maybeSingle();
  if(!active)return;if(pe)setError(pe.message);
  setProfile(p as Profile|null);
  const [r,a]=await Promise.all([
   p?.id?supabase.from("driver_references").select("id,referee_name,referee_company,verification_status,verified_at").eq("driver_profile_id",p.id).order("created_at",{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),
   supabase.from("job_driver_assignments").select("id,driver_display_name,vehicle_registration,assignment_date,status,created_at,listing_id").eq("driver_user_id",user.id).order("created_at",{ascending:false}).limit(100)
  ]);
  if(!active)return;
  if(r.error||a.error)setError((r.error||a.error)?.message||"Could not read complete records");
  setReferences((r.data||[]) as Reference[]);setAssignments((a.data||[]) as Assignment[]);setLoading(false);
 })();return()=>{active=false}},[]);
 const verified=references.filter(x=>x.verification_status==="verified"||x.verification_status==="confirmed");
 const completed=assignments.filter(x=>x.status==="completed");
 const body=useMemo(()=>{
  if(!profile)return "";
  return [
    "LOADLINK PROFESSIONAL DRIVER CAREER PASSPORT","Logistics Made Easier","",
    profile.full_name,
    [profile.city,profile.province].filter(Boolean).join(", "),
    profile.headline||"Professional Driver","",
    "PROFESSIONAL CREDENTIALS",
    "Licence category: "+(profile.licence_code||"Not recorded"),
    "Licence expiry: "+(profile.licence_expires_at||profile.licence_expiry||"Not recorded"),
    "PrDP expiry: "+(profile.prdp_expires_at||profile.prdp_expiry||"Not recorded"),
    "Profile review status: "+profile.status,
    "Verification level: "+(profile.verification_level||"No additional confirmation recorded"),
    "",
    "EXPERIENCE",
    "Years declared: "+(profile.years_experience??"Not recorded"),
    "Vehicle configurations: "+(profile.vehicle_types?.join(", ")||"Not recorded"),
    "Routes: "+(profile.route_experience?.join(", ")||"Not recorded"),
    "Languages: "+(profile.languages?.join(", ")||"Not recorded"),
    "Availability: "+(profile.availability||"Not stated"),
    ...(includeDeclared?["Previous roles (self-declared): "+(profile.previous_roles||"None recorded"),"About: "+(profile.bio||"")]:[]),
    ...(includeAssignments?["","LOADLINK ASSIGNMENTS CONFIRMED COMPLETE",
      ...completed.map((x,i)=>`${i+1}. ${x.assignment_date||x.created_at.slice(0,10)} · ${x.vehicle_registration||"Vehicle not supplied"} · Job ${x.listing_id.slice(0,8)}`)]:[]),
    "","CONFIRMED EMPLOYER REFERENCES",
    ...verified.map(x=>(x.referee_company||"Employer")+" — "+(x.referee_name||"Reference")+" (confirmed "+(x.verified_at?.slice(0,10)||"date not recorded")+")"),
    "","Disclaimer: self-declared qualifications and experience are distinguished from confirmed records. This document is not an official government licence-verification certificate. Private identity and medical evidence are not included."
  ].join("\n");
 },[profile,verified,completed,includeDeclared,includeAssignments]);
 async function copy(){try{await navigator.clipboard.writeText(body);setNotice("Professional profile copied.");}catch{setNotice("Your browser blocked copying.");}}
 return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-3xl font-black tracking-tight">Driver Career Passport</h1><p className="mt-2 text-sm opacity-65">Your professional LoadLink information, qualifications, completed assignments and confirmed references.</p></div>
    <Link className="rounded-xl border border-current/15 px-4 py-3 text-sm font-bold" href="/driver-profile">Edit Driver Profile</Link>
   </div>
   {error?<p role="alert" className="mt-5 text-sm text-red-600">{error}</p>:null}
   {notice?<p role="status" className="mt-5 text-sm">{notice}</p>:null}
   {loading?<p className="mt-6 text-sm">Loading your professional records…</p>:!profile?<div className={`mt-6 rounded-xl border p-5 ${panel}`}>
     <p className="text-sm">You need an existing LoadLink Driver Profile before generating a Career Passport.</p>
     <Link className="mt-3 inline-flex rounded-xl bg-[#f6b800] px-5 py-3 text-sm font-black text-black" href="/driver-profile">Create Driver Profile</Link>
    </div>:<div className="mt-7 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
     <section className={`h-fit rounded-2xl border p-5 ${panel}`}>
      <h2 className="text-lg font-black">{profile.full_name}</h2><p className="mt-1 text-sm opacity-65">{profile.headline||"Professional driver"}</p>
      <div className="mt-4 space-y-3 border-t border-current/10 pt-4 text-sm">
       <p><strong>Driver review:</strong> {profile.status}</p>
       <p><strong>Driving experience:</strong> {profile.years_experience??"Not recorded"} years declared</p>
       <p><strong>Completed LoadLink assignments:</strong> {completed.length}</p>
       <p><strong>Confirmed references:</strong> {verified.length}</p>
      </div>
      <label className="mt-5 flex gap-3 text-sm"><input type="checkbox" checked={includeDeclared} onChange={e=>setIncludeDeclared(e.target.checked)}/>Include self-declared career information</label>
      <label className="mt-3 flex gap-3 text-sm"><input type="checkbox" checked={includeAssignments} onChange={e=>setIncludeAssignments(e.target.checked)}/>Include completed LoadLink trips</label>
      <button type="button" onClick={()=>void copy()} className="mt-5 w-full rounded-xl bg-[#f6b800] px-4 py-3 text-sm font-black text-black">Copy Career Passport</button>
      <p className="mt-3 text-xs leading-5 opacity-60">This document is generated from your records. It will not disclose stored identity documents, scans or private evidence.</p>
      <Link href="/driver-assignments" className="mt-3 inline-flex text-sm font-bold underline">My transport assignments</Link>
     </section>
     <section className={`min-w-0 rounded-2xl border p-4 ${panel}`}><LoadLinkDocumentPreview darkMode={darkMode} documentType="Professional Driver Career Passport" body={body}/></section>
    </div>}
  </section></main>;
}
