"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import RecentActivityPanel from "@/components/RecentActivityPanel";
import { VerifiedBadge } from "@/components/MarketplaceDiscovery";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { formatListingRate } from "@/lib/formatCurrency";
import AuthStatusButton from "@/components/AuthStatusButton";
import RequireAuthLink from "@/components/RequireAuthLink";
import { isAuthenticatedUser } from "@/lib/auth";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
type QuickCategory = "truck" | "event-catering" | "logistics" | "mining-farming" | "";
type PortalFilter = "job" | "contract" | "asset" | "";

type JobListing = {
  id: string;
  title: string;
  city: string;
  group: VehicleGroup;
  rate: string;
  postedBy: string;
  contactNumber: string;
  whatsappNumber?: string;
  posterPhoto?: string;
  description: string;
  photos: string[];
  sponsored: boolean;
  packageType?: "standard" | "pro";
  createdAt?: string;
  viewCount?: number;
  lastViewedAt?: string | null;
  userId?: string | null;
  verified?: boolean;
  listingType?: "job" | "contract" | "asset";
  listingLabel?: string;
  vehicleNeeded?: string;
};

type JobRow = {
  id: string;
  title: string;
  city: string;
  vehicle_group: string;
  rate: string;
  posted_by: string;
  contact_number: string | null;
  whatsapp_number?: string | null;
  poster_photo?: string | null;
  description: string;
  photos: string[] | null;
  sponsored: boolean | null;
  package_type: string | null;
  created_at: string | null;
  view_count?: number | null;
  last_viewed_at?: string | null;
  user_id?: string | null;
};

const cityOptions = [
  "Johannesburg", "Sandton", "Midrand", "Pretoria", "Centurion", "Soweto", "Tembisa", "Kempton Park",
  "Boksburg", "Benoni", "Germiston", "Alberton", "Randburg", "Roodepoort", "Krugersdorp", "Vereeniging",
  "Vanderbijlpark", "Springs", "Brakpan", "Nigel", "Heidelberg", "Meyerton", "Carletonville", "Westonaria",
  "Bronkhorstspruit", "Cullinan", "Durban", "Pinetown", "Umhlanga", "Ballito", "Pietermaritzburg",
  "Richards Bay", "Empangeni", "Newcastle", "Ladysmith", "Dundee", "Vryheid", "Amanzimtoti", "Tongaat",
  "KwaDukuza", "Stanger", "Port Shepstone", "Margate", "Chatsworth", "Umlazi", "Cape Town", "Bellville",
  "Stellenbosch", "Paarl", "Worcester", "George", "Mossel Bay", "Knysna", "Hermanus", "Somerset West",
  "Atlantis", "Malmesbury", "Robertson", "Langebaan", "Saldanha", "Vredenburg", "Mitchells Plain",
  "Khayelitsha", "Caledon", "Beaufort West", "Port Elizabeth", "Gqeberha", "East London", "Mthatha",
  "Queenstown", "Komani", "Uitenhage", "Kariega", "Graaff-Reinet", "Butterworth", "King William's Town",
  "Qonce", "Mount Frere", "Bloemfontein", "Welkom", "Bethlehem", "Sasolburg", "Parys", "Phuthaditjhaba",
  "Kroonstad", "Harrismith", "Kimberley", "Upington", "Kuruman", "Springbok", "De Aar", "Rustenburg",
  "Klerksdorp", "Potchefstroom", "Mahikeng", "Brits", "Lichtenburg", "Polokwane", "Tzaneen",
  "Thohoyandou", "Lephalale", "Louis Trichardt", "Mokopane", "Phalaborwa", "Musina", "Nelspruit",
  "Mbombela", "Witbank", "Emalahleni", "Middelburg", "Secunda", "Ermelo", "Standerton", "Barberton",
  "Lydenburg"
];

const vehicleGroups: VehicleGroup[] = ["Catering / Event", "Trucks / Trailers", "Farming / Mining"];

const jobSearchTerms = [
  "Side tipper", "Superlink", "Flat deck", "Tautliner", "Refrigerated truck", "Lowbed", "Dropside truck",
  "Closed truck", "Bakkie", "8 ton truck", "34 ton truck", "Interlink", "Local delivery", "Long-distance load",
  "Cross-border load", "Construction delivery", "Mining transport", "Farming transport", "Refrigerated delivery",
  "Owner-driver job", "Driver job", "Warehouse delivery", "Mobile toilet", "Mobile fridge", "Food truck", "Trailer hire",
];

const searchStopWords = new Set(["a", "an", "and", "available", "find", "for", "in", "job", "jobs", "near", "on", "the", "to"]);

const starterJobs: JobListing[] = [
  {
    id: "demo-1",
    title: "Daily delivery route",
    city: "Johannesburg",
    group: "Trucks / Trailers",
    rate: "From R1 850 / day",
    postedBy: "MoveFast Logistics",
    contactNumber: "010 000 0000",
    description: "Closed truck or bakkie needed for local deliveries. Loading support preferred.",
    photos: ["/images/jobs/job-card-1.jpg", "/images/jobs/job-card-2.jpg", "/images/jobs/job-card-3.jpg"],
    sponsored: true,
    packageType: "standard",
    createdAt: new Date().toISOString(),
    viewCount: 0,
    verified: true,
    listingType: "job",
    listingLabel: "Job",
  },
];

function getListingDetails(description: string) {
  const match = description.match(/^Listing type:\s*([^\n]+)/i);
  const vehicleMatch = description.match(/^Vehicle needed:\s*([^\n]+)/im);
  const rawType = match?.[1]?.trim() || "Job";
  const vehicleNeeded = vehicleMatch?.[1]?.trim() || "";
  const cleanDescription = description.replace(/^Listing type:\s*[^\n]+\n?/i, "").replace(/^Vehicle needed:\s*[^\n]+\n?/im, "").trim();
  const normalised = rawType.toLowerCase();
  const listingType: "job" | "contract" | "asset" = normalised === "contract" ? "contract" : normalised === "job" ? "job" : "asset";
  return { listingType, listingLabel: rawType, vehicleNeeded, cleanDescription };
}

