"use client";

import { useEffect } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";

const ACTION_SELECTOR = [
  'a[href^="tel:"]',
  'a[href*="/chat"]',
  'a[href*="/message"]',
  'a[href*="/list-your"]',
  'a[href*="/post"]',
  '[data-auth-action]',
  '[data-marketplace-action]',
].join(",");

function clearRestrictionUi() {
  sessionStorage.removeItem("loadlink-marketplace-restricted");
  delete document.documentElement.dataset.loadlinkActionsHidden;
  document.querySelectorAll<HTMLElement>(ACTION_SELECTOR).forEach((element) => {
    if (element.dataset.loadlinkRestrictedHidden !== "true") return;
    element.hidden = false;
    element.removeAttribute("aria-hidden");
    delete element.dataset.loadlinkRestrictedHidden;
  });
}

function hideRestrictedActions() {
  document.querySelectorAll<HTMLElement>(ACTION_SELECTOR).forEach((element) => {
    element.dataset.loadlinkRestrictedHidden = "true";
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
  });
}

export default function MarketplaceRestrictionGuard() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      // A restriction belongs to an authenticated account, never to the browser forever.
      // Clear stale sessionStorage state when there is no current session so normal buttons
      // cannot remain hidden after sign-out, account switching or a failed network request.
      if (!token) {
        clearRestrictionUi();
        return;
      }

      let response: Response;
      try {
        response = await fetch("/api/phase2/capabilities", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        return;
      }
      if (!response.ok || cancelled) return;

      const capabilities = await response.json();
      if (cancelled) return;

      if (capabilities.hideActions || !capabilities.canLogin) {
        sessionStorage.setItem("loadlink-marketplace-restricted", "1");
        document.documentElement.dataset.loadlinkActionsHidden = "true";
        hideRestrictedActions();
        const timer = window.setTimeout(hideRestrictedActions, 200);
        await supabase.auth.signOut().catch(() => undefined);
        window.clearTimeout(timer);
        return;
      }

      clearRestrictionUi();
    };

    void run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
