"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/platform/Breadcrumbs";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import ReportDialog from "@/components/platform/ReportDialog";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { browserSupabase } from "@/lib/phase2/supabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Driver = {
  id: string;
  full_name: string;
  profile_image_url?: string;
  headline?: string;
  city?: string;
  province?: string;
  years_experience?: number;
  licence_code?: string;
  vehicle_types?: string[];
  route_experience?: string[];
  languages?: string[];
  availability?: string;
  bio?: string;
  verification_level?: string;
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/drivers/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Driver profile could not be loaded.");
        if (active) setDriver(payload.driver);
      })
      .catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : "Driver profile could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    try {
      const local = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      setSaved(Array.isArray(local) && local.some((item) => String(item?.id) === String(id) && (item?.entity_type === "driver" || item?.type === "driver")));
    } catch { setSaved(false); }
    void authenticatedFetch("/api/saved-items")
      .then(async (response) => response.status === 401 ? null : response.json())
      .then((payload) => { if (active && payload) setSaved((payload.references || []).some((item: { entity_type?: string; entity_id?: string }) => item.entity_type === "driver" && item.entity_id === id)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id]);

  async function contact() {
    try {
      const { data } = await browserSupabase().auth.getSession();
      const token = data.session?.access_token || "";
      if (!token) { window.location.href = `/login?next=${encodeURIComponent(`/drivers/${id}`)}`; return; }
      const response = await fetch(`/api/phase2/contact/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "This driver cannot be contacted right now.");
      if (payload.phone) window.location.href = `tel:${String(payload.phone).replace(/[^+0-9]/g, "")}`;
      else if (payload.email) window.location.href = `mailto:${payload.email}`;
      else setNotice("This driver has not added a public contact method.");
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : "This driver cannot be contacted right now.");
    }
  }

  async function toggleSave() {
    if (!driver) return;
    const nextSaved = !saved;
    try {
      const local = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
      const current = Array.isArray(local) ? local : [];
      const item = { id: driver.id, entity_id: driver.id, entity_type: "driver", title: driver.full_name, href: `/drivers/${driver.id}`, category: "Driver", type: "driver", image: driver.profile_image_url, meta: [driver.headline, driver.city, driver.licence_code ? `Licence ${driver.licence_code}` : null].filter(Boolean).join(" · ") };
      const next = nextSaved ? [item, ...current.filter((entry) => !(String(entry?.id) === driver.id && (entry?.entity_type === "driver" || entry?.type === "driver")))].slice(0, 100) : current.filter((entry) => !(String(entry?.id) === driver.id && (entry?.entity_type === "driver" || entry?.type === "driver")));
      localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
      setSaved(nextSaved);
      window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
      const response = await authenticatedFetch(nextSaved ? "/api/saved-items" : `/api/saved-items?entityType=driver&entityId=${encodeURIComponent(driver.id)}`, {
        method: nextSaved ? "POST" : "DELETE",
        headers: nextSaved ? { "Content-Type": "application/json" } : undefined,
        body: nextSaved ? JSON.stringify({ entityType: "driver", entityId: driver.id }) : undefined,
      });
      if (response.status === 401) { setNotice(nextSaved ? "Saved on this device. Sign in to synchronize across devices." : "Removed on this device."); return; }
      if (!response.ok) throw new Error("Saved state could not be synchronized.");
      setNotice(nextSaved ? "Driver saved to your LoadLink account." : "Driver removed from saved items.");
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : "This driver could not be saved.");
    }
  }

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className={`min-h-screen ${page}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="mx-auto max-w-6xl px-5 py-10"><div className={`h-96 animate-pulse rounded-[28px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} /></div></main>;
  if (!driver) return <main className={`min-h-screen ${page}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="mx-auto max-w-3xl px-5 py-12"><EmptyState title="Driver profile unavailable" body={error || "This profile may be under review, expired or no longer public."} actionLabel="Browse approved drivers" actionHref="/drivers" darkMode={darkMode} /></div><ProfessionalFooter darkMode={darkMode} /></main>;

  return (
    <main className={`min-h-screen ${page}`}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-6xl px-5 py-6">
        <Breadcrumbs darkMode={darkMode} items={[{ label: "Home", href: "/" }, { label: "Drivers", href: "/drivers" }, { label: driver.full_name }]} />
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className={`rounded-[28px] border p-5 md:p-8 ${surface}`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-3xl font-black text-[#f6b800]">
                {driver.profile_image_url ? <img src={driver.profile_image_url} alt={driver.full_name} className="h-full w-full object-cover" /> : driver.full_name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">Approved driver</span>{driver.verification_level && driver.verification_level !== "unverified" ? <span className="rounded-full border border-current/15 px-3 py-1 text-[10px] font-black uppercase">{driver.verification_level.replaceAll("_", " ")}</span> : null}</div>
                <h1 className="mt-4 text-4xl font-black tracking-[-.045em] md:text-6xl">{driver.full_name}</h1>
                <p className={`mt-3 text-lg font-bold ${muted}`}>{driver.headline || "Professional logistics driver"}</p>
                <p className={`mt-2 text-sm font-semibold ${muted}`}>{[driver.city, driver.province].filter(Boolean).join(", ") || "South Africa"}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Info label="Experience" value={`${driver.years_experience || 0} years`} darkMode={darkMode} />
              <Info label="Licence" value={driver.licence_code || "Not provided"} darkMode={darkMode} />
              <Info label="Availability" value={driver.availability || "On request"} darkMode={darkMode} />
            </div>
            {driver.bio ? <section className="mt-8"><h2 className="text-2xl font-black">Professional summary</h2><p className={`mt-3 whitespace-pre-line text-sm leading-7 ${muted}`}>{driver.bio}</p></section> : null}
            <TagSection title="Vehicle experience" values={driver.vehicle_types} darkMode={darkMode} />
            <TagSection title="Route experience" values={driver.route_experience} darkMode={darkMode} />
            <TagSection title="Languages" values={driver.languages} darkMode={darkMode} />
          </article>
          <aside className={`h-fit rounded-[28px] border p-5 lg:sticky lg:top-32 ${surface}`}>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#b88900]">Employer actions</p>
            <h2 className="mt-3 text-2xl font-black">Interested in this driver?</h2>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>Contact details are released only to signed-in users. Private driver documents never appear on this page.</p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => void contact()} className="h-12 rounded-xl bg-[#f6b800] font-black text-black">Contact driver</button>
              <button type="button" onClick={() => void toggleSave()} className="h-12 rounded-xl border border-current/15 font-black">{saved ? "Saved" : "Save driver"}</button>
              <button type="button" onClick={() => setReportOpen(true)} className="h-12 rounded-xl border border-red-500/30 font-black text-red-500">Report profile</button>
              <Link href="/safety" className="flex h-12 items-center justify-center rounded-xl border border-current/15 font-black">Hiring safety guide</Link>
            </div>
            {notice ? <p role="status" className="mt-4 rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-3 text-sm font-bold">{notice}</p> : null}
          </aside>
        </div>
      </section>
      <ProfessionalFooter darkMode={darkMode} />
      <ReportDialog open={reportOpen} entityType="driver" entityId={driver.id} entityTitle={driver.full_name} darkMode={darkMode} onClose={() => setReportOpen(false)} onSubmitted={setNotice} />
    </main>
  );
}

function Info({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b88900]">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div>;
}

function TagSection({ title, values, darkMode }: { title: string; values?: string[]; darkMode: boolean }) {
  if (!values?.length) return null;
  return <section className="mt-7"><h2 className="text-xl font-black">{title}</h2><div className="mt-3 flex flex-wrap gap-2">{values.map((value) => <span key={value} className={`rounded-full border px-3 py-2 text-xs font-bold ${darkMode ? "border-white/15 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}>{value}</span>)}</div></section>;
}
