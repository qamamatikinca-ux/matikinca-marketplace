"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getOwnerKeys } from "@/lib/chatKeys";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ListingStatus = "active" | "filled" | "closed" | "draft";

type MyListing = {
  id: string;
  title: string;
  city: string;
  vehicle_group: string;
  rate: string;
  posted_by: string;
  contact_number: string;
  description: string;
  photos: string[] | null;
  sponsored: boolean | null;
  package_type: string | null;
  created_at: string | null;
  view_count: number | null;
  last_viewed_at: string | null;
  owner_key: string;
  user_id: string | null;
  status?: ListingStatus | null;
};

type VerificationMap = Record<string, string>;
type Filter = "all" | "active" | "closed";

type AnalyticsPayload = {
  total_views?: number;
  unique_viewers?: number;
  last_viewed_at?: string | null;
  daily_views?: Array<{ label: string; count: number }>;
  devices?: Array<{ label: string; count: number }>;
  sources?: Array<{ label: string; count: number }>;
};

export default function MyPostsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<VerificationMap>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<MyListing | null>(null);
  const [analyticsListing, setAnalyticsListing] = useState<MyListing | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [lockedAnalytics, setLockedAnalytics] = useState<MyListing | null>(null);

  useEffect(() => {
    let active = true;

    async function start() {
      if (!active) return;
      setDarkMode(localStorage.getItem("loadlink-theme") === "dark");
      await verifyAndLoad();
    }

    queueMicrotask(() => { void start(); });
    return () => { active = false; };
    // The page intentionally performs its one-time account bootstrap on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyAndLoad() {
    if (!isSupabaseConfigured) {
      router.replace(loginHref(currentRelativePath()));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) {
      router.replace(loginHref(currentRelativePath()));
      return;
    }

    setAuthReady(true);
    await loadListings(user.id);
  }

  async function loadListings(userId?: string) {
    setLoading(true);
    setMessage("");
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isAuthenticatedUser(user)) throw new Error("Sign in required.");
        currentUserId = user.id;
      }

      const results: MyListing[] = [];
      const byUser = await supabase
        .from("job_listings")
        .select("id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,owner_key,user_id,status")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!byUser.error) results.push(...((byUser.data || []) as MyListing[]));
      else if (/status|column|schema cache/i.test(byUser.error.message)) {
        const fallback = await supabase
          .from("job_listings")
          .select("id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,owner_key,user_id")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        results.push(...((fallback.data || []) as MyListing[]));
      } else {
        throw byUser.error;
      }

      const existingIds = new Set(results.map((item) => item.id));
      const ownerKeys = getOwnerKeys();
      if (ownerKeys.length) {
        const byOwner = await supabase
          .from("job_listings")
          .select("id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,owner_key,user_id,status")
          .in("owner_key", ownerKeys)
          .order("created_at", { ascending: false });
        if (!byOwner.error) {
          ((byOwner.data || []) as MyListing[]).forEach((item) => {
            if (!existingIds.has(item.id)) results.push(item);
          });
        }
      }

      results.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setListings(results);

      if (results.length) {
        const verification = await supabase
          .from("vehicle_verifications")
          .select("listing_id,status")
          .in("listing_id", results.map((item) => item.id));
        if (!verification.error) {
          const next: VerificationMap = {};
          (verification.data || []).forEach((row) => { next[row.listing_id] = row.status; });
          setVerificationStatuses(next);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your posts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteListing(listing: MyListing) {
    if (!confirm(`Delete “${listing.title}” permanently?`)) return;
    setMessage("");
    const result = await supabase.rpc("delete_my_listing", { p_listing_id: listing.id, p_owner_key: listing.owner_key || "" });
    if (result.error || result.data !== true) {
      setMessage(result.error?.message || "This post could not be deleted. Run the new LoadLink SQL if this is your first update.");
      return;
    }
    setListings((current) => current.filter((item) => item.id !== listing.id));
  }

  async function setStatus(listing: MyListing, status: ListingStatus) {
    setMessage("");
    const result = await supabase.rpc("set_my_listing_status", { p_listing_id: listing.id, p_status: status, p_owner_key: listing.owner_key || "" });
    if (result.error || result.data !== true) {
      setMessage(result.error?.message || "The listing status could not be changed.");
      return;
    }
    setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item));
  }

  async function openAnalytics(listing: MyListing) {
    if ((listing.package_type || "standard") !== "pro") {
      setLockedAnalytics(listing);
      return;
    }
    setAnalyticsListing(listing);
    setAnalytics(null);
    setAnalyticsLoading(true);
    const result = await supabase.rpc("get_pro_job_analytics", {
      p_job_id: listing.id,
      p_owner_key: listing.owner_key || "",
    });
    if (!result.error) setAnalytics((result.data || {}) as AnalyticsPayload);
    setAnalyticsLoading(false);
  }

  const filteredListings = useMemo(() => listings.filter((listing) => {
    const status = listing.status || "active";
    if (filter === "active") return status === "active";
    if (filter === "closed") return status === "closed" || status === "filled";
    return true;
  }), [filter, listings]);

  const activeCount = listings.filter((item) => (item.status || "active") === "active").length;
  const proCount = listings.filter((item) => item.package_type === "pro").length;

  if (!authReady) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;

  const surface = darkMode ? "border-white/10 bg-[#0c0c0c] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <Header darkMode={darkMode} />

      <section className="border-b border-[#f6b800]/30 bg-black px-5 py-10 text-white md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.06em] md:text-7xl">My posts</h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/60">Edit, close or delete your listings. Detailed analytics is unlocked only for Pro posts.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/jobs/list" className="rounded-full border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#f6b800]">Post a job</Link>
              <Link href="/list-your-truck" className="rounded-full bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-black">List your truck</Link>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <Metric label="All posts" value={String(listings.length)} />
            <Metric label="Active" value={String(activeCount)} />
            <Metric label="Pro" value={String(proCount)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-7 md:px-6 md:py-10">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All posts</FilterButton>
          <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>Active</FilterButton>
          <FilterButton active={filter === "closed"} onClick={() => setFilter("closed")}>Filled / closed</FilterButton>
        </div>

        {message ? <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{message}</div> : null}

        {loading ? <div className="min-h-64"><LoadLinkLoading /></div> : filteredListings.length ? (
          <div className="grid gap-5">
            {filteredListings.map((listing) => {
              const status = listing.status || "active";
              const isPro = listing.package_type === "pro";
              const verificationStatus = verificationStatuses[listing.id];
              return (
                <article key={listing.id} className={`overflow-hidden rounded-[26px] border ${surface}`}>
                  <div className="grid md:grid-cols-[260px_1fr]">
                    <div className="relative min-h-[210px] bg-black">
                      <img src={listing.photos?.[0] || "/images/jobs/job-card-1.jpg"} alt={listing.title} className="h-full min-h-[210px] w-full object-cover" />
                      <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] ${status === "active" ? "bg-[#2f9f5b] text-white" : "bg-black/80 text-white"}`}>{status}</span>
                      {verificationStatus ? <span className="absolute bottom-3 left-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-black">Verification {verificationStatus.replaceAll("_", " ")}</span> : null}
                    </div>
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b88900]">{listing.city} · {listing.vehicle_group}</p>
                          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{listing.title}</h2>
                          <p className="mt-2 text-lg font-black text-[#b88900]">{formatListingRate(listing.rate)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${isPro ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/10 text-white" : "bg-black/5 text-black"}`}>{isPro ? "Pro" : "Standard"}</span>
                      </div>

                      <p className={`mt-4 line-clamp-3 text-sm leading-6 ${muted}`}>{cleanDescription(listing.description)}</p>
                      <p className={`mt-3 text-xs font-semibold ${muted}`}>Posted {formatDate(listing.created_at)}</p>

                      {isPro ? (
                        <div className="mt-4 rounded-2xl border border-[#f6b800]/40 bg-[#f6b800]/10 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]">Pro analytics</p>
                          <p className="mt-1 text-sm font-black">{listing.view_count || 0} total views</p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-black/10 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]">Analytics locked</p>
                          <p className={`mt-1 text-xs font-semibold ${muted}`}>Upgrade this listing to Pro to view performance data.</p>
                        </div>
                      )}

                      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <button type="button" onClick={() => setEditing(listing)} className="min-h-12 rounded-xl border border-[#f6b800] px-3 text-xs font-black uppercase text-[#b88900]">Edit</button>
                        <button type="button" onClick={() => openAnalytics(listing)} className="min-h-12 rounded-xl border border-[#f6b800] bg-[#f6b800] px-3 text-xs font-black uppercase text-black">{isPro ? "Analytics" : "Pro analytics"}</button>
                        {status === "active" ? <button type="button" onClick={() => setStatus(listing, "filled")} className="min-h-12 rounded-xl border border-black/15 px-3 text-xs font-black uppercase">Mark filled</button> : <button type="button" onClick={() => setStatus(listing, "active")} className="min-h-12 rounded-xl border border-black/15 px-3 text-xs font-black uppercase">Reopen</button>}
                        <button type="button" onClick={() => deleteListing(listing)} className="min-h-12 rounded-xl border border-red-500/60 px-3 text-xs font-black uppercase text-red-500">Delete</button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-[26px] border p-10 text-center ${surface}`}>
            <h2 className="text-3xl font-black">No posts here yet</h2>
            <p className={`mt-3 text-sm ${muted}`}>Create a job post or list a verified truck to see it here.</p>
            <div className="mt-6 flex justify-center gap-3"><Link href="/jobs/list" className="rounded-full border border-[#f6b800] px-5 py-3 text-xs font-black uppercase text-[#b88900]">Post job</Link><Link href="/list-your-truck" className="rounded-full bg-[#f6b800] px-5 py-3 text-xs font-black uppercase text-black">List truck</Link></div>
          </div>
        )}
      </section>

      {editing ? <EditModal listing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadListings(); }} /> : null}
      {lockedAnalytics ? <LockedAnalyticsModal onClose={() => setLockedAnalytics(null)} /> : null}
      {analyticsListing ? <AnalyticsModal listing={analyticsListing} data={analytics} loading={analyticsLoading} onClose={() => setAnalyticsListing(null)} /> : null}
    </main>
  );
}

function cleanDescription(value: string) {
  return value.replace(/^Listing type:\s*[^\n]+\n?/i, "").replace(/^Vehicle needed:\s*[^\n]+\n?/im, "").trim();
}

function formatDate(value: string | null) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function Header({ darkMode }: { darkMode: boolean }) {
  return <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="grid h-20 grid-cols-[92px_1fr_92px] items-center px-4"><div className="flex items-center gap-2"><Link href="/jobs" aria-label="Back to jobs" className={`flex h-10 w-10 items-center justify-center ${darkMode ? "text-white" : "text-black"}`}><BackIcon /></Link><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><div aria-hidden="true" /></div></header>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-5 py-3 text-xs font-black uppercase tracking-wide ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-black/15"}`}>{children}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-r border-white/10 p-4 last:border-r-0"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p><p className="mt-1 text-2xl font-black text-[#f6b800]">{value}</p></div>;
}

function EditModal({ listing, onClose, onSaved }: { listing: MyListing; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(listing.title);
  const [city, setCity] = useState(listing.city);
  const [rate, setRate] = useState(listing.rate);
  const [contact, setContact] = useState(listing.contact_number);
  const [description, setDescription] = useState(cleanDescription(listing.description));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const result = await supabase.rpc("update_my_listing", {
      p_listing_id: listing.id,
      p_title: title.trim(),
      p_city: city.trim(),
      p_rate: rate.trim(),
      p_contact_number: contact.trim(),
      p_description: description.trim(),
      p_owner_key: listing.owner_key || "",
    });
    setSaving(false);
    if (result.error || result.data !== true) {
      setError(result.error?.message || "The post could not be updated.");
      return;
    }
    onSaved();
  }

  return <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm"><section className="mx-auto mt-8 w-full max-w-xl rounded-[26px] border border-[#f6b800]/60 bg-[#080808] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">My posts</p><h2 className="mt-1 text-3xl font-black">Edit listing</h2></div><button type="button" onClick={onClose} className="h-10 w-10 rounded-full border border-white/15 text-xl">×</button></div><div className="mt-5 grid gap-3"><input value={title} onChange={(e) => setTitle(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><input value={city} onChange={(e) => setCity(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><input value={rate} onChange={(e) => setRate(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><input value={contact} onChange={(e) => setContact(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36 rounded-xl bg-white px-4 py-3 font-bold text-black" />{error ? <p className="text-sm font-bold text-red-400">{error}</p> : null}<button type="button" disabled={saving} onClick={save} className="h-13 rounded-xl bg-[#f6b800] font-black uppercase text-black">{saving ? "Saving..." : "Save changes"}</button></div></section></div>;
}

function LockedAnalyticsModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-[26px] border border-[#f6b800]/60 bg-[#080808] p-6 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Pro-only analytics</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Analytics is locked on Standard posts.</h2><p className="mt-4 text-sm leading-7 text-white/60">Pro posts can view total and unique views, seven-day performance, traffic sources, devices and recent signed-in viewers.</p><div className="mt-6 grid gap-3"><Link href="/jobs/list?upgrade=pro" className="flex h-13 items-center justify-center rounded-xl bg-[#f6b800] font-black text-black">Upgrade to Pro</Link><button type="button" onClick={onClose} className="h-13 rounded-xl border border-white/15 font-black">Not now</button></div></section></div>;
}

function AnalyticsModal({ listing, data, loading, onClose }: { listing: MyListing; data: AnalyticsPayload | null; loading: boolean; onClose: () => void }) {
  const daily = data?.daily_views || [];
  const max = Math.max(1, ...daily.map((item) => Number(item.count || 0)));
  return <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm"><section className="mx-auto mt-5 w-full max-w-3xl overflow-hidden rounded-[26px] border border-[#f6b800]/60 bg-[#080808] text-white"><div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Pro analytics</p><h2 className="mt-2 text-2xl font-black">{listing.title}</h2></div><button type="button" onClick={onClose} className="h-10 w-10 rounded-full border border-white/15 text-xl">×</button></div>{loading ? <div className="h-72 loadlink-skeleton bg-white/5" /> : <><div className="grid grid-cols-3 border-b border-white/10"><Metric label="Total views" value={String(data?.total_views ?? listing.view_count ?? 0)} /><Metric label="Unique" value={String(data?.unique_viewers ?? 0)} /><Metric label="Last viewed" value={data?.last_viewed_at ? new Date(data.last_viewed_at).toLocaleDateString("en-ZA") : "Not yet"} /></div><div className="grid gap-6 p-5 md:grid-cols-2"><div><h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Last 7 days</h3>{daily.length ? <div className="mt-4 flex h-40 items-end gap-2 border-b border-white/10 px-2">{daily.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-black">{item.count}</span><div className="w-full min-w-3 rounded-t bg-[#f6b800]" style={{ height: `${Math.max(6, Number(item.count) / max * 110)}px` }} /><span className="pb-2 text-[9px] font-bold uppercase text-white/45">{item.label}</span></div>)}</div> : <p className="mt-4 text-sm text-white/50">No daily view events yet.</p>}</div><Breakdown title="Devices" rows={data?.devices || []} /><Breakdown title="Traffic sources" rows={data?.sources || []} /></div></>}</section></div>;
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return <div><h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">{title}</h3><div className="mt-4 grid gap-2">{rows.length ? rows.map((row) => <div key={row.label} className="flex justify-between rounded-xl border border-white/10 px-3 py-2 text-sm font-bold"><span className="capitalize">{row.label}</span><span>{row.count}</span></div>) : <p className="text-sm text-white/50">No data yet.</p>}</div></div>;
}

function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
