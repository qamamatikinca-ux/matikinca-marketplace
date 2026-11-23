"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
const STATES=[
 {value:"still_discussing",label:"Still discussing"},
 {value:"agreement_reached",label:"We reached an agreement"},
 {value:"in_progress",label:"Transport is in progress"},
 {value:"completed_reported",label:"Work has been completed"},
 {value:"pending_confirmation",label:"Awaiting confirmation"},
 {value:"no_agreement",label:"No agreement reached"},
 {value:"cancelled",label:"Arrangement cancelled"},
 {value:"disputed",label:"There's a disagreement"}
] as const;
export default function JobConversationStatusDialog({listingId,threadId,listingTitle,onExit}:{listingId:string;threadId:string;listingTitle:string;onExit:()=>void}){
 const [status,setStatus]=useState<(typeof STATES)[number]["value"]>("still_discussing");
 const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function save(){if(busy)return;setBusy(true);setError("");
  const{data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Sign in to save your status.");setBusy(false);return}
  const{error:dbError}=await supabase.from("job_chat_status_updates").insert({listing_id:listingId,thread_id:threadId,user_id:user.id,status,note:note.trim()});
  if(dbError){setError(dbError.message);setBusy(false);return}
  onExit();
 }
 return <div role="dialog" aria-modal="true" aria-labelledby="job-chat-status-title" className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/70 p-4">
  <section className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[24px] border border-black/10 bg-white p-5 text-black shadow-2xl">
   <h2 id="job-chat-status-title" className="text-xl font-black">Update your job history</h2>
   <p className="mt-2 text-sm text-black/65">What happened with <strong>{listingTitle}</strong>? This is your status report, not automatic proof that both parties agreed.</p>
   <fieldset className="mt-4 space-y-2"><legend className="sr-only">Current job progress</legend>
    {STATES.map(s=><label key={s.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 p-3 text-sm font-semibold">
     <input type="radio" name="job-status" checked={status===s.value} onChange={()=>setStatus(s.value)}/>{s.label}
    </label>)}
   </fieldset>
   <label className="mt-4 block text-sm font-bold">Note (optional)<textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/15 p-3 text-sm" maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add details you want to keep with this job."/></label>
   {error?<p role="alert" className="mt-3 text-xs font-bold text-red-600">{error}</p>:null}
   <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={onExit} className="min-h-12 flex-1 rounded-xl border border-black/15 text-sm font-bold">Not now</button><button type="button" disabled={busy} onClick={()=>void save()} className="min-h-12 flex-1 rounded-xl bg-[#f6b800] text-sm font-black">{busy?"Saving…":"Save & exit"}</button></div>
   <p className="mt-3 text-[11px] leading-5 text-black/55">You can update this later from Job & Contract History. No agreement or completion is assumed when you skip.</p>
  </section>
 </div>;
}
