"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";
import styles from "./DriversAvailableForWork.module.css";

type Driver = {
  id:string; full_name:string; headline?:string; city:string; province:string;
  years_experience:number; licence_code:string; vehicle_types:string[]; bio?:string; availability:string;
};

export default function DriversAvailableForWork() {
  const [drivers,setDrivers]=useState<Driver[]>([]);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState("");

  useEffect(()=>{ fetch("/api/phase2/public-drivers?limit=8").then(r=>r.json()).then(d=>setDrivers(d.drivers??[])).catch(()=>setDrivers([])).finally(()=>setLoading(false)); },[]);

  async function contact(id:string){
    setNotice("");
    const { data } = await browserSupabase().auth.getSession();
    const token=data.session?.access_token;
    if(!token){ window.location.href="/login"; return; }
    const response=await fetch(`/api/phase2/contact/${id}`,{headers:{Authorization:`Bearer ${token}`}});
    const result=await response.json();
    if(!response.ok){ setNotice(result.error??"This driver cannot be contacted right now."); return; }
    if(result.phone) window.location.href=`tel:${String(result.phone).replace(/[^+0-9]/g,"")}`;
    else if(result.email) window.location.href=`mailto:${result.email}`;
  }

  return <section className={styles.section} data-loadlink-phase2-home>
    <div className={styles.headingRow}>
      <div><p className={styles.eyebrow}>LoadLink workforce</p><h2 className={styles.title}>Drivers Available for Work</h2><p className={styles.subtitle}>Approved drivers can show their experience, licence details, vehicle experience and availability to logistics companies and truck owners.</p></div>
      <div className={styles.actions}><Link data-marketplace-action className={styles.primary} href="/driver-profile">Create driver profile</Link><Link className={styles.secondary} href="/drivers">View all drivers</Link></div>
    </div>
    {notice && <p role="alert" className={styles.empty}>{notice}</p>}
    {loading ? <div className={styles.empty}>Loading approved drivers…</div> : drivers.length===0 ? <div className={styles.empty}>No approved driver profiles are available yet.</div> :
      <div className={styles.grid}>{drivers.map(driver=><article className={styles.card} key={driver.id}>
        <h3>{driver.full_name}</h3><p className={styles.headline}>{driver.headline||"Professional driver"}</p>
        <div className={styles.meta}><span>{driver.city}, {driver.province}</span><span>{driver.years_experience} years</span><span>Licence {driver.licence_code}</span></div>
        <p className={styles.bio}>{driver.bio||driver.vehicle_types?.slice(0,3).join(" · ")||"Available for suitable logistics work."}</p>
        <button data-marketplace-action type="button" className={styles.contact} onClick={()=>contact(driver.id)}>Contact driver</button>
      </article>)}</div>}
  </section>;
}
