"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Status = "not_started" | "phone_verified" | "pending" | "verified" | "rejected";

const STATUS_COPY: Record<Status, { title: string; body: string; step: number }> = {
  not_started: { title: "Not started", body: "Submit your cellphone number and identity details to begin.", step: 0 },
  phone_verified: { title: "Phone verified", body: "Your cellphone number is confirmed. Complete the identity step to finish your application.", step: 1 },
  pending: { title: "Pending review", body: "Your verification is with LoadLink for review. This page updates automatically when a decision is made.", step: 2 },
  verified: { title: "Verified", body: "Your identity has been approved. Your account can now display the LoadLink Verified badge.", step: 3 },
  rejected: { title: "Needs attention", body: "Your submission needs an update before it can be approved.", step: 2 },
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
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const actionLabel = status === "pending" ? "Review submitted details" : status === "rejected" ? "Update verification" : "Start or update verification";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="relative mx-auto flex h-[76px] max-w-6xl items-center px-4 sm:px-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-5"><SiteMenu darkMode={darkMode} /></div>
          <HomeLogoLink theme="auto" showGlow={false} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[132px] sm:w-[148px]" />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-7 sm:px-5 md:py-10">
        <div className="mb-5"><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#b98300] dark:text-[#f6b800]">Account verification</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Verification status</h1><p className={`mt-2 text-sm font-semibold ${muted}`}>One clear place to see what LoadLink still needs from you.</p></div>

        <section className={`overflow-hidden rounded-[28px] border shadow-[0_18px_55px_rgba(0,0,0,.08)] ${card}`}>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b98300] dark:text-[#f6b800]">Current status</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">{loading ? "Checking…" : copy.title}</h2>
                <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{loading ? "Securely loading the latest verification result." : status === "rejected" && reason ? reason : copy.body}</p>
              </div>
              {!loading ? <StatusMark status={status} /> : <div className="h-11 w-11 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />}
            </div>

            <div className={`mt-7 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.015]"}`}>
              <div className="grid grid-cols-3 gap-2">
                {[[1,"Phone"],[2,"Identity"],[3,"Review"]].map(([number,label], index) => {
                  const reached = copy.step >= index + 1 || status === "verified";
                  const current = !loading && ((status === "not_started" && index === 0) || (status === "phone_verified" && index === 1) || ((status === "pending" || status === "rejected") && index === 2));
                  return <div key={String(label)} className="min-w-0 text-center"><div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black ${reached ? "border-[#f6b800] bg-[#f6b800] text-black" : current ? "border-[#f6b800] text-[#c18d00] dark:text-[#f6b800]" : darkMode ? "border-white/12 text-white/30" : "border-black/12 text-black/30"}`}>{reached && !current ? "✓" : number}</div><p className={`mt-2 truncate text-[10px] font-black uppercase tracking-[.08em] ${reached || current ? "opacity-80" : "opacity-35"}`}>{label}</p></div>;
                })}
              </div>
            </div>

            {!loading && status === "verified" ? <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.07] p-4"><p className="text-sm font-black text-emerald-500">Verification complete</p><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>No further identity action is required right now.</p></div> : null}

            {!loading && status !== "verified" ? <Link href="/verify" className="mt-6 flex h-13 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.16)]">{actionLabel}</Link> : null}
            <Link href="/" className={`mt-3 flex h-12 items-center justify-center rounded-2xl border text-sm font-black ${darkMode ? "border-white/12 text-white/75" : "border-black/12 text-black/75"}`}>Return home</Link>
          </div>
          <div className={`border-t px-5 py-4 text-xs font-semibold leading-5 sm:px-7 ${darkMode ? "border-white/10 bg-black text-white/42" : "border-black/10 bg-[#faf8f2] text-black/48"}`}>Status refreshes automatically. You do not need to keep this page open while LoadLink reviews your submission.</div>
        </section>
      </section>
    </main>
  );
}

function StatusMark({ status }: { status: Status }) {
  const verified = status === "verified";
  const rejected = status === "rejected";
  return <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg font-black ${verified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : rejected ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-[#f6b800]/35 bg-[#f6b800]/10 text-[#c18d00] dark:text-[#f6b800]"}`}>{verified ? "✓" : rejected ? "!" : "•"}</div>;
}
