"use client";
import Link from "next/link";
import LoadLinkImage from "@/components/LoadLinkImage";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { useOwnDriverProfile } from "@/lib/useOwnDriverProfile";
import { driverProfilePresentation } from "@/lib/driverProfilePresentation";
import styles from "./OwnDriverProfileCard.module.css";
export default function OwnDriverProfileCard({ darkMode, compact = false }: { darkMode: boolean; compact?: boolean }) {
 const { profile, portrait, error, refresh } = useOwnDriverProfile();
 if (!profile) return error ? <section className={`${styles.card} ${darkMode ? styles.dark : ""}`} aria-label="Your driver profile"><p role="alert">{error}</p><button className={styles.retry} type="button" onClick={refresh}>Retry loading profile</button></section> : null;
 const presentation = driverProfilePresentation(profile.status);
 return <section id="your-driver-profile" data-loadlink-own-driver-profile="true" className={`${styles.card} ${darkMode ? styles.dark : ""}`} aria-label="Your private driver profile">
  <div className={styles.topline}><div><span className={styles.label}>Your driver profile</span><span className={styles.private}><LoadLinkIcon name="lock" size={13} />Only visible to you</span></div><span className={styles.badge}>{presentation.label}</span></div>
  <div className={styles.identity}><div className={styles.portrait}>{portrait ? <LoadLinkImage src={portrait} alt="Your driver profile" /> : <LoadLinkIcon name="user" size={28} />}</div><div><h2>{profile.full_name || "Your driver profile"}</h2><p>{profile.headline || "Professional driver"}</p><span>{[profile.city, profile.province].filter(Boolean).join(", ") || "Add your operating location"}</span></div></div>
  {!compact ? <><dl className={styles.facts}><div><dt>Licence</dt><dd>{profile.licence_code || "Not added"}</dd></div><div><dt>Experience</dt><dd>{profile.years_experience ?? 0} {profile.years_experience === 1 ? "year" : "years"}</dd></div><div><dt>Availability</dt><dd>{profile.availability || "Not added"}</dd></div><div><dt>Email</dt><dd>{profile.email || "Not added"}</dd></div><div><dt>Phone</dt><dd>{profile.phone || "Not added"}</dd></div><div><dt>Languages</dt><dd>{profile.languages?.join(", ") || "Not added"}</dd></div><div className={styles.vehicleFact}><dt>Vehicle experience</dt><dd>{profile.vehicle_types?.join(", ") || "Not added"}</dd></div><div className={styles.vehicleFact}><dt>Routes</dt><dd>{profile.route_experience?.join(", ") || "Not added"}</dd></div></dl>{profile.bio ? <p className={styles.vehicles}>{profile.bio}</p> : null}</> : null}
  {error ? <p role="status" className={styles.vehicles}>Showing your last loaded profile. <button className={styles.textButton} type="button" onClick={refresh}>Refresh profile</button></p> : null}
  <div className={styles.bottom}><p>{profile.review_reason && presentation.label === "Changes required" ? profile.review_reason : presentation.note}</p><Link href={presentation.href}>{presentation.action}<LoadLinkIcon name="chevronRight" size={16} /></Link></div>
 </section>;
}
