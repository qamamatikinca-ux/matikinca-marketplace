"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {supabase} from "@/lib/supabaseClient";
import {loginHref} from "@/lib/auth";
type Listing={id:string;title:string;listing_kind:string;user_id:string};
type PublicDriver={id:string;user_id:string;full_name:string;city:string;licence_code:string;years_experience:number;vehicle_types:string[]|null};
type Assignment={id:string;listing_id:string;award_id:string|null;operator_user_id:string;driver_user_id:string;driver_profile_id:string;driver_display_name:string;vehicle_registration:string;collection_instructions:string;delivery_instructions:string;assignment_date:string|null;status:string;created_at:string};
type Award={listing_id:string;status:string;transporter_user_id:string;poster_user_id:string};
const label=(v:string)=>v.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());
export default function DriverAssignmentRecords(){
 const {darkMode}=useLoadLinkTheme();
 const [uid,setUid]=useState("");const [rows,setRows]=useState<Assignment[]>([]);
 const [listings,setListings]=useState<Listing[]>([]);const [drivers,setDrivers]=useState<PublicDriver[]>([]);
 const [search,setSearch]=useState("");const [listingId,setListingId]=useState("");
 const [driverId,setDriverId]=useState("");const [vehicle,setVehicle]=useState("");
 const [pickup,setPickup]=useState("");const [delivery,setDelivery]=useState("");
 const [date,setDate]=useState("");const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const surface=darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white";
 const input=`mt-2 h-11 w-full rounded-xl border px-3 text-sm ${darkMode?"border-white/20 bg-black":"border-black/15 bg-[#fafafa]"}`;
 const reload=useCallback(async(userId:string)=>{
   const [mine,awards,assignments]=await Promise.all([
     supabase.from("job_listings").select("id,title,listing_kind,user_id").eq("user_id",userId).in("listing_kind",["job","contract"]).limit(100),
     supabase.from("job_offer_awards").select("listing_id,status,poster_user_id,transporter_user_id").eq("transporter_user_id",userId).eq("status","confirmed").limit(100),
     supabase.from("job_driver_assignments").select("id,listing_id,award_id,operator_user_id,driver_user_id,driver_profile_id,driver_display_name,vehicle_registration,collection_instructions,delivery_instructions,assignment_date,status,created_at").order("created_at",{ascending:false}).limit(150)
   ]);
   if(mine.error||awards.error||assignments.error)throw(mine.error||awards.error||assignments.error);
   const confirmed=(awards.data||[]) as Award[];
   const ids=[...new Set([...(mine.data||[]).map(x=>x.id),...confirmed.map(x=>x.listing_id)])];
   let permitted:Listing[]=[...(mine.data||[]) as Listing[]];
   const more=ids.filter(id=>!permitted.some(x=>x.id===id));
   if(more.length){const {data,error:dbError}=await supabase.from("job_listings").select("id,title,listing_kind,user_id").in("id",more).limit(100);if(dbError)throw dbError;permitted=[...permitted,...(data||[]) as Listing[]];}
   setListings(permitted);
   setRows((assignments.data||[]) as Assignment[]);
   const requested=typeof window!=="undefined"?new URLSearchParams(location.search).get("listing"):"";
   setListingId(current=>permitted.some(x=>x.id===current)?current:permitted.find(x=>x.id===requested)?.id||permitted[0]?.id||"");
 },[]);
 useEffect(()=>{let alive=true;(async()=>{const{data:{user}}=await supabase.auth.getUser();if(!alive)return;if(!user){window.location.assign(loginHref("/history"));return}
   setUid(user.id);try{await reload(user.id);}catch(e){if(alive)setError(e instanceof Error?e.message:"Could not load assignments");}
   if(alive)setLoading(false);
 })();return()=>{alive=false}},[reload]);
 useEffect(()=>{let alive=true;const fetchDrivers=async()=>{const{data,error:dbError}=await supabase.rpc("loadlink_public_driver_profiles",{p_limit:30,p_offset:0,p_search:search.trim()||null});if(!alive)return;
    if(dbError)setError(dbError.message);else{const list=(data||[]) as PublicDriver[];setDrivers(list);setDriverId(id=>list.find(x=>x.id===id)?.id||list[0]?.id||"");}
 };const timer=window.setTimeout(()=>{void fetchDrivers()},250);return()=>{alive=false;window.clearTimeout(timer)}},[search]);
 async function create(e:FormEvent){e.preventDefault();if(!uid||!listingId||!driverId||busy)return;
    setBusy(true);setError("");setNotice("");
    const{error:dbError}=await supabase.from("job_driver_assignments").insert({
      listing_id:listingId,operator_user_id:uid,driver_profile_id:driverId,
      vehicle_registration:vehicle.trim(),collection_instructions:pickup.trim(),
      delivery_instructions:delivery.trim(),assignment_date:date||null
    });
    if(dbError)setError(dbError.message);else{setNotice("Driver assignment sent. The driver must acknowledge it.");setVehicle("");setPickup("");setDelivery("");setDate("");await reload(uid);}
    setBusy(false);
 }
 async function updateAssignment(item:Assignment,status:string){if(busy)return;setBusy(true);setError("");setNotice("");
    const{error:dbError}=await supabase.from("job_driver_assignments").update({status}).eq("id",item.id);
    if(dbError)setError(dbError.message);else{setNotice("Assignment progress recorded.");await reload(uid);}
    setBusy(false);
 }
 function choices(a:Assignment){if(a.driver_user_id===uid)return a.status==="offered"?["accepted","declined"]:a.status==="accepted"?["in_transit"]:a.status==="in_transit"?["delivery_reported"]:[];
    if(a.operator_user_id===uid)return a.status==="delivery_reported"?["completed","cancelled"]:["offered","accepted","in_transit"].includes(a.status)?["cancelled"]:[];
    return [];
 }
 return <section aria-label="Driver assignments and trip records" className="mt-4 scroll-mt-24">
   <div><h3 className="text-lg font-black">Driver Assignments & Trip Records</h3><p className="mt-2 text-sm opacity-65">Assign a qualified driver to transport jobs, acknowledge work and record completion.</p></div>
   {error?<p role="alert" className="mt-5 rounded-xl border border-red-500/25 p-3 text-sm text-red-600">{error}</p>:null}
   {notice?<p role="status" className="mt-5 rounded-xl border border-current/15 p-3 text-sm">{notice}</p>:null}
   <div className="mt-7 grid gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
    <section className={`rounded-2xl border p-5 ${surface}`}>
      <h2 className="text-lg font-black">My transport assignments</h2>
      {loading?<p className="mt-3 text-sm">Loading assignments…</p>:rows.length===0?<p className="mt-3 text-sm opacity-65">No assignments recorded yet. Drivers will see their assigned work here.</p>:
        rows.map(a=><article key={a.id} className="mt-4 rounded-xl border border-current/15 p-4">
         <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black">{listings.find(x=>x.id===a.listing_id)?.title||"LoadLink transport job"}</p><span className="rounded-lg border border-current/15 px-2 py-1 text-xs font-semibold">{label(a.status)}</span></div>
         <p className="mt-2 text-sm">{a.driver_display_name}{a.vehicle_registration?" · "+a.vehicle_registration:""}</p>
         <p className="mt-2 text-xs opacity-70">Scheduled: {a.assignment_date||"To be confirmed"} · {a.driver_user_id===uid?"Assigned to you":"Operator assignment"}</p>
         {a.collection_instructions?<p className="mt-3 whitespace-pre-wrap text-xs"><strong>Collection:</strong> {a.collection_instructions}</p>:null}
         {a.delivery_instructions?<p className="mt-2 whitespace-pre-wrap text-xs"><strong>Delivery:</strong> {a.delivery_instructions}</p>:null}
         <div className="mt-3 flex flex-wrap gap-2">{choices(a).map(next=><button key={next} type="button" disabled={busy} onClick={()=>void updateAssignment(a,next)} className={`rounded-xl px-3 py-2 text-xs font-bold ${next==="completed"||next==="accepted"?"bg-[#f6b800] text-black":"border border-current/20"}`}>{next==="accepted"?"Accept assignment":next==="declined"?"Decline":next==="in_transit"?"Start transport":next==="delivery_reported"?"Report delivery":next==="completed"?"Confirm completion":label(next)}</button>)}</div>
        </article>)}
    </section>
    <aside className={`h-fit rounded-2xl border p-5 ${surface}`}>
      <h2 className="text-lg font-black">Assign a driver</h2>
      <p className="mt-2 text-xs opacity-65">Only a job poster or confirmed transport operator can assign drivers. Select a verified public Driver Profile.</p>
      {!listings.length?<p className="mt-4 text-sm opacity-65">No jobs or awarded contracts are available for your account yet.</p>:
      <form onSubmit={create} className="mt-4 grid gap-3">
        <label className="text-xs font-bold">Job or contract<select className={input} value={listingId} onChange={e=>setListingId(e.target.value)}>{listings.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
        <label className="text-xs font-bold">Find a professional driver<input className={input} placeholder="Search approved driver profiles" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <label className="text-xs font-bold">Driver<select className={input} value={driverId} onChange={e=>setDriverId(e.target.value)}>{drivers.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.licence_code} · {x.city}</option>)}</select></label>
        <label className="text-xs font-bold">Vehicle registration<input className={input} value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="e.g. CA 123-456"/></label>
        <label className="text-xs font-bold">Collection instructions<textarea className={`${input} min-h-24 py-3`} value={pickup} onChange={e=>setPickup(e.target.value)} maxLength={2000}/></label>
        <label className="text-xs font-bold">Delivery instructions<textarea className={`${input} min-h-24 py-3`} value={delivery} onChange={e=>setDelivery(e.target.value)} maxLength={2000}/></label>
        <label className="text-xs font-bold">Assignment date<input className={input} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <button type="submit" disabled={busy||!driverId||!listingId} className="min-h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40">{busy?"Sending…":"Send assignment"}</button>
      </form>}
    </aside>
   </div>
  </section>;
}
