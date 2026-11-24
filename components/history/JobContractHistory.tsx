"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {loginHref} from "@/lib/auth";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";

type Kind="job"|"contract";
type ClosedItem={
 listing_id:string;thread_id:string|null;closed_by:string;
 title:string;listing_kind:string;city:string;rate:string;
 outcome:"completed"|"cancelled"|"no_agreement";note:string;closed_at:string;
};
const date=(value:string)=>new Date(value).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"});
export default function JobContractHistory({kind}:{kind:Kind}){
 const {darkMode}=useLoadLinkTheme();
 const [rows,setRows]=useState<ClosedItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [userId,setUserId]=useState("");
 const [ratingListing,setRatingListing]=useState("");
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError)throw authError;
    if(!user){window.location.assign(loginHref("/history"));return}
    if(!active)return;
    setUserId(user.id);
    const result=await supabase.from("job_closures")
      .select("listing_id,thread_id,closed_by,title,listing_kind,city,rate,outcome,note,closed_at")
      .eq("listing_kind",kind).order("closed_at",{ascending:false}).limit(100);
    if(result.error)throw result.error;
    if(active)setRows((result.data||[]) as ClosedItem[]);
   }catch(e){if(active)setError(e instanceof Error?e.message:"History could not load.")}
   finally{if(active)setLoading(false)}
  };
  void load();
  const refresh=()=>{if(!document.hidden)void load()};
  window.addEventListener("loadlink:content-updated",refresh);
  return()=>{active=false;window.removeEventListener("loadlink:content-updated",refresh)};
 },[kind]);
 const complete=rows.filter(item=>item.outcome==="completed"),other=rows.filter(item=>item.outcome!=="completed");
 const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 return <section aria-label={kind==="job"?"Job history":"Contract history"} className={`min-w-0 rounded-[20px] border p-5 sm:p-6 ${surface}`}>
  <div className="flex items-start justify-between gap-3">
   <div><h2 className="text-xl font-black tracking-[-.035em]">{kind==="job"?"Completed jobs":"Completed contracts"}</h2>
    <p className="mt-1 text-xs leading-5 opacity-60">Only work marked completed by the original poster counts as verified LoadLink history.</p></div>
   {!loading&&!error?<span className="shrink-0 rounded-full bg-[#f6b800] px-3 py-1.5 text-xs font-black text-black">{complete.length} verified</span>:null}
  </div>
  {loading?<p className="mt-5 text-sm opacity-65">Loading records…</p>:
   error?<p role="alert" className="mt-5 text-sm text-red-600">{error}</p>:
   !rows.length?<div className="mt-6 border-t border-current/10 pt-5">
     <p className="text-sm font-semibold">{kind==="job"?"No completed jobs yet.":"No completed contracts yet."}</p>
     <p className="mt-1 text-sm leading-6 opacity-60">When the original poster confirms completed {kind==="job"?"work":"contract work"}, the record will appear here.</p>
   </div>:<>
     {!complete.length?<p className="mt-5 border-t border-current/10 pt-5 text-sm opacity-65">No confirmed completed {kind==="job"?"jobs":"contracts"} yet. The original poster must confirm completed work before it appears here.</p>:null}
     <div className="mt-5 divide-y divide-current/10 border-t border-current/10">{complete.map(item=><article key={item.listing_id} className="py-4">
       <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="break-words text-sm font-bold">{item.title}</h3>
         <p className="mt-1 text-xs opacity-60">{[item.city,date(item.closed_at)].filter(Boolean).join(" · ")}</p></div>
        <span className="shrink-0 rounded-full bg-[#269c58] px-2.5 py-1.5 text-[10px] font-black uppercase text-white">Completed</span>
       </div>
       <p className="mt-2 text-xs opacity-60">Confirmed by the original poster · Recorded on LoadLink</p>
       <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold underline underline-offset-4">Record details</summary>
        <div className="mt-3 space-y-2 border-l-2 border-[#f6b800] pl-3 text-xs leading-5">
         {item.rate?<p><strong>Advertised rate:</strong> {item.rate}</p>:null}
         {item.note?<p className="whitespace-pre-wrap"><strong>Poster note:</strong> {item.note}</p>:null}
         {item.thread_id?<Link href={`/messages?listing=${encodeURIComponent(item.listing_id)}`} className="block font-bold underline">View conversation</Link>:null}
         {item.closed_by===userId?<div>
          <button type="button" onClick={()=>setRatingListing(v=>v===item.listing_id?"":item.listing_id)} className="font-bold underline">Rate assigned driver</button>
          {ratingListing===item.listing_id?<CompletedDriverFeedback listingId={item.listing_id} onDone={()=>setRatingListing("")}/>:null}
         </div>:null}
        </div>
       </details>
      </article>)}</div>
     {other.length?<details className="mt-4 border-t border-current/10 pt-4">
      <summary className="cursor-pointer text-xs font-bold opacity-65">Other closed records ({other.length}) · Not verified completed work</summary>
      <div className="mt-3 divide-y divide-current/10">{other.map(item=><div key={item.listing_id} className="py-3">
       <p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs opacity-60">{date(item.closed_at)} · {item.outcome==="cancelled"?"Cancelled":"Closed without agreement"} · Not counted as completed</p>
      </div>)}</div>
     </details>:null}
   </>}
 </section>;
}