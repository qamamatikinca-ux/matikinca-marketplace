"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/auth";
type Listing={id:string;title:string;listing_kind:string;city:string;rate:string;description:string;created_at:string;user_id:string|null;status:string;moderation_status:string;lifecycle_status:string};
type Interest={listing_id:string;status:string};
type DiscussedThread={listing_id:string;thread_id:string};
type StatusEvent={id:string;listing_id:string;thread_id:string|null;user_id:string;status:string;note:string;created_at:string};
type Document={id:string;listing_id:string;title:string;tool_key:string;document_text:string;shared_with_counterparty:boolean;created_at:string};
type Award={id:string;listing_id:string;thread_id:string;poster_user_id:string;transporter_user_id:string|null;quote_snapshot:{amount?:string;unit?:string;vehicle?:string;route?:string;terms?:string;vat?:string};status:string;accepted_at:string;transporter_confirmed_at:string|null};
const STATUSES=[["still_discussing","Still discussing"],["agreement_reached","Agreement reached"],["in_progress","Work in progress"],["completed_reported","Completed — awaiting confirmation"],["pending_confirmation","Awaiting confirmation"],["no_agreement","No agreement"],["cancelled","Cancelled"],["disputed","Disputed"]] as const;
export default function JobContractHistory(){
 const {darkMode}=useLoadLinkTheme();
 const [userId,setUserId]=useState("");const [owned,setOwned]=useState<Listing[]>([]);const [working,setWorking]=useState<Listing[]>([]);
 const [awards,setAwards]=useState<Award[]>([]);const [statusEvents,setStatusEvents]=useState<StatusEvent[]>([]);
 const [docs,setDocs]=useState<Document[]>([]);const [tab,setTab]=useState<"posted"|"work">("posted");
 const [selectedId,setSelectedId]=useState("");const [status,setStatus]=useState<(typeof STATUSES)[number][0]>("still_discussing");
 const [note,setNote]=useState("");const [notice,setNotice]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 const [prefs,setPrefs]=useState<Record<string,boolean>>({});
 const [discussedThreads,setDiscussedThreads]=useState<DiscussedThread[]>([]);
 const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 useEffect(()=>{let mounted=true;(async()=>{
  const{data:{user}}=await supabase.auth.getUser();
  if(!mounted)return;if(!user){window.location.assign(loginHref("/history"));return}
  setUserId(user.id);
  const [mine,applied,awarded,discussed]=await Promise.all([
   supabase.from("job_listings").select("id,title,listing_kind,city,rate,description,created_at,user_id,status,moderation_status,lifecycle_status").eq("user_id",user.id).in("listing_kind",["job","contract"]).order("created_at",{ascending:false}).limit(100),
   supabase.from("job_interests").select("listing_id,status").eq("applicant_user_id",user.id).limit(100),
   supabase.from("job_offer_awards").select("id,listing_id,thread_id,poster_user_id,transporter_user_id,quote_snapshot,status,accepted_at,transporter_confirmed_at").or(`poster_user_id.eq.${user.id},transporter_user_id.eq.${user.id}`).order("accepted_at",{ascending:false}).limit(150),
    supabase.rpc("loadlink_my_transport_threads")
  ]);
  if(!mounted)return;
  const ownRows=(mine.data||[]) as Listing[];const interests=(applied.data||[]) as Interest[];
  const awardRows=(awarded.data||[]) as Award[];
   const chatThreads=(discussed.data||[]) as DiscussedThread[];
   setDiscussedThreads(chatThreads);
  setOwned(ownRows);setAwards(awardRows);
  const activeIds=[...new Set([...ownRows.map(x=>x.id),...interests.map(x=>x.listing_id),...awardRows.map(x=>x.listing_id),...chatThreads.map(x=>x.listing_id)])];
  if(activeIds.length){
    const [other,events,documents,preference]=await Promise.all([
      supabase.from("job_listings").select("id,title,listing_kind,city,rate,description,created_at,user_id,status,moderation_status,lifecycle_status").in("id",activeIds).limit(200),
      supabase.from("job_chat_status_updates").select("id,listing_id,thread_id,user_id,status,note,created_at").in("listing_id",activeIds).order("created_at",{ascending:false}).limit(300),
      supabase.from("job_tool_records").select("id,listing_id,title,tool_key,document_text,shared_with_counterparty,created_at").in("listing_id",activeIds).order("created_at",{ascending:false}).limit(200),
      supabase.from("job_offer_preferences").select("listing_id,accepts_offers").in("listing_id",ownRows.length?ownRows.map(x=>x.id):["00000000-0000-0000-0000-000000000000"])
    ]);
    if(!mounted)return;const allRows=(other.data||[]) as Listing[];
    setWorking(allRows.filter(x=>x.user_id!==user.id));
    setStatusEvents((events.data||[]) as StatusEvent[]);
    setDocs((documents.data||[]) as Document[]);
    setPrefs(Object.fromEntries((preference.data||[]).map(x=>[x.listing_id,x.accepts_offers])));
  }
  const first=ownRows[0]?.id||interests[0]?.listing_id||awardRows[0]?.listing_id||chatThreads[0]?.listing_id||"";
  if(mounted){setSelectedId(first);setLoading(false);if(mine.error||applied.error||awarded.error||discussed.error)setNotice("Some history records could not be loaded. Refresh to retry.");}
 })();return()=>{mounted=false}},[]);
 const rows=tab==="posted"?owned:working;
 const selected=[...owned,...working].find(x=>x.id===selectedId)||null;
 const selectedEvents=statusEvents.filter(x=>x.listing_id===selectedId);
 const selectedDocs=docs.filter(x=>x.listing_id===selectedId);
 const selectedAwards=awards.filter(x=>x.listing_id===selectedId);
 const threadId=selectedAwards[0]?.thread_id||selectedEvents.find(x=>x.thread_id)?.thread_id||discussedThreads.find(t=>t.listing_id===selectedId)?.thread_id||null;
 async function saveStatus(e:FormEvent){e.preventDefault();if(!selected||!userId||busy)return;setBusy(true);setNotice("");
  const payload={listing_id:selected.id,thread_id:threadId,user_id:userId,status,note:note.trim()};
  const{data,error}=await supabase.from("job_chat_status_updates").insert(payload).select("id,listing_id,thread_id,user_id,status,note,created_at").single();
  if(error)setNotice(error.message);else{setStatusEvents(list=>[data as StatusEvent,...list]);setNote("");setNotice("Your job status has been saved to history.")}
  setBusy(false);
 }
 async function confirmAward(award:Award){if(busy)return;setBusy(true);setNotice("");
  const{data,error}=await supabase.from("job_offer_awards").update({status:"confirmed"}).eq("id",award.id).select("id,listing_id,thread_id,poster_user_id,transporter_user_id,quote_snapshot,status,accepted_at,transporter_confirmed_at").single();
  if(error)setNotice(error.message);else{setAwards(s=>s.map(x=>x.id===award.id?data as Award:x));setNotice("Transporter confirmation recorded.")}
  setBusy(false);
 }
 async function copyRecord(){if(!selected)return;
  const body=["LOADLINK JOB / CONTRACT RECORD","Logistics Made Easier",selected.title,"Type: "+selected.listing_kind,"Location: "+selected.city,"Rate: "+selected.rate,"Original details:",selected.description,
   "History:",...selectedEvents.map(x=>`${x.created_at} — ${x.status} — ${x.note}`),
   "Accepted offers:",...selectedAwards.map(x=>JSON.stringify({status:x.status,accepted_at:x.accepted_at,terms:x.quote_snapshot})),
   "Linked tool documentation:",...selectedDocs.map(x=>`${x.title}\n${x.document_text}`),
   "This record includes only accessible and saved information. Completion or payment is not guaranteed."].join("\n\n");
  try{await navigator.clipboard.writeText(body);setNotice("Complete accessible job record copied.");}catch{setNotice("Copy was blocked by your browser.");}
 }
 return <section id="jobs-contracts-history" className="scroll-mt-24 pt-10">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Jobs & Contracts History</h2>
    <p className="mt-1 text-sm opacity-65">Your posted opportunities, discussions, agreements and saved tools in one place.</p></div>
    
  </div>
  {notice?<p role="status" className="mt-4 rounded-xl border border-current/15 p-3 text-xs font-semibold">{notice}</p>:null}
  <div className="mt-6 flex gap-2"><button onClick={()=>{setTab("posted");setSelectedId(owned[0]?.id||"")}} className={`rounded-xl border px-5 py-3 text-sm font-bold ${tab==="posted"?"bg-[#f6b800] text-black":"border-current/20"}`}>My Posted Jobs & Contracts</button>
    <button onClick={()=>{setTab("work");setSelectedId(working[0]?.id||"")}} className={`rounded-xl border px-5 py-3 text-sm font-bold ${tab==="work"?"bg-[#f6b800] text-black":"border-current/20"}`}>My Transport Work</button>
  </div>
  <div className="mt-5 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
   <aside className={`overflow-hidden rounded-2xl border ${surface}`}>
    {loading?<p className="p-4 text-sm">Loading records…</p>:!rows.length?<div className="p-5 text-sm opacity-65">No saved opportunities in this section yet.</div>:rows.map(row=><button key={row.id} onClick={()=>setSelectedId(row.id)} className={`w-full border-b border-current/10 p-4 text-left ${selectedId===row.id?"bg-[#f6b800]/10":""}`}>
      <p className="text-sm font-black">{row.title}</p><p className="mt-1 text-xs opacity-60">{row.listing_kind} · {row.city}</p><p className="mt-1 text-xs">{selectedId===row.id?selectedEvents[0]?.status.replaceAll("_"," ")||row.lifecycle_status:row.lifecycle_status}</p>
    </button>)}
   </aside>
   <section className={`min-w-0 rounded-2xl border p-5 sm:p-6 ${surface}`}>
     {!selected?<p className="text-sm opacity-65">Choose an opportunity to see its saved history.</p>:<>
      <p className="text-xs font-semibold uppercase opacity-55">{selected.listing_kind} · {selected.id.slice(0,8)}</p>
      <h2 className="mt-2 text-2xl font-black">{selected.title}</h2><p className="mt-1 text-sm opacity-65">{selected.city} · {selected.rate||"Rate negotiable"}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{selected.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="rounded-xl border border-current/15 px-4 py-2.5 text-xs font-bold" href={`/messages?listing=${selected.id}`}>Open Messages</Link>
        <Link className="rounded-xl border border-current/15 px-4 py-2.5 text-xs font-bold" href={`/tools?listing=${selected.id}`}>Open Logistics Tools</Link><Link className="rounded-xl border border-current/15 px-4 py-2.5 text-xs font-bold" href={`/driver-assignments?listing=${selected.id}`}>Assign a driver</Link>
        <button className="rounded-xl border border-current/15 px-4 py-2.5 text-xs font-bold" type="button" onClick={()=>void copyRecord()}>Copy job record</button>
      </div>
      {selected.user_id===userId?<div className="mt-5 rounded-xl border border-current/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black">Formal offers</h3><p className="mt-1 text-xs opacity-65">{prefs[selected.id]?"Accepting transport quotes":"Not accepting formal quotes"}</p></div>
        <span className="text-xs font-medium opacity-60">{prefs[selected.id]?"Accepting formal quotations":"Formal offers not enabled"}</span></div>
      </div>:null}
      <div className="mt-6 border-t border-current/10 pt-5"><h3 className="text-lg font-black">Agreements & accepted offers</h3>
       {!selectedAwards.length?<p className="mt-2 text-sm opacity-60">No formally accepted quote is saved for this job yet. Informal discussions remain available in Messages.</p>:
       selectedAwards.map(a=><div key={a.id} className="mt-3 rounded-xl border border-current/15 p-4">
         <p className="text-sm font-black">R{a.quote_snapshot?.amount||"Amount unavailable"} · {a.quote_snapshot?.unit||"total"}</p>
         <p className="mt-1 text-xs opacity-65">{a.quote_snapshot?.vehicle||"Vehicle not specified"} · {a.quote_snapshot?.route||"Route per listing"}</p>
         <p className="mt-2 whitespace-pre-wrap text-sm">{a.quote_snapshot?.terms||"No additional quote terms recorded"}</p>
         <p className="mt-2 text-xs font-bold">Status: {a.status.replaceAll("_"," ")}</p>
         {a.transporter_user_id===userId&&a.status==="pending_transporter"?<button disabled={busy} type="button" onClick={()=>void confirmAward(a)} className="mt-3 rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black">Confirm awarded terms</button>:null}
       </div>)}
      </div>
      <div className="mt-6 border-t border-current/10 pt-5"><h3 className="text-lg font-black">Progress timeline</h3>
       {!selectedEvents.length?<p className="mt-2 text-sm opacity-60">No updates recorded yet.</p>:
       <ol className="mt-3 space-y-3">{selectedEvents.map(e=><li className="border-l-2 border-current/15 pl-4" key={e.id}>
        <p className="text-sm font-bold">{e.status.replaceAll("_"," ")}</p><p className="text-xs opacity-60">{new Date(e.created_at).toLocaleString("en-ZA")}</p>
        {e.note?<p className="mt-1 whitespace-pre-wrap text-xs">{e.note}</p>:null}
       </li>)}</ol>}
       <form onSubmit={saveStatus} className="mt-4 grid gap-3 rounded-xl border border-current/15 p-4">
         <label className="text-xs font-bold">Update progress<select value={status} className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3" onChange={e=>setStatus(e.target.value as typeof status)}>{STATUSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
         <label className="text-xs font-bold">Notes (optional)<textarea maxLength={1500} className="mt-2 min-h-20 w-full rounded-xl border border-current/15 bg-transparent p-3" value={note} onChange={e=>setNote(e.target.value)}/></label>
         <button disabled={busy} type="submit" className="h-11 rounded-xl bg-[#f6b800] text-sm font-black text-black">{busy?"Saving…":"Save status"}</button>
       </form>
       <p className="mt-2 text-[11px] opacity-55">Your update is recorded under your account. A single report does not establish confirmation from both parties.</p>
      </div>
      <div className="mt-6 border-t border-current/10 pt-5"><h3 className="text-lg font-black">Linked Logistics Tools & Documents</h3>
       {!selectedDocs.length?<p className="mt-2 text-sm opacity-60">No tools saved to this job. Open Logistics Tools and explicitly attach a document to add it here.</p>:
       selectedDocs.map(d=><details key={d.id} className="mt-3 rounded-xl border border-current/15 p-4"><summary className="cursor-pointer text-sm font-bold">{d.title} · {d.tool_key}</summary>
        <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6">{d.document_text}</pre>
        <p className="mt-2 text-[11px] opacity-55">{d.shared_with_counterparty?"Shared with authorised job participant":"Private job record"} · {new Date(d.created_at).toLocaleString("en-ZA")}</p>
       </details>)}
      </div>
     </>}
   </section>
  </div>
 </section>;
}