function mapJobRow(row: JobRow, verifiedUsers: Set<string> = new Set()): JobListing {
  const details = getListingDetails(row.description || "");
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    group: row.vehicle_group as VehicleGroup,
    rate: formatListingRate(row.rate),
    postedBy: row.posted_by,
    contactNumber: row.contact_number || "No number added",
    whatsappNumber: row.whatsapp_number || row.contact_number || "",
    posterPhoto: row.poster_photo || "",
    description: details.cleanDescription || row.description,
    photos: row.photos && row.photos.length > 0 ? row.photos : ["/images/jobs/job-card-1.jpg"],
    sponsored: Boolean(row.sponsored),
    packageType: row.package_type === "pro" ? "pro" : "standard",
    createdAt: row.created_at || undefined,
    viewCount: row.view_count || 0,
    lastViewedAt: row.last_viewed_at || null,
    userId: row.user_id || null,
    verified: Boolean(row.user_id && verifiedUsers.has(row.user_id)),
    listingType: details.listingType,
    listingLabel: details.listingLabel,
    vehicleNeeded: details.vehicleNeeded,
  };
}

function getDeviceKey() {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem("loadlink-device-key");
  if (existing) return existing;

  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  localStorage.setItem("loadlink-device-key", key);
  return key;
}

function getOwnedJobs(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}");
  } catch {
    localStorage.removeItem("loadlink-owned-job-keys");
    return {};
  }
}

function saveViewedJob(job: JobListing) {
  try {
    const saved = localStorage.getItem("loadlink-recent-viewed-jobs");
    const current = saved ? JSON.parse(saved) : [];
    const nextItem = {
      id: job.id,
      title: job.title,
      href: `/jobs#job-${job.id}`,
      category: "Job",
      type: job.group,
      image: job.photos[0] || "/images/jobs/job-card-1.jpg",
      meta: `${job.city} • ${formatPostedDate(job.createdAt)}`,
      savedAt: Date.now(),
    };

    const next = [nextItem, ...(Array.isArray(current) ? current.filter((item) => item?.id !== job.id) : [])].slice(0, 12);
    localStorage.setItem("loadlink-recent-viewed-jobs", JSON.stringify(next));
    window.dispatchEvent(new Event("loadlink-recent-activity-updated"));
    window.dispatchEvent(new Event("loadlink-account-state-changed"));
    recordUserActivity("listing_view", {
      entityType: "listing",
      entityId: job.id,
      metadata: { title: job.title, city: job.city, group: job.group },
    }).catch(() => undefined);
    syncAccountState().catch(() => undefined);
  } catch {
    localStorage.removeItem("loadlink-recent-viewed-jobs");
  }
}

function saveLikedJob(job: JobListing) {
  try {
    const current = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
    const item = { id: job.id, title: job.title, href: `/jobs#job-${job.id}`, category: "Job", type: job.group, image: job.photos[0] || "/images/jobs/job-card-1.jpg", meta: `${job.city} - ${formatListingRate(job.rate)}`, savedAt: Date.now() };
    const exists = Array.isArray(current) && current.some((entry) => entry?.id === job.id);
    const next = exists ? current.filter((entry) => entry?.id !== job.id) : [item, ...(Array.isArray(current) ? current : [])].slice(0, 30);
    localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
    window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
    window.dispatchEvent(new Event("loadlink-account-state-changed"));
    recordUserActivity(exists ? "listing_unliked" : "listing_liked", {
      entityType: "listing",
      entityId: job.id,
      metadata: { title: job.title, city: job.city, group: job.group },
    }).catch(() => undefined);
    syncAccountState().catch(() => undefined);
    return !exists;
  } catch {
    localStorage.removeItem("loadlink-liked-listings");
    return false;
  }
}

function getLikedJobIds() {
  try {
    const items = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
    return new Set<string>(Array.isArray(items) ? items.map((item) => item?.id).filter(Boolean) : []);
  } catch {
    return new Set<string>();
  }
}

async function shareListing(job: JobListing) {
  const url = `${window.location.origin}/jobs#job-${job.id}`;
  const data = { title: job.title, text: `${job.title} in ${job.city} on LoadLink`, url };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(url); window.alert("Listing link copied."); }
  } catch { }
}

function reportListing(job: JobListing) {
  const reason = window.prompt("Briefly explain why you are reporting this listing.");
  if (!reason?.trim()) return;
  try {
    const reports = JSON.parse(localStorage.getItem("loadlink-pending-reports") || "[]");
    const next = [{ listingId: job.id, title: job.title, reason: reason.trim(), createdAt: new Date().toISOString() }, ...(Array.isArray(reports) ? reports : [])];
    localStorage.setItem("loadlink-pending-reports", JSON.stringify(next));
    window.alert("Report saved. It will be sent when the complaints email connection is added.");
  } catch {
    window.alert("The report could not be saved on this device.");
  }
}

