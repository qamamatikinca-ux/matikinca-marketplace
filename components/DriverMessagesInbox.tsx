"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import LoadLinkImage from "@/components/LoadLinkImage";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {browserSupabase} from "@/lib/phase2/supabase";
import {isAuthenticatedUser} from "@/lib/auth";

type Thread={id:string;driver_profile_id:string;driver_user_id:string;enquirer_user_id:string;driver_name:string;enquirer_name:string;blocked:boolean;reopen_requested_by?:string|null;updated_at?:string};
type Message={id:string;sender_id:string;body:string;created_at:string};
export default function DriverMessagesInbox({profileId,threadId,onBack}:{profileId:string;threadId:string;onBack:()=>void}){
 const {darkMode}=useLoadLinkTheme();
 const [userId,setUserId]=useState("");
 const [threads,setThreads]=useState<Thread[]>([]);
 const [avatars,setAvatars]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState(threadId);
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [reopening,setReopening]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [searchOpen,setSearchOpen]=useState(false);
 const [searchTerm,setSearchTerm]=useState("");
 const last=useRef<HTMLDivElement>(null);
 const pending=useRef<{thread:string;text:string;key:string}|null>(null);
 const chosen=threads.find(t=>t.id===selected)||null;
 const reload=useCallback(async()=>{
  const {data,error}=await browserSupabase().from("driver_message_threads")
   .select("id,driver_profile_id,driver_user_id,enquirer_user_id,driver_name,enquirer_name,blocked,reopen_requested_by,updated_at")
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
      window.dispatchEvent(new Event("loadlink-driver-thread-opened"));
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
 useEffect(()=>{if(!userId)return;const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void reload().catch(()=>undefined)},12000);return()=>window.clearInterval(timer)},[userId,reload]);
 async function requestReopen(){
  if(!chosen||reopening)return;
  setReopening(true);setError("");setNotice("");
  try{
    const {data,error:err}=await browserSupabase().rpc("loadlink_request_reopen_driver_chat",{p_thread_id:chosen.id});
    if(err)throw err;
    await reload();
    if(data==="pending")setNotice("Request sent. The other participant must approve reopening.");
    else if(data==="reopened")setNotice("Conversation reopened.");
  }catch(e){setError(e instanceof Error?e.message:"Could not request reopening.")}
  finally{setReopening(false)}
 }
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
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  const update=async()=>{
   const {data}=await browserSupabase().rpc("loadlink_my_message_avatars");
   if(!active||!data)return;
   const images:Record<string,string>={};
   for(const item of data){if(item.conversation_kind==="driver"&&item.avatar_url)images[String(item.thread_id)]=String(item.avatar_url)}
   setAvatars(images);
  };
  void update();
  return()=>{active=false};
 },[userId]);
 const visibleMessages=searchTerm.trim()?messages.filter(m=>m.body.toLowerCase().includes(searchTerm.trim().toLowerCase())):messages;
 const person=(t:Thread)=>t.driver_user_id===userId?t.enquirer_name:t.driver_name;
 const profilePhoto=(t:Thread)=>avatars[t.id]||"";
 return (<>
     {chosen?<>
       <header className={`loadlink-chat-header flex min-h-[78px] shrink-0 items-center gap-3 border-b px-3 py-3 md:px-5 ${darkMode?"border-white/10 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}>
        <button type="button" onClick={onBack} aria-label="Back to conversations" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 md:hidden"><LoadLinkIcon name="chevronLeft" size={18}/></button>
        <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-black text-lg font-black text-[#f6b800]">{profilePhoto(chosen)?<LoadLinkImage src={profilePhoto(chosen)} alt="" className="h-full w-full object-cover"/>:person(chosen).charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold">{person(chosen)}</h2><p className={`truncate text-xs ${darkMode?"text-white/55":"text-black/50"}`}>LoadLink Messages</p></div>
        <button type="button" aria-label="Search driver conversation" aria-expanded={searchOpen} onClick={()=>{setSearchOpen(v=>!v);setSearchTerm("")}}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${darkMode?"border-white/15":"border-black/10"}`}><LoadLinkIcon name="search" size={18}/></button>
       </header>
       <div className={`loadlink-listing-context flex min-h-10 shrink-0 items-center gap-3 border-b px-4 py-2 ${darkMode?"border-white/10 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}><span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase text-black">Driver</span><span className={`min-w-0 flex-1 truncate text-xs font-semibold ${darkMode?"text-white/65":"text-black/60"}`}>{chosen.driver_name} · Driver profile</span></div>
       {searchOpen?<div className={`border-b px-4 py-2 ${darkMode?"border-white/10 bg-[#111]":"border-black/10 bg-white"}`}>
         <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} aria-label="Search messages" placeholder="Search this conversation" type="search"
           className={`h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-[#f6b800] ${darkMode?"border-white/15 bg-[#222] text-white":"border-black/10 bg-white text-black"}`}/>
       </div>:null}
       <div className="loadlink-message-viewport loadlink-chat-wallpaper min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-5 md:px-8" aria-live="polite">
        {!messages.length?<p className={`text-center text-xs ${darkMode?"text-white/60":"text-black/45"}`}>Ask about availability, routes and driving work.</p>:null}
        {messages.length>0&&!visibleMessages.length?<p className={`text-center text-xs ${darkMode?"text-white/60":"text-black/45"}`}>No matching messages.</p>:null}
        <div className="mx-auto max-w-3xl space-y-3">
        {visibleMessages.map((m,i)=>{
          const mine=m.sender_id===userId;
          const prev=visibleMessages[i-1];
          const showDay=!prev||new Date(prev.created_at).toDateString()!==new Date(m.created_at).toDateString();
          return <div key={m.id}>
            {showDay?<div className="my-5 flex justify-center"><span className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black/45">{new Intl.DateTimeFormat("en-ZA",{weekday:"short",day:"2-digit",month:"short"}).format(new Date(m.created_at))}</span></div>:null}
            <div className={`flex items-end gap-2 ${mine?"justify-end":"justify-start"}`}>
              {!mine?<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-xs font-bold text-[#f6b800]">{profilePhoto(chosen)?<LoadLinkImage src={profilePhoto(chosen)} alt="" className="h-full w-full object-cover"/>:person(chosen).charAt(0).toUpperCase()}</span>:null}
              <div className={`relative min-w-0 max-w-[calc(100%_-_2.75rem)] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${mine?"rounded-br-sm bg-black text-white":"rounded-bl-sm border border-black/5 bg-white text-black"}`}>
                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{m.body}</p>
                <time className={`mt-1.5 block text-right text-[9px] font-semibold ${mine?"text-white/45":"text-black/35"}`} dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}</time>
              </div>
            </div>
          </div>;
        })}
        </div>
        <div ref={last}/>
       </div>
       {error?<p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">{error}</p>:null}
       {notice?<p role="status" className="border-t border-[#f6b800]/20 bg-[#fff8dc] px-4 py-2 text-xs font-semibold text-[#765800]">{notice}</p>:null}
       {chosen.blocked?<div className={`border-t p-4 ${darkMode?"border-white/10 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}>
        <p className={`text-sm font-semibold ${darkMode?"text-white/80":"text-black/70"}`}>This conversation is closed.</p>
        <p className={`mt-1 text-xs ${darkMode?"text-white/60":"text-black/50"}`}>Reopening requires both participants to agree.</p>
        <button type="button" disabled={reopening||chosen.reopen_requested_by===userId} onClick={()=>void requestReopen()}
          className="mt-3 min-h-11 rounded-xl border border-[#f6b800] bg-[#f6b800] px-5 text-xs font-black text-black disabled:opacity-50">{reopening?"Updating…":chosen.reopen_requested_by===userId?"Request pending":"Reopen conversation"}</button>
       </div>:
         <form onSubmit={e=>void send(e)} className="loadlink-chat-composer border-t border-black/10 bg-white/75 p-3 pb-[max(.8rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
           <div className="loadlink-message-input min-w-0 flex-1 rounded-[22px] border border-black/10 bg-white px-4 py-2.5 shadow-sm focus-within:border-[#f6b800]"><textarea data-loadlink-message-composer="true" aria-label="Write a message" rows={1} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Message" className="min-h-7 max-h-28 w-full resize-none bg-transparent py-1 text-[15px] font-medium leading-6 outline-none"/></div>
           <button type="submit" disabled={busy||!draft.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black shadow-sm disabled:opacity-40">{busy?"…":<LoadLinkIcon name="send" size={18}/>}</button>
          </div>
         </form>}
      </>:<div className="flex h-full min-h-0 flex-1 items-center justify-center p-8 text-center text-sm opacity-60">{loading?"Loading driver conversation…":error||"Select a driver conversation."}</div>}
    </>);
}
