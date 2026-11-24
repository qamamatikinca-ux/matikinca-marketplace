"use client";

import DriverContactDialog from "@/components/DriverContactDialog";
import LoadLinkImage from "@/components/LoadLinkImage";
import LoadLinkSortControl from "@/components/LoadLinkSortControl";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";
import styles from "./DriversAvailableForWork.module.css";
import LoadLinkPagination from "@/components/LoadLinkPagination";

type Driver = {
  id: string;
  user_id?: string | null;
  profile_image_url?: string | null;
  full_name: string;
  headline?: string;
  city: string;
  province: string;
  years_experience: number;
  licence_code: string;
  vehicle_types: string[];
  bio?: string;
  availability: string;
  average_rating?: number | string;
  review_count?: number | string;
  total_count?: number | string;
};

type SortOption = "recommended" | "experience" | "name" | "location" | "available";
type DriverNeed = "" | "long_distance" | "local_delivery" | "heavy_vehicle" | "mining" | "refrigerated" | "tanker" | "passenger";
const NEEDS: {value:DriverNeed;label:string}[]=[
 {value:"",label:"Any type of work"},
 {value:"long_distance",label:"Long-distance transport"},
 {value:"local_delivery",label:"Local deliveries"},
 {value:"heavy_vehicle",label:"Heavy vehicles"},
 {value:"mining",label:"Mining / construction"},
 {value:"refrigerated",label:"Refrigerated transport"},
 {value:"tanker",label:"Tankers"},
 {value:"passenger",label:"Passenger transport"}
];
function needScore(row:Driver, need:DriverNeed){
 if(!need)return 0;
 const detail=[row.headline,row.bio,...(row.vehicle_types||[])].join(" ").toLowerCase();
 const licence=(row.licence_code||"").toUpperCase();
 const match=(pattern:RegExp)=>pattern.test(detail);
 if(need==="long_distance")return (match(/long.?distance|cross.?border|line.?haul|national|inter.?provincial/)?6:0)+(/\bEC\b|CODE 14/.test(licence)?3:0)+(match(/truck|super.?link/)?1:0);
 if(need==="local_delivery")return (match(/courier|local|last.?mile|deliver|distribution|urban/)?5:0)+(match(/van|bakkie/)?2:0);
 if(need==="heavy_vehicle")return (match(/truck|heavy|articulated|rigid|super.?link/)?5:0)+(/\bEC\b|\bC\b|CODE 14|CODE 10/.test(licence)?2:0);
 if(need==="mining")return match(/mining|tipper|construction|quarry|side.?tipper/)?6:0;
 if(need==="refrigerated")return match(/refrigerat|cold.?chain|reefer|fridge/)?6:0;
 if(need==="tanker")return match(/tanker|fuel|hazchem|bulk.?liquid/)?6:0;
 return match(/passenger|bus|coach|shuttle/)?6:0;
}
const PAGE_SIZE = 7;

