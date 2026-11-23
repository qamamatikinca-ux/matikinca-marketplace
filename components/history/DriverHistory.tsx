"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
import {loginHref} from "@/lib/auth";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";

type Driver={id:string;full_name:string;headline:string|null;city:string;province:string;licence_code:string;years_experience:number;prdp_required:boolean;prdp_expiry:string|null;licence_expires_at:string|null;licence_expiry:string|null;prdp_expires_at:string|null;profile_expires_at:string|null;availability:string;vehicle_types:string[]|null;route_experience:string[]|null;status:string;verification_level:string;created_at:string};
type DriverDocument={id:string;document_type:string;original_filename:string;validation_status:string;uploaded_at:string};
type Ref={id:string;referee_name:string;referee_company:string|null;verification_status:string;verified_at:string|null};
type Assignment={id:string;listing_id:string;operator_user_id:string;driver_user_id:string;driver_display_name:string;vehicle_registration:string;assignment_date:string|null;status:string;created_at:string};
type EmployerReference={id:string;assignment_id:string;employer_user_id:string;driver_user_id:string;statement:string;created_at:string};
type Application={id:string;vacancy_id:string;status:string;created_at:string};
function date(value:string|null|undefined){if(!value)return "Not recorded";const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}):"Not recorded"}
function expiry(value:string|null|undefined){if(!value)return "Not recorded";const d=new Date(value);if(!Number.isFinite(d.getTime()))return "Not recorded";return value.slice(0,10)<new Date().toISOString().slice(0,10)?`Expired · ${date(value)}`:`Valid until ${date(value)}`}
export default function DriverHistory(){
 const {darkMode}=useLoadLinkTheme();
 const [profile,setProfile]=useState<Driver|null>(null);const [documents,setDocuments]=useState<DriverDocument[]>([]);
 const [references,setReferences]=useState<Ref[]>([]);const [employerReferences,setEmployerReferences]=useState<EmployerReference[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);const [applications,setApplications]=useState<Application[]>([]);
 const [uid,setUid]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const [referenceNotes,setReferenceNotes]=useState<Record<string,string>>({});const [sending,setSending]=useState("");const [notice,setNotice]=useState("");
 const surface=darkMode?"border-white/15 bg-[#111]":"border-black/10 bg-white";
 const input=darkMode?"border-white/15 bg-black text-white":"border-black/15 bg-white text-black";
 useEffect(()=>{let live=true;(async()=>{
  try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(!live)return;if(authError)throw authError;if(!user){window.location.assign(loginHref("/history"));return}
    setUid(user.id);
    const [p,a,apps]=await Promise.all([
      supabase.from("driver_profiles").select("id,full_name,headline,city,province,licence_code,years_experience,prdp_required,prdp_expiry,licence_expires_at,licence_expiry,prdp_expires_at,profile_expires_at,availability,vehicle_types,route_experience,status,verification_level,created_at").eq("user_id",user.id).maybeSingle(),
      supabase.from("job_driver_assignments").select("id,listing_id,operator_user_id,driver_user_id,driver_display_name,vehicle_registration,assignment_date,status,created_at").or(`operator_user_id.eq.${user.id},driver_user_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(120),
      supabase.from("driver_vacancy_applications").select("id,vacancy_id,status,created_at").eq("driver_user_id",user.id).order("created_at",{ascending:false}).limit(80),
    ]);
    if(!live)return;if(p.error||a.error||apps.error)throw p.error||a.error||apps.error;
    const d=p.data as Driver|null;setProfile(d);setAssignments((a.data||[]) as Assignment[]);setApplications((apps.data||[]) as Application[]);
    const assignIds=(a.data||[]).map(x=>x.id);
    const [docs,refs,employers]=await Promise.all([
      d?supabase.from("driver_documents").select("id,document_type,original_filename,validation_status,uploaded_at").eq("profile_id",d.id).order("uploaded_at",{ascending:false}):Promise.resolve({data:[],error:null}),
      d?supabase.from("driver_references").select("id,referee_name,referee_company,verification_status,verified_at").eq("driver_profile_id",d.id).order("created_at",{ascending:false}):Promise.resolve({data:[],error:null}),
      assignIds.length?supabase.from("driver_assignment_references").select("id,assignment_id,employer_user_id,driver_user_id,statement,created_at").in("assignment_id",assignIds):Promise.resolve({data:[],error:null})
    ]);
    if(!live)return;
    if(docs.error||refs.error||employers.error)throw docs.error||refs.error||employers.error;
    setDocuments((docs.data||[]) as DriverDocument[]);setReferences((refs.data||[]) as Ref[]);setEmployerReferences((employers.data||[]) as EmployerReference[]);
  }catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load driver history. Please retry.")}
  finally{if(live)setLoading(false)}
 })();return()=>{live=false}},[]);
 async function submitReference(assignment:Assignment){
  const statement=referenceNotes[assignment.id]?.trim()||"";if(sending||statement.length<30)return;
  setSending(assignment.id);setNotice("");
  const {data,error:writeError}=await supabase.from("driver_assignment_references").insert({
    assignment_id:assignment.id,employer_user_id:uid,driver_user_id:assignment.driver_user_id,statement
  }).select("id,assignment_id,employer_user_id,driver_user_id,statement,created_at").single();
  if(writeError)setNotice(writeError.message);
  else {setEmployerReferences(current=>[...current,data as EmployerReference]);setReferenceNotes(s=>({...s,[assignment.id]:""}));setNotice("Employer reference recorded for this completed assignment.")}
  setSending("");
 }
 const ownAssignments=assignments.filter(x=>x.driver_user_id===uid);
 const givenAssignments=assignments.filter(x=>x.operator_user_id===uid&&x.driver_user_id!==uid);
 const refById=new Map(employerReferences.map(x=>[x.assignment_id,x]));
 return <section id="driver-history" className="scroll-mt-24">
   <div className="mb-5"><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Driver History & Documents</h2>
    <p className="mt-1 text-sm opacity-65">Your professional profile, document status, work assignments and references. Identity evidence remains private.</p></div>
   {error?<p className="mb-5 rounded-xl border border-red-500/30 p-3 text-sm text-red-600" role="alert">{error}</p>:null}
   {notice?<p className="mb-5 rounded-xl border border-current/15 p-3 text-sm" role="status">{notice}</p>:null}
   {loading?<div className={`rounded-2xl border p-6 text-sm ${surface}`}>Loading your driver records…</div>:<>
    <div className={`rounded-[22px] border p-5 sm:p-6 ${surface}`}>
     <h3 className="text-lg font-black">Professional driver record</h3>
     {!profile?<p className="mt-3 text-sm opacity-70">You have not created a LoadLink Driver Profile yet. <Link className="font-bold underline" href="/driver-profile">Create your profile</Link> to start a professional record.</p>:<>
      <p className="mt-3 text-xl font-bold">{profile.full_name}</p>
      <p className="mt-1 text-sm opacity-65">{[profile.headline,profile.city,profile.province].filter(Boolean).join(" · ")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
       {([["Licence",profile.licence_code],["Driving experience",profile.years_experience+" years"],["Driver status",profile.status],["Vehicle experience",(profile.vehicle_types||[]).join(", ")||"Not recorded"],["Licence expiry",expiry(profile.licence_expires_at||profile.licence_expiry)],["PrDP",profile.prdp_required?expiry(profile.prdp_expires_at||profile.prdp_expiry):"Not required on profile"],["Profile validity",expiry(profile.profile_expires_at)],["Availability",profile.availability]] as const).map(([name,value])=><div key={name} className="border-b border-current/10 pb-3 text-sm"><p className="text-xs font-semibold opacity-55">{name}</p><p className="mt-1 font-semibold">{value||"Not recorded"}</p></div>)}
      </div>
      <p className="mt-3 text-xs opacity-65">Verification is performed by authorised LoadLink staff. This view does not automatically approve documents.</p>
      <Link href="/driver-profile" className="mt-3 inline-block text-sm font-bold underline underline-offset-4">Update existing Driver Profile</Link>
     </>}
    </div>
    <div className={`mt-4 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
     <h3 className="text-lg font-black">Documents</h3>
     <p className="mt-1 text-xs opacity-65">Private files stay in their existing protected storage. This list shows document type and review state, not the contents of identity records.</p>
     {!documents.length?<p className="mt-3 text-sm opacity-65">No driver documents recorded yet.</p>:
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{documents.map(d=><div key={d.id} className="rounded-xl border border-current/10 p-3">
       <p className="text-sm font-bold">{d.document_type.replaceAll("_"," ")}</p><p className="mt-1 break-all text-xs opacity-60">{d.original_filename}</p>
       <p className="mt-1 text-xs">Status: {d.validation_status||"Pending review"} · {date(d.uploaded_at)}</p>
      </div>)}</div>}
    </div>
    <div className={`mt-4 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
     <h3 className="text-lg font-black">Driver Work History</h3>
     {!ownAssignments.length?<p className="mt-3 text-sm opacity-65">No assigned transport work has been recorded for this profile yet.</p>:
      <div className="mt-4 space-y-3">{ownAssignments.map(a=><article key={a.id} className="rounded-xl border border-current/10 p-4">
       <p className="text-sm font-bold">Assignment {a.listing_id.slice(0,8).toUpperCase()}</p>
       <p className="mt-1 text-xs opacity-65">{date(a.assignment_date||a.created_at)} · {a.status.replaceAll("_"," ")}{a.vehicle_registration?" · "+a.vehicle_registration:""}</p>
       {refById.get(a.id)?<div className="mt-3 rounded-lg bg-[#f6b800]/10 p-3 text-xs"><strong>Employer reference:</strong><p className="mt-1 whitespace-pre-wrap">{refById.get(a.id)?.statement}</p></div>:null}
      </article>)}</div>}
    </div>
    <div className={`mt-4 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
     <h3 className="text-lg font-black">References</h3>
     {!references.length?<p className="mt-3 text-sm opacity-65">No previous reference contacts recorded in your Driver Profile.</p>:<div className="mt-3 grid gap-2 sm:grid-cols-2">{references.map(r=><div key={r.id} className="rounded-xl border border-current/10 p-3">
      <p className="text-sm font-bold">{r.referee_name}</p><p className="text-xs opacity-65">{r.referee_company||"Employer / referee"}</p>
      <p className="mt-1 text-xs">Recorded review state: {r.verification_status||"Unverified"}</p>
     </div>)}</div>}
     <p className="mt-3 text-xs opacity-55">Self-submitted referee contacts are separate from employer-confirmed assignment references shown above.</p>
    </div>
    {applications.length?<div className={`mt-4 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
      <h3 className="text-lg font-black">Driver Applications</h3><div className="mt-3 space-y-2">{applications.map(a=><p key={a.id} className="border-b border-current/10 py-2 text-sm">Application {a.vacancy_id.slice(0,8).toUpperCase()} · <strong>{a.status.replaceAll("_"," ")}</strong> · {date(a.created_at)}</p>)}</div>
      <Link href="/messages/recruitment" className="mt-3 inline-block text-sm font-bold underline">View application conversations in Messages</Link>
     </div>:null}
    {givenAssignments.length?<div className={`mt-4 rounded-[22px] border p-5 sm:p-6 ${surface}`}>
      <h3 className="text-lg font-black">Driver Assignments You Managed</h3>
      <p className="mt-1 text-xs opacity-65">A factual employer reference is available once your assignment is completed.</p>
      {givenAssignments.map(a=><article key={a.id} className="mt-3 rounded-xl border border-current/10 p-4">
       <p className="text-sm font-bold">{a.driver_display_name} · {a.status.replaceAll("_"," ")}</p>
       <p className="mt-1 text-xs opacity-65">{date(a.assignment_date||a.created_at)}</p>
       {refById.get(a.id)?<p className="mt-2 whitespace-pre-wrap text-sm">{refById.get(a.id)?.statement}</p>
       :a.status==="completed"?<div className="mt-3">
        <label className="block text-xs font-bold">Employer reference for completed work<textarea className={`mt-2 min-h-20 w-full rounded-xl border p-3 text-sm ${input}`} value={referenceNotes[a.id]||""} maxLength={3000} onChange={e=>setReferenceNotes(s=>({...s,[a.id]:e.target.value}))} placeholder="Describe the driver's actual responsibilities and performance."/></label>
        <button type="button" disabled={sending===a.id||(referenceNotes[a.id]||"").trim().length<30} onClick={()=>void submitReference(a)} className="mt-2 rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black disabled:opacity-45">Save employer reference</button>
       </div>:null}
      </article>)}
     </div>:null}
   </>}
 </section>;
}
