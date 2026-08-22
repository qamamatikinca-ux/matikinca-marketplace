"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  dealershipId?: string | null;
  dealershipSlug?: string | null;
  dealershipName?: string | null;
  darkMode: boolean;
};

export default function DealershipListingActions20260822({ dealershipId, dealershipSlug, dealershipName, darkMode }: Props) {
  const [userId, setUserId] = useState("");
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!dealershipId) { if (active) setReady(true); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      const uid = auth.user?.id || "";
      setUserId(uid);
      if (uid) {
        const result = await supabase
          .from("dealership_followers")
          .select("dealership_id")
          .eq("dealership_id", dealershipId)
          .eq("user_id", uid)
          .maybeSingle();
        if (active && !result.error) setFollowing(Boolean(result.data));
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [dealershipId]);

  if (!dealershipId || !dealershipSlug) return null;

  const showroomHref = `/dealership/${encodeURIComponent(dealershipSlug)}`;
  const border = darkMode ? "border-white/12" : "border-black/10";

  async function toggleFollow() {
    if (busy) return;
    if (!userId) {
      const returnTo = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}${window.location.hash}` : showroomHref;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    setBusy(true);
    try {
      if (following) {
        const result = await supabase
          .from("dealership_followers")
          .delete()
          .eq("dealership_id", dealershipId)
          .eq("user_id", userId);
        if (result.error) throw result.error;
        setFollowing(false);
      } else {
        const result = await supabase
          .from("dealership_followers")
          .insert({ dealership_id: dealershipId, user_id: userId });
        if (result.error && result.error.code !== "23505") throw result.error;
        setFollowing(true);
      }
      window.dispatchEvent(new CustomEvent("loadlink-dealership-follow-changed", { detail: { dealershipId, following: !following } }));
    } catch {
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "error", title: "Follow not updated", message: "LoadLink could not change this dealership follow right now. Try again.", duration: 4800 } }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mt-4 border-t pt-4 ${border}`} data-loadlink-dealership-card-actions="true">
      {dealershipName ? <p className="mb-3 truncate text-[11px] font-black">{dealershipName}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleFollow()}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition active:scale-[.985] disabled:opacity-55 ${following ? `${border} ${darkMode ? "bg-white/[.05]" : "bg-black/[.03]"}` : "border-[#f6b800] bg-[#f6b800] text-black"}`}
          aria-label={`${following ? "Unfollow" : "Follow"} ${dealershipName || "dealership"}`}
        >
          {busy ? "Updating…" : ready && following ? "Following" : "Follow"}
        </button>
        <Link
          href={showroomHref}
          className={`flex min-h-11 items-center justify-center rounded-xl border px-3 text-center text-xs font-black ${border}`}
          aria-label={`Take me to ${dealershipName || "dealership"} showroom`}
        >
          Take me to showroom
        </Link>
      </div>
    </div>
  );
}
