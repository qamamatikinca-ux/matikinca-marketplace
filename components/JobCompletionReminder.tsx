"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {supabase} from "@/lib/supabaseClient";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";
type Due={id:string;title:string;listing_kind:string;work_starts_at:string};
function today(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Johannesburg",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
export default function JobCompletionReminder(){
 const pathname=usePathname();
 const [eligible,setEligible]=useState(false);
 const [newChatEntry,setNewChatEntry]=useState(false);
 useEffect(()=>{
  setEligible(false);
  // Show only on Home, or when a listing enquiry starts a new chat.
  // Existing conversations (?thread=...) and posting/verification routes never qualify.
  const startingChat=pathname==="/messages"&&new URLSearchParams(window.location.search).has("listing");
  setNewChatEntry(startingChat);
  if(pathname!=="/"&&!startingChat)return;
  const timer=window.setTimeout(()=>setEligible(true),pathname==="/"?9000:1200);
  return()=>window.clearTimeout(timer);
 },[pathname]);
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
    const {data,error:queryError}=await supabase.from("job_listings")
     .select("id,title,listing_kind,work_starts_at")
     .eq("user_id",user.id).eq("status","active").eq("listing_kind","job")
     .not("work_starts_at","is",null).lte("work_starts_at",`${today()}T21:59:59.999Z`)
     .order("work_starts_at",{ascending:true}).limit(15);
    if(queryError)throw queryError;
    const candidate=((data||[]) as Due[]).find(j=>{try{return localStorage.getItem(`loadlink-due-dismiss:${user.id}:${j.id}:${today()}`)!=="1"&&localStorage.getItem(`loadlink-due-complete:${user.id}:${j.id}`)!=="1"}catch{return true}});
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
   if(closeError)throw closeError;
   try{localStorage.setItem(`loadlink-due-complete:${poster}:${item.id}`,"1")}catch{}
   setStage("rate");
   window.dispatchEvent(new Event("loadlink:content-updated"));
  }catch(e){setError(e instanceof Error?e.message:"Could not confirm completion.")}
  finally{setBusy(false)}
 }
 if((pathname!=="/"&&!newChatEntry)||!eligible||!item)return null;
 return <aside role="region" aria-label="Job completion reminder"
  className="fixed bottom-[max(92px,env(safe-area-inset-bottom))] right-3 z-[1000] w-[min(345px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-black shadow-lg"
  style={{maxHeight:"min(68dvh,520px)"}}>
   <div className="flex items-start justify-between gap-3">
    <div><h2 className="text-base font-semibold">{stage==="ask"?"Was this job completed?":"Job marked completed"}</h2></div>
    <button type="button" onClick={dismiss} aria-label="Dismiss job reminder" className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-lg">×</button>
   </div>
   <p className="mt-2 line-clamp-2 text-xs font-semibold text-black/65">{item.title}</p>
   {stage==="ask"?<>
     <p className="mt-3 text-xs leading-5 text-black/60">The scheduled work date has arrived. Only the original poster can confirm completion.</p>
     {error?<p role="alert" className="mt-2 text-xs text-red-600">{error}</p>:null}
     <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" onClick={dismiss} className="min-h-11 rounded-xl border border-black/12 text-xs font-bold">Not yet</button>
      <button type="button" disabled={busy} onClick={()=>void complete()} className="min-h-11 rounded-xl bg-[#f6b800] px-3 text-xs font-black text-black disabled:opacity-40">{busy?"Saving…":"Yes, completed"}</button>
     </div>
    </>:<><CompletedDriverFeedback listingId={item.id} onDone={dismiss}/>
      <button type="button" onClick={dismiss} className="mt-3 text-xs font-bold underline">Done</button>
    </>}
  </aside>;
}
