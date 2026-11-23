"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
type Post={id:string;title:string};
export default function AttachToolToHistory({toolKey,title,body,darkMode}:{toolKey:string;title:string;body:string;darkMode:boolean}){
 const [posts,setPosts]=useState<Post[]>([]);const [listingId,setListingId]=useState("");
 const [threadId,setThreadId]=useState<string|null>(null);const [userId,setUserId]=useState("");
 const [share,setShare]=useState(false);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user||!active)return;setUserId(user.id);
  const [owned,interests,awards,discussions]=await Promise.all([
   supabase.from("job_listings").select("id,title").eq("user_id",user.id).in("listing_kind",["job","contract"]).limit(80),
   supabase.from("job_interests").select("listing_id").eq("applicant_user_id",user.id).limit(80),
   supabase.from("job_offer_awards").select("listing_id,thread_id").eq("transporter_user_id",user.id).limit(80),
   supabase.rpc("loadlink_my_transport_threads")
  ]);
  if(!active)return;
  const awardRows=awards.data||[];
  const discussionRows=(discussions.data||[]) as {listing_id:string;thread_id:string}[];
  const jobIds=[...new Set([...(interests.data||[]).map(x=>x.listing_id),...awardRows.map(x=>x.listing_id),...discussionRows.map(x=>x.listing_id)])];
  const joined=jobIds.length?await supabase.from("job_listings").select("id,title").in("id",jobIds):{data:[],error:null};
  if(!active)return;
  const options=[...(owned.data||[]) as Post[],...(joined.data||[]) as Post[]];
  setPosts(Array.from(new Map(options.map(x=>[x.id,x])).values()));
  const query=new URLSearchParams(window.location.search);
  const selected=query.get("listing")||"";const valid=options.some(x=>x.id===selected);
  setListingId(valid?selected:options[0]?.id||"");
  setThreadId(query.get("thread")||awardRows.find(x=>x.listing_id===selected)?.thread_id||discussionRows.find(x=>x.listing_id===selected)?.thread_id||null);
 })();return()=>{active=false}},[]);
 async function save(){if(!userId||!listingId||!body.trim()||busy)return;
  setBusy(true);setNotice("");
  const {error}=await supabase.from("job_tool_records").insert({
   listing_id:listingId,user_id:userId,tool_key:toolKey,title,document_text:body,
   thread_id:share?threadId:null,shared_with_counterparty:share&&Boolean(threadId)
  });
  setNotice(error?error.message:"Saved to your LoadLink Job History.");
  setBusy(false);
 }
 return <section className={`mx-4 mb-4 rounded-xl border p-4 md:mx-6 ${darkMode?"border-white/15 bg-white/[.03]":"border-black/10 bg-[#fafafa]"}`}>
  <h3 className="text-sm font-black">Attach this tool to a job</h3>
  <p className="mt-1 text-xs opacity-65">Save this exact document to your in-app Job & Contract History. Private by default.</p>
  <div className="mt-3 flex flex-wrap gap-2">
   <select aria-label="Choose a job" className={`min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-xs ${darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-black"}`} value={listingId} onChange={e=>setListingId(e.target.value)}>
    {!posts.length?<option value="">No available jobs</option>:null}
    {posts.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}
   </select>
   <button type="button" className="min-h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-40" disabled={!listingId||busy||!body.trim()} onClick={()=>void save()}>{busy?"Saving…":"Save to History"}</button>
  </div>
  {threadId?<label className="mt-2 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/>Share with the other participant in this conversation</label>:null}
  {!posts.length?<p className="mt-2 text-xs opacity-65">Post a job or take part in an opportunity to link documents.</p>:null}
  {notice?<p role="status" className="mt-2 text-xs font-semibold">{notice}</p>:null}
  <Link className="mt-3 inline-block text-xs font-bold underline" href="/job-history">View Job & Contract History</Link>
 </section>;
}
