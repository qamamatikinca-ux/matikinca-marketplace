"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getOwnerKeys } from "@/lib/chatKeys";
import { formatListingRate } from "@/lib/formatCurrency";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { requestListingRenewal } from "@/lib/packageAccess";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ListingStatus = "active" | "filled" | "closed" | "draft";
type ModerationStatus = "pending" | "approved" | "rejected";

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
  moderation_status?: ModerationStatus | null;
  moderation_notes?: string | null;
  moderated_at?: string | null;
  listing_kind?: string | null;
  expires_at?: string | null;
  stock_status?: string | null;
};

type VerificationMap = Record<string, string>;
type Filter = "all" | "active" | "review" | "closed";
type MyPostsSort = "newest" | "views" | "oldest" | "status";
const POSTS_PER_PAGE = 7;

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
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<VerificationMap>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [sortMode, setSortMode] = useState<MyPostsSort>("newest");
  const [currentPage, setCurrentPage] = useState(1);
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

    const legacyOwnerKeys = getOwnerKeys();
    for (const ownerKey of legacyOwnerKeys) {
      try {
        await supabase.rpc("claim_guest_listings", { p_owner_key: ownerKey });
      } catch {
        // Guest-claim failure should not block the user from viewing their posts.
      }
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
        .select("id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,owner_key,user_id,status,moderation_status,moderation_notes,moderated_at,listing_kind,expires_at,stock_status")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!byUser.error) results.push(...((byUser.data || []) as MyListing[]));
      else if (/status|column|schema cache/i.test(byUser.error.message)) {
        const fallback = await supabase
          .from("job_listings")
          .select("id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,owner_key,user_id,moderation_status,moderation_notes,moderated_at,listing_kind,expires_at,stock_status")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        results.push(...((fallback.data || []) as MyListing[]));
      } else {
        throw byUser.error;
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
    const result = await supabase.rpc("delete_my_listing", { p_listing_id: listing.id, p_owner_key: "" });
    if (result.error || result.data !== true) {
      setMessage(result.error?.message || "This post could not be deleted. Run the new LoadLink SQL if this is your first update.");
      return;
    }
    setListings((current) => current.filter((item) => item.id !== listing.id));
  }

  async function setStatus(listing: MyListing, status: ListingStatus) {
    setMessage("");
    const result = await supabase.rpc("set_my_listing_status", { p_listing_id: listing.id, p_status: status, p_owner_key: "" });
    if (result.error || result.data !== true) {
      setMessage(result.error?.message || "The listing status could not be changed.");
      return;
    }
    setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item));
  }

  async function renewListing(listing: MyListing) {
    const raw = window.prompt("How many days would you like to renew this listing for? Each day costs R15.", "7");
    if (!raw) return;
    const days = Math.max(1, Math.min(365, Math.floor(Number(raw) || 0)));
    if (!days) return;
    setMessage("");
    try {
      const payment = await requestListingRenewal(listing.id, days);
      setMessage(`Renewal request ${payment.reference} was created for R${(payment.amount_cents / 100).toFixed(2)}. The expiry date updates automatically when payment is marked paid.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The renewal request could not be created.");
    }
  }

  async function openAnalytics(listing: MyListing) {
    if (!["pro", "dealer"].includes(listing.package_type || "manual")) {
      setLockedAnalytics(listing);
      return;
    }
    setAnalyticsListing(listing);
    setAnalytics(null);
    setAnalyticsLoading(true);
    const result = await supabase.rpc("get_pro_job_analytics", {
      p_job_id: listing.id,
      p_owner_key: "",
    });
    if (!result.error) setAnalytics((result.data || {}) as AnalyticsPayload);
    setAnalyticsLoading(false);
  }

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const status = listing.status || "active";
      const moderation = listing.moderation_status || "pending";
      if (filter === "active") return status === "active" && moderation === "approved";
      if (filter === "review") return moderation === "pending" || moderation === "rejected";
      if (filter === "closed") return status === "closed" || status === "filled";
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "views") return Number(b.view_count || 0) - Number(a.view_count || 0);
      if (sortMode === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortMode === "status") return postStateLabel(a).localeCompare(postStateLabel(b));
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [filter, listings, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / POSTS_PER_PAGE));
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredListings.slice(start, start + POSTS_PER_PAGE);
  }, [currentPage, filteredListings]);

  useEffect(() => { setCurrentPage(1); }, [filter, sortMode]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const activeCount = listings.filter((item) => (item.status || "active") === "active" && (item.moderation_status || "pending") === "approved").length;
  const reviewCount = listings.filter((item) => ["pending", "rejected"].includes(item.moderation_status || "pending")).length;
  const totalViews = listings.reduce((sum, item) => sum + Number(item.view_count || 0), 0);

  if (!authReady) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;

  const surface = darkMode ? "border-white/10 bg-[#0c0c0c] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <Header darkMode={darkMode} toggleTheme={toggleTheme} />

      <section className={`border-b px-4 py-7 md:px-6 md:py-9 ${darkMode ? "border-white/10 bg-[#070707]" : "border-black/10 bg-[#f8f4ea]"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.055em] md:text-5xl">My posts</h1>
              <p className={`mt-2 max-w-xl text-sm leading-6 ${muted}`}>Manage the listings owned by this signed-in account, follow review status and keep live opportunities up to date.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link href="/jobs/list" className="flex h-11 items-center justify-center rounded-xl border border-[#f6b800] px-4 text-xs font-black text-[#b88900]">Post opportunity</Link>
              <Link href="/list-your-vehicle" className="flex h-11 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">List vehicle</Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DashboardMetric label="Total" value={String(listings.length)} darkMode={darkMode} />
            <DashboardMetric label="Live" value={String(activeCount)} darkMode={darkMode} />
            <DashboardMetric label="Needs attention" value={String(reviewCount)} darkMode={darkMode} />
            <DashboardMetric label="Total views" value={String(totalViews)} darkMode={darkMode} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
            <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>Live</FilterButton>
            <FilterButton active={filter === "review"} onClick={() => setFilter("review")}>Review</FilterButton>
            <FilterButton active={filter === "closed"} onClick={() => setFilter("closed")}>Completed</FilterButton>
          </div>
          <label className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${surface}`}>
            <span className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as MyPostsSort)} className="bg-transparent text-xs font-black outline-none">
              <option value="newest">Newest first</option>
              <option value="views">Most viewed</option>
              <option value="status">Status</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        {message ? <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{message}</div> : null}

        {loading ? <div className="min-h-64"><LoadLinkLoading /></div> : filteredListings.length ? (
          <>
            <div className="grid gap-3">
              {paginatedListings.map((listing) => {
                const status = listing.status || "active";
                const moderationStatus = listing.moderation_status || "pending";
                const isPro = ["pro", "dealer"].includes(listing.package_type || "");
                const isManualVehicle = listing.listing_kind === "vehicle" && listing.package_type === "manual";
                const expired = Boolean(listing.expires_at && new Date(listing.expires_at) <= new Date());
                const verificationStatus = verificationStatuses[listing.id];
                const state = postStateLabel(listing);
                const tone = postStateTone(listing, darkMode);

                return (
                  <article key={listing.id} className={`overflow-hidden rounded-[22px] border ${surface}`}>
                    <div className="grid md:grid-cols-[210px_1fr]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-black md:aspect-auto md:min-h-[210px]">
                        <img src={listing.photos?.[0] || "/images/jobs/job-card-1.jpg"} alt={listing.title} loading="lazy" className="h-full w-full object-cover" />
                        <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] ${tone}`}>{state}</span>
                        {verificationStatus ? <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1.5 text-[9px] font-black text-white">Verification {verificationStatus.replaceAll("_", " ")}</span> : null}
                      </div>

                      <div className="min-w-0 p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`truncate text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>{listing.city} · {listing.vehicle_group}</p>
                            <h2 className="mt-1 line-clamp-2 text-xl font-black tracking-[-.035em] md:text-2xl">{listing.title}</h2>
                            <p className="mt-1 text-sm font-black text-[#b88900]">{formatListingRate(listing.rate)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase ${isPro ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/8 text-white/65" : "bg-black/5 text-black/60"}`}>{listing.package_type === "dealer" ? "Dealer" : isPro ? "Pro" : "Standard"}</span>
                        </div>

                        <div className={`mt-4 grid grid-cols-3 divide-x rounded-xl border ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>
                          <MiniStat label="Views" value={String(listing.view_count || 0)} />
                          <MiniStat label="Posted" value={shortDate(listing.created_at)} />
                          <MiniStat label="Status" value={state} />
                        </div>

                        {moderationStatus === "rejected" ? <div className="mt-3 rounded-xl border border-red-500/35 bg-red-500/10 p-3"><p className="text-xs font-black text-red-400">Needs changes</p><p className={`mt-1 text-xs leading-5 ${muted}`}>{listing.moderation_notes || "LoadLink requested changes before this post can go live."}</p></div> : null}
                        {moderationStatus === "pending" ? <div className="mt-3 rounded-xl border border-[#f6b800]/30 bg-[#f6b800]/8 p-3"><p className="text-xs font-black text-[#b88900]">In review</p><p className={`mt-1 text-xs ${muted}`}>Only you can manage this post until review is complete.</p></div> : null}
                        {isManualVehicle && listing.expires_at ? <div className={`mt-3 rounded-xl border p-3 ${expired ? "border-red-500/35 bg-red-500/10" : "border-[#f6b800]/25 bg-[#f6b800]/8"}`}><p className="text-xs font-black">{expired ? "Listing expired" : `Expires ${formatDate(listing.expires_at)}`}</p>{!expired ? <button type="button" onClick={() => void renewListing(listing)} className="mt-2 text-xs font-black text-[#b88900] underline underline-offset-4">Renew listing</button> : null}</div> : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/jobs#job-${listing.id}`} className={`flex h-10 items-center rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View</Link>
                          <button type="button" onClick={() => setEditing(listing)} className="h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">{moderationStatus === "rejected" ? "Edit & resubmit" : "Edit"}</button>
                          <details className="relative">
                            <summary className={`flex h-10 cursor-pointer list-none items-center rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>Manage</summary>
                            <div className={`absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border shadow-xl ${surface}`}>
                              <button type="button" onClick={() => void openAnalytics(listing)} className="block w-full px-4 py-3 text-left text-xs font-black">{isPro ? "View analytics" : "Analytics options"}</button>
                              {moderationStatus === "approved" ? status === "active" ? <button type="button" onClick={() => void setStatus(listing, "filled")} className="block w-full border-t border-current/10 px-4 py-3 text-left text-xs font-black">Mark as filled</button> : <button type="button" onClick={() => void setStatus(listing, "active")} className="block w-full border-t border-current/10 px-4 py-3 text-left text-xs font-black">Reopen post</button> : null}
                              <button type="button" onClick={() => void deleteListing(listing)} className="block w-full border-t border-red-500/20 px-4 py-3 text-left text-xs font-black text-red-500">Delete permanently</button>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {totalPages > 1 ? <LoadLinkPagination current={currentPage} total={totalPages} onChange={setCurrentPage} darkMode={darkMode} label="My post pages" /> : null}
          </>
        ) : (
          <div className={`rounded-[22px] border p-9 text-center ${surface}`}>
            <h2 className="text-2xl font-black">Nothing in this view</h2>
            <p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${muted}`}>Change the filter or create a new LoadLink opportunity.</p>
            <div className="mt-5 flex justify-center gap-2"><Link href="/jobs/list" className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Post opportunity</Link><Link href="/list-your-vehicle" className={`rounded-xl border px-5 py-3 text-xs font-black ${darkMode ? "border-white/15" : "border-black/15"}`}>List vehicle</Link></div>
          </div>
        )}
      </section>

      {editing ? <EditModal listing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadListings(); }} /> : null}
      {lockedAnalytics ? <LockedAnalyticsModal onClose={() => setLockedAnalytics(null)} /> : null}
      {analyticsListing ? <AnalyticsModal listing={analyticsListing} data={analytics} loading={analyticsLoading} onClose={() => setAnalyticsListing(null)} /> : null}
    </main>
  );
}

function moderationLabel(value: ModerationStatus) {
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending review";
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

function Header({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) {
  return <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4"><div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} /><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" /></div></header>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-black/15"}`}>{children}</button>;
}

function DashboardMetric({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`rounded-xl border p-3.5 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white"}`}><p className={`text-[9px] font-black uppercase tracking-[.12em] ${darkMode ? "text-white/40" : "text-black/40"}`}>{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3 py-2.5"><p className="text-[8px] font-black uppercase tracking-[.1em] opacity-40">{label}</p><p className="mt-1 truncate text-[11px] font-black">{value}</p></div>;
}

function shortDate(value: string | null) {
  if (!value) return "Recent";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recent" : date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function postStateLabel(listing: MyListing) {
  const moderation = listing.moderation_status || "pending";
  const status = listing.status || "active";
  if (moderation === "rejected") return "Needs changes";
  if (moderation === "pending") return "In review";
  if (status === "filled") return "Filled";
  if (status === "closed") return "Closed";
  if (status === "draft") return "Draft";
  return "Live";
}

function postStateTone(listing: MyListing, darkMode: boolean) {
  const label = postStateLabel(listing);
  if (label === "Live") return "bg-emerald-500 text-white";
  if (label === "Needs changes") return "bg-red-600 text-white";
  if (label === "In review") return "bg-[#f6b800] text-black";
  return darkMode ? "bg-black/80 text-white" : "bg-white/90 text-black";
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
      p_owner_key: "",
    });
    setSaving(false);
    if (result.error || result.data !== true) {
      setError(result.error?.message || "The post could not be updated.");
      return;
    }
    onSaved();
  }

  return <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm"><section className="mx-auto mt-8 w-full max-w-xl rounded-[26px] border border-[#f6b800]/60 bg-[#080808] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">My posts</p><h2 className="mt-1 text-3xl font-black">Edit listing</h2></div><button type="button" onClick={onClose} className="h-10 w-10 rounded-full border border-white/15 text-xl">×</button></div><div className="mt-5 grid gap-3"><input value={title} onChange={(e) => setTitle(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><SouthAfricaLocationInput value={city} onChange={setCity} darkMode={false} allowAllSouthAfrica={false} placeholder="City, town or province" ariaLabel="Listing location" className="h-13 w-full rounded-xl bg-white px-4 font-bold text-black" /><input value={rate} onChange={(e) => setRate(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><input value={contact} onChange={(e) => setContact(e.target.value)} className="h-13 rounded-xl bg-white px-4 font-bold text-black" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36 rounded-xl bg-white px-4 py-3 font-bold text-black" />{error ? <p className="text-sm font-bold text-red-400">{error}</p> : null}<button type="button" disabled={saving} onClick={save} className="h-13 rounded-xl bg-[#f6b800] font-black uppercase text-black">{saving ? "Saving..." : "Save changes"}</button></div></section></div>;
}

function LockedAnalyticsModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-[26px] border border-[#f6b800]/60 bg-[#080808] p-6 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Pro-only analytics</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Analytics is locked on Manual listings and free job posts.</h2><p className="mt-4 text-sm leading-7 text-white/60">Pro posts can view total and unique views, seven-day performance, traffic sources, devices and recent signed-in viewers.</p><div className="mt-6 grid gap-3"><Link href="/jobs/list?upgrade=pro" className="flex h-13 items-center justify-center rounded-xl bg-[#f6b800] font-black text-black">Upgrade to Pro</Link><button type="button" onClick={onClose} className="h-13 rounded-xl border border-white/15 font-black">Not now</button></div></section></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-4 py-4"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/40">{label}</p><p className="mt-1 break-words text-lg font-black text-white">{value}</p></div>;
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
