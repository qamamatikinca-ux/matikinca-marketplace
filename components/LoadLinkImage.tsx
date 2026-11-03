"use client";

import { getImageProps } from "next/image";
import { useImperativeHandle, useLayoutEffect, useRef, useState, type ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"img">;
function canOptimize(src: string) {
  if (/\.(svg|gif)(?:[?#]|$)/i.test(src)) return false;
  if (src.startsWith("/images/") || src.startsWith("/api/truck-model-photo/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "cqmjgulfbbwxyecsnzed.supabase.co" && url.pathname.startsWith("/storage/v1/object/public/");
  } catch { return false; }
}
const UNAVAILABLE_IMAGE = "/images/image-unavailable.svg";
const imageDeliveryCache = new Map<string, Pick<Props, "src" | "srcSet" | "sizes">>();
const IMAGE_DELIVERY_CACHE_LIMIT = 96;

// Pure metadata cache keeps repeated image sizing cheap, including test and SSR calls.
function getOptimizedDelivery(value: string, srcSet: string | undefined, sizes: string | undefined, alt: string, className: string) {
  if (!value || srcSet || !canOptimize(value)) return { src: value || undefined, srcSet, sizes };
  const compact = /(?:h|w)-(?:8|9|10|11|12|14|16)(?:\s|$)/.test(className) || /avatar|profile/i.test(alt);
  const sizeHint = sizes || (compact ? "96px" : "(max-width: 767px) 100vw, 50vw");
  const key = JSON.stringify([value, sizeHint]);
  const cached = imageDeliveryCache.get(key);
  if (cached) return cached;
  const props = getImageProps({ src: value, alt, width: 1200, height: 900, quality: 75, sizes: sizeHint }).props;
  const delivery = { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
  if (imageDeliveryCache.size >= IMAGE_DELIVERY_CACHE_LIMIT) {
    const oldest = imageDeliveryCache.keys().next().value;
    if (oldest) imageDeliveryCache.delete(oldest);
  }
  imageDeliveryCache.set(key, delivery);
  return delivery;
}


export default function LoadLinkImage({ src, srcSet, sizes, loading, decoding, onLoad, onError, ref, ...rest }: Props) {
  const value = typeof src === "string" ? src : "";
  const imageRef = useRef<HTMLImageElement>(null);
  const [recovery, setRecovery] = useState<{ source: string; stage: "original" | "fallback" | "hidden" } | null>(null);
  const [loadedSource, setLoadedSource] = useState("");
  const stage = recovery?.source === value ? recovery.stage : null;
  useImperativeHandle(ref, () => imageRef.current!, []);
  const critical = /logo|avatar|profile|hero/i.test(`${rest.alt || ""} ${rest.className || ""}`);
  // Avoid re-deriving responsive srcset values for every marketplace filter render.
  const stableDelivery = getOptimizedDelivery(value, srcSet, sizes, rest.alt || "", rest.className || "");
  let delivery = stableDelivery;
  const optimized = stableDelivery.src !== value;
  if (stage === "original") delivery = { src: value };
  if (stage === "fallback") delivery = { src: UNAVAILABLE_IMAGE };
  const sourceKey = `${value}|${stage || "optimized"}`;

  function recover() {
    if (!value || stage === "hidden") return;
    setLoadedSource("");
    const decorative = /logo|icon|badge|avatar|profile/i.test(`${rest.alt || ""} ${rest.className || ""}`);
    setRecovery({ source: value, stage: !stage && optimized ? "original" : !decorative && stage !== "fallback" && value !== UNAVAILABLE_IMAGE ? "fallback" : "hidden" });
  }

  useLayoutEffect(() => {
    const image = imageRef.current;
    // Cached images can finish before React attaches onLoad/onError.
    if (!image?.complete || !value || stage === "hidden") return;
    if (image.naturalWidth > 0) setLoadedSource(sourceKey);
    else recover();
  }, [sourceKey]);

  return <img {...rest} {...delivery} ref={imageRef}
    data-loadlink-managed-image="true"
    data-loadlink-image-state={stage === "hidden" ? "unavailable" : loadedSource === sourceKey ? "ready" : "pending"}
    data-loadlink-original-src={value || undefined}
    loading={loading || (critical ? "eager" : "lazy")} decoding={decoding || "async"}
    onLoad={(event) => { if (event.currentTarget.naturalWidth > 0) setLoadedSource(sourceKey); onLoad?.(event); }}
    onError={(event) => {
      const image = event.currentTarget;
      const before = image.src;
      onError?.(event);
      if (image.src === before) recover();
    }}
  />;
}
