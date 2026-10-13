import { getImageProps } from "next/image";
import type { ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"img">;
function canOptimize(src: string) {
  if (/\.(svg|gif)(?:[?#]|$)/i.test(src)) return false;
  if (src.startsWith("/images/") || src.startsWith("/api/truck-model-photo/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "cqmjgulfbbwxyecsnzed.supabase.co" && url.pathname.startsWith("/storage/v1/object/public/");
  } catch { return false; }
}
export default function LoadLinkImage({ src, srcSet, sizes, loading, decoding, ...rest }: Props) {
  const value = typeof src === "string" ? src : "";
  const critical = /logo|avatar|profile|hero/i.test(`${rest.alt || ""} ${rest.className || ""}`);
  let delivery: Pick<Props, "src" | "srcSet" | "sizes"> = { src: value || undefined, srcSet, sizes };
  if (value && !srcSet && canOptimize(value)) {
    const compact = /(?:h|w)-(?:8|9|10|11|12|14|16)(?:\s|$)/.test(rest.className || "") || /avatar|profile/i.test(rest.alt || "");
    const optimized = getImageProps({ src: value, alt: rest.alt || "", width: 1200, height: 900, quality: 75, sizes: sizes || (compact ? "96px" : "(max-width: 767px) 100vw, 50vw") }).props;
    // Preserve the caller's geometry; only src/srcSet/sizes control delivery.
    delivery = { src: optimized.src, srcSet: optimized.srcSet, sizes: optimized.sizes };
  }
  return <img {...rest} {...delivery} data-loadlink-original-src={value || undefined} loading={loading || (critical ? "eager" : "lazy")} decoding={decoding || "async"} />;
}
