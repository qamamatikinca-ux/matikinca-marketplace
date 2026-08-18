"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";
import styles from "./DriversAvailableForWork.module.css";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { flexibleMatch } from "@/lib/smartSearch";
import { matchesSouthAfricanLocation } from "@/lib/southAfricaLocations";

type Driver = {
  id: string;
  user_id?: string | null;
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
const PAGE_SIZE = 7;

export default function DriversAvailableForWork({ darkMode = false, fullPage = false, showHero = true }: { darkMode?: boolean; fullPage?: boolean; showHero?: boolean }) {
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [filtersReady, setFiltersReady] = useState(!fullPage);
  const [reviewTarget, setReviewTarget] = useState<Driver | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    if (!fullPage) return;
    const params = new URLSearchParams(window.location.search);
    setSearchTerm(params.get("search") || ""); setCityFilter(params.get("city") || ""); setFiltersReady(true);
  }, [fullPage]);

  useEffect(() => {
    if (!filtersReady) return;
    let active = true; setLoading(true); setNotice("");
    const params = new URLSearchParams({ limit: fullPage ? "50" : "4", offset: "0" });
    fetch(`/api/phase2/public-drivers?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(String(result.error || "Driver profiles could not be loaded.")); return result; })
      .then((result) => { if (!active) return; setAllDrivers((result.drivers ?? []) as Driver[]); setPage(1); })
      .catch((error) => { if (!active) return; setAllDrivers([]); setNotice(error instanceof Error ? error.message : "Driver profiles could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filtersReady, fullPage]);

  const filteredDrivers = useMemo(() => allDrivers.filter((driver) => {
    const searchable = `${driver.full_name || ""} ${driver.headline || ""} ${driver.city || ""} ${driver.province || ""} ${driver.licence_code || ""} ${(driver.vehicle_types || []).join(" ")} ${driver.years_experience || ""} ${driver.availability || ""}`;
    return (!searchTerm.trim() || flexibleMatch(searchable, searchTerm)) && matchesSouthAfricanLocation(driver.city || driver.province, cityFilter);
  }), [allDrivers, cityFilter, searchTerm]);

  const sortedDrivers = useMemo(() => {
    const rows = [...filteredDrivers];
    if (sort === "experience") return rows.sort((a, b) => Number(b.years_experience || 0) - Number(a.years_experience || 0));
    if (sort === "name") return rows.sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    if (sort === "location") return rows.sort((a, b) => `${a.province || ""} ${a.city || ""}`.localeCompare(`${b.province || ""} ${b.city || ""}`));
    if (sort === "available") return rows.sort((a, b) => availabilityScore(b.availability) - availabilityScore(a.availability));
    return rows.sort((a,b) => Number(b.average_rating || 0)-Number(a.average_rating || 0));
  }, [filteredDrivers, sort]);

  const drivers = fullPage ? sortedDrivers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : sortedDrivers.slice(0, 4);
  const pageCount = Math.max(1, Math.ceil(sortedDrivers.length / PAGE_SIZE));

  async function contact(id: string) {
    setNotice(""); let token = "";
    try { const { data } = await browserSupabase().auth.getSession(); token = data.session?.access_token || ""; }
    catch (error) { setNotice(error instanceof Error ? error.message : "LoadLink could not connect to your account."); return; }
    if (!token) { window.location.href = `/login?next=${encodeURIComponent("/drivers")}`; return; }
    const response = await fetch(`/api/phase2/contact/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error ?? "This driver cannot be contacted right now."); return; }
    if (result.phone) window.location.href = `tel:${String(result.phone).replace(/[^+0-9]/g, "")}`;
    else if (result.email) window.location.href = `mailto:${result.email}`;
  }

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
      {showHero ? <div className={styles.hero}><img src="/images/driver-profile-hero.jpg" alt="Truck drivers ready for logistics opportunities" className={styles.heroImage} /><div className={styles.heroShade} /><div className={styles.heroContent}><h2 className={styles.title}>Drivers Available for Work</h2><p className={styles.subtitle}>Approved drivers can present their licence details, experience, routes and availability directly to logistics companies and truck owners.</p><div className={styles.actions}><Link data-marketplace-action className={styles.primary} href="/driver-profile">Create driver profile</Link>{fullPage ? <Link className={styles.secondary} href="/account/settings">Profile settings</Link> : null}</div></div></div> : null}

      <div className={styles.content}>
        {fullPage ? <div className={styles.filterBar}><label className={styles.filterField}><span>Search drivers</span><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Name, licence, vehicle experience" /></label><label className={styles.filterField}><span>Location</span><SouthAfricaLocationInput value={cityFilter} onChange={(value) => { setCityFilter(value); setPage(1); }} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Filter drivers by South African location" className={styles.locationInput} /></label></div> : null}
        <div className={styles.resultsHeader}>{!showHero ? <div><h2 className={styles.embeddedHeading}>Approved drivers ready for work</h2></div> : <div><h2 className={styles.resultsTitle}>Available drivers</h2>{(searchTerm || cityFilter) ? <p className={styles.resultsCopy}>Showing matches for {[searchTerm, cityFilter].filter(Boolean).join(" · ")}.</p> : null}</div>}<label className={`${styles.sortControl} loadlink-sort-control`}><span>Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortOption); setPage(1); }}><option value="recommended">Recommended</option><option value="available">Available first</option><option value="experience">Most experience</option><option value="name">Name A–Z</option><option value="location">Location A–Z</option></select></label></div>

        {notice ? <p role="alert" className={styles.empty}>{notice}</p> : null}
        {loading ? <div className={styles.empty}>Loading approved drivers…</div> : drivers.length === 0 ? <div className={styles.empty}>No approved driver profiles match this search yet.</div> : <div className={styles.grid}>{drivers.map((driver) => {
          const rating=Number(driver.average_rating||0), count=Number(driver.review_count||0);
          return <article className={styles.card} key={driver.id}><div className={styles.avatar} aria-hidden="true">{initials(driver.full_name)}</div><div className={styles.cardBody}><div className={styles.cardTop}><div><h3>{driver.full_name}</h3><p className={styles.headline}>{driver.headline || "Professional driver"}</p><p className="mt-1 text-[11px] font-bold opacity-60">{count ? `★ ${rating.toFixed(1)} · ${count} review${count===1?"":"s"}` : "No profile reviews yet"}</p></div><span className={styles.verified}>Approved</span></div><div className={styles.meta}><span>{driver.city}, {driver.province}</span><span>{driver.years_experience} years</span><span>Licence {driver.licence_code}</span><span>{driver.availability || "Availability on request"}</span></div><p className={styles.bio}>{driver.bio || driver.vehicle_types?.slice(0, 3).join(" · ") || "Available for suitable logistics work."}</p><div className="grid grid-cols-2 gap-2"><button data-marketplace-action type="button" className={styles.contact} onClick={() => void contact(driver.id)}>Contact driver</button>{driver.user_id ? <button type="button" className="rounded-xl border border-current/15 px-3 py-3 text-xs font-black" onClick={()=>setReviewTarget(driver)}>Review profile</button>:null}</div></div></article>;
        })}</div>}

        {fullPage && pageCount > 1 ? <LoadLinkPagination current={page} total={pageCount} onChange={setPage} darkMode={darkMode} label="Driver profile pages" /> : null}
      </div>

      {reviewTarget ? <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-black/65 p-3 sm:items-center"><button aria-label="Close review" className="absolute inset-0" onClick={()=>setReviewTarget(null)} /><section className={`relative z-10 w-full max-w-md rounded-[26px] border p-5 shadow-2xl ${darkMode?"border-white/12 bg-[#0b0b0b] text-white":"border-black/10 bg-white text-black"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Review {reviewTarget.full_name}</h3><p className="mt-1 text-xs opacity-50">Your rating appears on this approved LoadLink profile.</p></div><button className="h-9 w-9 rounded-full border border-current/15" onClick={()=>setReviewTarget(null)}>×</button></div><div className="mt-5 flex gap-2" aria-label="Rating">{[1,2,3,4,5].map(star=><button key={star} type="button" onClick={()=>setReviewRating(star)} className={`h-10 w-10 rounded-full border text-lg ${star<=reviewRating?"border-[#f6b800] bg-[#f6b800] text-black":"border-current/15"}`}>★</button>)}</div><textarea maxLength={1200} value={reviewBody} onChange={e=>setReviewBody(e.target.value)} placeholder="Describe your experience (optional)" className={`mt-4 min-h-28 w-full rounded-2xl border p-3 text-sm outline-none ${darkMode?"border-white/12 bg-white/[.04]":"border-black/10 bg-[#fafafa]"}`} /><button type="button" disabled={reviewBusy} onClick={()=>void submitReview()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{reviewBusy?"Saving…":"Save review"}</button></section></div> : null}
    </section>
  );
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL"; }
function availabilityScore(value: string) { const clean=String(value||"").toLowerCase(); if(clean.includes("immediate")||clean.includes("available now"))return 3;if(clean.includes("available"))return 2;if(clean.includes("notice"))return 1;return 0; }