function formatPostedDate(value?: string) {
  if (!value) return "Posted recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Posted recently";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Posted just now";
  if (minutes < 60) return `Posted ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
}

function normaliseWhatsapp(value?: string) {
  const clean = (value || "").replace(/[^\d+]/g, "");
  if (!clean) return "";
  if (clean.startsWith("0")) return `27${clean.slice(1)}`;
  return clean.replace("+", "");
}

function buildGreeting(job: JobListing, requesterNumber = "") {
  const subject =
    job.group === "Trucks / Trailers"
      ? "this truck"
      : job.group === "Catering / Event"
        ? "this event or catering service"
        : "this farming or mining transport service";

  return `Hey, I’m interested in ${subject} on LoadLink. Please call me on ${requesterNumber || "my number"} when you are available.`;
}

function getViewerDeviceType() {
  if (typeof navigator === "undefined") return "unknown";
  const agent = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(agent)) return "tablet";
  if (/iphone|android|mobile/.test(agent)) return "mobile";
  return "desktop";
}

function getViewerSource() {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    if (host.includes("google")) return "google";
    if (host.includes("facebook") || host.includes("instagram")) return "social";
    if (host.includes("whatsapp")) return "whatsapp";
    if (host === window.location.hostname) return "loadlink";
    return "referral";
  } catch {
    return "direct";
  }
}

function getRequesterNumber() {
  const savedNumber = localStorage.getItem("loadlink-user-contact-number") || "";
  const requesterNumber = window.prompt("Enter your number to include in the greeting.", savedNumber) || savedNumber;

  if (requesterNumber) localStorage.setItem("loadlink-user-contact-number", requesterNumber);
  return requesterNumber;
}



function greetPoster(job: JobListing) {
  const requesterNumber = getRequesterNumber();
  const message = buildGreeting(job, requesterNumber);
  const clean = job.contactNumber.replace(/[^\d+]/g, "");
  const phone = clean.startsWith("0") ? `27${clean.slice(1)}` : clean.replace("+", "");

  if (!phone || phone.toLowerCase().includes("no")) {
    alert(message);
    return;
  }

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

export default function JobsPortalPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [group, setGroup] = useState<VehicleGroup | "">("");
  const [showCityOptions, setShowCityOptions] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sharedJobs, setSharedJobs] = useState<JobListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [galleryJob, setGalleryJob] = useState<JobListing | null>(null);
  const [ownedJobs, setOwnedJobs] = useState<Record<string, string>>({});
  const [editJob, setEditJob] = useState<JobListing | null>(null);
  const [likedJobIds, setLikedJobIds] = useState<Set<string>>(new Set());
  const [quickCategory, setQuickCategory] = useState<QuickCategory>("");
  const [portalFilter, setPortalFilter] = useState<PortalFilter>("");
  const [analyticsJob, setAnalyticsJob] = useState<JobListing | null>(null);
  const [loadError, setLoadError] = useState("");
  const cityWrapperRef = useRef<HTMLLabelElement | null>(null);

  async function fetchJobs() {
    setLoadError("");
    setLoadingJobs(true);

    try {
      const response = await fetch(`/api/job-listings?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Listings could not load.");
      }

      const rows = (payload?.rows || []) as JobRow[];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value))));
      const verifiedUsers = new Set<string>();

      if (isSupabaseConfigured && userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,verification_status")
          .in("id", userIds);
        (profiles || []).forEach((profile) => {
          if (profile.verification_status === "verified") verifiedUsers.add(profile.id);
        });
      }

      setSharedJobs(rows.map((row) => mapJobRow(row, verifiedUsers)));
    } catch (error) {
      setSharedJobs([]);
      setLoadError(error instanceof Error ? error.message : "Listings could not load.");
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("loadlink-theme");
    if (savedTheme === "dark") setDarkMode(true);
    const deviceKey = getDeviceKey();
    const locallyOwnedJobs = getOwnedJobs();
    setOwnedJobs(locallyOwnedJobs);
    setLikedJobIds(getLikedJobIds());

    if (isSupabaseConfigured && Object.keys(locallyOwnedJobs).length > 0) {
      const ownerKeys = Array.from(new Set(Object.values(locallyOwnedJobs).filter(Boolean)));
      supabase.auth.getUser()
        .then(async ({ data }) => {
          if (!isAuthenticatedUser(data.user)) return;
          for (const ownerKey of ownerKeys) {
            await supabase.rpc("claim_guest_listings", { p_owner_key: ownerKey });
          }
          await syncAccountState().catch(() => undefined);
          await fetchJobs();
        })
        .catch(() => undefined);
    }
    const params = new URLSearchParams(window.location.search);
    const querySearch = params.get("search") || "";
    const category = (params.get("category") || "") as QuickCategory;
    const portal = (params.get("portal") || "") as PortalFilter;
    if (["job", "contract", "asset"].includes(portal)) {
      setPortalFilter(portal);
      setHasSearched(true);
    }
    if (["truck", "event-catering", "logistics", "mining-farming"].includes(category)) {
      setQuickCategory(category);
      setHasSearched(true);
    }
    const homeSearch = localStorage.getItem("loadlink-home-search") || querySearch;
    if (homeSearch) {
      const lower = homeSearch.toLowerCase();
      const cityMatch = cityOptions.find((item) => lower.includes(item.toLowerCase()));
      setKeyword(homeSearch);
      if (cityMatch) setCity(cityMatch);
      if (lower.includes("truck") || lower.includes("superlink") || lower.includes("tipper") || lower.includes("flat deck") || lower.includes("lowbed") || lower.includes("tautliner") || lower.includes("bakkie")) setGroup("Trucks / Trailers");
      if (lower.includes("mining") || lower.includes("farming")) setGroup("Farming / Mining");
      if (lower.includes("catering") || lower.includes("event")) setGroup("Catering / Event");
      setHasSearched(true);
      localStorage.removeItem("loadlink-home-search");
    }
    fetchJobs();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("public-job-listings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_listings" }, () => fetchJobs())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const refreshAccountState = () => {
      setOwnedJobs(getOwnedJobs());
      setLikedJobIds(getLikedJobIds());
    };

    window.addEventListener("loadlink-account-state-synced", refreshAccountState);
    return () => window.removeEventListener("loadlink-account-state-synced", refreshAccountState);
  }, []);

  useEffect(() => {
    if (!loadingJobs && window.location.hash) {
      setTimeout(() => {
        document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, [loadingJobs, sharedJobs.length]);

  useEffect(() => {
    function closeCityOptions(e: MouseEvent | TouchEvent) {
      if (!cityWrapperRef.current?.contains(e.target as Node)) setShowCityOptions(false);
    }

    document.addEventListener("mousedown", closeCityOptions);
    document.addEventListener("touchstart", closeCityOptions);
    return () => {
      document.removeEventListener("mousedown", closeCityOptions);
      document.removeEventListener("touchstart", closeCityOptions);
    };
  }, []);

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem("loadlink-theme", nextMode ? "dark" : "light");
    window.dispatchEvent(new Event("loadlink-theme-change"));
  }

  const cityMatches = useMemo(() => {
    const sorted = [...cityOptions].sort((a, b) => a.localeCompare(b));
    if (showAllCities) return sorted;
    if (!city.trim()) return sorted.slice(0, 12);
    return sorted.filter((item) => item.toLowerCase().includes(city.toLowerCase())).slice(0, 16);
  }, [city, showAllCities]);

  const allJobs = useMemo(() => sharedJobs, [sharedJobs]);

  const matchingJobs = useMemo(() => {
    const tokens = keyword
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9-]/g, ""))
      .filter((token) => token && !searchStopWords.has(token));

    return allJobs.filter((job) => {
      const searchable = `${job.title} ${job.city} ${job.group} ${job.vehicleNeeded || ""} ${job.rate} ${job.postedBy} ${job.description} ${job.packageType || "standard"} ${job.sponsored ? "premium sponsored pro" : "standard"} ${job.verified ? "verified" : ""}`.toLowerCase();
      const keywordMatch = tokens.length === 0 || tokens.every((token) => searchable.includes(token));
      const cityMatch = !city.trim() || job.city.toLowerCase().includes(city.toLowerCase());
      const groupMatch = !group || job.group === group;
      const categoryMatch = !quickCategory || (
        quickCategory === "truck" ? /truck|trailer|tipper|superlink|lowbed|tautliner|bakkie|mobile unit/.test(searchable) :
        quickCategory === "event-catering" ? /event|catering|food truck|mobile toilet|mobile fridge|mobile kitchen/.test(searchable) :
        quickCategory === "logistics" ? /logistics|delivery|transport|freight|courier|warehouse|load/.test(searchable) :
        /mining|farming|farm|agriculture|agricultural/.test(searchable)
      );
      const portalMatch = !portalFilter || job.listingType === portalFilter;
      return keywordMatch && cityMatch && groupMatch && categoryMatch && portalMatch;
    });
  }, [allJobs, keyword, city, group, quickCategory, portalFilter]);

  function toggleLiked(job: JobListing) {
    const nowLiked = saveLikedJob(job);
    setLikedJobIds((current) => {
      const next = new Set(current);
      if (nowLiked) next.add(job.id); else next.delete(job.id);
      return next;
    });
  }

  function searchJobs() {
    setIsSearching(true);
    setHasSearched(true);
    requestAnimationFrame(() => {
      document.getElementById("matching-jobs")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setIsSearching(false), 900);
    });
  }

  async function openGallery(job: JobListing) {
    saveViewedJob(job);
    setGalleryJob(job);

    if (!isSupabaseConfigured || job.id.startsWith("demo-")) return;

    const viewerKey = getDeviceKey();
    const ownerKey = ownedJobs[job.id];

    if (ownerKey && ownerKey === viewerKey) return;

    const detailedView = await supabase.rpc("record_job_view", {
      p_job_id: job.id,
      p_viewer_key: viewerKey,
      p_device_type: getViewerDeviceType(),
      p_source: getViewerSource(),
    });

    if (detailedView.error) {
      await supabase.rpc("increment_job_view", {
        p_job_id: job.id,
        p_viewer_key: viewerKey,
      });
    }

    fetchJobs();
  }

  async function deleteJob(job: JobListing) {
    const ownerKey = ownedJobs[job.id];
    if (!ownerKey) {
      alert("Only the device that posted this job can delete it.");
      return;
    }

    const confirmed = confirm("Delete this post from LoadLink?");
    if (!confirmed) return;

    const { data, error } = await supabase.rpc("delete_job_listing", {
      p_job_id: job.id,
      p_owner_key: ownerKey,
    });

    if (error || data !== true) {
      alert("This post can only be deleted from the device that created it.");
      return;
    }

    const next = { ...ownedJobs };
    delete next[job.id];
    localStorage.setItem("loadlink-owned-job-keys", JSON.stringify(next));
    setOwnedJobs(next);
    fetchJobs();
  }

  const portalRailJobs = useMemo(() => {
    const promoted = allJobs.filter((job) => job.sponsored || job.packageType === "pro");
    const recent = allJobs.filter((job) => !job.sponsored && job.packageType !== "pro");
    return [...promoted, ...recent].slice(0, 8);
  }, [allJobs]);

  const portalCopy = portalFilter === "contract"
    ? { eyebrow: "Contracts portal", title: "Find logistics contracts", description: "Browse posted transport, construction, mining, farming and recurring delivery contracts.", searchButton: "Search contracts", listLabel: "Post a contract", listHref: "/jobs/list?mode=contract", results: "Available contracts" }
    : portalFilter === "asset"
      ? { eyebrow: "Vehicles and mobile units", title: "Find equipment for hire", description: "Browse trucks, trailers, mobile toilets, mobile fridges, food trucks and other mobile units.", searchButton: "Search listings", listLabel: "List a vehicle or mobile unit", listHref: "/jobs/list?mode=asset", results: "Available vehicles and mobile units" }
      : { eyebrow: "", title: "Find paid logistics work", description: "For truck owners, drivers, mobile kitchens, mobile fridges, farming vehicles and mining transport operators looking for real posted jobs.", searchButton: "Search jobs", listLabel: "List a job", listHref: "/jobs/list", results: "Available jobs" };

  return (
    <main className={`min-h-screen scroll-smooth transition-colors duration-500 ${darkMode ? "bg-black text-white" : "bg-[#fff7df] text-black"}`}>
      {isSearching ? <LoadLinkLoading /> : null}
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <section className="relative min-h-[82vh] overflow-hidden border-b border-[#f6b800]/40">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Truck fleet ready for logistics work" className="absolute inset-0 h-full w-full object-cover grayscale" />
        <div className={`absolute inset-0 ${darkMode ? "bg-gradient-to-b from-black/15 via-black/45 to-black" : "bg-gradient-to-b from-black/5 via-black/35 to-[#fff7df]"}`} />

        <div className="relative mx-auto flex min-h-[82vh] max-w-5xl flex-col justify-end px-5 pb-8 pt-20">
          <div className="max-w-4xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            {portalCopy.eyebrow ? <p className="mb-4 inline-flex border border-[#f6b800] bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#f6b800]">{portalCopy.eyebrow}</p> : null}
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] md:text-7xl">{portalCopy.title}</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 md:text-lg">
              {portalCopy.description}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-[#f6b800] bg-black/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-5">
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Job or truck type</span>
                <input
                  list="loadlink-job-search-terms"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchJobs(); }}
                  placeholder="Side tipper, delivery, mining..."
                  className="h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-sm font-semibold text-black outline-none placeholder:text-neutral-500 focus:border-[#f6b800]"
                />
                <datalist id="loadlink-job-search-terms">
                  {jobSearchTerms.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>

              <label ref={cityWrapperRef} className="relative block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Location</span>
                <input
                  value={city}
                  onFocus={() => setShowCityOptions(true)}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setShowCityOptions(true);
                    setShowAllCities(false);
                  }}
                  placeholder="Enter city"
                  className="h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-sm font-semibold text-black outline-none placeholder:text-neutral-500 focus:border-[#f6b800]"
                />

                {showCityOptions ? (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[#f6b800]/50 bg-white text-black shadow-2xl">
                    <button type="button" onClick={() => setShowAllCities((value) => !value)} className="block w-full border-b border-black/10 bg-[#fff2bf] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-black">
                      {showAllCities ? "Show matching cities" : "Show all cities"}
                    </button>

                    {cityMatches.map((item) => (
                      <button key={item} type="button" onClick={() => { setCity(item); setShowCityOptions(false); }} className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm font-bold hover:bg-[#fff2bf]">
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Category</span>
                <select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup | "")} className="h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-sm font-semibold text-black outline-none focus:border-[#f6b800]">
                  <option value="">All categories</option>
                  {vehicleGroups.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <button onClick={searchJobs} className="mt-6 h-12 rounded-xl border border-[#f6b800] bg-[#f6b800] px-7 text-sm font-black uppercase tracking-wide text-black active:scale-[0.99] md:mt-auto">
                {portalCopy.searchButton}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5">
            <RequireAuthLink href={portalCopy.listHref} className="inline-flex items-center gap-2 border border-[#f6b800] bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-black">
              {portalCopy.listLabel}
            </RequireAuthLink>
            <RequireAuthLink href="/my-posts" className="inline-flex items-center gap-1.5 rounded-full border border-[#f6b800]/70 bg-black/65 px-4 py-3 text-xs font-black uppercase tracking-wide text-[#f6b800] shadow-sm backdrop-blur transition hover:bg-black">
              My posts
              <span aria-hidden="true">›</span>
            </RequireAuthLink>
          </div>
        </div>
      </section>

      {portalRailJobs.length ? <FeaturedJobsRail jobs={portalRailJobs} darkMode={darkMode} onOpen={openGallery} /> : null}

      <section id="matching-jobs" className="mx-auto max-w-5xl px-5 pb-12 pt-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-[-0.05em]">{hasSearched ? `Matching ${portalCopy.results.toLowerCase()}` : portalCopy.results}</h2>
          </div>

          <RequireAuthLink href={portalCopy.listHref} className={`hidden border px-5 py-3 text-xs font-black uppercase tracking-wide md:inline-flex ${darkMode ? "border-[#f6b800] text-[#f6b800]" : "border-black text-black"}`}>{portalCopy.listLabel}</RequireAuthLink>
        </div>

        {loadError ? <div className="mb-5 border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-600">{loadError}</div> : null}

        <div className="grid gap-5">
          {loadingJobs ? <ListingSkeletons darkMode={darkMode} /> : matchingJobs.length > 0 ? (
            matchingJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                darkMode={darkMode}
                isOwner={Boolean(ownedJobs[job.id])}
                isLiked={likedJobIds.has(job.id)}
                onToggleLiked={() => toggleLiked(job)}
                onShare={() => shareListing(job)}
                onReport={() => reportListing(job)}
                onOpenGallery={() => openGallery(job)}
                onOpenAnalytics={() => setAnalyticsJob(job)}
                onDelete={() => deleteJob(job)}
                onEdit={() => setEditJob(job)}
              />
            ))
          ) : (
            <div className={`border p-8 text-center ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white/70" : "border-black/10 bg-white text-black/65"}`}>
              <p className="text-2xl font-black">No matching listings</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6">Try a different city or vehicle group, or clear your filters to see all available work.</p>
              <button onClick={() => { setKeyword(""); setCity(""); setGroup(""); setQuickCategory(""); setHasSearched(false); }} className="mt-5 border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#b88900]">Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <RecentActivityPanel darkMode={darkMode} />
      <Footer darkMode={darkMode} />

      {galleryJob ? <PhotoGalleryModal job={galleryJob} onClose={() => setGalleryJob(null)} /> : null}
      {analyticsJob ? <ListingAnalyticsModal job={analyticsJob} ownerKey={ownedJobs[analyticsJob.id] || ""} onClose={() => setAnalyticsJob(null)} /> : null}
      {editJob ? <EditJobModal job={editJob} ownerKey={ownedJobs[editJob.id]} onClose={() => setEditJob(null)} onUpdated={() => { setEditJob(null); fetchJobs(); }} /> : null}
    </main>
  );
}

function FeaturedJobsRail({ jobs, darkMode, onOpen }: { jobs: JobListing[]; darkMode: boolean; onOpen: (job: JobListing) => void }) {
  return (
    <section className={`border-b px-5 py-7 md:px-12 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-[#fff7df] text-black"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Featured and recent listings</h2>
          </div>
        </div>

        <div className="no-scrollbar mt-5 flex w-full touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 scroll-smooth">
          {jobs.map((job) => {
            const promoted = job.sponsored || job.packageType === "pro";
            return (
              <button
                key={job.id}
                onClick={() => onOpen(job)}
                className={`min-w-[82%] snap-start overflow-hidden border text-left sm:min-w-[58%] md:min-w-[360px] md:max-w-[360px] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}
              >
                <div className="relative aspect-[16/9] bg-black">
                  <img src={job.photos[0] || "/images/jobs/job-card-1.jpg"} alt={job.title} className="h-full w-full object-cover" />
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] ${promoted ? "bg-[#f6b800] text-black" : "bg-black/75 text-white"}`}>
                    {promoted ? "Featured" : "Recent"}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-[#b88900]">{job.city} · {job.group}</p>
                  <h3 className="mt-2 text-xl font-black">{job.title}</h3>
                  <p className="mt-3 text-lg font-black text-[#b88900]">{formatListingRate(job.rate)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function JobCard({ job, darkMode, isOwner, isLiked, onToggleLiked, onShare, onReport, onOpenGallery, onOpenAnalytics, onDelete, onEdit }: { job: JobListing; darkMode: boolean; isOwner: boolean; isLiked: boolean; onToggleLiked: () => void; onShare: () => void; onReport: () => void; onOpenGallery: () => void; onOpenAnalytics: () => void; onDelete: () => void; onEdit: () => void }) {
  const coverPhoto = job.photos[0] || "/images/jobs/job-card-1.jpg";
  const photoCount = job.photos.length;
  const isPro = job.packageType === "pro";

  return (
    <article id={`job-${job.id}`} className={`scroll-mt-24 overflow-hidden border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
      <div role="button" tabIndex={0} onClick={onOpenGallery} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" ")onOpenGallery()}} className="group relative block w-full cursor-pointer overflow-hidden bg-black text-left">
        <div className="aspect-[4/3] w-full overflow-hidden md:aspect-[16/9]"><img src={coverPhoto} alt={job.title} className="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.02]" /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />
        <span className="absolute right-3 bottom-3 rounded-full bg-black/75 px-3 py-1.5 text-xs font-black text-white">{photoCount} photos</span>
        {job.sponsored ? <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-black">Promoted</span> : null}
        <button type="button" onClick={(e)=>{e.stopPropagation();onToggleLiked()}} className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 ${isLiked?"bg-[#f6b800] text-black":"bg-black/65 text-white"}`} aria-label="Save listing"><SaveIcon filled={isLiked}/></button>
      </div>

      <div className="p-5">
        <p className="text-3xl font-black tracking-[-.04em] text-[#b88900]">{formatListingRate(job.rate)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#2f9f5b] px-3 py-1.5 text-[10px] font-black uppercase text-white">{job.listingLabel || "Job"}</span>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${darkMode ? "bg-white/10 text-white" : "bg-[#eef2f8] text-[#263246]"}`}>{job.group}</span>
          {job.vehicleNeeded ? <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${darkMode ? "bg-white/10 text-white" : "bg-[#eef2f8] text-[#263246]"}`}>{job.vehicleNeeded}</span> : null}
          {job.verified ? <VerifiedBadge /> : null}
          {job.sponsored ? <span className="rounded-full bg-[#168eea] px-3 py-1.5 text-[10px] font-black uppercase text-white">Promoted</span> : null}
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-.03em]">{job.title}</h3>
        <p className={`mt-2 text-sm font-semibold ${darkMode?"text-white/60":"text-black/60"}`}>{job.city} · {job.group}</p>
        <p className={`mt-3 text-sm ${darkMode?"text-white/55":"text-black/55"}`}>Posted by <strong className={darkMode?"text-white":"text-black"}>{job.postedBy}</strong> · {formatPostedDate(job.createdAt)}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">{job.vehicleNeeded?<span className="rounded-full bg-[#eef2ff] px-3 py-2 text-black">{job.vehicleNeeded}</span>:null}<span className="rounded-full bg-[#eef2ff] px-3 py-2 text-black">{job.city}</span>{isOwner && isPro ? <span className="rounded-full bg-black px-3 py-2 text-white">{job.viewCount||0} views</span> : null}</div>

        {isOwner && (job.viewCount || 0) > 0 ? <div className="mt-4 flex items-center justify-between gap-3 border border-[#f6b800]/60 bg-[#f6b800]/10 px-3 py-2.5"><p className="text-xs font-black uppercase tracking-[.12em] text-[#b88900]">Your listing is being viewed.</p><button type="button" onClick={onOpenAnalytics} className="border border-[#f6b800] px-3 py-2 text-[10px] font-black uppercase text-[#b88900]">{isPro?"Analytics":"Pro analytics"}</button></div>:null}

        <details className={`mt-5 border ${darkMode?"border-white/10":"border-black/10"}`}>
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black uppercase tracking-wide">View full details</summary>
          <div className={`border-t p-4 ${darkMode?"border-white/10":"border-black/10"}`}><p className={`text-sm leading-7 ${darkMode?"text-white/70":"text-black/65"}`}>{job.description}</p><ContactSellerStack job={job} darkMode={darkMode}/></div>
        </details>

        <div className={`mt-4 grid grid-cols-2 overflow-hidden border ${darkMode?"border-white/10":"border-black/10"}`}><button onClick={onShare} className={`flex min-h-12 items-center justify-center gap-2 border-r text-xs font-black uppercase ${darkMode?"border-white/10":"border-black/10"}`}><ShareIcon/>Share</button><button onClick={onReport} className="flex min-h-12 items-center justify-center gap-2 text-xs font-black uppercase text-red-500"><ReportIcon/>Report</button></div>
        {isOwner?<div className="mt-3 grid grid-cols-2 gap-3"><button onClick={onEdit} className="border border-[#f6b800] px-4 py-3 text-xs font-black uppercase text-[#b88900]">Edit post</button><button onClick={onDelete} className="border border-red-500/70 px-4 py-3 text-xs font-black uppercase text-red-500">Delete post</button></div>:null}
      </div>
    </article>
  );
}


function ListingSkeletons({ darkMode }: { darkMode: boolean }) {
  return <>{[0,1].map((item) => <div key={item} className={`overflow-hidden border loadlink-skeleton ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><div className={`aspect-[16/9] ${darkMode ? "bg-white/10" : "bg-black/10"}`} /><div className="space-y-3 p-5"><div className={`h-5 w-2/3 ${darkMode ? "bg-white/10" : "bg-black/10"}`} /><div className={`h-4 w-1/3 ${darkMode ? "bg-white/10" : "bg-black/10"}`} /><div className={`h-20 w-full ${darkMode ? "bg-white/10" : "bg-black/10"}`} /></div></div>)}</>;
}
function SaveIcon({filled}:{filled:boolean}){return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled?"currentColor":"none"}><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}
function ShareIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 13v6h14v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function ReportIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 21V4m0 1h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function MenuIcon(){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}

