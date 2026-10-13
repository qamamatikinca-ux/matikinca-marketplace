"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { showLoadLinkToast } from "@/components/LoadLinkToastCenter";

type Recommendation = { listing_id: string; title: string; reason: string; message: string };
type BoostRequest = { reference: string; amount_cents: number; status: string; duration_days: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ListingPerformance() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listingId, setListingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<BoostRequest | null>(null);
  const [error, setError] = useState("");
  const ownerRef = useRef("");
  const checkingRef = useRef(false);
  const shownRef = useRef(new Set<string>());
  const titleRef = useRef<HTMLHeadingElement>(null);

  const refresh = useCallback(async () => {
    if (checkingRef.current || !ownerRef.current || !navigator.onLine || document.visibilityState !== "visible") return;
    checkingRef.current = true;
    const owner = ownerRef.current;
    try {
      const { data, error: loadError } = await supabase.rpc("loadlink_get_my_listing_recommendations");
      if (loadError || owner !== ownerRef.current || !Array.isArray(data)) return;
      const item = (data as Recommendation[]).find((row) => !shownRef.current.has(`${owner}:${row.listing_id}`));
      if (!item) return;
      const key = `loadlink-listing-attention-v1:${owner}`;
      try { if (Date.now() - Number(sessionStorage.getItem(key) || 0) < 86400000) return; } catch {}
      shownRef.current.add(`${owner}:${item.listing_id}`);
      try { sessionStorage.setItem(key, String(Date.now())); } catch {}
      showLoadLinkToast({ id: `listing-attention:${item.listing_id}`, kind: "info", title: item.title, message: item.message,
        actionLabel: item.reason === "improve_details" ? "Review listing" : "Consider a boost",
        onAction: () => router.push(`/my-posts?${item.reason === "improve_details" ? "listing" : "boost"}=${item.listing_id}`), duration: 12000 });
    } finally { checkingRef.current = false; }
  }, [router]);

  useEffect(() => {
    let disposed = false;
    const bind = (id: string) => {
      if (disposed) return;
      if (!id || (ownerRef.current && ownerRef.current !== id)) { setListingId(""); setRequest(null); shownRef.current.clear(); }
      ownerRef.current = id;
      if (id) void refresh();
    };
    void supabase.auth.getSession().then(({ data }) => bind(data.session?.user.id || ""));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => bind(session?.user.id || ""), 0);
    });
    const timer = window.setInterval(() => void refresh(), 300000);
    const reconnect = () => void refresh();
    window.addEventListener("online", reconnect);
    window.addEventListener("loadlink-listing-updated", reconnect);
    return () => { disposed = true; ownerRef.current = ""; subscription.unsubscribe(); window.clearInterval(timer); window.removeEventListener("online", reconnect); window.removeEventListener("loadlink-listing-updated", reconnect); };
  }, [refresh]);

  useEffect(() => {
    const open = (event: Event) => {
      const id = String((event as CustomEvent<{ listingId?: string }>).detail?.listingId || "");
      if (UUID.test(id)) { setListingId(id); setRequest(null); setError(""); }
    };
    window.addEventListener("loadlink:boost-listing", open);
    if (pathname === "/my-posts") {
      const id = searchParams.get("boost") || "";
      if (UUID.test(id)) { setListingId(id); setRequest(null); setError(""); }
    }
    return () => window.removeEventListener("loadlink:boost-listing", open);
  }, [pathname, searchParams]);

  function close() {
    setListingId(""); setRequest(null); setError("");
    const url = new URL(window.location.href);
    if (url.searchParams.has("boost")) { url.searchParams.delete("boost"); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }
  }

  useEffect(() => {
    if (!listingId) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
      if (event.key === "Tab") {
        const buttons = titleRef.current?.closest("section")?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) return;
        if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === titleRef.current)) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [listingId, busy]);

  async function requestBoost() {
    if (busy) return;
    setBusy(true); setError("");
    const owner = ownerRef.current;
    try {
      const { data, error: requestError } = await supabase.rpc("loadlink_request_listing_boost", { p_listing_id: listingId });
      if (requestError) throw requestError;
      if (owner !== ownerRef.current) return;
      setRequest(data as BoostRequest);
      window.dispatchEvent(new Event("loadlink-listing-updated"));
    } catch (failure) { setError((failure as { message?: string })?.message || "The boost request could not be created. Try again."); }
    finally { setBusy(false); }
  }

  async function dismiss() {
    const { error: dismissError } = await supabase.rpc("loadlink_dismiss_listing_recommendation", { p_listing_id: listingId });
    if (dismissError) { setError("This reminder could not be paused. Please try again."); return; }
    close();
  }

  if (!listingId) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="listing-boost-title" className="fixed inset-0 z-[2147483500] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
    <section className="w-full max-w-md rounded-[24px] border border-[#f6b800]/30 bg-[#0b0b0b] p-6 text-white shadow-2xl">
      <h2 ref={titleRef} tabIndex={-1} id="listing-boost-title" className="text-2xl font-black">{request ? "Boost request saved" : "Boost your listing"}</h2>
      {request ? <>
        <p className="mt-3 text-sm leading-6 text-white/70">{request.status === "active" ? "Your promotion is already active." : "Your request is awaiting payment confirmation by LoadLink. Promotion starts after payment is confirmed."}</p>
        <p className="mt-4 break-all rounded-xl border border-white/15 p-3 text-xs">Payment reference: <strong>{request.reference}</strong><br />Amount: R{(request.amount_cents / 100).toFixed(2)}</p>
        <button onClick={close} type="button" className="mt-5 min-h-11 w-full rounded-xl bg-[#f6b800] font-black text-black">Done</button>
      </> : <>
        <p className="mt-3 text-sm leading-6 text-white/70">R14 for seven days in Promoted Listings. A boost increases placement; enquiries depend on your vehicle, price and listing details.</p>
        <p className="mt-2 text-xs leading-5 text-white/50">The boost is optional and separate from R15 daily Standard visibility. Creating a request does not charge your card.</p>
        <button onClick={() => void requestBoost()} disabled={busy} type="button" className="mt-5 min-h-12 w-full rounded-xl bg-[#f6b800] font-black text-black disabled:opacity-50">{busy ? "Saving…" : "Request boost · R14"}</button>
        <div className="mt-2 flex gap-2"><button onClick={() => void dismiss()} disabled={busy} type="button" className="min-h-11 flex-1 text-xs font-bold">Remind me in a week</button><button onClick={close} disabled={busy} type="button" className="min-h-11 flex-1 text-xs font-bold">Not now</button></div>
      </>}
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  </div>;
}
