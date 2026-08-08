"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
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
import { imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, revokePreviewUrl, validateImageFile } from "@/lib/mobilePosting";
import { withTransientRetry } from "@/lib/reliableSupabase";
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



type DeletedListing = {
  id: string;
  listing_id: string | null;
  title: string;
  event_type: "deleted";
  note: string | null;
  created_at: string;
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
  const [deletedListings, setDeletedListings] = useState<DeletedListing[]>([]);
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

      const history = await supabase
        .from("loadlink_listing_history")
        .select("id,listing_id,title,event_type,note,created_at")
        .eq("user_id", currentUserId)
        .eq("event_type", "deleted")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!history.error) setDeletedListings((history.data || []) as DeletedListing[]);
      else if (/relation|does not exist|schema cache/i.test(history.error.message)) setDeletedListings([]);

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
    await loadListings();
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
                const inactive = inactiveReason(listing);

                return (
                  <article key={listing.id} className={`overflow-hidden rounded-[22px] border ${surface}`}>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] md:grid-cols-[168px_minmax(0,1fr)]">
                      <div className="relative min-h-[148px] overflow-hidden bg-black md:min-h-[190px]">
                        <img src={listing.photos?.[0] || "/images/jobs/job-card-1.jpg"} alt={listing.title} loading="lazy" className="h-full w-full object-cover" />
                        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${tone}`}>{state}</span>
                        {verificationStatus ? <span className="absolute bottom-2.5 left-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-black/75 px-2.5 py-1 text-[8px] font-black text-white">{verificationStatus.replaceAll("_", " ")}</span> : null}
                      </div>

                      <div className="min-w-0 p-3.5 md:p-5">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`truncate text-[9px] font-black uppercase tracking-[.11em] ${muted}`}>{listing.city} · {listing.vehicle_group}</p>
                            <h2 className="mt-1 line-clamp-2 text-lg font-black tracking-[-.03em] md:text-2xl">{listing.title}</h2>
                            <p className="mt-1 text-xs font-black text-[#b88900] md:text-sm">{formatListingRate(listing.rate)}</p>
                          </div>
                          <span className={`hidden shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-black uppercase sm:inline-flex ${isPro ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/8 text-white/65" : "bg-black/5 text-black/60"}`}>{listing.package_type === "dealer" ? "Dealer" : isPro ? "Pro" : "Standard"}</span>
                        </div>

                        <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold ${muted}`}>
                          <span>{listing.view_count || 0} views</span>
                          <span>Posted {shortDate(listing.created_at)}</span>
                          <span>{state}</span>
                        </div>

                        {inactive ? (
                          <div className={`mt-3 rounded-xl border px-3 py-2.5 ${
                            inactive.tone === "danger"
                              ? "border-red-500/35 bg-red-500/10"
                              : inactive.tone === "review"
                                ? "border-[#f6b800]/30 bg-[#f6b800]/8"
                                : darkMode
                                  ? "border-white/10 bg-white/[.035]"
                                  : "border-black/10 bg-black/[.025]"
                          }`}>
                            <p className={`text-[11px] font-black ${inactive.tone === "danger" ? "text-red-400" : inactive.tone === "review" ? "text-[#b88900]" : ""}`}>{inactive.title}</p>
                            <p className={`mt-1 line-clamp-2 text-[10px] leading-4 ${muted}`}>{inactive.copy}</p>
                          </div>
                        ) : null}

                        {isManualVehicle && listing.expires_at ? <div className={`mt-3 rounded-xl border px-3 py-2.5 ${expired ? "border-red-500/35 bg-red-500/10" : "border-[#f6b800]/25 bg-[#f6b800]/8"}`}><p className="text-[10px] font-black">{expired ? "Listing expired" : `Expires ${formatDate(listing.expires_at)}`}</p>{!expired ? <button type="button" onClick={() => void renewListing(listing)} className="mt-1.5 text-[10px] font-black text-[#b88900] underline underline-offset-4">Renew</button> : null}</div> : null}

                        <div className="mt-3 flex items-center gap-2">
                          <Link href={`/jobs#job-${listing.id}`} className={`flex h-9 items-center justify-center rounded-xl border px-3 text-[10px] font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View</Link>
                          <button type="button" onClick={() => setEditing(listing)} className="h-9 min-w-0 flex-1 rounded-xl bg-[#f6b800] px-3 text-[10px] font-black text-black">{moderationStatus === "rejected" ? "Edit & resubmit" : "Edit post"}</button>
                          <details className="relative shrink-0">
                            <summary aria-label="More post actions" className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border text-base font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>•••</summary>
                            <div className={`absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border shadow-xl ${surface}`}>
                              <button type="button" onClick={() => void openAnalytics(listing)} className="block w-full px-4 py-3 text-left text-xs font-black">{isPro ? "View analytics" : "Analytics options"}</button>
                              {moderationStatus === "approved" ? status === "active" ? <button type="button" onClick={() => void setStatus(listing, "filled")} className="block w-full border-t border-current/10 px-4 py-3 text-left text-xs font-black">Mark as filled</button> : <button type="button" onClick={() => void setStatus(listing, "active")} className="block w-full border-t border-current/10 px-4 py-3 text-left text-xs font-black">Reopen post</button> : null}
                              <button type="button" onClick={() => void deleteListing(listing)} className="block w-full border-t border-red-500/20 px-4 py-3 text-left text-xs font-black text-red-500">Delete post</button>
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
            {filter === "all" && deletedListings.length ? <RemovedPostsHistory items={deletedListings} darkMode={darkMode} muted={muted} /> : null}
          </>
        ) : (
          <>
            <div className={`rounded-[22px] border p-9 text-center ${surface}`}>
              <h2 className="text-2xl font-black">Nothing in this view</h2>
              <p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${muted}`}>{filter === "all" && deletedListings.length ? "You have no current posts. Deleted posts are kept below so their status remains clear." : "Change the filter or create a new LoadLink opportunity."}</p>
              <div className="mt-5 flex justify-center gap-2"><Link href="/jobs/list" className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Post opportunity</Link><Link href="/list-your-vehicle" className={`rounded-xl border px-5 py-3 text-xs font-black ${darkMode ? "border-white/15" : "border-black/15"}`}>List vehicle</Link></div>
            </div>
            {filter === "all" && deletedListings.length ? <RemovedPostsHistory items={deletedListings} darkMode={darkMode} muted={muted} /> : null}
          </>
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

function RemovedPostsHistory({ items, darkMode, muted }: { items: DeletedListing[]; darkMode: boolean; muted: string }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><p className={`text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>Post history</p><h2 className="mt-1 text-lg font-black">Removed posts</h2></div>
        <span className={`text-[10px] font-bold ${muted}`}>Status history</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-white"}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#f4efe3]"}`}>×</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{item.title}</p>
              <p className={`mt-0.5 text-[10px] leading-4 ${muted}`}>{item.note || "Deleted by you. This post is no longer active or visible on LoadLink."}</p>
            </div>
            <span className={`shrink-0 text-[9px] font-bold ${muted}`}>{shortDate(item.created_at)}</span>
          </div>
        ))}
      </div>
    </section>
  );
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

function inactiveReason(listing: MyListing) {
  const moderation = listing.moderation_status || "pending";
  const status = listing.status || "active";
  if (moderation === "rejected") {
    return {
      title: "Not approved by LoadLink",
      copy: listing.moderation_notes || "This post did not pass review. Edit the details or replace the photos, then resubmit it.",
      tone: "danger" as const,
    };
  }
  if (moderation === "pending") {
    return {
      title: "Awaiting LoadLink review",
      copy: "This post is saved but is not public until LoadLink approves it.",
      tone: "review" as const,
    };
  }
  if (status === "filled") {
    return { title: "No longer active", copy: "You marked this opportunity as filled. It is no longer shown as available.", tone: "quiet" as const };
  }
  if (status === "closed") {
    return { title: "No longer active", copy: "This post was closed by you and has been removed from active results.", tone: "quiet" as const };
  }
  if (status === "draft") {
    return { title: "Draft", copy: "This post has not been published yet.", tone: "quiet" as const };
  }
  return null;
}

function EditModal({ listing, onClose, onSaved }: { listing: MyListing; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(listing.title);
  const [city, setCity] = useState(listing.city);
  const [rate, setRate] = useState(listing.rate);
  const [contact, setContact] = useState(listing.contact_number);
  const [description, setDescription] = useState(cleanDescription(listing.description));
  const [replacementFiles, setReplacementFiles] = useState<File[]>([]);
  const [replacementPreviews, setReplacementPreviews] = useState<string[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoLimit = ["pro", "dealer"].includes(listing.package_type || "") ? 15 : 5;
  const rejected = (listing.moderation_status || "pending") === "rejected";

  useEffect(() => () => replacementPreviews.forEach(revokePreviewUrl), [replacementPreviews]);

  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, photoLimit);
    event.target.value = "";
    if (!selected.length) return;
    setError("");
    setPreparingPhotos(true);
    const nextFiles: File[] = [];
    const nextPreviews: string[] = [];
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const source = selected[index];
        const validation = validateImageFile(source, source.name || `Photo ${index + 1}`);
        if (validation) throw new Error(validation);
        const prepared = await prepareImageFileForForm(source, {
          maxWidth: 1440,
          maxHeight: 1440,
          quality: 0.76,
          namePrefix: `loadlink-resubmit-${index + 1}`,
        });
        nextFiles.push(prepared.file);
        nextPreviews.push(prepared.previewUrl);
      }
      replacementPreviews.forEach(revokePreviewUrl);
      setReplacementFiles(nextFiles);
      setReplacementPreviews(nextPreviews);
    } catch (photoError) {
      nextPreviews.forEach(revokePreviewUrl);
      setError(readableUploadError(photoError, "The selected photo could not be prepared."));
    } finally {
      setPreparingPhotos(false);
    }
  }

  async function uploadReplacementPhotos() {
    if (!replacementFiles.length) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) throw new Error("Sign in again before resubmitting this post.");

    const urls: string[] = [];
    const batch = Date.now();
    for (let index = 0; index < replacementFiles.length; index += 1) {
      const file = replacementFiles[index];
      const contentType = inferUploadContentType(file);
      const path = `${user.id}/resubmissions/${listing.id}/${batch}-${index}.${imageExtension(contentType)}`;
      await withTransientRetry(async () => {
        const result = await supabase.storage.from("job-photos").upload(path, file, {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });
        if (result.error) throw result.error;
      });
      const publicUrl = supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
      if (!publicUrl) throw new Error("A replacement photo URL could not be created.");
      urls.push(publicUrl);
    }
    return urls;
  }

  async function save() {
    if (!title.trim() || !city.trim() || !rate.trim() || contact.trim().length < 10 || !description.trim()) {
      setError("Complete the title, location, rate, contact number and description before resubmitting.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const photos = await uploadReplacementPhotos();
      const result = await supabase.rpc("resubmit_my_listing", {
        p_listing_id: listing.id,
        p_title: title.trim(),
        p_city: city.trim(),
        p_rate: rate.trim(),
        p_contact_number: contact.trim(),
        p_description: description.trim(),
        p_photos: photos,
      });

      if (result.error || result.data !== true) {
        const raw = result.error?.message || "";
        if (/function|schema cache|does not exist/i.test(raw) && replacementFiles.length === 0) {
          const fallback = await supabase.rpc("update_my_listing", {
            p_listing_id: listing.id,
            p_title: title.trim(),
            p_city: city.trim(),
            p_rate: rate.trim(),
            p_contact_number: contact.trim(),
            p_description: description.trim(),
            p_owner_key: "",
          });
          if (fallback.error || fallback.data !== true) throw fallback.error || new Error("The post could not be updated.");
        } else if (/function|schema cache|does not exist/i.test(raw)) {
          throw new Error("Run LOADLINK-MARKETPLACE-V2.5.txt in Supabase once to enable rejected-photo replacement.");
        } else {
          throw result.error || new Error("The post could not be updated.");
        }
      }
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The post could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  const photosToShow = replacementPreviews.length ? replacementPreviews : (listing.photos || []).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm">
      <section className="mx-auto my-6 w-full max-w-xl overflow-hidden rounded-[26px] border border-[#f6b800]/55 bg-[#080808] text-white">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f6b800]">My posts</p>
            <h2 className="mt-1 text-2xl font-black">{rejected ? "Fix & resubmit" : "Edit post"}</h2>
            <p className="mt-1 text-xs leading-5 text-white/50">{rejected ? "Change the rejected details or replace the photos, then send it back to LoadLink review." : "Any saved edit is sent back through LoadLink review."}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg" aria-label="Close edit post">×</button>
        </div>

        <div className="grid gap-3 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/55">Listing photos</span>
              <span className="text-[9px] font-bold text-white/35">Up to {photoLimit}</span>
            </div>
            {photosToShow.length ? <div className="grid grid-cols-5 gap-1.5">{photosToShow.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`Listing photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />)}</div> : <div className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center text-xs text-white/40">No listing photo</div>}
            <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 px-4 text-xs font-black transition hover:border-[#f6b800]">
              {preparingPhotos ? "Preparing photos…" : replacementFiles.length ? "Choose different photos" : "Replace listing photos"}
              <input disabled={saving || preparingPhotos} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void choosePhotos(event)} className="hidden" />
            </label>
            {replacementFiles.length ? <p className="mt-2 text-[10px] font-bold text-[#f6b800]">{replacementFiles.length} replacement photo{replacementFiles.length === 1 ? "" : "s"} ready. These will replace the current listing photos.</p> : null}
          </div>

          <input aria-label="Listing title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black" />
          <SouthAfricaLocationInput value={city} onChange={setCity} darkMode={false} allowAllSouthAfrica={false} placeholder="City, town or province" ariaLabel="Listing location" className="h-12 w-full rounded-xl bg-white px-4 text-sm font-bold text-black" />
          <input aria-label="Rate" value={rate} onChange={(event) => setRate(event.target.value)} className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black" />
          <input aria-label="Contact number" value={contact} onChange={(event) => setContact(event.target.value)} className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black" />
          <textarea aria-label="Listing description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-32 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black" />

          {error ? <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-bold leading-5 text-red-300">{error}</p> : null}
          <button type="button" disabled={saving || preparingPhotos} onClick={() => void save()} className="h-12 rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.08em] text-black disabled:opacity-50">{saving ? "Submitting…" : rejected ? "Resubmit for review" : "Save & send for review"}</button>
        </div>
      </section>
    </div>
  );
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