function ContactSellerStack({ job, darkMode }: { job: JobListing; darkMode: boolean }) {
  const whatsappPhone = normaliseWhatsapp(job.whatsappNumber || job.contactNumber);
  const message = buildGreeting(job);

  return (
    <div className={`mt-5 overflow-hidden border ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#f8f9ff]"}`}>
      <div className="p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b88900]">Contact poster</p>
        <div className={`mt-3 flex items-center gap-3 border p-3 ${darkMode ? "border-white/10 bg-[#090909]" : "border-black/10 bg-white"}`}>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-[#f6b800]/50 bg-white">
            {job.posterPhoto ? <img src={job.posterPhoto} alt={job.postedBy} className="h-full w-full object-cover" /> : <PosterUserIcon />}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-lg font-black">{job.postedBy}</h4>
            <p className={`mt-1 text-xs font-bold ${darkMode ? "text-white/55" : "text-black/55"}`}>{job.city} • {job.group}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-black/10">
        <a href={`tel:${job.contactNumber.replace(/\s/g, "")}`} className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><PhoneIcon /> Call</a>
        <RequireAuthLink href={`/messages?listing=${encodeURIComponent(job.id)}`} className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><MessageIcon /> Message</RequireAuthLink>
        <a href={whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : "#"} onClick={(e) => { if (!whatsappPhone) { e.preventDefault(); greetPoster(job); } }} target="_blank" rel="noreferrer" className="flex min-h-16 flex-col items-center justify-center gap-1.5 bg-[#0d442b] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><WhatsAppIcon /> WhatsApp</a>
      </div>
    </div>
  );
}
function PosterUserIcon() { return <svg width="38" height="38" viewBox="0 0 24 24" fill="none" className="text-black"><path d="M12 12.2a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c.7-4.2 3.8-6.9 8-6.9s7.3 2.7 8 6.9" fill="currentColor" /></svg>; }
function PhoneIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.6 3.4 9.4 6c.7.6.8 1.6.3 2.4l-1 1.5c1.2 2.4 3 4.2 5.4 5.4l1.5-1c.8-.5 1.8-.4 2.4.3l2.6 2.8c.7.8.7 2-.1 2.7-.9.8-2 1.2-3.2 1.2C9.2 21.3 2.7 14.8 2.7 6.7c0-1.2.4-2.3 1.2-3.2.7-.8 1.9-.9 2.7-.1Z" fill="currentColor" /></svg>; }
function MessageIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.2-.1 6.3 5.1c.3.3.8.3 1.1 0l6.2-5.1H5.2Z" fill="currentColor" /></svg>; }
function WhatsAppIcon() { return <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.4.7 4.7 1.9 6.7L3.5 29l6.7-1.7c1.8 1 3.8 1.5 5.8 1.5 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm7.4 18.1c-.3.9-1.8 1.7-2.5 1.8-.7.1-1.5.1-2.4-.2-.6-.2-1.3-.4-2.2-.8-3.9-1.7-6.5-5.6-6.7-5.8-.2-.2-1.6-2.1-1.6-4s1-2.8 1.4-3.2c.3-.4.8-.5 1.1-.5h.8c.3 0 .6.1.8.7.3.7 1 2.4 1.1 2.6.1.2.1.5 0 .7-.1.3-.2.4-.4.7-.2.2-.4.5-.6.7-.2.2-.4.4-.2.8.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.5 2.5 1.7.3.2.6.2.8-.1.2-.3.9-1.1 1.1-1.4.2-.3.5-.3.8-.2.3.1 2.1 1 2.5 1.2.4.2.7.3.8.5.1.2.1 1.1-.2 2Z" fill="currentColor" /></svg>; }

type AnalyticsBreakdown = { label: string; count: number };
type ListingAnalytics = {
  totalViews: number;
  uniqueViewers: number | null;
  lastViewedAt: string | null;
  dailyViews: AnalyticsBreakdown[];
  devices: AnalyticsBreakdown[];
  sources: AnalyticsBreakdown[];
  recentViewers: { name: string; viewedAt: string }[];
  detailed: boolean;
};

function normaliseAnalyticsPayload(data: unknown, job: JobListing): ListingAnalytics {
  const fallback: ListingAnalytics = {
    totalViews: job.viewCount || 0,
    uniqueViewers: null,
    lastViewedAt: job.lastViewedAt || null,
    dailyViews: [],
    devices: [],
    sources: [],
    recentViewers: [],
    detailed: false,
  };
  if (!data || typeof data !== "object") return fallback;
  const raw = data as Record<string, unknown>;
  const toRows = (value: unknown): AnalyticsBreakdown[] => Array.isArray(value)
    ? value.map((row) => {
        const item = row as Record<string, unknown>;
        return { label: String(item.label || item.day || item.name || "Other"), count: Number(item.count || 0) };
      })
    : [];
  return {
    totalViews: Number(raw.total_views ?? raw.totalViews ?? fallback.totalViews),
    uniqueViewers: Number.isFinite(Number(raw.unique_viewers ?? raw.uniqueViewers)) ? Number(raw.unique_viewers ?? raw.uniqueViewers) : null,
    lastViewedAt: String(raw.last_viewed_at ?? raw.lastViewedAt ?? fallback.lastViewedAt ?? "") || null,
    dailyViews: toRows(raw.daily_views ?? raw.dailyViews),
    devices: toRows(raw.devices),
    sources: toRows(raw.sources),
    recentViewers: Array.isArray(raw.recent_viewers ?? raw.recentViewers) ? ((raw.recent_viewers ?? raw.recentViewers) as any[]).map((item:any)=>({name:String(item.name||"LoadLink member"),viewedAt:String(item.viewed_at||item.viewedAt||"")})) : [],
    detailed: true,
  };
}

function ListingAnalyticsModal({ job, ownerKey, onClose }: { job: JobListing; ownerKey: string; onClose: () => void }) {
  const [analytics, setAnalytics] = useState<ListingAnalytics>(() => normaliseAnalyticsPayload(null, job));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured || !ownerKey || job.id.startsWith("demo-")) {
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_pro_job_analytics", { p_job_id: job.id, p_owner_key: ownerKey });
      if (active && !error) setAnalytics(normaliseAnalyticsPayload(data, job));
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [job, ownerKey]);

  const maximumDaily = Math.max(1, ...analytics.dailyViews.map((item) => item.count));
  const maximumDevice = Math.max(1, ...analytics.devices.map((item) => item.count));
  const insight = analytics.totalViews === 0
    ? "Your listing has not been opened yet. A clear cover photo, exact location and specific title help people understand it faster."
    : analytics.totalViews < 5
      ? "Your listing is starting to get discovered. Keep the title specific and put the strongest photo first so people know what is available immediately."
      : job.packageType === "pro"
        ? "Your listing is attracting attention. Keep the rate, location and availability current so interested users can act quickly."
        : "Your listing is attracting attention. More complete photos and a clearer rate usually help a listing hold attention when visibility increases.";

  if (job.packageType !== "pro") {
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"><section className="w-full max-w-md border border-[#f6b800]/50 bg-[#080808] p-6 text-white"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f6b800]">Pro analytics</p><h2 className="mt-3 text-3xl font-black">Understand who is finding your listing</h2><p className="mt-4 text-sm leading-7 text-white/60">Standard listings keep their public view count. Pro analytics adds seven-day graphs, traffic sources, devices and signed-in viewers who opened the listing.</p><div className="mt-6 grid gap-3"><RequireAuthLink href="/jobs/list?upgrade=pro" className="flex h-12 items-center justify-center bg-[#f6b800] font-black text-black">View Pro options</RequireAuthLink><button onClick={onClose} className="h-12 border border-white/15 font-black">Not now</button></div></section></div>;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
      <section className="mx-auto my-6 max-w-2xl border border-[#f6b800]/60 bg-[#080808] text-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">Listing analytics</p>
            <h2 className="mt-2 text-2xl font-black">{job.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-white/20 text-xl font-black" aria-label="Close analytics">×</button>
        </header>

        <div className="grid grid-cols-2 border-b border-white/10 md:grid-cols-3">
          <Metric label="Total views" value={String(analytics.totalViews)} />
          <Metric label="Unique viewers" value={analytics.uniqueViewers === null ? "Tracking" : String(analytics.uniqueViewers)} />
          <Metric label="Last viewed" value={analytics.lastViewedAt ? new Date(analytics.lastViewedAt).toLocaleDateString() : "Not yet"} wide />
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b800]">Views over 7 days</h3>
            {loading ? <div className="mt-4 h-36 loadlink-skeleton bg-white/5" /> : analytics.dailyViews.length ? (
              <div className="mt-4 flex h-40 items-end gap-2 border-b border-white/15 px-1 pb-2">
                {analytics.dailyViews.map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-black text-white/55">{item.count}</span>
                    <div className="w-full min-w-3 bg-[#f6b800]" style={{ height: `${Math.max(6, (item.count / maximumDaily) * 105)}px` }} />
                    <span className="max-w-full truncate text-[9px] font-bold uppercase text-white/45">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 border border-white/10 p-4 text-sm leading-6 text-white/55">Daily diagrams begin collecting after the analytics database update. Your current total remains visible above.</div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b800]">Viewer devices</h3>
            {analytics.devices.length ? <div className="mt-4 space-y-4">{analytics.devices.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-xs font-bold"><span className="capitalize">{item.label}</span><span>{item.count}</span></div>
                <div className="h-2 bg-white/10"><div className="h-full bg-[#f6b800]" style={{ width: `${Math.max(4, (item.count / maximumDevice) * 100)}%` }} /></div>
              </div>
            ))}</div> : <div className="mt-4 border border-white/10 p-4 text-sm leading-6 text-white/55">Device information is privacy-friendly and only shows grouped totals, never personal identities.</div>}
          </div>
        </div>

        {analytics.sources.length ? (
          <div className="border-t border-white/10 px-5 py-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b800]">How viewers found it</h3>
            <div className="mt-3 flex flex-wrap gap-2">{analytics.sources.map((item) => <span key={item.label} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold capitalize">{item.label}: {item.count}</span>)}</div>
          </div>
        ) : null}

        <div className="border-t border-white/10 p-5"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b800]">Signed-in viewers</h3>{analytics.recentViewers.length?<div className="mt-4 grid gap-3 sm:grid-cols-2">{analytics.recentViewers.map((viewer,index)=><div key={viewer.name+index} className="flex items-center gap-3 border border-white/10 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6b800] font-black text-black">{viewer.name.slice(0,1).toUpperCase()}</div><div><p className="text-sm font-black">{viewer.name}</p><p className="text-[10px] text-white/40">{viewer.viewedAt?new Date(viewer.viewedAt).toLocaleString():"Viewed your listing"}</p></div></div>)}</div>:<p className="mt-3 text-sm leading-6 text-white/50">Anonymous views remain private. Signed-in members will appear here after they open the listing.</p>}</div>

        <div className="border-t border-[#f6b800]/30 bg-[#120f03] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6b800]">Visibility advice</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{insight}</p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`border-r border-white/10 p-4 last:border-r-0 ${wide ? "col-span-2 md:col-span-1" : ""}`}><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p><p className="mt-2 text-xl font-black text-[#f6b800]">{value}</p></div>;
}

function PhotoGalleryModal({ job, onClose }: { job: JobListing; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-4 z-10 mb-4 flex items-center justify-between border border-white/15 bg-black px-4 py-3 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">{job.photos.length} photo{job.photos.length === 1 ? "" : "s"}</p>
            <h3 className="text-lg font-black">{job.title}</h3>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-white/20 text-2xl font-black">×</button>
        </div>

        <div className="grid gap-4">
          {job.photos.map((photo, index) => (
            <figure key={photo + index} className="border border-white/10 bg-black">
              <img src={photo} alt={`${job.title} photo ${index + 1}`} className="h-auto w-full object-contain" />
              {index === 0 ? <figcaption className="px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Cover photo</figcaption> : null}
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditJobModal({ job, ownerKey, onClose, onUpdated }: { job: JobListing; ownerKey: string; onClose: () => void; onUpdated: () => void }) {
  const [title, setTitle] = useState(job.title);
  const [city, setCity] = useState(job.city);
  const [group, setGroup] = useState<VehicleGroup>(job.group);
  const [rate, setRate] = useState(job.rate);
  const [contactNumber, setContactNumber] = useState(job.contactNumber);
  const [description, setDescription] = useState(job.description);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    const { data, error } = await supabase.rpc("update_job_listing", {
      p_job_id: job.id,
      p_owner_key: ownerKey,
      p_title: title,
      p_city: city,
      p_vehicle_group: group,
      p_rate: rate,
      p_contact_number: contactNumber,
      p_description: description,
    });

    setSaving(false);

    if (error || data !== true) {
      alert("This post can only be edited from the device that created it.");
      return;
    }

    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-xl border border-[#f6b800] bg-black p-5 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-black">Edit post</h3>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-white/20 text-2xl font-black">×</button>
        </div>

        <div className="grid gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 bg-white px-4 font-bold text-black" />
          <input value={city} onChange={(e) => setCity(e.target.value)} className="h-12 bg-white px-4 font-bold text-black" />
          <select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className="h-12 bg-white px-4 font-bold text-black">
            {vehicleGroups.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={rate} onChange={(e) => setRate(e.target.value)} className="h-12 bg-white px-4 font-bold text-black" />
          <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="h-12 bg-white px-4 font-bold text-black" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-32 bg-white px-4 py-3 font-bold text-black" />
          <button onClick={save} disabled={saving} className="h-12 bg-[#f6b800] font-black uppercase tracking-wide text-black">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-500 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
      <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className={`flex h-10 w-10 items-center justify-center text-3xl font-black ${darkMode ? "text-white" : "text-black"}`} aria-label="Open menu"><MenuIcon /></Link>
          <AuthStatusButton darkMode={darkMode} />
        </div>

        <HomeLogoLink theme={darkMode ? "dark" : "light"} />

        <button onClick={toggleDarkMode} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${darkMode ? "border-yellow-400/70 bg-yellow-400 text-black" : "border-black/10 bg-black text-[#f6b800]"}`}>
          {darkMode ? <HeaderSunIcon /> : <HeaderMoonIcon />}
        </button>
      </div>
    </header>
  );
}

function Footer({ darkMode }: { darkMode: boolean }) {
  const sections = ["Company", "Logistics", "Services", "Customers"];

  return (
    <footer className={`px-5 py-10 transition-colors duration-500 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-center overflow-visible">
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        </div>

        <div className="grid gap-0">
          {sections.map((section) => (
            <details key={section} className={`border-t py-7 ${darkMode ? "border-white/10" : "border-black/10"}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-3xl font-black tracking-[-0.04em]">
                {section}
                <span className="text-[#b88900]">v</span>
              </summary>
              <p className={`mt-4 text-sm leading-7 ${darkMode ? "text-white/60" : "text-black/60"}`}>More LoadLink information will be added here.</p>
            </details>
          ))}
        </div>
      </div>
    </footer>
  );
}

function HeaderUserPlusIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M10.4 11.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM3.2 20.4c.55-3.85 3.35-6.4 7.2-6.4 2.1 0 3.86.76 5.1 2.07" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14.2v6.6M14.7 17.5h6.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function HeaderSunIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeaderMoonIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" />
    </svg>
  );
}
