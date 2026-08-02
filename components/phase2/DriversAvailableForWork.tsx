"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";
import styles from "./DriversAvailableForWork.module.css";
import LoadLinkPagination from "@/components/LoadLinkPagination";

type Driver = {
  id: string;
  full_name: string;
  headline?: string;
  city: string;
  province: string;
  years_experience: number;
  licence_code: string;
  vehicle_types: string[];
  bio?: string;
  availability: string;
  total_count?: number | string;
};

type SortOption = "recommended" | "experience" | "name" | "location" | "available";

const PAGE_SIZE = 7;

export default function DriversAvailableForWork({
  darkMode = false,
  fullPage = false,
  showHero = true,
}: {
  darkMode?: boolean;
  fullPage?: boolean;
  showHero?: boolean;
}) {
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [filtersReady, setFiltersReady] = useState(!fullPage);

  useEffect(() => {
    if (!fullPage) return;
    const params = new URLSearchParams(window.location.search);
    setSearchTerm(params.get("search") || "");
    setCityFilter(params.get("city") || "");
    setFiltersReady(true);
  }, [fullPage]);

  useEffect(() => {
    if (!filtersReady) return;
    let active = true;
    setLoading(true);
    setNotice("");

    const params = new URLSearchParams({
      limit: fullPage ? "50" : "4",
      offset: "0",
    });
    if (fullPage && searchTerm) params.set("search", searchTerm);
    if (fullPage && cityFilter) params.set("city", cityFilter);

    fetch(`/api/phase2/public-drivers?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result.error || "Driver profiles could not be loaded."));
        return result;
      })
      .then((result) => {
        if (!active) return;
        setAllDrivers((result.drivers ?? []) as Driver[]);
        setPage(1);
      })
      .catch((error) => {
        if (!active) return;
        setAllDrivers([]);
        setNotice(error instanceof Error ? error.message : "Driver profiles could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cityFilter, filtersReady, fullPage, searchTerm]);

  const sortedDrivers = useMemo(() => {
    const rows = [...allDrivers];
    if (sort === "experience") return rows.sort((a, b) => Number(b.years_experience || 0) - Number(a.years_experience || 0));
    if (sort === "name") return rows.sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    if (sort === "location") return rows.sort((a, b) => `${a.province || ""} ${a.city || ""}`.localeCompare(`${b.province || ""} ${b.city || ""}`));
    if (sort === "available") return rows.sort((a, b) => availabilityScore(b.availability) - availabilityScore(a.availability));
    return rows;
  }, [allDrivers, sort]);

  const drivers = fullPage
    ? sortedDrivers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : sortedDrivers.slice(0, 4);
  const pageCount = Math.max(1, Math.ceil(sortedDrivers.length / PAGE_SIZE));

  async function contact(id: string) {
    setNotice("");
    let token = "";
    try {
      const { data } = await browserSupabase().auth.getSession();
      token = data.session?.access_token || "";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "LoadLink could not connect to your account.");
      return;
    }
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent("/drivers")}`;
      return;
    }
    const response = await fetch(`/api/phase2/contact/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) {
      setNotice(result.error ?? "This driver cannot be contacted right now.");
      return;
    }
    if (result.phone) window.location.href = `tel:${String(result.phone).replace(/[^+0-9]/g, "")}`;
    else if (result.email) window.location.href = `mailto:${result.email}`;
  }

  const sectionClass = `${styles.section} ${darkMode ? styles.dark : styles.light} ${fullPage ? styles.fullPage : ""} ${showHero ? "" : styles.embedded}`;

  return (
    <section className={sectionClass} data-loadlink-phase2-home>
      {showHero ? (
        <div className={styles.hero}>
          <img src="/images/driver-profile-hero.jpg" alt="Truck drivers ready for logistics opportunities" className={styles.heroImage} />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <h2 className={styles.title}>Drivers Available for Work</h2>
            <p className={styles.subtitle}>Approved drivers can present their licence details, experience, routes and availability directly to logistics companies and truck owners.</p>
            <div className={styles.actions}>
              <Link data-marketplace-action className={styles.primary} href="/driver-profile">Create driver profile</Link>
              {fullPage ? <Link className={styles.secondary} href="/account/settings">Profile settings</Link> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.content}>
        <div className={styles.resultsHeader}>
          {!showHero ? (
            <div>
              <h2 className={styles.embeddedHeading}>Approved drivers ready for work</h2>
              <p className={styles.embeddedCopy}>Browse approved profiles and contact a suitable driver through LoadLink.</p>
            </div>
          ) : (
            <div>
              <h2 className={styles.resultsTitle}>Available drivers</h2>
              {(searchTerm || cityFilter) ? <p className={styles.resultsCopy}>Showing matches for {[searchTerm, cityFilter].filter(Boolean).join(" · ")}.</p> : null}
            </div>
          )}

          <label className={styles.sortControl}>
            <span>Sort</span>
            <select value={sort} onChange={(event) => { setSort(event.target.value as SortOption); setPage(1); }}>
              <option value="recommended">Recommended</option>
              <option value="available">Available first</option>
              <option value="experience">Most experience</option>
              <option value="name">Name A–Z</option>
              <option value="location">Location A–Z</option>
            </select>
          </label>
        </div>

        {notice ? <p role="alert" className={styles.empty}>{notice}</p> : null}
        {loading ? (
          <div className={styles.empty}>Loading approved drivers…</div>
        ) : drivers.length === 0 ? (
          <div className={styles.empty}>No approved driver profiles match this search yet.</div>
        ) : (
          <div className={styles.grid}>
            {drivers.map((driver) => (
              <article className={styles.card} key={driver.id}>
                <div className={styles.avatar} aria-hidden="true">{initials(driver.full_name)}</div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <div>
                      <h3>{driver.full_name}</h3>
                      <p className={styles.headline}>{driver.headline || "Professional driver"}</p>
                    </div>
                    <span className={styles.verified}>Approved</span>
                  </div>
                  <div className={styles.meta}>
                    <span>{driver.city}, {driver.province}</span>
                    <span>{driver.years_experience} years</span>
                    <span>Licence {driver.licence_code}</span>
                    <span>{driver.availability || "Availability on request"}</span>
                  </div>
                  <p className={styles.bio}>{driver.bio || driver.vehicle_types?.slice(0, 3).join(" · ") || "Available for suitable logistics work."}</p>
                  <button data-marketplace-action type="button" className={styles.contact} onClick={() => void contact(driver.id)}>Contact driver</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {fullPage && pageCount > 1 ? (
          <LoadLinkPagination current={page} total={pageCount} onChange={setPage} darkMode={darkMode} label="Driver profile pages" />
        ) : null}
      </div>
    </section>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL";
}

function availabilityScore(value: string) {
  const clean = String(value || "").toLowerCase();
  if (clean.includes("immediate") || clean.includes("available now")) return 3;
  if (clean.includes("available")) return 2;
  if (clean.includes("notice")) return 1;
  return 0;
}
