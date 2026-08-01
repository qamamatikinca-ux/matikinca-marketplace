"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";
import styles from "./DriversAvailableForWork.module.css";
import LoadLinkPagination from "@/components/LoadLinkPagination";

type Driver = {
  id: string;
  full_name: string;
  profile_image_url?: string;
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

const PAGE_SIZE = 7;

export default function DriversAvailableForWork({
  darkMode = false,
  fullPage = false,
}: {
  darkMode?: boolean;
  fullPage?: boolean;
}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const limit = fullPage ? PAGE_SIZE : 4;
    const offset = fullPage ? (page - 1) * PAGE_SIZE : 0;
    setNotice("");
    fetch(`/api/phase2/public-drivers?limit=${limit}&offset=${offset}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result.error || "Driver profiles could not be loaded."));
        return result;
      })
      .then((result) => {
        if (!active) return;
        const rows = (result.drivers ?? []) as Driver[];
        setDrivers(rows);
        setTotal(Number(result.total || rows[0]?.total_count || rows.length));
      })
      .catch((error) => {
        if (!active) return;
        setDrivers([]);
        setNotice(error instanceof Error ? error.message : "Driver profiles could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fullPage, page]);

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

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sectionClass = `${styles.section} ${darkMode ? styles.dark : styles.light} ${fullPage ? styles.fullPage : ""}`;

  return (
    <section className={sectionClass} data-loadlink-phase2-home>
      <div className={styles.hero}>
        <img src="/images/driver-profile-hero.jpg" alt="Truck drivers ready for logistics opportunities" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <h2 className={styles.title}>Drivers Available for Work</h2>
          <p className={styles.subtitle}>Approved drivers can present their licence details, experience, routes and availability directly to logistics companies and truck owners.</p>
          <div className={styles.actions}>
            <Link data-marketplace-action className={styles.primary} href="/driver-profile">Create driver profile</Link>
            {!fullPage ? <Link className={styles.secondary} href="/drivers">View all drivers</Link> : <Link className={styles.secondary} href="/account/settings">Profile settings</Link>}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {notice ? <p role="alert" className={styles.empty}>{notice}</p> : null}
        {loading ? (
          <div className={styles.empty}>Loading approved drivers…</div>
        ) : drivers.length === 0 ? (
          <div className={styles.empty}>No approved driver profiles are available yet.</div>
        ) : (
          <div className={styles.grid}>
            {drivers.map((driver) => (
              <article className={styles.card} key={driver.id}>
                <div className={styles.avatar}>{driver.profile_image_url ? <img src={driver.profile_image_url} alt="" className="h-full w-full rounded-full object-cover" /> : initials(driver.full_name)}</div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <div>
                      <h3><Link href={`/drivers/${driver.id}`}>{driver.full_name}</Link></h3>
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
                  <div className={styles.cardActions}><Link data-marketplace-action className={styles.profile} href={`/drivers/${driver.id}`}>View profile</Link><button data-marketplace-action type="button" className={styles.contact} onClick={() => void contact(driver.id)}>Contact driver</button></div>
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
