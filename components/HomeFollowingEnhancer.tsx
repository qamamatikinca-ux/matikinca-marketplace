"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const UPDATE_BUTTON_ID = "loadlink-home-updates-tab";

export default function HomeFollowingEnhancer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/" || !isSupabaseConfigured) return;
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let allButton: HTMLButtonElement | null = null;

    const goFollowing = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      router.push("/following");
    };

    const goUpdates = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      router.push("/following?view=updates");
    };

    function applyFollowingNavigation() {
      if (cancelled) return;
      const section = document.querySelector<HTMLElement>("[data-loadlink-home-search-section]");
      const tabRow = section?.querySelector<HTMLDivElement>(".no-scrollbar > .flex");
      if (!tabRow) return;

      const buttons = Array.from(tabRow.querySelectorAll<HTMLButtonElement>("button"));
      const candidate = buttons.find((button) => button.dataset.loadlinkFollowingTab === "true" || button.textContent?.trim() === "All");
      if (!candidate) return;

      if (allButton && allButton !== candidate) allButton.removeEventListener("click", goFollowing, true);
      allButton = candidate;
      candidate.dataset.loadlinkFollowingTab = "true";
      candidate.textContent = "Following";
      candidate.setAttribute("aria-label", "View followed dealerships");
      candidate.removeEventListener("click", goFollowing, true);
      candidate.addEventListener("click", goFollowing, true);

      let updates = document.getElementById(UPDATE_BUTTON_ID) as HTMLButtonElement | null;
      if (!updates) {
        updates = document.createElement("button");
        updates.id = UPDATE_BUTTON_ID;
        updates.type = "button";
        updates.textContent = "Updates";
        updates.className = candidate.className.replace(/border-\[#f6b800\][^\"]*?shadow-\[[^\]]+\]/g, "");
        updates.classList.remove("bg-[#f6b800]", "text-black");
        updates.classList.add("border-black/[.16]", "bg-white/68", "text-black/66");
        updates.setAttribute("aria-label", "Updates from followed dealerships");
        updates.addEventListener("click", goUpdates, true);
        candidate.insertAdjacentElement("afterend", updates);
      }
    }

    async function initialise() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data, error } = await supabase
        .from("dealership_followers")
        .select("dealership_id")
        .eq("user_id", user.id)
        .limit(1);
      if (cancelled || error || !data?.length) return;

      applyFollowingNavigation();
      observer = new MutationObserver(applyFollowingNavigation);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    void initialise();
    return () => {
      cancelled = true;
      observer?.disconnect();
      allButton?.removeEventListener("click", goFollowing, true);
      const updates = document.getElementById(UPDATE_BUTTON_ID);
      updates?.removeEventListener("click", goUpdates, true);
      updates?.remove();
    };
  }, [pathname, router]);

  return null;
}
