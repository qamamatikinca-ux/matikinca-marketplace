"use client";
import {useEffect,useState} from "react";
import {usePathname,useSearchParams} from "next/navigation";
import {supabase} from "@/lib/supabaseClient";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";
type Due={id:string;title:string;listing_kind:"job"|"contract";work_starts_at:string|null;work_ends_at:string|null};
function zaDate(value:string){try{return new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Johannesburg",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}catch{return "9999-12-31"}}
function today(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Johannesburg",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
export default function JobCompletionReminder(){
 const pathname=usePathname();
 const searchParams=useSearchParams();
 // The query can change without the pathname changing. An existing chat
 // must never receive the new-enquiry reminder.
 const newChatEntry=pathname==="/messages" && searchParams.has("listing") && !searchParams.has("thread");
 const reminderRoute=pathname==="/" ? "home" : newChatEntry ? "new-enquiry" : "";
 const [readyRoute,setReadyRoute]=useState("");
 useEffect(()=>{
  if(!reminderRoute)return;
  const timer=window.setTimeout(()=>setReadyRoute(reminderRoute),reminderRoute==="home"?9000:1200);
  return()=>window.clearTimeout(timer);
 },[reminderRoute]);
 const eligible=Boolean(reminderRoute&&readyRoute===reminderRoute);
 const [item,setItem]=useState<Due|null>(null);
 const [poster,setPoster]=useState("");
 const [stage,setStage]=useState<"ask"|"rate">("ask");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!eligible)return;
  let active=true;
  const check=async()=>{
   try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!active||!user)return;
    // Jobs may be confirmed after their work date; contracts only after
    // their recorded end date. This mirrors the actual job_closures RLS rule.
    const [jobs,contracts]=await Promise.all([
     supabase.from("job_listings").select("id,title,listing_kind,work_starts_at,work_ends_at")
      .eq("user_id",user.id).eq("status","active").eq("moderation_status","approved").eq("listing_kind","job")
      .not("work_starts_at","is",null).order("work_starts_at",{ascending:true}).limit(75),
     supabase.from("job_listings").select("id,title,listing_kind,work_starts_at,work_ends_at")
      .eq("user_id",user.id).eq("status","active").eq("moderation_status","approved").eq("listing_kind","contract")
      .not("work_ends_at","is",null).order("work_ends_at",{ascending:true}).limit(75)
    ]);
    if(jobs.error)throw jobs.error;
    if(contracts.error)throw contracts.error;
    const date=today();
    const candidate=([...(jobs.data||[]),...(contracts.data||[])] as Due[])
     .filter(j=>{
      const due=j.listing_kind==="contract" ? j.work_ends_at : j.work_ends_at||j.work_starts_at;
      return due&&zaDate(due)<=date;
     })
     .sort((a,b)=>String(a.work_ends_at||a.work_starts_at).localeCompare(String(b.work_ends_at||b.work_starts_at)))
     .find(j=>{try{return localStorage.getItem(`loadlink-due-dismiss:${user.id}:${j.id}:${date}`)!=="1"
      &&localStorage.getItem(`loadlink-due-complete:${user.id}:${j.id}`)!=="1"}catch{return true}});
    if(active){setPoster(user.id);setStage("ask");setItem(candidate||null);}
   }catch{/* A reminder must never interrupt ordinary browsing. */}
  };
  void check();
  return()=>{active=false};
 },[eligible]);
 function dismiss(){
  if(item)try{localStorage.setItem(`loadlink-due-dismiss:${poster}:${item.id}:${today()}`,"1")}catch{}
  setItem(null);setError("");
 }
 async function complete(){
  if(!item||!poster||busy)return;
  setBusy(true);setError("");
  try{
   const {error:closeError}=await supabase.from("job_closures").insert({
    listing_id:item.id,thread_id:null,closed_by:poster,outcome:"completed",note:"Confirmed complete after scheduled work date."
   });
   if(closeError){
    // A second device may submit completion while this prompt is open.
    if(closeError.code==="23505"){
     const existing=await supabase.from("job_closures").select("outcome")
      .eq("listing_id",item.id).eq("closed_by",poster).maybeSingle();
     if(!existing.error&&existing.data?.outcome==="completed"){
      try{localStorage.setItem(`loadlink-due-complete:${poster}:${item.id}`,"1")}catch{}
      setStage("rate");
      return;
     }
    }
    throw closeError;
   }
   try{localStorage.setItem(`loadlink-due-complete:${poster}:${item.id}`,"1")}catch{}
   setStage("rate");
   window.dispatchEvent(new Event("loadlink:content-updated"));
  }catch(e){setError(e instanceof Error?e.message:"Could not confirm completion.")}
  finally{setBusy(false)}
 }
 if(!eligible||!item)return null;
 return <aside role="region" aria-label="Job completion reminder"
  className="fixed bottom-[max(92px,env(safe-area-inset-bottom))] right-3 z-[1000] w-[min(345px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-black shadow-lg"
  style={{maxHeight:"min(68dvh,520px)"}}>
   <div className="flex items-start justify-between gap-3">
    <div><h2 className="text-base font-semibold">{stage==="ask"?`Was this ${item.listing_kind} completed?`:`${item.listing_kind==="contract"?"Contract":"Job"} added to History`}</h2></div>
    <button type="button" onClick={dismiss} aria-label="Dismiss job reminder" className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-lg">×</button>
   </div>
   <p className="mt-2 line-clamp-2 text-xs font-semibold text-black/65">{item.title}</p>
   {stage==="ask"?<>
     <p className="mt-3 text-xs leading-5 text-black/60">{item.listing_kind==="contract"?"The contract end date has passed. Only the original poster can confirm completion.":"The scheduled work date has arrived. Only the original poster can confirm completion."}</p>
     {error?<p role="alert" className="mt-2 text-xs text-red-600">{error}</p>:null}
     <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" onClick={dismiss} className="min-h-11 rounded-xl border border-black/12 text-xs font-bold">Not yet</button>
      <button type="button" disabled={busy} onClick={()=>void complete()} className="min-h-11 rounded-xl bg-[#f6b800] px-3 text-xs font-black text-black disabled:opacity-40">{busy?"Saving…":"Yes, completed"}</button>
     </div>
    </>:<>{item.listing_kind==="job"?<CompletedDriverFeedback listingId={item.id} onDone={dismiss}/>:<p className="mt-3 text-xs leading-5 text-black/60">The completed contract is saved in LoadLink History.</p>}
      <button type="button" onClick={dismiss} className="mt-3 text-xs font-bold underline">Done</button>
    </>}
  </aside>;
}
