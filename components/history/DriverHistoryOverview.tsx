"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import DriverHistory from "@/components/history/DriverHistory";
import DriverAssignmentRecords from "@/components/history/DriverAssignmentRecords";

type Profile={id:string;full_name:string;status:string};
type Assignment={id:string;driver_display_name:string;status:string;assignment_date:string|null;created_at:string};
export default function DriverHistoryOverview(){
 const {darkMode}=useLoadLinkTheme();
 const [profile,setProfile]=useState<Profile|null>(null);
 const [records,setRecords]=useState<Assignment[]>([]);
 const [docCount,setDocCount]=useState(0);
 const [loading,setLoading]=useState(true);
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{let active=true;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user||!active)return;
  const [p,a]=await Promise.all([
   supabase.from("driver_profiles").select("id,full_name,status").eq("user_id",user.id).maybeSingle(),
   supabase.from("job_driver_assignments").select("id,driver_display_name,status,assignment_date,created_at")
     .or(`operator_user_id.eq.${user.id},driver_user_id.eq.${user.id}`).eq("status","completed").order("created_at",{ascending:false}).limit(5)
  ]);
  if(!active)return;
  setProfile((p.data||null) as Profile|null);
  setRecords((a.data||[]) as Assignment[]);
  if(p.data?.id){
   const d=await supabase.from("driver_documents").select("id",{count:"exact",head:true}).eq("profile_id",p.data.id);
   if(active)setDocCount(d.count||0);
  }
  setLoading(false);
 })().catch(()=>{if(active)setLoading(false);});
  if(window.location.hash==="#driver-assignments")setExpanded(true);
  return()=>{active=false;};
 },[]);
 const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 return <section id="driver-records" aria-label="Driver history" className={`mt-5 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
  <h2 className="text-xl font-black tracking-[-.035em]">Driver records</h2>
  {loading?<p className="mt-3 text-sm opacity-60">Loading driver records…</p>:
   !profile&&!records.length?<p className="mt-3 text-sm opacity-60">Completed driver assignments and driver documents will appear here when available.</p>:
   <div className="mt-4 space-y-2 text-sm">
    {profile?<p className="font-semibold">{profile.full_name} <span className="font-normal opacity-60">· {docCount} document{docCount===1?"":"s"} recorded</span></p>:null}
    {records.length?<p className="opacity-65">{records.length} recent completed driver assignment{records.length===1?"":"s"}</p>:null}
   </div>}
  <div className="mt-4 flex flex-wrap gap-4">
   {profile?<Link href="/driver-profile" className="text-xs font-bold underline underline-offset-4">Driver profile</Link>:null}
   <button type="button" onClick={()=>setExpanded(x=>!x)} aria-expanded={expanded} className="text-xs font-bold underline underline-offset-4">{expanded?"Hide driver details":"Driver details & assignments"}</button>
  </div>
  {expanded?<div id="driver-assignments" className="mt-6 border-t border-current/10 pt-6">
   <DriverHistory/>
   <DriverAssignmentRecords/>
  </div>:null}
 </section>;
}
