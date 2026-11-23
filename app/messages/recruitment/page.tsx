"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/auth";
type Vacancy={id:string;title:string;company_name:string;user_id:string;listing_term:string};
type Application={id:string;vacancy_id:string;driver_user_id:string;driver_profile_id:string;status:string;profile_snapshot:{driver_name?:string;licence_code?:string;years_experience?:number;vehicle_types?:string[];profile_status?:string};message:string;created_at:string};
type Msg={id:string;application_id:string;sender_user_id:string;body:string;created_at:string};
const RECRUITER_STATUSES=["under_review","shortlisted","interview","offered","unsuccessful"];
export default function RecruitmentMessagesPage(){
  const {darkMode,toggleTheme}=useLoadLinkTheme();
  const [userId,setUserId]=useState("");const [vacancies,setVacancies]=useState<Vacancy[]>([]);
  const [apps,setApps]=useState<Application[]>([]);const [selected,setSelected]=useState("");
  const [msgs,setMsgs]=useState<Msg[]>([]);const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const page=darkMode?"bg-black text-white":"bg-[#f4efe3] text-black";
  const surface=darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white";
  const selectedApp=apps.find(x=>x.id===selected)||null;
  const currentVacancy=vacancies.find(x=>x.id===selectedApp?.vacancy_id);
  const recruiter=currentVacancy?.user_id===userId;
  const loadApps=useCallback(async(uid:string)=>{
    const [{data:jobs,error:jerr},{data:mine,error:aerr}]=await Promise.all([
      supabase.from("driver_vacancies").select("id,title,company_name,user_id,listing_term").eq("user_id",uid).order("created_at",{ascending:false}).limit(100),
      supabase.from("driver_vacancy_applications").select("id,vacancy_id,driver_user_id,driver_profile_id,status,profile_snapshot,message,created_at").eq("driver_user_id",uid).order("created_at",{ascending:false}).limit(100)
    ]);
    const owned=(jobs||[]) as Vacancy[];let recruiterApps:Application[]=[];
    if(owned.length){const r=await supabase.from("driver_vacancy_applications").select("id,vacancy_id,driver_user_id,driver_profile_id,status,profile_snapshot,message,created_at").in("vacancy_id",owned.map(x=>x.id)).order("created_at",{ascending:false}).limit(150);
      if(r.error)throw r.error;recruiterApps=(r.data||[]) as Application[];}
    if(jerr||aerr)throw(jerr||aerr);
    const union=[...(mine||[]) as Application[],...recruiterApps];
    const unique=Array.from(new Map(union.map(x=>[x.id,x])).values());
    const allIds=[...new Set(unique.map(x=>x.vacancy_id))];
    const r=allIds.length?await supabase.from("driver_vacancies").select("id,title,company_name,user_id,listing_term").in("id",allIds):{data:[],error:null};
    if(r.error)throw r.error;
    setVacancies([...(r.data||[]) as Vacancy[],...owned.filter(x=>!allIds.includes(x.id))]);
    setApps(unique);
    setSelected(prev=>unique.find(x=>x.id===prev)?.id||unique[0]?.id||"");
  },[]);
  useEffect(()=>{let mounted=true;(async()=>{const{data:{user}}=await supabase.auth.getUser();if(!mounted)return;
    if(!user){window.location.assign(loginHref("/messages/recruitment"));return;}
    setUserId(user.id);
    try{await loadApps(user.id)}catch(e){if(mounted)setError(e instanceof Error?e.message:"Failed to load applications")}
    finally{if(mounted)setLoading(false);}
  })();return()=>{mounted=false}},[loadApps]);
  const refreshMessages=useCallback(async()=>{if(!selected)return;
    const{data,error:dbError}=await supabase.from("driver_application_messages").select("id,application_id,sender_user_id,body,created_at").eq("application_id",selected).order("created_at",{ascending:true}).limit(200);
    if(dbError){setError(dbError.message);return;}
    setMsgs((data||[]) as Msg[]);
  },[selected]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void refreshMessages()},0);return()=>window.clearTimeout(timer)},[refreshMessages]);
  async function send(e:FormEvent){e.preventDefault();if(!selected||!draft.trim()||busy)return;setBusy(true);setError("");
    const{error:dbError}=await supabase.from("driver_application_messages").insert({application_id:selected,sender_user_id:userId,body:draft.trim()});
    if(dbError)setError(dbError.message);else{setDraft("");await refreshMessages()}setBusy(false);
  }
  async function updateStatus(status:string){if(!selectedApp||busy)return;setBusy(true);setError("");
    const{error:dbError}=await supabase.from("driver_vacancy_applications").update({status}).eq("id",selectedApp.id);
    if(dbError)setError(dbError.message);else await loadApps(userId);
    setBusy(false);
  }
  const possibleStatuses=recruiter?[...RECRUITER_STATUSES,...(selectedApp?.status==="accepted"?["hired"]:[])]:selectedApp?.status==="offered"?["accepted","withdrawn"]:["withdrawn"];
  return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
    <section className="mx-auto max-w-6xl px-4 py-9">
      <Link className="text-sm font-semibold underline" href="/messages">Back to Messages</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div>
        <h1 className="text-3xl font-black tracking-tight">Driver applications</h1>
        <p className="mt-1 text-sm opacity-65">Review applications and communicate securely inside LoadLink.</p>
      </div></div>
      {error?<div role="alert" className="mt-4 rounded-xl border border-red-500/30 p-3 text-sm text-red-600">{error}</div>:null}
      <div className="mt-6 grid min-h-[560px] gap-4 md:grid-cols-[310px_minmax(0,1fr)]">
       <aside className={`rounded-2xl border ${surface}`}>
        <h2 className="border-b border-current/10 px-4 py-4 text-sm font-black">Application conversations</h2>
        {loading?<p className="p-4 text-sm">Loading…</p>:!apps.length?<p className="p-4 text-sm opacity-65">No driver applications yet. Posted driver opportunities and new applications will appear here.</p>
        :apps.map(a=>{const v=vacancies.find(x=>x.id===a.vacancy_id);return <button key={a.id} type="button" onClick={()=>setSelected(a.id)} className={`block w-full border-b border-current/10 p-4 text-left ${selected===a.id?"bg-[#f6b800]/10":""}`}>
          <p className="text-sm font-black">{v?.user_id===userId?a.profile_snapshot?.driver_name||"Driver applicant":v?.company_name||"Employer"}</p>
          <p className="mt-1 text-xs opacity-70">{v?.title||"Driver opportunity"}</p>
          <p className="mt-1 text-[11px] font-semibold opacity-55">{a.status.replaceAll("_"," ")}</p>
        </button>})}
       </aside>
       <section className={`flex min-w-0 flex-col rounded-2xl border ${surface}`}>
         {!selectedApp?<div className="flex flex-1 items-center justify-center p-6 text-sm opacity-65">Select an application to read messages.</div>:<>
          <header className="border-b border-current/10 p-4">
            <h2 className="text-lg font-black">{currentVacancy?.title||"Driver opportunity"}</h2>
            <p className="mt-1 text-sm opacity-65">{recruiter?"Applicant: "+(selectedApp.profile_snapshot?.driver_name||"Driver"):currentVacancy?.company_name}</p>
            <p className="mt-2 text-xs">Status: <strong>{selectedApp.status.replaceAll("_"," ")}</strong></p>
            {recruiter?<p className="mt-1 text-xs opacity-70">Licence: {selectedApp.profile_snapshot?.licence_code||"Not recorded"} · {selectedApp.profile_snapshot?.years_experience??"?"} years declared · Profile: {selectedApp.profile_snapshot?.profile_status||"Unknown"}</p>:null}
            <div className="mt-3 flex flex-wrap gap-2">{possibleStatuses.map(s=><button disabled={busy||s===selectedApp.status} key={s} onClick={()=>void updateStatus(s)} type="button" className="rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold disabled:opacity-40">{s.replaceAll("_"," ")}</button>)}</div>
            <p className="mt-2 text-[11px] opacity-55">Recruitment outcomes require the appropriate employer and driver confirmations. Uploaded credentials are not government-certified by LoadLink.</p>
          </header>
          <div className="max-h-[56vh] min-h-56 flex-1 space-y-3 overflow-y-auto p-4">
            {selectedApp.message?<div className="max-w-[85%] rounded-xl bg-[#f6b800]/10 p-3 text-sm"><strong>Original application:</strong><p className="mt-1 whitespace-pre-wrap">{selectedApp.message}</p></div>:null}
            {msgs.map(m=><div key={m.id} className={`max-w-[88%] rounded-xl p-3 text-sm ${m.sender_user_id===userId?"ml-auto bg-[#f6b800]/15":"bg-black/5 dark:bg-white/10"}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className="mt-2 text-[10px] opacity-55">{new Date(m.created_at).toLocaleString("en-ZA")}</p></div>)}
            {!msgs.length?<p className="text-xs opacity-50">Start a conversation about requirements, availability or next steps.</p>:null}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-current/10 p-3">
            <input className={`min-w-0 flex-1 rounded-xl border border-current/15 bg-transparent px-4 py-3 text-sm`} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={3000} placeholder="Message the other participant…"/>
            <button disabled={busy||!draft.trim()} className="rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40" type="submit">Send</button>
          </form>
         </>}
       </section>
      </div>
    </section>
  </main>;
}
