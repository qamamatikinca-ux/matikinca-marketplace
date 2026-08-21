"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { supabase } from "@/lib/supabaseClient";

type ListingRow = {
  id: string;
  posted_by?: string | null;
  poster_photo?: string | null;
  package_type?: string | null;
  user_id?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_logo?: string | null;
  dealership_review_count?: number | string | null;
  dealership_review_average?: number | string | null;
  dealer_package_active?: boolean | null;
};

type DriverRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
};

type ProfileReviewRow = {
  id: string;
  rating: number;
  body?: string | null;
  created_at: string;
  target_user_id?: string | null;
};

type DealerReviewRow = {
  id: string;
  rating: number;
  body?: string | null;
  review_text?: string | null;
  dealer_response?: string | null;
  dealership_response?: string | null;
  created_at: string;
};

type ReviewStat = { average: number; count: number };
type Binding = { host: HTMLElement; kind: "listing" | "driver"; id: string; compact: boolean };
type ReviewTarget = {
  userId?: string;
  dealershipId?: string;
  name: string;
  photo?: string;
  accountType: string;
  average: number | null;
  count: number;
};

type ReviewViewRow = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  response?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL";
}

function isRelevantPath(path: string) {
  return /^(\/jobs|\/contracts|\/search|\/list-your-vehicle|\/list-your-truck|\/listing\/|\/vehicles\/|\/drivers|\/messages)/.test(path);
}

