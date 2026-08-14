"use client";

import { useEffect } from "react";
import { showLoadLinkToast } from "@/components/LoadLinkToastCenter";

function cleanText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function getListingContext(button: HTMLButtonElement) {
  const article = button.closest<HTMLElement>('article[id^="job-"]');
  if (!article) return null;

  const rawId = article.id.replace(/^job-/, "");
  const listingAnchor = article.querySelector<HTMLAnchorElement>('a[href^="/listing/"]');
  const url = listingAnchor?.href || `${window.location.origin}/listing/${encodeURIComponent(rawId)}`;
  const heading = article.querySelector<HTMLElement>("h1,h2,h3,h4");
  const title = cleanText(heading?.textContent) || "this listing";

  const possiblePosterText = Array.from(article.querySelectorAll<HTMLElement>("p,span,strong,small"))
    .map((element) => cleanText(element.textContent))
    .find((text) => /^posted\s+by\b/i.test(text));
  const postedBy = cleanText(possiblePosterText?.replace(/^posted\s+by\s*/i, "").split("•")[0]) || "";

  return { title, postedBy, url };
}

async function shareListing(context: { title: string; postedBy: string; url: string }) {
  const titlePart = context.title === "this listing" ? "this listing" : `“${context.title}”`;
  const posterPart = context.postedBy ? `, posted by ${context.postedBy}` : "";
  const text = `This caught my eye on LoadLink — ${titlePart}${posterPart}. Thought it was worth sending your way.`;
  const shareData = { title: `${context.title} | LoadLink`, text, url: context.url };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${context.url}`);
    showLoadLinkToast({
      kind: "success",
      title: "Share message copied",
      message: "Paste it into WhatsApp, Messages or anywhere you want to send this LoadLink find.",
      duration: 4300,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    try {
      await navigator.clipboard.writeText(`${text}\n${context.url}`);
      showLoadLinkToast({
        kind: "success",
        title: "Share message copied",
        message: "The full LoadLink message and listing link are ready to paste.",
        duration: 4300,
      });
    } catch {
      showLoadLinkToast({
        kind: "error",
        title: "Couldn’t open sharing",
        message: "Please try the Share button again.",
        duration: 3800,
      });
    }
  }
}

export default function LoadLinkShareEnhancer() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>("button");
      if (!button || cleanText(button.textContent).toLowerCase() !== "share") return;

      const context = getListingContext(button);
      if (!context) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void shareListing(context);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
