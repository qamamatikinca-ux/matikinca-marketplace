"use client";

import { useEffect, useRef, useState } from "react";
import LoadLinkImage from "@/components/LoadLinkImage";

export type PostingIntent = "transport" | "driver";

type Props = {
  value: PostingIntent | null;
  onChange: (value: PostingIntent) => void;
  darkMode: boolean;
};

/** Match the vehicle-type choices on List Your Vehicle, including image loading. */
function PostingCategoryPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = photoRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [src]);

  return (
    <span className="relative mb-3 block h-32 w-full overflow-hidden rounded-lg bg-white/[.045] sm:h-36">
      {!loaded ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-current/[.045]" /> : null}
      <LoadLinkImage
        ref={photoRef}
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 440px"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover object-center ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
    </span>
  );
}

const OPTIONS: ReadonlyArray<{
  id: PostingIntent;
  title: string;
  description: string;
  image: string;
  alt: string;
}> = [
  {
    id: "transport",
    title: "Transporter / Truck",
    description: "Need goods moved? Find a transport company with a truck to collect and deliver your load.",
    image: "/images/vehicle-types/truck.webp",
    alt: "Commercial freight truck",
  },
  {
    id: "driver",
    title: "Professional Driver",
    description: "Need someone to drive? Find a qualified driver to operate your own truck or fleet vehicle.",
    image: "/images/driver-profile-hero.jpg",
    alt: "Professional driver in a commercial truck cabin",
  },
];

export default function PostingIntentCards({ value, onChange, darkMode }: Props) {
  const muted = darkMode ? "text-white/55" : "text-black/55";
  return (
    <fieldset className="min-w-0">
      <legend className="text-xl font-bold tracking-[-.025em]">What are you looking for?</legend>
      <div className="ll-vehicle-type-choices mt-4 grid max-w-3xl gap-3 sm:grid-cols-2" data-loadlink-posting-intent-cards="true">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`ll-vehicle-type-card min-h-28 rounded-xl border px-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${darkMode ? "bg-black text-white" : "bg-[#faf8f2] text-black"} ${selected ? darkMode ? "border-white ring-1 ring-white" : "border-black ring-1 ring-black" : darkMode ? "border-white/15" : "border-black/10"}`}
            >
              <PostingCategoryPhoto src={option.image} alt={option.alt} />
              <span className="flex items-center justify-between gap-2">
                <span className="block text-base font-bold">{option.title}</span>
                {selected ? <span className="text-xs font-semibold opacity-65" aria-label="Selected">✓</span> : null}
              </span>
              <span className={`mt-2 block text-xs leading-5 ${muted}`}>{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
