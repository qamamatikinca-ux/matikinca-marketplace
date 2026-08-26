"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

function listingIdFromCard(card: HTMLElement) {
  const link = card.querySelector<HTMLAnchorElement>('a[href^="/listing/"]');
  const match = link?.getAttribute("href")?.match(/^\/listing\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function styleCancelledBadge(node: HTMLElement) {
  if (node.dataset.loadlinkCancelledBadge === "true") return;
  node.dataset.loadlinkCancelledBadge = "true";
  node.textContent = "Cancelled";
  node.style.borderRadius = "8px";
  node.style.background = "rgba(239,68,68,.10)";
  node.style.color = "rgb(239 68 68)";
  node.style.border = "1px solid rgba(239,68,68,.22)";
  node.style.boxShadow = "none";
}

function cancelledBadges(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("span").forEach((node) => {
    if ((node.textContent || "").trim() === "Closed") styleCancelledBadge(node);
  });
}

export default function MyPostsCancellationEnhancer() {
  useEffect(() => {
    let busy = false;

    const enhance = () => {
      cancelledBadges(document);

      document.querySelectorAll<HTMLDetailsElement>('details').forEach((details) => {
        if (details.dataset.loadlinkCancelReady === "true") return;
        const summary = details.querySelector<HTMLElement>('summary[aria-label="More post actions"]');
        if (!summary) return;
        const menu = details.querySelector<HTMLElement>(":scope > div");
        const card = details.closest<HTMLElement>("article");
        if (!menu || !card || !/Mark as filled/i.test(menu.textContent || "")) return;
        const listingId = listingIdFromCard(card);
        if (!listingId) return;

        details.dataset.loadlinkCancelReady = "true";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.dataset.loadlinkCancelListing = "true";
        cancel.className = "block w-full border-t border-red-500/20 px-4 py-3 text-left text-xs font-black text-red-500";
        cancel.textContent = "Cancel listing";
        cancel.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (busy) return;
          if (!window.confirm("Cancel this listing? It will be removed from active results and can be reopened later.")) return;
          busy = true;
          cancel.disabled = true;
          cancel.textContent = "Cancelling…";
          try {
            const result = await supabase.rpc("set_my_listing_status", {
              p_listing_id: listingId,
              p_status: "closed",
              p_owner_key: "",
            });
            if (result.error || result.data !== true) throw result.error || new Error("The listing could not be cancelled.");
            window.location.reload();
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "The listing could not be cancelled.");
            cancel.disabled = false;
            cancel.textContent = "Cancel listing";
            busy = false;
          }
        });

        const deleteButton = Array.from(menu.querySelectorAll<HTMLButtonElement>("button")).find((button) => /Delete post/i.test(button.textContent || ""));
        if (deleteButton) menu.insertBefore(cancel, deleteButton);
        else menu.appendChild(cancel);
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
