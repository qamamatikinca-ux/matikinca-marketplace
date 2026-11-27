"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";

export default function JobConversationStatusDialog({listingId,threadId,listingTitle,listingKind="job",onExit,onCompleted}:{listingId:string;threadId:string;listingTitle:string;listingKind?:"job"|"contract";onExit:()=>void;onCompleted?:()=>void}){
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [rateAfterClose,setRateAfterClose]=useState(false);
 async function closeJob(){
  if(busy)return;
  setBusy(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Sign in to close your listing.");setBusy(false);return;}
  const {error:writeError}=await supabase.from("job_closures").insert({
   listing_id:listingId,thread_id:threadId,closed_by:user.id,outcome:"completed",note:note.trim()
  });
  if(writeError){
   if(writeError.code==="23505"){
    const existing=await supabase.from("job_closures").select("outcome")
      .eq("listing_id",listingId).eq("closed_by",user.id).maybeSingle();
    if(!existing.error&&existing.data?.outcome==="completed"){
      onCompleted?.();setRateAfterClose(true);setBusy(false);return;
    }
   }
   setError(/lifecycle|constraint|violates check/i.test(writeError.message||"")
     ? "History could not save the listing status. Please retry; your listing has not been changed."
     : writeError.message||"Could not confirm completion. Please retry.");
   setBusy(false);return;
  }
  onCompleted?.();
  setRateAfterClose(true);
 }
 if(rateAfterClose)return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/65 px-3 py-4">
   <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-black">
    <h2 className="text-xl font-black">Work completed</h2>
    <CompletedDriverFeedback listingId={listingId} onDone={onExit}/>
    <button type="button" onClick={onExit} className="mt-4 text-xs font-bold underline">Finish</button>
   </div>
 </div>;
 return <div role="dialog" aria-modal="true" aria-labelledby="job-closure-title" className="fixed inset-0 z-[2147483600] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-5">
  <section className="my-auto max-h-[min(86dvh,620px)] w-full max-w-[430px] overflow-y-auto rounded-[22px] border border-black/10 bg-white p-5 text-black shadow-xl sm:p-6">
   <div className="flex items-center gap-2 text-xs font-semibold text-black/50"><span className="h-2 w-2 rounded-full bg-[#f6b800]"/>LoadLink History</div>
   <h2 id="job-closure-title" className="mt-3 text-[23px] font-bold leading-tight tracking-tight">Mark {listingKind} as completed?</h2>
   <p className="mt-3 break-words text-sm font-semibold leading-6 text-black/85">{listingTitle}</p>
   <p className="mt-2 text-[13px] leading-5 text-black/60">Only the original poster can confirm finished work. Confirming moves this listing to History and makes the conversation read-only.</p>
   <label className="mt-5 block border-t border-black/10 pt-4 text-xs font-semibold">Completion note <span className="font-normal text-black/50">(optional)</span>
    <textarea maxLength={1500} value={note} onChange={e=>setNote(e.target.value)}
     placeholder="Add a brief record of the completed work" className="mt-2 min-h-[84px] w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-sm font-normal outline-none focus:border-[#c38d00]"/>
   </label>
   {error?<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium leading-5 text-red-700">{error}</p>:null}
   <div className="mt-4 grid grid-cols-2 gap-2">
    <button type="button" disabled={busy} onClick={onExit} className="min-h-12 rounded-xl border border-black/15 bg-white px-3 text-sm font-semibold disabled:opacity-50">Still open</button>
    <button type="button" disabled={busy} onClick={()=>void closeJob()} className="min-h-12 rounded-xl bg-[#f6b800] px-3 text-sm font-bold text-black disabled:opacity-50">{busy?"Saving…":"Confirm completed"}</button>
   </div>
  </section>
 </div>;
}
