"use client";
import Link from "next/link";
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
type Case={id:string;case_number:string;subject:string;status:string;priority:string;created_at:string;updated_at:string};
type Thread=Case&{description:string;messages:Array<{id:string;body:string;author_kind:"customer"|"agent";visibility:string;created_at:string;mine:boolean}>};
const time=(v:string)=>new Date(v).toLocaleString("en-ZA",{dateStyle:"medium",timeStyle:"short"});
export default function SupportCasesPage(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [uid,setUid]=useState("");const [ready,setReady]=useState(false);
 const [cases,setCases]=useState<Case[]>([]);const [selected,setSelected]=useState("");
 const [thread,setThread]=useState<Thread|null>(null);
 const [drafts,setDrafts]=useState<Record<string,string>>({});const body=drafts[selected]||"";const setBody=(value:string)=>setDrafts(current=>({...current,[selected]:value}));
 const [query,setQuery]=useState("");const [filter,setFilter]=useState("all");const threadRequest=useRef(0);const selectedRef=useRef(selected);selectedRef.current=selected;
 const visibleCases=useMemo(()=>cases.filter(row=>(filter==="all" || (filter==="open" ? !["closed","resolved"].includes(row.status) : ["closed","resolved"].includes(row.status))) && `${row.case_number} ${row.subject}`.toLowerCase().includes(query.toLowerCase())),[cases,filter,query]);const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);const [notice,setNotice]=useState("");
 const loadCases=useCallback(async()=>{
  const r=await supabase.rpc("loadlink_support_my_cases",{p_limit:40});
  if(r.error)throw r.error;
  const list=(r.data||[]) as Case[];setCases(list);
  return list;
 },[]);
 const loadThread=useCallback(async(id:string)=>{
  const sequence=++threadRequest.current;
  const r=await supabase.rpc("loadlink_support_case_thread",{p_case_id:id});
  if(r.error)throw r.error;
  if(sequence===threadRequest.current && id===selectedRef.current)setThread(r.data as Thread);
 },[]);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(async({data})=>{
   if(!active)return;setUid(data.user?.id||"");
   if(data.user){try{const list=await loadCases();if(!active)return;setSelected(current=>{const requested=new URLSearchParams(window.location.search).get("case");return list.some(x=>x.id===current)?current:requested&&list.some(x=>x.id===requested)?requested:(list[0]?.id||"");});}catch(e){setNotice(e instanceof Error?e.message:"Support cases unavailable.");}}
 }).catch(()=>setNotice("Unable to check your account.")).finally(()=>{if(active){setReady(true);setLoading(false);}});
 return()=>{active=false};},[loadCases]);
 useEffect(()=>{if(!uid||!selected)return;void loadThread(selected).catch(()=>setNotice("This case could not be loaded."));},[uid,selected,loadThread]);
 useEffect(()=>{if(!uid||!selected)return;const timer=window.setInterval(()=>{if(document.visibilityState==="visible"){void loadCases().catch(()=>setNotice("Could not refresh your cases. Your draft is saved on this page."));void loadThread(selected).catch(()=>setNotice("Could not refresh this conversation."));}},30000);return()=>window.clearInterval(timer)},[uid,selected,loadCases,loadThread]);
 async function reply(){
  if(sending||!selected||body.trim().length<2)return;
  setSending(true);setNotice("");
  try{
   const r=await supabase.rpc("loadlink_support_customer_reply",{p_case_id:selected,p_body:body.trim()});
   if(r.error)throw r.error;setDrafts(current=>({...current,[selected]:""}));setNotice("Your reply has been added to the case.");
   await Promise.all([loadThread(selected),loadCases()]);
  }catch(e){setNotice(e instanceof Error?e.message:"Your reply could not be saved.");}
  finally{setSending(false);}
 }
 const surface=darkMode?"border-white/10 bg-[#0e0e0e]":"border-black/10 bg-white";
 const text=darkMode?"bg-black text-white":"bg-[#f5f1e9] text-black";
 const muted=darkMode?"text-white/55":"text-black/50";
 return <main data-loadlink-support="20261021" data-theme={darkMode ? "dark" : "light"} className={"min-h-screen "+text}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
   <Link href="/help" className={"text-xs font-bold "+muted}>Help Centre</Link>
   <div className="mt-5"><p className="text-[11px] font-black uppercase tracking-widest text-[#b98a00]">LOADLINK CUSTOMER CARE</p>
     <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">My support cases</h1>
     <p className={"mt-2 max-w-2xl text-sm leading-6 "+muted}>Keep every update and reply together, from your first question to resolution.</p>
   </div>
   {notice?<p role="status" className="mt-4 rounded-xl border border-[#f6b800]/35 p-3 text-sm">{notice}</p>:null}
   {!ready||loading?<p className="mt-8 text-sm">Loading your cases…</p>:!uid?<div className={"mt-8 rounded-2xl border p-7 "+surface}><p>Sign in to view conversations linked to your account.</p><Link href="/login?returnTo=%2Fsupport%2Fcases" className="mt-4 inline-flex rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Sign in</Link></div>:
   <div className="ll-support-inbox mt-7 grid gap-4 md:grid-cols-[minmax(235px,0.7fr)_minmax(0,1.4fr)]">
    <section className={"overflow-hidden rounded-2xl border "+surface}>
     <div className="ll-support-list-heading"><h2>Your cases <span>({cases.length})</span></h2><label><span className="sr-only">Find a support case</span><input type="search" placeholder="Search subject or case number" value={query} onChange={event=>setQuery(event.target.value)}/></label><div role="group" aria-label="Filter cases">{["all","open","closed"].map(value=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==="all"?"All cases":value==="open"?"Open":"Resolved"}</button>)}</div></div>
     {visibleCases.length?visibleCases.map(row=><button key={row.id} type="button" onClick={()=>{setSelected(row.id);setNotice("");}} className={"block w-full border-b border-current/10 p-4 text-left "+(selected===row.id?"bg-[#f6b800]/10":"")}>
      <div className="flex items-start justify-between gap-3"><strong className="text-xs text-[#b98a00]">{row.case_number}</strong><small className="capitalize opacity-60">{row.status.replaceAll("_"," ")}</small></div>
      <p className="mt-2 text-sm font-bold">{row.subject}</p><small className={"mt-2 block "+muted}>{time(row.updated_at)}</small></button>):<p className={"p-6 text-sm "+muted}>{cases.length ? "No cases match this search." : "Your support cases will appear here. Visit the Help Centre to contact the LoadLink team."}</p>}
    </section>
    <section className={"ll-support-thread min-h-96 rounded-2xl border "+surface}>
     {!thread||thread.id!==selected?<p className={"p-8 text-sm "+muted}>Choose a case to view its conversation.</p>:<>
      <div className="border-b border-current/10 p-5"><p className="text-xs font-black text-[#b98a00]">{thread.case_number}</p><h2 className="mt-2 text-xl font-black">{thread.subject}</h2><p className={"mt-2 text-xs capitalize "+muted}>{thread.status.replaceAll("_"," ")} · Opened {time(thread.created_at)}</p></div>
      <div className="space-y-4 p-5">
       <div className="rounded-xl border border-current/10 p-4"><p className={"text-[10px] font-black uppercase tracking-wider "+muted}>Original request</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{thread.description}</p></div>
       {thread.messages.map(m=><article key={m.id} className={"max-w-[92%] rounded-xl border p-4 "+(m.author_kind==="customer"?"ml-auto border-[#f6b800]/30 bg-[#f6b800]/5":"border-current/10")}>
         <div className="flex items-center justify-between gap-2"><strong className="text-xs">{m.author_kind==="customer"?"You":"LoadLink Support"}</strong><small className={muted}>{time(m.created_at)}</small></div>
         <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{m.body}</p>
       </article>)}
      </div>
      {thread.status!=="closed"?<form className="border-t border-current/10 p-5" onSubmit={e=>{e.preventDefault();void reply();}}>
       <label className="text-xs font-black" htmlFor="support-reply">Reply to LoadLink Support</label>
       <textarea id="support-reply" rows={3} maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} className={"mt-3 w-full rounded-xl border border-current/15 bg-transparent p-3 text-sm"} placeholder="Describe the issue or answer the support employee's question. Never share passwords or OTPs."/>
       <button disabled={sending||body.trim().length<2} className="mt-3 rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black disabled:opacity-40">{sending?"Sending…":"Send reply"}</button>
      </form>:<p className={"border-t border-current/10 p-5 text-xs "+muted}>This case is closed. Ask LinkBot to create a new support case if you need further help.</p>}
     </>}
    </section>
   </div>}
  </div>
 </main>
}