export default function DriversAvailableForWork({ darkMode = false, fullPage = false, showHero = true }: { darkMode?: boolean; fullPage?: boolean; showHero?: boolean }) {
  const [contactTarget, setContactTarget] = useState<Driver | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [search,setSearch]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [need,setNeed]=useState<DriverNeed>("");
  const [location,setLocation]=useState("");
  const [licence,setLicence]=useState("");
  const [minExperience,setMinExperience]=useState(0);
  const [availableOnly,setAvailableOnly]=useState(false);
  const [reviewTarget, setReviewTarget] = useState<Driver | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [ownsDriverProfile, setOwnsDriverProfile] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const sb = browserSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!active || !auth.user) return;
        const { data } = await sb.from("driver_profiles").select("id").eq("user_id", auth.user.id).limit(1).maybeSingle();
        if (active) setOwnsDriverProfile(Boolean(data?.id));
      } catch {
        if (active) setOwnsDriverProfile(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true; queueMicrotask(() => { if (active) { setLoading(true); setNotice(""); } });
    const pageSize=fullPage?50:4;
    async function fetchDrivers(offset:number){
      const params=new URLSearchParams({limit:String(pageSize),offset:String(offset)});
      const response=await fetch(`/api/phase2/public-drivers?${params.toString()}`,{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(String(data.error||"Driver profiles could not be loaded."));
      return data;
    }
    void (async()=>{
      try{
        const first=await fetchDrivers(0);
        let results=(first.drivers||[]) as Driver[];
        const total=Number(first.total||results[0]?.total_count||0);
        if(fullPage&&total>pageSize){
          const offsets=Array.from({length:Math.min(5,Math.ceil(total/pageSize))-1},(_,i)=>(i+1)*pageSize);
          const next=await Promise.all(offsets.map(offset=>fetchDrivers(offset)));
          results=[...results,...next.flatMap(r=>(r.drivers||[]) as Driver[])];
        }
        if(active){setAllDrivers(results);setPage(1);}
      }catch(error){if(active){setAllDrivers([]);setNotice(error instanceof Error?error.message:"Driver profiles could not be loaded.");}}
      finally{if(active)setLoading(false);}
    })();
    return () => { active = false; };
  }, [fullPage]);

  const sortedDrivers=useMemo(()=>{
    const rows=allDrivers.filter(row=>{
      const term=search.trim().toLowerCase();
      if(term && ![row.full_name,row.headline,row.bio,row.city,row.province,row.licence_code,...(row.vehicle_types||[])].join(" ").toLowerCase().includes(term))return false;
      if(location.trim()&&!([row.city,row.province].join(" ").toLowerCase().includes(location.trim().toLowerCase())))return false;
      if(licence && !String(row.licence_code||"").toUpperCase().includes(licence))return false;
      if(Number(row.years_experience||0)<minExperience)return false;
      if(availableOnly && availabilityScore(row.availability)<2)return false;
      if(need&&needScore(row,need)===0)return false;
      return true;
    });
    if(sort==="experience")return rows.sort((a,b)=>Number(b.years_experience||0)-Number(a.years_experience||0));
    if(sort==="name")return rows.sort((a,b)=>a.full_name.localeCompare(b.full_name));
    if(sort==="location")return rows.sort((a,b)=>`${a.province} ${a.city}`.localeCompare(`${b.province} ${b.city}`));
    if(sort==="available")return rows.sort((a,b)=>availabilityScore(b.availability)-availabilityScore(a.availability));
    return rows.sort((a,b)=>
      needScore(b,need)-needScore(a,need)
      ||availabilityScore(b.availability)-availabilityScore(a.availability)
      ||Number(b.average_rating||0)-Number(a.average_rating||0)
      ||Number(b.years_experience||0)-Number(a.years_experience||0)
    );
  },[allDrivers,search,need,location,licence,minExperience,availableOnly,sort]);
  useEffect(()=>{setPage(1)},[search,need,location,licence,minExperience,availableOnly,sort]);

  const drivers = fullPage ? sortedDrivers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : sortedDrivers.slice(0, 4);
  const pageCount = Math.max(1, Math.ceil(sortedDrivers.length / PAGE_SIZE));

  async function submitReview() {
    if (!reviewTarget?.user_id) return;
    setReviewBusy(true); setNotice("");
    try {
      const sb = browserSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { window.location.href = `/login?next=${encodeURIComponent("/drivers")}`; return; }
      const { error } = await sb.functions.invoke("loadlink-review-service", { body: { target_user_id: reviewTarget.user_id, rating: reviewRating, body: reviewBody } });
      if (error) throw error;
      setAllDrivers((rows) => rows.map((row) => row.id === reviewTarget.id ? { ...row, average_rating: reviewRating, review_count: Math.max(1, Number(row.review_count || 0)) } : row));
      setReviewTarget(null); setReviewBody(""); setReviewRating(5); setNotice("Review saved. Thank you for keeping LoadLink profiles accountable.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review could not be saved."); }
    finally { setReviewBusy(false); }
  }

  const sectionClass = `${styles.section} ${darkMode ? styles.dark : styles.light} ${fullPage ? styles.fullPage : ""} ${showHero ? "" : styles.embedded}`;

  return (
    <section className={sectionClass} data-loadlink-phase2-home>
      {showHero ? <div className={`${styles.hero} ll-driver-hero`}><LoadLinkImage src="/images/driver-profile-hero.jpg" alt="Truck drivers ready for logistics opportunities" className={styles.heroImage} /><div className={styles.heroShade} /><div className={styles.heroContent}><h2 className={styles.title}>Drivers Available for Work</h2><p className={styles.subtitle}>Approved drivers can present their licence details, experience, routes and availability directly to logistics companies and truck owners.</p><div className={styles.actions}><Link data-marketplace-action className={styles.primary} href="/driver-profile">{ownsDriverProfile ? "Manage your profile" : "Create driver profile"}</Link>{fullPage ? <Link className={styles.secondary} href="/account/settings">Profile settings</Link> : null}</div></div></div> : null}

      <div className={styles.content}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.embeddedHeading}>{showHero?"Available drivers":"Approved drivers"}</h2>
        </div>
        {fullPage?<div data-loadlink-autotrader-search="true" className={styles.searchShell}>
          <form onSubmit={e=>{e.preventDefault();document.getElementById("loadlink-driver-results")?.scrollIntoView({behavior:"smooth",block:"start"})}}>
            <div className={styles.searchRow}>
              <span className={styles.searchSymbol}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.9"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.1 4.1" strokeLinecap="round"/></svg></span>
              <input type="search" aria-label="Search professional drivers" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search drivers, routes or vehicles" className={styles.searchInput} />
            </div>
            <div className={styles.searchControls}>
              <button type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)} className={styles.filtersButton}>
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg>
                <span>Filters{need||location||licence||minExperience||availableOnly?" · Active":""}</span>
              </button>
              <button type="submit" className={styles.searchButton}>Search drivers</button>
            </div>
          </form>
          {filtersOpen?<div className={styles.filterPanel} aria-label="Driver filters">
            <div className={styles.filterFields}>
              <label className={styles.filterField}><span>Work type</span><select value={need} onChange={e=>setNeed(e.target.value as DriverNeed)}>
                {NEEDS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
              </select></label>
              <div className={styles.filterField}><label htmlFor="loadlink-driver-location">Location</label>
                <SouthAfricaLocationInput id="loadlink-driver-location" value={location} onChange={setLocation}
                  darkMode={darkMode} placeholder="City or province" ariaLabel="Search drivers by location" className={styles.locationInput}/>
              </div>
              <label className={styles.filterField}><span>Licence</span><select value={licence} onChange={e=>setLicence(e.target.value)}>
                <option value="">All licences</option><option value="EC">Code 14 / EC</option>
                <option value="C1">C1</option><option value="C">C</option><option value="EB">EB</option><option value="B">B</option>
              </select></label>
              <label className={styles.filterField}><span>Experience</span><select value={minExperience} onChange={e=>setMinExperience(Number(e.target.value))}>
                {[0,1,3,5,10].map(x=><option key={x} value={x}>{x===0?"Any experience":`${x}+ years`}</option>)}
              </select></label>
              <label className={styles.filterCheck}><input type="checkbox" checked={availableOnly} onChange={e=>setAvailableOnly(e.target.checked)}/> Available now</label>
            </div>
            <div className={styles.filterFooter}>
              <button type="button" onClick={()=>{setNeed("");setLocation("");setLicence("");setMinExperience(0);setAvailableOnly(false);setSearch("")}}>Clear all</button>
              <button type="button" onClick={()=>setFiltersOpen(false)}>Show {sortedDrivers.length} drivers</button>
            </div>
          </div>:null}
        </div>:null}

        <div id="loadlink-driver-results" className={styles.resultsBar}>
          <span>{loading?"Loading drivers…":`${sortedDrivers.length} driver${sortedDrivers.length===1?"":"s"} found`}</span>
          <LoadLinkSortControl darkMode={darkMode} value={sort} onChange={value=>setSort(value as SortOption)}
           options={[{value:"recommended",label:"Recommended"},{value:"available",label:"Available first"},{value:"experience",label:"Most experience"},{value:"name",label:"Name A–Z"},{value:"location",label:"Location A–Z"}]}/>
        </div>
        {notice?<p role="alert" className={styles.empty}>{notice}</p>:null}
        {loading?<div className={styles.empty}>Loading approved drivers…</div>:!drivers.length?<div className={styles.empty}>No approved drivers match your search.</div>
        :<div className={styles.grid}>{drivers.map(driver=>{
          const rating=Number(driver.average_rating||0),count=Number(driver.review_count||0);
          const place=[driver.city,driver.province].filter(Boolean).join(", ");
          return <article className={styles.directoryCard} data-loadlink-refined-driver-card="true" key={driver.id}>
            <div className={styles.cardTop}>
              <div className={styles.portrait}>
                {driver.profile_image_url?<LoadLinkImage src={driver.profile_image_url}
                  alt={`${driver.full_name} profile photograph`} className="h-full w-full object-cover" />:<span>{initials(driver.full_name)}</span>}
              </div>
              <div className={styles.cardIdentity}>
                <span className={styles.approved}>APPROVED</span>
                <h3 className={styles.driverName}>{driver.full_name}</h3>
                <p className={styles.cardRole}>{driver.headline||"Professional driver"}</p>
              </div>
            </div>
            <div className={styles.cardFacts}>
              <span>{place||"South Africa"}</span>
              <span>{driver.licence_code||"Licence on request"}</span>
              <span>{Number(driver.years_experience||0)} {Number(driver.years_experience||0)===1?"year":"years"}</span>
            </div>
            <div className={styles.cardFoot}>
              <span className={styles.available}>{driver.availability||"Availability on request"}</span>
              {count>0?<span className={styles.rating}>★ {rating.toFixed(1)} · {count} review{count===1?"":"s"}</span>:null}
            </div>
            <div className={styles.cardActions}>
              <button data-marketplace-action type="button" onClick={()=>setContactTarget(driver)}
                className={styles.cardContact}>Contact driver</button>
            </div>
            <details className={styles.cardDetails}>
              <summary>View driver details</summary>
              <div className={styles.cardExpanded}>
                <p><strong>Vehicle experience:</strong> {driver.vehicle_types?.join(", ")||"On request"}</p>
                {driver.bio?<p className="mt-2 whitespace-pre-wrap">{driver.bio}</p>:null}
                {driver.user_id?<button type="button" onClick={()=>setReviewTarget(driver)}
                  className={styles.reviewButton}>Write a review</button>:null}
              </div>
            </details>
          </article>;
        })}</div>}
        {fullPage&&pageCount>1?<LoadLinkPagination current={page} total={pageCount} onChange={setPage} darkMode={darkMode} label="Driver profile pages"/>:null}
      </div>

      {contactTarget ? <DriverContactDialog id={contactTarget.id} name={contactTarget.full_name} darkMode={darkMode} onClose={() => setContactTarget(null)} /> : null}
      {reviewTarget ? <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-black/65 p-3 sm:items-center"><button aria-label="Close review" className="absolute inset-0" onClick={()=>setReviewTarget(null)} /><section className={`relative z-10 w-full max-w-md rounded-[26px] border p-5 shadow-2xl ${darkMode?"border-white/12 bg-[#0b0b0b] text-white":"border-black/10 bg-white text-black"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Review {reviewTarget.full_name}</h3><p className="mt-1 text-xs opacity-50">Your rating appears on this approved LoadLink profile.</p></div><button className="h-9 w-9 rounded-full border border-current/15" onClick={()=>setReviewTarget(null)} aria-label="Close review"><LoadLinkIcon name="close" size={18} className="inline-block shrink-0 align-middle" /></button></div><div className="mt-5 flex gap-2" aria-label="Rating">{[1,2,3,4,5].map(star=><button key={star} type="button" aria-label={`${star} out of 5 stars`} aria-pressed={star<=reviewRating} onClick={()=>setReviewRating(star)} className={`h-10 w-10 rounded-full border text-lg ${star<=reviewRating?"border-[#f6b800] bg-[#f6b800] text-black":"border-current/15"}`}><LoadLinkIcon name="star" size={16} className="inline-block shrink-0 align-middle" /></button>)}</div><textarea maxLength={1200} value={reviewBody} onChange={e=>setReviewBody(e.target.value)} placeholder="Describe your experience (optional)" className={`mt-4 min-h-28 w-full rounded-2xl border p-3 text-sm outline-none ${darkMode?"border-white/12 bg-white/[.04]":"border-black/10 bg-[#fafafa]"}`} /><button type="button" disabled={reviewBusy} onClick={()=>void submitReview()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{reviewBusy?"Saving…":"Save review"}</button></section></div> : null}
    </section>
  );
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL"; }
function availabilityScore(value: string) { const clean=String(value||"").toLowerCase(); if(/unavailable|not available|not seeking|employed|busy/.test(clean))return 0;if(clean.includes("immediate")||clean.includes("available now"))return 3;if(clean.includes("available"))return 2;if(clean.includes("notice"))return 1;return 0; }
