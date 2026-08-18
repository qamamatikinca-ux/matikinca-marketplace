"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const FOLLOWED_RAIL_ID = "loadlink-home-followed-dealers";

type FollowedDealer = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  hasStatus: boolean;
};

export default function HomeFollowingEnhancer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/" || !isSupabaseConfigured) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let allButton: HTMLButtonElement | null = null;
    let dealers: FollowedDealer[] = [];

    function makeAvatar(dealer: FollowedDealer) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "group flex w-[58px] shrink-0 flex-col items-center gap-1 text-center";
      button.setAttribute("aria-label", dealer.hasStatus ? `View ${dealer.name} status` : `Open ${dealer.name} dealership`);

      const ring = document.createElement("span");
      ring.className = `flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 p-[2px] transition active:scale-[.96] ${
        dealer.hasStatus ? "border-[#f6b800] shadow-[0_7px_18px_rgba(246,184,0,.18)]" : "border-current/15"
      }`;

      const avatar = document.createElement("span");
      avatar.className = "flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-current/10 bg-[#111] text-[9px] font-black uppercase text-[#f6b800]";
      if (dealer.profile_image_url) {
        const image = document.createElement("img");
        image.src = dealer.profile_image_url;
        image.alt = "";
        image.loading = "lazy";
        image.className = "h-full w-full object-cover";
        avatar.appendChild(image);
      } else {
        avatar.textContent = dealer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").slice(0, 2) || "LL";
      }

      const name = document.createElement("span");
      name.className = "block w-full truncate text-[9px] font-bold leading-3 opacity-55";
      name.textContent = dealer.name;

      ring.appendChild(avatar);
      button.append(ring, name);
      button.addEventListener("click", () => {
        router.push(`/dealership/${encodeURIComponent(dealer.slug)}${dealer.hasStatus ? "?status=1" : ""}`);
      });
      return button;
    }

    function applyFollowingAvatars() {
      if (cancelled || !dealers.length) return;
      const section = document.querySelector<HTMLElement>("[data-loadlink-home-search-section]");
      const tabRow = section?.querySelector<HTMLDivElement>(".no-scrollbar > .flex");
      if (!tabRow) return;

      const buttons = Array.from(tabRow.querySelectorAll<HTMLButtonElement>("button"));
      const candidate = buttons.find((button) => button.textContent?.trim() === "All");
      if (candidate) {
        allButton = candidate;
        candidate.style.display = "none";
        candidate.setAttribute("aria-hidden", "true");
        candidate.tabIndex = -1;
      }

      const existing = document.getElementById(FOLLOWED_RAIL_ID);
      if (existing?.parentElement === tabRow) return;
      existing?.remove();

      const rail = document.createElement("div");
      rail.id = FOLLOWED_RAIL_ID;
      rail.className = "flex shrink-0 items-start gap-2 pr-1";
      rail.setAttribute("aria-label", "Followed dealerships");
      dealers.forEach((dealer) => rail.appendChild(makeAvatar(dealer)));

      if (candidate) candidate.insertAdjacentElement("afterend", rail);
      else tabRow.prepend(rail);
    }

    async function initialise() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { data: follows, error: followsError } = await supabase
        .from("dealership_followers")
        .select("dealership_id")
        .eq("user_id", user.id)
        .limit(8);
      if (cancelled || followsError || !follows?.length) return;

      const ids = [...new Set(follows.map((row) => String(row.dealership_id || "")).filter(Boolean))];
      if (!ids.length) return;

      const now = new Date().toISOString();
      const [profilesResult, statusesResult] = await Promise.all([
        supabase
          .from("public_dealership_profiles")
          .select("id,slug,name,profile_image_url")
          .in("id", ids),
        supabase
          .from("public_dealership_statuses")
          .select("dealership_id,expires_at")
          .in("dealership_id", ids)
          .gt("expires_at", now),
      ]);
      if (cancelled || profilesResult.error) return;

      const liveDealers = new Set((statusesResult.data || []).map((row) => String(row.dealership_id)));
      const profileById = new Map((profilesResult.data || []).map((profile) => [String(profile.id), profile]));
      dealers = ids.flatMap((id) => {
        const profile = profileById.get(id);
        if (!profile?.slug || !profile?.name) return [];
        return [{
          id,
          slug: String(profile.slug),
          name: String(profile.name),
          profile_image_url: profile.profile_image_url ? String(profile.profile_image_url) : null,
          hasStatus: liveDealers.has(id),
        } satisfies FollowedDealer];
      });
      if (!dealers.length) return;

      applyFollowingAvatars();
      observer = new MutationObserver(applyFollowingAvatars);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    void initialise();
    return () => {
      cancelled = true;
      observer?.disconnect();
      document.getElementById(FOLLOWED_RAIL_ID)?.remove();
      if (allButton) {
        allButton.style.display = "";
        allButton.removeAttribute("aria-hidden");
        allButton.tabIndex = 0;
      }
    };
  }, [pathname, router]);

  return null;
}
