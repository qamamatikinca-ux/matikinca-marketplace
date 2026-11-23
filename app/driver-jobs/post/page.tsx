"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/auth";

type VacancyInput = {
  title:string; company_name:string; city:string; province:string;
  employment_type:"permanent"|"fixed_term"|"temporary"|"contract";
  licence_code:string; requires_prdp:boolean; min_years_experience:string;
  vehicle_type:string; pay_terms:string; starts_on:string; duration:string; description:string;
};
const EMPTY:VacancyInput={title:"",company_name:"",city:"",province:"",
  employment_type:"contract",licence_code:"EC",requires_prdp:true,min_years_experience:"0",
  vehicle_type:"",pay_terms:"",starts_on:"",duration:"",description:""};
const LICENSES=["C1","C","EC1","EC","B","EB"];
function DriverVacancyForm(){
  const router=useRouter();const query=useSearchParams();const {darkMode,toggleTheme}=useLoadLinkTheme();
  const term=query.get("term")==="contract"?"contract":"job";
  const [step,setStep]=useState(1);const [form,setForm]=useState<VacancyInput>(EMPTY);
  const [ready,setReady]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [accountId,setAccountId]=useState("");
  const update=<K extends keyof VacancyInput>(key:K,value:VacancyInput[K])=>setForm(s=>({...s,[key]:value}));
  const page=darkMode?"bg-black text-white":"bg-[#f4efe3] text-black";
  const surface=darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white";
  const input=`mt-2 h-12 w-full rounded-[15px] border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode?"border-white/20 bg-[#181818] text-white":"border-black/15 bg-[#fafafa] text-black"}`;
  useEffect(()=>{let active=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();
    if(!active)return;if(!user){router.replace(loginHref(`/driver-jobs/post?term=${term}`));return;}
    setAccountId(user.id);const key=`loadlink-driver-vacancy-draft:${user.id}:${term}`;
    try{const draft=JSON.parse(localStorage.getItem(key)||"null");if(draft)setForm({...EMPTY,...draft});}catch{}
    const {data:profile}=await supabase.from("profiles").select("company_name,full_name").eq("id",user.id).maybeSingle();
    setForm(s=>({...s,company_name:s.company_name||String(profile?.company_name||profile?.full_name||"")}));
    setReady(true);
  })();return()=>{active=false}},[router,term]);
  useEffect(()=>{if(accountId&&ready)localStorage.setItem(`loadlink-driver-vacancy-draft:${accountId}:${term}`,JSON.stringify(form))},[accountId,term,form,ready]);
  function validate(current:number){
    if(current===1&&(!form.company_name.trim()||!form.title.trim()||form.title.trim().length<5||!form.city.trim()))return "Enter the company name, role title and location.";
    if(current===2&&(!form.licence_code||!Number.isInteger(Number(form.min_years_experience))||Number(form.min_years_experience)<0||Number(form.min_years_experience)>60))return "Confirm the licence and valid experience requirement.";
    if(current===3&&form.description.trim().length<20)return "Describe the duties and employment requirements (at least 20 characters).";
    return "";
  }
  function next(){const problem=validate(step);if(problem){setError(problem);return;}setError("");setStep(s=>Math.min(4,s+1))}
  async function submit(event:FormEvent){event.preventDefault();if(busy||!accountId)return;
    for(const stage of [1,2,3]){const problem=validate(stage);if(problem){setStep(stage);setError(problem);return;}}
    setBusy(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();if(!user||user.id!==accountId)throw Error("Sign in again to publish.");
      const payload={user_id:user.id,listing_term:term,title:form.title.trim(),company_name:form.company_name.trim(),
        city:form.city.trim(),province:form.province.trim(),employment_type:form.employment_type,
        licence_code:form.licence_code,requires_prdp:form.requires_prdp,min_years_experience:Number(form.min_years_experience),
        vehicle_type:form.vehicle_type.trim(),pay_terms:form.pay_terms.trim(),starts_on:form.starts_on||null,
        duration:form.duration.trim(),description:form.description.trim()};
      const {data,error:dbError}=await supabase.from("driver_vacancies").insert(payload).select("id").single();
      if(dbError)throw dbError;
      localStorage.removeItem(`loadlink-driver-vacancy-draft:${user.id}:${term}`);
      router.replace(`/driver-jobs/${data.id}`);
    }catch(e){setError(e instanceof Error?e.message:"Could not publish this driver opportunity. Your draft is saved.");}
    finally{setBusy(false)}
  }
  const field=(label:string,key:keyof VacancyInput,placeholder="",type="text")=><label className="block text-xs font-bold">{label}<input className={input} type={type} value={String(form[key])} placeholder={placeholder} onChange={e=>update(key as keyof VacancyInput,e.target.value as never)} /></label>;
  return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-5">
      <Link href={term==="contract"?"/contracts/post":"/jobs/list"} className="text-xs font-semibold underline">Back to posting choices</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Post a driver {term==="contract"?"contract":"job"}</h1>
      <p className="mt-2 text-sm opacity-70">Hire a professional driver for your truck or fleet. This is not a request for someone to supply a truck.</p>
      <p className="mt-6 text-xs font-bold opacity-65">Step {step} of 4</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-[#f6b800]" style={{width:`${step*25}%`}}/></div>
      <form onSubmit={submit} className={`mt-5 space-y-5 rounded-[24px] border p-5 sm:p-7 ${surface}`}>
        {!ready?<p role="status">Loading your account…</p>:step===1?<div className="grid gap-4">
          <h2 className="text-xl font-black">Who are you hiring?</h2>
          {field("Company or employer name","company_name","Business name")}
          {field("Driver position","title","e.g. Code EC Superlink Driver")}
          <div className="grid gap-4 sm:grid-cols-2">{field("City or operating area","city","Johannesburg")}{field("Province","province","Gauteng")}</div>
          <label className="block text-xs font-bold">Engagement type<select className={input} value={form.employment_type} onChange={e=>update("employment_type",e.target.value as VacancyInput["employment_type"])}>
            <option value="permanent">Permanent employment</option><option value="fixed_term">Fixed-term employment</option>
            <option value="temporary">Temporary work</option><option value="contract">Contract engagement</option>
          </select></label>
        </div>:step===2?<div className="grid gap-4">
          <h2 className="text-xl font-black">Driver qualifications</h2>
          <label className="block text-xs font-bold">Required driving licence<select className={input} value={form.licence_code} onChange={e=>update("licence_code",e.target.value)}>
            {LICENSES.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-xl border border-current/15 p-3 text-sm font-semibold"><input type="checkbox" checked={form.requires_prdp} onChange={e=>update("requires_prdp",e.target.checked)}/>PrDP required for this role</label>
          {field("Minimum years of experience","min_years_experience","3","number")}
          {field("Vehicle type or configuration","vehicle_type","e.g. Superlink, Tautliner")}
          <p className="text-xs opacity-65">Driver credentials are reviewed through existing LoadLink Driver Profiles. Uploading a document does not automatically verify it.</p>
        </div>:step===3?<div className="grid gap-4">
          <h2 className="text-xl font-black">Work and payment arrangements</h2>
          {field("Start date (optional)","starts_on","","date")}
          {term==="contract"?field("Contract duration","duration","e.g. 12 months"):null}
          {field("Salary / rate and payment basis","pay_terms","e.g. R18,000/month plus applicable allowances")}
          <label className="block text-xs font-bold">Role, routes, responsibilities and conditions<textarea className={`${input} min-h-44 py-3`} value={form.description} onChange={e=>update("description",e.target.value)} placeholder="What will the driver do? State vehicle duties, route, working conditions, and any relevant requirements."/></label>
        </div>:<div className="grid gap-3">
          <h2 className="text-xl font-black">Review driver opportunity</h2>
          {([["Position",form.title],["Company",form.company_name],["Location",form.city+", "+form.province],["Licence",form.licence_code],["PrDP",form.requires_prdp?"Required":"Not specified as required"],["Experience",form.min_years_experience+" years"],["Vehicle",form.vehicle_type||"Not specified"],["Pay",form.pay_terms||"To be discussed"],["Duties",form.description]] as const).map(([label,value])=><div key={label} className="border-b border-current/10 py-2 text-sm"><span className="font-semibold opacity-55">{label}:</span> <span className="font-medium">{value}</span></div>)}
          <p className="text-xs opacity-65">This advert will identify your business as the poster. It is not an endorsement or employment guarantee from LoadLink.</p>
        </div>}
        {error?<p role="alert" className="rounded-xl border border-red-500/30 p-3 text-xs font-bold text-red-600">{error}</p>:null}
        <div className="flex gap-3">{step>1?<button type="button" className="h-12 rounded-xl border border-current/20 px-5 text-sm font-bold" onClick={()=>{setStep(s=>s-1);setError("")}}>Back</button>:null}
          {step<4?<button className="h-12 flex-1 rounded-xl bg-[#f6b800] px-5 text-sm font-bold text-black" type="button" onClick={next} disabled={!ready}>Continue</button>
          :<button className="h-12 flex-1 rounded-xl bg-[#f6b800] px-5 text-sm font-bold text-black disabled:opacity-50" type="submit" disabled={busy}>{busy?"Publishing…":"Publish driver opportunity"}</button>}
        </div>
      </form>
    </section>
  </main>;
}
export default function DriverVacancyPostPage(){return <Suspense fallback={<p>Loading…</p>}><DriverVacancyForm/></Suspense>}
