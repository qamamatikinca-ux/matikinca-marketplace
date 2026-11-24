"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import {browserSupabase} from "@/lib/phase2/supabase";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {isAuthenticatedUser} from "@/lib/auth";
import styles from "@/app/messages/messages.module.css";

type Thread={id:string;driver_profile_id:string;driver_user_id:string;enquirer_user_id:string;driver_name:string;enquirer_name:string;blocked:boolean;updated_at?:string};
type Message={id:string;sender_id:string;body:string;created_at:string};
export default function DriverMessagesInbox({profileId,threadId}:{profileId:string;threadId:string}){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [userId,setUserId]=useState("");
 const [threads,setThreads]=useState<Thread[]>([]);
 const [selected,setSelected]=useState(threadId);
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [mobileChat,setMobileChat]=useState(Boolean(profileId||threadId));
 const last=useRef<HTMLDivElement>(null);
 const pending=useRef<{thread:string;text:string;key:string}|null>(null);
 const chosen=threads.find(t=>t.id===selected)||null;
 const reload=useCallback(async()=>{
  const {data,error}=await browserSupabase().from("driver_message_threads")
   .select("id,driver_profile_id,driver_user_id,enquirer_user_id,driver_name,enquirer_name,blocked,updated_at")
   .order("updated_at",{ascending:false}).limit(100);
  if(error)throw error;
  setThreads((data||[]) as Thread[]);
  return (data||[]) as Thread[];
 },[]);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const sb=browserSupabase();
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!isAuthenticatedUser(user)){window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`);return}
    if(!active)return;
    setUserId(user.id);
    let current=threadId;
    if(profileId){
      const {data:opened,error:openError}=await sb.rpc("loadlink_open_driver_chat",{p_profile_id:profileId});
      if(openError)throw openError;
      current=String(opened||"");
      if(!current)throw new Error("Driver conversation could not be opened.");
      setSelected(current);
      setMobileChat(true);
      // Only the opening enquirer sends the introductory message; never resend on reopening a thread.
      const {data:older,error:historyError}=await sb.from("driver_thread_messages").select("id").eq("thread_id",current).limit(1);
      if(historyError)throw historyError;
      if(!older?.length){
       const {data:profile,error:profileError}=await sb.from("driver_message_threads")
         .select("driver_name,enquirer_user_id").eq("id",current).single();
       if(profileError)throw profileError;
       if(profile?.enquirer_user_id===user.id){
        const firstName=String(profile.driver_name||"").trim().split(/\s+/)[0]||"there";
        const greeting=`Hi ${firstName}, I found your profile on LoadLink. I'm looking for a professional driver. Are you available to discuss work?`;
        const {error:sendError}=await sb.rpc("loadlink_send_driver_message",
          {p_thread_id:current,p_body:greeting,p_client_message_id:crypto.randomUUID()});
        if(sendError)throw sendError;
       }
      }
    }
    const list=await reload();
    if(!current&&list.length&&window.innerWidth>=768)setSelected(list[0].id);
   }catch(e){if(active)setError(e instanceof Error?e.message:"Could not open driver messages.")}
   finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[profileId,threadId,reload]);
 useEffect(()=>{
  if(!selected||!userId)return;
  let active=true;
  const load=async()=>{
   if(document.hidden||!navigator.onLine)return;
   try{
    const {data,error:fetchError}=await browserSupabase().from("driver_thread_messages")
      .select("id,sender_id,body,created_at").eq("thread_id",selected)
      .order("created_at",{ascending:false}).limit(100);
    if(fetchError)throw fetchError;
    if(active)setMessages(((data||[]) as Message[]).reverse());
   }catch{if(active)setError("Messages could not refresh. Check your connection.")}
  };
  void load();
  const timer=window.setInterval(()=>void load(),6000);
  document.addEventListener("visibilitychange",load);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",load)};
 },[selected,userId]);
 useEffect(()=>{last.current?.scrollIntoView({block:"nearest"})},[messages.length]);
 async function send(e:FormEvent){
  e.preventDefault();if(!selected||!draft.trim()||busy||chosen?.blocked)return;
  const body=draft.trim();
  if(pending.current?.thread!==selected||pending.current?.text!==body)pending.current={thread:selected,text:body,key:crypto.randomUUID()};
  setBusy(true);setError("");
  try{
   const {data,error:sendError}=await browserSupabase().rpc("loadlink_send_driver_message",
    {p_thread_id:selected,p_body:body,p_client_message_id:pending.current.key});
   if(sendError)throw sendError;
   setMessages(current=>current.some(x=>x.id===String(data))?current:
    [...current,{id:String(data),sender_id:userId,body,created_at:new Date().toISOString()}]);
   setDraft("");pending.current=null;void reload();
  }catch{setError("Message wasn't sent. Check your connection and retry.")}
  finally{setBusy(false)}
 }
 const person=(t:Thread)=>t.driver_user_id===userId?t.enquirer_name:t.driver_name;
 return <main data-loadlink-smart-glass="true" data-theme={darkMode?"dark":"light"}
  style={{height:"var(--loadlink-message-vh,100dvh)",minHeight:"var(--loadlink-message-vh,100svh)"}}
  className={`${styles.messageApp} loadlink-messages flex flex-col overflow-hidden ${darkMode?"bg-[#050505] text-white":"bg-[#eeeae0] text-black"}`}>
   <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} sticky={false}/>
   <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 md:grid-cols-[360px_minmax(0,1fr)]">
    <aside className={`${mobileChat?"hidden md:flex":"flex"} loadlink-inbox-panel min-h-0 flex-col border-r border-black/10 bg-white text-black`}>
     <div className="border-b border-black/10 p-4">
      <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
      <div className="mt-3 flex gap-2">
       <Link href="/messages" className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold">All messages</Link>
       <span className="rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-bold text-black">Driver conversations</span>
      </div>
     </div>
     <div className="min-h-0 flex-1 overflow-y-auto">
      {loading?<p className="p-5 text-sm opacity-65">Loading conversations…</p>:
       threads.length===0?<div className="p-5 text-sm text-black/60">No driver conversations yet. <Link href="/driver-portal" className="underline">Find drivers</Link></div>:
       threads.map(t=><button key={t.id} type="button"
         onClick={()=>{setSelected(t.id);setMessages([]);setMobileChat(true);setError("")}}
         className={`flex w-full items-center gap-3 border-b border-black/5 p-4 text-left ${selected===t.id?"bg-[#fff4c7]":"bg-white"}`}>
         <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-black text-[#f6b800]">{person(t).charAt(0).toUpperCase()}</span>
         <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{person(t)}</strong>
          <span className="mt-1 block truncate text-xs text-black/50">Driver profile · {t.driver_name}</span></span>
       </button>)
      }
     </div>
    </aside>
    <section className={`${mobileChat?"flex":"hidden md:flex"} loadlink-chat-panel min-h-0 flex-col bg-[#f3f0e8] text-black`} data-loadlink-mobile-chat-fit="true">
     {chosen?<>
       <header className="loadlink-chat-header flex min-h-[78px] items-center gap-3 border-b border-black/10 bg-white px-3 py-3 md:px-5">
        <button type="button" onClick={()=>setMobileChat(false)} aria-label="Back to conversations" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 md:hidden"><LoadLinkIcon name="chevronLeft" size={18}/></button>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg font-black text-[#f6b800]">{person(chosen).charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold">{person(chosen)}</h2><p className="truncate text-xs text-black/50">LoadLink driver conversation</p></div>
       </header>
       <div className="loadlink-message-viewport min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length===0?<p className="text-center text-xs text-black/45">Ask about availability, routes and driving work.</p>:null}
        {messages.map(m=><div key={m.id} className={`max-w-[83%] rounded-[19px] px-4 py-3 text-sm leading-6 ${m.sender_id===userId?"ml-auto bg-[#f6b800] text-black":"bg-white text-black shadow-sm"}`}>
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
          <time className="mt-1 block text-right text-[10px] text-black/45" dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}</time>
        </div>)}
        <div ref={last}/>
       </div>
       {error?<p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">{error}</p>:null}
       {chosen.blocked?<p className="border-t border-black/10 p-4 text-sm">This conversation is closed.</p>:
         <form onSubmit={e=>void send(e)} className="loadlink-chat-composer border-t border-black/10 bg-white/75 p-3 pb-[max(.8rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[20px] border border-black/10 bg-white px-3 py-2">
           <textarea aria-label="Write a message" rows={1} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Type a message…" className="min-h-10 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"/>
           <button type="submit" disabled={busy||!draft.trim()} className="h-10 shrink-0 rounded-full bg-[#f6b800] px-5 text-xs font-bold text-black disabled:opacity-40">{busy?"Sending":"Send"}</button>
          </div>
         </form>}
      </>:<div className="flex h-full items-center justify-center p-8 text-center text-sm text-black/50">Select a driver conversation.</div>}
    </section>
   </div>
 </main>;
}
