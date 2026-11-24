"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { loginHref } from "@/lib/auth";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";

type ClosedItem = {
  listing_id: string; thread_id: string; closed_by: string;
  title: string; listing_kind: string; city: string; rate: string;
  outcome: "completed" | "cancelled" | "no_agreement"; note: string; closed_at: string;
};
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {day:"numeric",month:"short",year:"numeric"});
}
function outcomeLabel(value: ClosedItem["outcome"]) {
  return value === "completed" ? "Completed" : value === "cancelled" ? "Cancelled" : "Closed · no agreement";
}
export default function JobContractHistory() {
  const {darkMode}=useLoadLinkTheme();
  const [rows,setRows]=useState<ClosedItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [userId,setUserId]=useState("");
  const [ratingListing,setRatingListing]=useState("");
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try {
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(!mounted)return;
        if(authError)throw authError;
        if(!user){window.location.assign(loginHref("/history"));return;}
        if(mounted)setUserId(user.id);
        const result=await supabase.from("job_closures")
          .select("listing_id,thread_id,closed_by,title,listing_kind,city,rate,outcome,note,closed_at")
          .order("closed_at",{ascending:false}).limit(100);
        if(result.error)throw result.error;
        if(mounted)setRows((result.data||[]) as ClosedItem[]);
      }catch(e){if(mounted)setError(e instanceof Error?e.message:"Unable to load History.");}
      finally{if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false;};
  },[]);
  const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {(["job","contract"] as const).map(kind=>{
        const list=rows.filter(row=>row.listing_kind===kind);
        const title=kind==="job"?"Job history":"Contract history";
        return <section key={kind} aria-label={title} className={`min-w-0 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-[-.035em]">{title}</h2>
            {!loading&&list.length>0?<span className="text-xs font-bold opacity-55">{list.length}</span>:null}
          </div>
          {loading?<p className="mt-5 text-sm opacity-60">Loading history…</p>
          :error?<p role="alert" className="mt-4 text-sm text-red-600">History could not load. {error}</p>
          :!list.length?<p className="mt-4 text-sm leading-6 opacity-60">
            {kind==="job"?"Completed jobs and closed job discussions will appear here.":"Completed contracts and closed agreements will appear here."}
          </p>
          :<div className="mt-4 divide-y divide-current/10">{list.map(item=>
            <details key={item.listing_id} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs opacity-60">{[item.city,formatDate(item.closed_at)].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${item.outcome==="completed"?"border-[#d4a225]/40 bg-[#f6b800]/10":"border-current/15"}`}>{outcomeLabel(item.outcome)}</span>
              </summary>
              <div className="mt-3 rounded-xl border border-current/10 p-3 text-xs leading-6">
                {item.rate?<p><strong>Rate:</strong> {item.rate}</p>:null}
                {item.note?<p className="mt-1 whitespace-pre-wrap">{item.note}</p>:null}
                {item.thread_id?<Link className="mt-2 inline-block font-bold underline underline-offset-4" href={`/messages?listing=${encodeURIComponent(item.listing_id)}`}>View conversation</Link>:null}
                {item.outcome==="completed"&&item.closed_by===userId?
                  <div className="mt-3">
                    <button type="button" onClick={()=>setRatingListing(old=>old===item.listing_id?"":item.listing_id)} className="font-black underline underline-offset-4">Rate assigned driver</button>
                    {ratingListing===item.listing_id?<CompletedDriverFeedback listingId={item.listing_id} onDone={()=>setRatingListing("")}/>:null}
                  </div>:null}
              </div>
            </details>
          )}</div>}
        </section>;
      })}
    </div>
  );
}
