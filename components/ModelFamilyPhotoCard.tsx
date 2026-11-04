"use client";

import { useEffect, useState } from "react";
import { modelFamilyPhoto } from "@/lib/modelFamilyPhoto";

type Props = {
  kind: "truck" | "bakkie";
  make: string;
  model: string;
  year?: number;
  darkMode: boolean;
  compact?: boolean;
};

export default function ModelFamilyPhotoCard({ kind, make, model, year, darkMode, compact = false }: Props) {
  const photo = modelFamilyPhoto(kind, make, model, year);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { setUnavailable(false); }, [photo?.src]);
  if (!photo) return null;
  return (
    <div className={[
      "overflow-hidden rounded-[18px] border",
      darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-[#f7f7f7]",
      compact ? "w-full" : "w-full",
    ].join(" ")}>
      <div className={compact ? "grid grid-cols-[110px_minmax(0,1fr)] items-center sm:grid-cols-[165px_minmax(0,1fr)]" : "grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center"}>
        <div className={compact ? "relative h-[108px] overflow-hidden bg-black/[.04] sm:h-[126px]" : "relative aspect-[16/9] overflow-hidden bg-black/[.04]"}>
          {!unavailable ? (
            <img
              key={photo.src}
              src={photo.src}
              alt={"Reference photo of " + photo.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setUnavailable(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <div role="status" className="flex h-full items-center justify-center px-3 text-center text-[11px] opacity-60">Model photo unavailable</div>
          )}
        </div>
        <div className={compact ? "min-w-0 px-4 py-3" : "min-w-0 px-4 py-4 sm:px-5"}>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] opacity-55">Model reference</p>
          <h3 className="mt-1 truncate text-base font-bold">{photo.name}</h3>
          <p className="mt-1 text-[11px] leading-5 opacity-60">{photo.caption}. Compare with the exact vehicle you are listing.</p>
        </div>
      </div>
    </div>
  );
}
