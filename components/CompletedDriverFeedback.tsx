"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";

type Assignment={id:string;listing_id:string;driver_profile_id:string;driver_display_name:string;status:string};
type Previous={assignment_id:string;driver_profile_id:string};
export default function CompletedDriverFeedback({listingId,onDone}:{listingId:string;onDone:()=>void}){
 const {darkMode}=useLoadLinkTheme();
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [loading,setLoading]=useState(true);
 const [index,setIndex]=useState(0);
 const [rating,setRating]=useState(5);
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [poster,setPoster]=useState("");
 useEffect(()=>{
  let alive=true;
  void(async()=>{
   try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)throw new Error("Please sign in to rate a completed driver.");
    const [assigned,old]=await Promise.all([
     supabase.from("job_driver_assignments").select("id,listing_id,driver_profile_id,driver_display_name,status")
      .eq("listing_id",listingId).in("status",["accepted","in_transit","delivery_reported","completed"]),
     supabase.from("driver_completion_feedback").select("assignment_id,driver_profile_id").eq("listing_id",listingId)
    ]);
    if(assigned.error||old.error)throw assigned.error||old.error;
    const completed=new Set(((old.data||[]) as Previous[]).map(x=>x.driver_profile_id));
    const toRate=(assigned.data||[]) as Assignment[];
    const unique=new Set<string>();
    const remaining=toRate.filter(a=>{if(completed.has(a.driver_profile_id)||unique.has(a.driver_profile_id))return false;unique.add(a.driver_profile_id);return true});
    if(alive){setPoster(user.id);setAssignments(remaining);setIndex(0);}
   }catch(e){if(alive)setError(e instanceof Error?e.message:"Could not load completed driver assignments.");}
   finally{if(alive)setLoading(false)}
  })();
  return()=>{alive=false};
 },[listingId]);
 async function submit(){
  const a=assignments[index];if(!a||busy||!poster)return;
  setBusy(true);setError("");
  try{
   const {error:saveError}=await supabase.from("driver_completion_feedback").insert({
    assignment_id:a.id,listing_id:listingId,driver_profile_id:a.driver_profile_id,
    poster_user_id:poster,rating,note:note.trim()
   });
   if(saveError)throw saveError;
   if(index+1<assignments.length){setIndex(i=>i+1);setRating(5);setNote("");}
   else onDone();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save rating.");}
  finally{setBusy(false)}
 }
 if(loading)return <p className="mt-3 text-xs opacity-60">Checking completed driver assignments…</p>;
 if(error&&!assignments.length)return <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>;
 if(!assignments.length)return <p className="mt-3 text-xs opacity-60">No accepted driver assignments require a rating.</p>;
 const a=assignments[index];
 return <section aria-label="Rate verified completed driver" className={`mt-4 rounded-2xl border p-4 ${darkMode?"border-white/15 bg-[#141414]":"border-black/10 bg-[#fbfaf7]"}`}>
  <h3 className="text-lg font-black">Rate completed work</h3>
  <p className="mt-2 text-sm font-semibold">{a.driver_display_name}</p>
  <p className="mt-1 text-xs opacity-60">Only the original poster can rate a driver assigned to this confirmed completed job or contract.</p>
  <div role="group" aria-label="Driver rating" className="mt-3 flex gap-2">
   {[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setRating(n)} aria-label={`${n} out of 5`} aria-pressed={rating===n}
    className={`h-10 w-10 rounded-xl border text-xl ${n<=rating?"border-[#f6b800] bg-[#f6b800] text-black":"border-current/15"}`}>★</button>)}
  </div>
  <label className="mt-3 block text-xs font-bold">Work feedback (optional)
   <textarea maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} rows={2}
    placeholder="On-time delivery, professionalism, communication…" className={`mt-2 w-full rounded-xl border p-3 text-sm outline-none ${darkMode?"border-white/15 bg-[#181818]":"border-black/10 bg-white"}`}/>
  </label>
  {error?<p className="mt-2 text-xs text-red-600" role="alert">{error}</p>:null}
  <div className="mt-3 flex gap-2">
   <button type="button" disabled={busy} onClick={onDone} className="min-h-10 flex-1 rounded-xl border border-current/15 text-xs font-bold">Skip for now</button>
   <button type="button" disabled={busy} onClick={()=>void submit()} className="min-h-10 flex-1 rounded-xl bg-[#f6b800] text-xs font-black text-black disabled:opacity-40">{busy?"Saving…":"Save rating"}</button>
  </div>
 </section>;
}
