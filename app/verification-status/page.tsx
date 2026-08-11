"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Status = "not_started" | "phone_verified" | "pending" | "verified" | "rejected";

const STATUS_COPY: Record<Status, { title: string; step: number }> = {
  not_started: { title: "Not started", step: 0 },
  phone_verified: { title: "Phone verified", step: 1 },
  pending: { title: "Pending review", step: 2 },
  verified: { title: "Verified", step: 3 },
  rejected: { title: "Update required", step: 2 },
};

export default function VerificationStatusPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [status, setStatus] = useState<Status>("not_started");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("verification_requests").select("status,rejection_reason").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setStatus((data?.status || "not_started") as Status);
      setReason(data?.rejection_reason || "");
      setLoading(false);
      if (!channel) {
        channel = supabase.channel(`verification-${user.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "verification_requests", filter: `user_id=eq.${user.id}` }, (payload) => {
          const next = payload.new as { status?: string; rejection_reason?: string | null };
          setStatus((next.status || "not_started") as Status);
          setReason(next.rejection_reason || "");
        }).subscribe();
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const copy = useMemo(() => STATUS_COPY[status], [status]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const actionLabel = status === "pending" ? "View submitted details" : status === "rejected" ? "Update verification" : "Start verification";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-3xl px-4 py-7 sm:px-5 md:py-10">
        <h1 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">Verification status</h1>

        <section className={`mt-5 overflow-hidden rounded-[26px] border shadow-[0_16px_45px_rgba(0,0,0,.07)] ${card}`}>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">{loading ? "Checking…" : copy.title}</h2>
                {!loading && status === "rejected" && reason ? <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{reason}</p> : null}
              </div>
              {!loading ? <StatusMark status={status} /> : <div className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />}
            </div>

            <div className={`mt-6 grid grid-cols-3 gap-3 border-t pt-5 ${darkMode ? "border-white/10" : "border-black/10"}`} aria-label="Verification progress">
              {[[1, "Phone"], [2, "Identity"], [3, "Review"]].map(([number, label], index) => {
                const reached = copy.step >= index + 1 || status === "verified";
                return (
                  <div key={String(label)} className="text-center">
                    <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black ${reached ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 text-white/30" : "border-black/12 text-black/30"}`}>{reached ? "✓" : number}</div>
                    <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[.08em] ${reached ? "opacity-75" : "opacity-35"}`}>{label}</p>
                  </div>
                );
              })}
            </div>

            {!loading && status !== "verified" ? <Link href="/verify" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-center text-sm font-semibold text-black">{actionLabel}</Link> : null}
            <Link href="/" className={`mt-3 flex h-11 items-center justify-center rounded-xl border text-sm font-semibold ${darkMode ? "border-white/12 text-white/70" : "border-black/12 text-black/70"}`}>Return home</Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusMark({ status }: { status: Status }) {
  const verified = status === "verified";
  const rejected = status === "rejected";
  return <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-black ${verified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : rejected ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-current/15 opacity-60"}`}>{verified ? "✓" : rejected ? "!" : "•"}</div>;
}
