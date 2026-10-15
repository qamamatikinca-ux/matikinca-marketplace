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

export default function LoadLinkImage({ src, srcSet, sizes, loading, decoding, onLoad, onError, ref, ...rest }: Props) {
  const value = typeof src === "string" ? src : "";
  const imageRef = useRef<HTMLImageElement>(null);
  const [recovery, setRecovery] = useState<{ source: string; stage: "original" | "fallback" | "hidden" } | null>(null);
  const [loadedSource, setLoadedSource] = useState("");
  const stage = recovery?.source === value ? recovery.stage : null;
  useImperativeHandle(ref, () => imageRef.current!, []);
  const critical = /logo|avatar|profile|hero/i.test(`${rest.alt || ""} ${rest.className || ""}`);
  let delivery: Pick<Props, "src" | "srcSet" | "sizes"> = { src: value || undefined, srcSet, sizes };
  if (value && !srcSet && canOptimize(value)) {
    const compact = /(?:h|w)-(?:8|9|10|11|12|14|16)(?:\s|$)/.test(rest.className || "") || /avatar|profile/i.test(rest.alt || "");
    const optimized = getImageProps({ src: value, alt: rest.alt || "", width: 1200, height: 900, quality: 75, sizes: sizes || (compact ? "96px" : "(max-width: 767px) 100vw, 50vw") }).props;
    // Preserve the caller's geometry; only src/srcSet/sizes control delivery.
    delivery = { src: optimized.src, srcSet: optimized.srcSet, sizes: optimized.sizes };
  }
  const optimized = delivery.src !== value;
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
