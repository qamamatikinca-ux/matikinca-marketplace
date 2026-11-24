"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import CompletedDriverFeedback from "@/components/CompletedDriverFeedback";

type Outcome="completed"|"cancelled"|"no_agreement";
export default function JobConversationStatusDialog({listingId,threadId,listingTitle,listingKind="job",onExit}:{listingId:string;threadId:string;listingTitle:string;listingKind?:"job"|"contract";onExit:()=>void}){
 const [choice,setChoice]=useState<Outcome>("completed");
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
   listing_id:listingId,thread_id:threadId,closed_by:user.id,outcome:choice,note:note.trim()
  });
  if(writeError){
   if(writeError.code==="23505"){onExit();return;}
   setError(writeError.message||"Could not close this listing.");
   setBusy(false);return;
  }
  if(choice==="completed")setRateAfterClose(true);
  else onExit();
 }
 if(rateAfterClose)return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/65 px-3 py-4">
   <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-black">
    <h2 className="text-xl font-black">Work completed</h2>
    <CompletedDriverFeedback listingId={listingId} onDone={onExit}/>
    <button type="button" onClick={onExit} className="mt-4 text-xs font-bold underline">Finish</button>
   </div>
 </div>;
 return <div role="dialog" aria-modal="true" aria-labelledby="job-closure-title" className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/65 px-3 py-4 backdrop-blur-sm">
  <section className="max-h-[min(90dvh,680px)] w-full max-w-sm overflow-y-auto rounded-[24px] border border-black/10 bg-white p-5 text-black shadow-2xl sm:p-6">
   <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#9a7000]">LoadLink history</p>
   <h2 id="job-closure-title" className="mt-1 text-2xl font-black tracking-[-.04em]">Is this {listingKind} closed?</h2>
   <p className="mt-2 text-sm leading-6 text-black/60">Only the original poster can close <strong className="text-black">{listingTitle}</strong>. Closed work moves to History.</p>
   <fieldset className="mt-5 grid gap-2">
    <legend className="mb-2 text-xs font-black">Outcome</legend>
    {([["completed","Yes, work completed"],["cancelled","Closed / cancelled"],["no_agreement","No agreement reached"]] as const).map(([value,label])=>
     <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold ${choice===value?"border-[#e3aa24] bg-[#f6b800]/10":"border-black/10"}`}>
      <input type="radio" name="job-outcome" checked={choice===value} onChange={()=>setChoice(value)}/>{label}
     </label>
    )}
   </fieldset>
   <label className="mt-4 block text-xs font-bold">Note (optional)
    <textarea maxLength={1500} value={note} onChange={e=>setNote(e.target.value)}
     placeholder="Add a brief record" className="mt-2 min-h-16 w-full rounded-xl border border-black/15 bg-white p-3 text-sm font-normal outline-none focus:border-[#f6b800]"/>
   </label>
   {error?<p role="alert" className="mt-3 text-xs font-bold text-red-600">{error}</p>:null}
   <div className="mt-4 flex gap-2">
    <button type="button" disabled={busy} onClick={onExit} className="min-h-11 flex-1 rounded-xl border border-black/15 text-sm font-bold">Still open</button>
    <button type="button" disabled={busy} onClick={()=>void closeJob()} className="min-h-11 flex-1 rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{busy?"Saving…":`Close ${listingKind}`}</button>
   </div>
  </section>
 </div>;
}
