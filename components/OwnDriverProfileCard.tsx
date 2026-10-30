"use client";
import Link from "next/link";
import LoadLinkImage from "@/components/LoadLinkImage";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { useOwnDriverProfile } from "@/lib/useOwnDriverProfile";
import styles from "./OwnDriverProfileCard.module.css";
export default function OwnDriverProfileCard({ darkMode, compact = false }: { darkMode: boolean; compact?: boolean }) {
 const { profile, portrait, hasPortrait } = useOwnDriverProfile();
 if (!profile || !hasPortrait || !profile.full_name?.trim() || !["draft", "pending", "pending_review", "changes_required", "rejected", "needs_changes", "missing_document"].includes(profile.status)) return null;
 const changes = ["changes_required", "rejected", "needs_changes", "missing_document"].includes(profile.status);
 return <section id="your-driver-profile" className={`${styles.card} ${darkMode ? styles.dark : ""}`} aria-label="Your private driver profile">
  <div className={styles.topline}><span className={styles.private}><LoadLinkIcon name="lock" size={13} />Only visible to you</span><span className={styles.badge}>{changes ? "Changes required" : "Waiting for verification"}</span></div>
  <div className={styles.identity}><div className={styles.portrait}>{portrait ? <LoadLinkImage src={portrait} alt="Your driver profile" /> : <LoadLinkIcon name="user" size={28} />}</div><div><h2>{profile.full_name || "Your driver profile"}</h2><p>{profile.headline || "Professional driver"}</p><span>{[profile.city, profile.province].filter(Boolean).join(", ") || "Add your operating location"}</span></div></div>
  {!compact ? <><dl className={styles.facts}><div><dt>Licence</dt><dd>{profile.licence_code || "Not added"}</dd></div><div><dt>Experience</dt><dd>{profile.years_experience ?? 0} years</dd></div><div><dt>Availability</dt><dd>{profile.availability || "Not added"}</dd></div></dl>{profile.vehicle_types?.length ? <p className={styles.vehicles}>{profile.vehicle_types.slice(0, 4).join(" · ")}</p> : null}</> : null}
  <div className={styles.bottom}><p>{changes ? profile.review_reason || "Update the details requested by the LoadLink team." : profile.status === "draft" ? "Your profile stays private. Finish the remaining checks before submitting it." : "Your profile stays private until the LoadLink team approves it."}</p><Link href={profile.status === "draft" ? "/driver-profile?step=verification" : "/driver-profile"}>{changes ? "Update profile" : profile.status === "draft" ? "Continue verification" : "View application"}<LoadLinkIcon name="chevronRight" size={16} /></Link></div>
 </section>;
}