function listingIdFromHref(href: string) {
  const direct = href.match(/\/listing\/([0-9a-f-]{36})/i)?.[1];
  if (direct && UUID_RE.test(direct)) return direct;
  const hash = href.match(/#job-([0-9a-f-]{36})/i)?.[1];
  if (hash && UUID_RE.test(hash)) return hash;
  return "";
}

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function accountTypeForListing(row: ListingRow) {
  if (row.dealership_id || row.dealer_package_active || row.package_type === "dealer") return "Verified dealership";
  if (row.package_type === "pro") return "Pro account";
  return "LoadLink account";
}

export default function LoadLinkReleaseCompletion20260821() {
  const [path, setPath] = useState("");
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [profileStats, setProfileStats] = useState<Record<string, ReviewStat>>({});
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [reviewTab, setReviewTab] = useState<"view" | "write">("view");
  const [reviews, setReviews] = useState<ReviewViewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync();
    const timer = window.setInterval(sync, 800);
    window.addEventListener("popstate", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    if (!path || !isRelevantPath(path)) return;
    let active = true;

    async function loadMarketplaceData() {
      if (!/^(\/jobs|\/contracts|\/search|\/list-your-vehicle|\/list-your-truck|\/listing\/|\/vehicles\/)/.test(path)) return;
      try {
        const response = await fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok) setListings(Array.isArray(payload.rows) ? payload.rows : []);
      } catch {
        if (active) setListings([]);
      }
    }

    async function loadDrivers() {
      if (!path.startsWith("/drivers")) return;
      try {
        const response = await fetch("/api/phase2/public-drivers?limit=50&offset=0", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok) setDrivers(Array.isArray(payload.drivers) ? payload.drivers : []);
      } catch {
        if (active) setDrivers([]);
      }
    }

    void Promise.all([loadMarketplaceData(), loadDrivers()]);
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    const ids = Array.from(new Set([
      ...listings.map((row) => String(row.user_id || "")),
      ...drivers.map((row) => String(row.user_id || "")),
    ].filter((id) => UUID_RE.test(id))));
    if (!ids.length) {
      setProfileStats({});
      return;
    }
    let active = true;
    supabase
      .from("profile_reviews")
      .select("target_user_id,rating")
      .in("target_user_id", ids)
      .eq("status", "published")
      .then(({ data }) => {
        if (!active) return;
        const buckets: Record<string, number[]> = {};
        (data || []).forEach((row) => {
          const id = String(row.target_user_id || "");
          if (!id) return;
          (buckets[id] ||= []).push(numeric(row.rating));
        });
        const next: Record<string, ReviewStat> = {};
        ids.forEach((id) => {
          const values = buckets[id] || [];
          next[id] = {
            count: values.length,
            average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
          };
        });
        setProfileStats(next);
      });
    return () => { active = false; };
  }, [drivers, listings]);

  useEffect(() => {
    if (!path.startsWith("/messages")) return;
    let active = true;

    async function registerEveryKnownChatKey() {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      const keys = Array.from(new Set([...getBuyerKeys(), ...getOwnerKeys()].map((key) => String(key || "").trim()).filter(Boolean)));
      await Promise.allSettled(keys.map((accessKey) => supabase.rpc("loadlink_register_chat_access_key", { p_access_key: accessKey })));
    }

    void registerEveryKnownChatKey();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void registerEveryKnownChatKey();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => void registerEveryKnownChatKey());
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      authListener.subscription.unsubscribe();
    };
  }, [path]);

  useEffect(() => {
    let allowCustomFocus = false;
    const onClickCapture = (event: MouseEvent) => {
      const element = event.target as Element | null;
      if (element?.closest(".ll-final-type")) allowCustomFocus = true;
    };
    const onFocusCapture = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement | null;
      if (!allowCustomFocus || !input?.matches('input[data-ll-final-search-input="true"]')) return;
      allowCustomFocus = false;
      event.stopImmediatePropagation();
      window.setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
    };
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("focus", onFocusCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("focus", onFocusCapture, true);
    };
  }, []);

  const listingMap = useMemo(() => Object.fromEntries(listings.map((row) => [row.id, row])), [listings]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((row) => [row.id, row])), [drivers]);
  const driverByName = useMemo(() => {
    const map: Record<string, DriverRow> = {};
    drivers.forEach((row) => {
      const key = String(row.full_name || "").trim().toLowerCase();
      if (key) map[key] = row;
    });
    return map;
  }, [drivers]);

  const scanBindings = useCallback(() => {
    if (!path || !isRelevantPath(path)) {
      setBindings([]);
      return;
    }

    const ensureHost = (container: HTMLElement, kind: "listing" | "driver", id: string, compact: boolean) => {
      if (!id) return;
      let host = Array.from(container.children).find((child) => (child as HTMLElement).dataset?.llAccountReviewHost === "true") as HTMLElement | undefined;
      if (!host) {
        host = document.createElement("div");
        host.dataset.llAccountReviewHost = "true";
        container.appendChild(host);
      }
      host.dataset.llAccountKind = kind;
      host.dataset.llAccountId = id;
      host.dataset.llAccountCompact = compact ? "true" : "false";
    };

    document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
      const id = article.id.replace(/^job-/, "");
      if (listingMap[id]) ensureHost(article, "listing", id, false);
    });

    document.querySelectorAll<HTMLElement>("article").forEach((article) => {
      if (article.id.startsWith("job-")) return;
      const link = article.querySelector<HTMLAnchorElement>('a[href*="/listing/"]');
      const id = listingIdFromHref(link?.getAttribute("href") || "");
      if (id && listingMap[id]) ensureHost(article, "listing", id, false);
    });

    document.querySelectorAll<HTMLAnchorElement>("a.loadlink-search-result-card").forEach((card) => {
      const id = listingIdFromHref(card.getAttribute("href") || "");
      if (id && listingMap[id]) ensureHost(card, "listing", id, true);
    });

    if (path.startsWith("/drivers")) {
      document.querySelectorAll<HTMLElement>('[data-loadlink-phase2-home] article').forEach((article) => {
        const name = (article.querySelector("h3")?.textContent || "").trim().toLowerCase();
        const driver = driverByName[name];
        if (!driver?.id || !driver.user_id) return;
        article.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
          if ((button.textContent || "").trim().toLowerCase() === "review profile") button.dataset.llReviewLegacyHidden = "true";
        });
        ensureHost(article, "driver", driver.id, false);
      });
    }

    const next = Array.from(document.querySelectorAll<HTMLElement>('[data-ll-account-review-host="true"]')).map((host) => ({
      host,
      kind: (host.dataset.llAccountKind === "driver" ? "driver" : "listing") as "listing" | "driver",
      id: host.dataset.llAccountId || "",
      compact: host.dataset.llAccountCompact === "true",
    })).filter((item) => item.id);

    const signature = next.map((item) => `${item.kind}:${item.id}:${item.compact}:${item.host.isConnected}`).join("|");
    setBindings((current) => {
      const currentSignature = current.map((item) => `${item.kind}:${item.id}:${item.compact}:${item.host.isConnected}`).join("|");
      return currentSignature === signature ? current : next;
    });
  }, [driverByName, listingMap, path]);

  useEffect(() => {
    scanBindings();
    const observer = new MutationObserver(() => scanBindings());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(scanBindings, 1500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [scanBindings]);

  const reviewTargetForBinding = useCallback((binding: Binding): ReviewTarget | null => {
    if (binding.kind === "driver") {
      const driver = driverMap[binding.id];
      const userId = String(driver?.user_id || "");
      if (!driver || !UUID_RE.test(userId)) return null;
      const stat = profileStats[userId];
      const count = stat?.count ?? numeric(driver.review_count);
      const average = count ? (stat?.average || numeric(driver.average_rating)) : null;
      return {
        userId,
        name: String(driver.full_name || "Approved LoadLink driver"),
        accountType: "Approved driver",
        average,
        count,
      };
    }

    const row = listingMap[binding.id];
    if (!row) return null;
    const dealershipId = String(row.dealership_id || "");
    const userId = String(row.user_id || "");
    const dealer = UUID_RE.test(dealershipId) && (row.dealer_package_active || row.package_type === "dealer");
    const stat = UUID_RE.test(userId) ? profileStats[userId] : undefined;
    const dealerCount = numeric(row.dealership_review_count);
    const dealerAverage = numeric(row.dealership_review_average);
    const count = dealer ? dealerCount : (stat?.count || 0);
    const average = count ? (dealer ? dealerAverage : stat?.average || 0) : null;
    return {
      userId: UUID_RE.test(userId) ? userId : undefined,
      dealershipId: dealer ? dealershipId : undefined,
      name: String((dealer && row.dealership_name) || row.posted_by || "LoadLink member"),
      photo: String((dealer && row.dealership_logo) || row.poster_photo || "") || undefined,
      accountType: accountTypeForListing(row),
      average,
      count,
    };
  }, [driverMap, listingMap, profileStats]);

  const openReview = useCallback((nextTarget: ReviewTarget, tab: "view" | "write") => {
    setTarget(nextTarget);
    setReviewTab(tab);
    setRating(5);
    setReviewBody("");
    setReviewNotice("");
  }, []);

  const loadReviews = useCallback(async (nextTarget: ReviewTarget) => {
    setReviewsLoading(true);
    setReviewNotice("");
    try {
      if (nextTarget.dealershipId) {
        const { data, error } = await supabase.rpc("loadlink_public_dealer_reviews", {
          p_dealership_id: nextTarget.dealershipId,
          p_limit: 50,
        });
        if (error) throw error;
        const rows = (data || []) as DealerReviewRow[];
        setReviews(rows.map((row) => ({
          id: row.id,
          rating: numeric(row.rating),
          body: String(row.body || row.review_text || ""),
          createdAt: row.created_at,
          response: String(row.dealer_response || row.dealership_response || "") || undefined,
        })));
      } else if (nextTarget.userId) {
        const { data, error } = await supabase
          .from("profile_reviews")
          .select("id,rating,body,created_at")
          .eq("target_user_id", nextTarget.userId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setReviews(((data || []) as ProfileReviewRow[]).map((row) => ({
          id: row.id,
          rating: numeric(row.rating),
          body: String(row.body || ""),
          createdAt: row.created_at,
        })));
      } else {
        setReviews([]);
      }
    } catch (error) {
      setReviews([]);
      setReviewNotice(error instanceof Error ? error.message : "Reviews could not be loaded right now.");
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!target) return;
    void loadReviews(target);
  }, [loadReviews, target]);

  async function submitReview() {
    if (!target || reviewBusy) return;
    setReviewNotice("");
    setReviewBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`);
        return;
      }
      if (target.userId && target.userId === user.id && !target.dealershipId) {
        setReviewNotice("You cannot review your own account.");
        return;
      }
      if (target.dealershipId) {
        if (reviewBody.trim().length < 5) {
          setReviewNotice("Write at least 5 characters about your experience.");
          return;
        }
        const { error } = await supabase.rpc("loadlink_submit_public_dealer_review", {
          p_dealership_id: target.dealershipId,
          p_rating: rating,
          p_body: reviewBody.trim(),
        });
        if (error) throw error;
      } else if (target.userId) {
        const { error } = await supabase.functions.invoke("loadlink-review-service", {
          body: { target_user_id: target.userId, rating, body: reviewBody.trim() },
        });
        if (error) throw error;
      } else {
        throw new Error("This account is not linked to a reviewable LoadLink profile yet.");
      }
      setReviewNotice("Review published.");
      setReviewBody("");
      setRating(5);
      setReviewTab("view");
      await loadReviews(target);
      if (target.userId) {
        const { data } = await supabase.from("profile_reviews").select("rating").eq("target_user_id", target.userId).eq("status", "published");
        const values = (data || []).map((row) => numeric(row.rating));
        setProfileStats((current) => ({
          ...current,
          [target.userId as string]: { count: values.length, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 },
        }));
      }
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : "Review could not be saved right now.");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <>
      {bindings.map((binding) => {
        const reviewTarget = reviewTargetForBinding(binding);
        if (!reviewTarget || !binding.host.isConnected) return null;
        const ratingLabel = reviewTarget.count && reviewTarget.average !== null
          ? `★ ${reviewTarget.average.toFixed(1)} · ${reviewTarget.count} review${reviewTarget.count === 1 ? "" : "s"}`
          : "No account reviews yet";
        return createPortal(
          <div className={`ll-account-footer ${binding.compact ? "is-compact" : ""}`} onClick={(event) => event.stopPropagation()}>
            <div className="ll-account-footer-main">
              <div className="ll-account-footer-avatar" aria-hidden="true">
                {reviewTarget.photo ? <img src={reviewTarget.photo} alt="" /> : <span>{initials(reviewTarget.name)}</span>}
              </div>
              <div className="ll-account-footer-copy">
                <strong>{reviewTarget.name}</strong>
                <span>{reviewTarget.accountType}</span>
                <small>{ratingLabel}</small>
              </div>
            </div>
            {!binding.compact && (reviewTarget.userId || reviewTarget.dealershipId) ? (
              <div className="ll-account-footer-actions">
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openReview(reviewTarget, "view"); }}>View account reviews</button>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openReview(reviewTarget, "write"); }}>Write a review</button>
              </div>
            ) : null}
          </div>,
          binding.host,
          `${binding.kind}-${binding.id}-${binding.compact ? "compact" : "full"}`,
        );
      })}

      {target ? createPortal(
        <div className="ll-account-review-modal" data-ll-account-review-modal="true" role="dialog" aria-modal="true" aria-label={`Reviews for ${target.name}`}>
          <button type="button" className="ll-account-review-backdrop" aria-label="Close reviews" onClick={() => setTarget(null)} />
          <section className="ll-account-review-panel">
            <header className="ll-account-review-header">
              <div className="ll-account-review-identity">
                <div className="ll-account-review-avatar" aria-hidden="true">{target.photo ? <img src={target.photo} alt="" /> : <span>{initials(target.name)}</span>}</div>
                <div><small>{target.accountType}</small><h2>{target.name}</h2><p>{target.count && target.average !== null ? `★ ${target.average.toFixed(1)} from ${target.count} review${target.count === 1 ? "" : "s"}` : "No reviews yet"}</p></div>
              </div>
              <button type="button" className="ll-account-review-close" onClick={() => setTarget(null)} aria-label="Close">×</button>
            </header>

            <div className="ll-account-review-tabs" role="tablist" aria-label="Account review options">
              <button type="button" role="tab" aria-selected={reviewTab === "view"} onClick={() => { setReviewTab("view"); setReviewNotice(""); }}>View account reviews</button>
              <button type="button" role="tab" aria-selected={reviewTab === "write"} onClick={() => { setReviewTab("write"); setReviewNotice(""); }}>Write a review</button>
            </div>

            {reviewNotice ? <p className="ll-account-review-notice" role="status">{reviewNotice}</p> : null}

            {reviewTab === "view" ? (
              <div className="ll-account-review-list">
                {reviewsLoading ? <div className="ll-account-review-empty">Loading reviews…</div> : reviews.length ? reviews.map((review) => (
                  <article key={review.id} className="ll-account-review-card">
                    <div className="ll-account-review-card-top"><strong>{"★".repeat(Math.max(1, Math.min(5, review.rating)))}</strong><span>{new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(review.createdAt))}</span></div>
                    <p>{review.body || "Rating submitted without a written comment."}</p>
                    {review.response ? <div className="ll-account-review-response"><small>Account response</small><p>{review.response}</p></div> : null}
                  </article>
                )) : <div className="ll-account-review-empty"><strong>No reviews yet</strong><span>Be the first person to leave useful feedback about this account.</span></div>}
              </div>
            ) : (
              <div className="ll-account-review-write">
                <div className="ll-account-review-stars" aria-label="Choose a rating">
                  {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" aria-label={`${star} star${star === 1 ? "" : "s"}`} aria-pressed={star <= rating} onClick={() => setRating(star)}>★</button>)}
                </div>
                <label><span>Your experience</span><textarea maxLength={1200} value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder={target.dealershipId ? "Describe your experience with this dealership" : "Describe your experience (optional)"} /></label>
                <p className="ll-account-review-guidance">Keep reviews factual and relevant to your LoadLink interaction. Reviews are attached to the account, not just one post.</p>
                <button type="button" className="ll-account-review-submit" disabled={reviewBusy} onClick={() => void submitReview()}>{reviewBusy ? "Publishing…" : "Publish review"}</button>
              </div>
            )}
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
