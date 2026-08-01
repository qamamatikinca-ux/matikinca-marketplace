"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FollowedProfile } from "@/lib/following";
import { getFollowedProfiles, mergeFollowedProfiles } from "@/lib/following";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

function typeLabel(type: FollowedProfile["type"]) {
  if (type === "dealership") return "Dealership";
  if (type === "contractor") return "Contractor";
  if (type === "opportunity_poster") return "Opportunity poster";
  return "LoadLink user";
}

export default function FollowedNetwork({ darkMode }: { darkMode: boolean }) {
  const [profiles, setProfiles] = useState<FollowedProfile[]>([]);

  useEffect(() => {
    let active = true;
    const sync = () => {
      try {
        setProfiles(getFollowedProfiles());
      } catch {
        setProfiles([]);
      }
    };

    sync();
    window.addEventListener("loadlink-following-changed", sync);
    window.addEventListener("storage", sync);

    async function syncCloudFollowing() {
      if (!isSupabaseConfigured) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!active || !sessionData.session?.user?.id) return;

        const { data: rows, error } = await supabase
          .from("loadlink_profile_follows")
          .select("target_type,target_id,target_name,target_href,target_location,target_image,notify_new_listings,notify_updates,notify_price_changes,created_at")
          .order("created_at", { ascending: false });

        if (!active || error || !rows?.length) return;
        mergeFollowedProfiles(rows.map((row) => ({
          id: String(row.target_id),
          type: row.target_type as FollowedProfile["type"],
          name: String(row.target_name),
          href: String(row.target_href),
          location: row.target_location ? String(row.target_location) : undefined,
          image: row.target_image ? String(row.target_image) : undefined,
          preferences: {
            newListings: Boolean(row.notify_new_listings),
            updates: Boolean(row.notify_updates),
            priceChanges: Boolean(row.notify_price_changes),
          },
          followedAt: String(row.created_at || new Date().toISOString()),
        })));
        sync();
      } catch {
        // Local following remains available when the cloud request is unavailable.
      }
    }

    void syncCloudFollowing();

    return () => {
      active = false;
      window.removeEventListener("loadlink-following-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visible = useMemo(() => profiles.slice(0, 6), [profiles]);
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <section id="followed-network" className={`px-5 py-12 md:px-12 md:py-16 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-4xl font-black tracking-[-.045em] md:text-5xl">Your LoadLink network</h2>
            <p className={`mt-3 max-w-2xl text-sm leading-7 md:text-base ${muted}`}>Dealerships, contractors and logistics opportunity posters you follow appear here with the updates you selected.</p>
          </div>
          <Link href="/jobs" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-[#9b7100]">Discover profiles</Link>
        </div>

        {visible.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((profile) => (
              <Link key={`${profile.type}-${profile.id}`} href={profile.href} className={`group overflow-hidden rounded-[24px] border ${surface}`}>
                <div className="relative aspect-[16/9] overflow-hidden bg-black">
                  <img src={profile.image || "/images/jobs/jobs-hero-fleet.jpg"} alt="" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black">{typeLabel(profile.type)}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-black">{profile.name}</h3>
                  <p className={`mt-1 text-xs font-semibold ${muted}`}>{profile.location || "South Africa"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.preferences.newListings ? <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${darkMode ? "border-white/15" : "border-black/10"}`}>New listings</span> : null}
                    {profile.preferences.updates ? <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${darkMode ? "border-white/15" : "border-black/10"}`}>Updates</span> : null}
                    {profile.preferences.priceChanges ? <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${darkMode ? "border-white/15" : "border-black/10"}`}>Price changes</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`mt-7 grid gap-5 rounded-[26px] border p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7 ${surface}`}>
            <div>
              <h3 className="text-2xl font-black">No followed profiles yet</h3>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>Follow a dealership, contractor or logistics opportunity poster and choose the updates you want to receive.</p>
            </div>
            <Link href="/dealership/loadlink-commercial-centurion" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-black">View featured dealership</Link>
          </div>
        )}
      </div>
    </section>
  );
}
