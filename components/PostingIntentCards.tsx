"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

export type PostingIntent = "transport" | "driver" | "specialist";

type Props = {
  value: PostingIntent;
  onChange: (value: PostingIntent) => void;
  darkMode: boolean;
};

const OPTIONS: Array<{
  id: PostingIntent;
  title: string;
  description: string;
  image: string;
  alt: string;
}> = [
  {
    id: "transport",
    title: "Move goods with a truck",
    description: "Find a transporter with the right truck to collect and deliver your goods.",
    image: "/images/jobs/jobs-hero-fleet.jpg",
    alt: "Commercial freight trucks ready for transport work",
  },
  {
    id: "driver",
    title: "Find a professional driver",
    description: "Find a qualified driver to operate a vehicle. You do not need to hire a truck.",
    image: "/images/driver-profile-hero.jpg",
    alt: "Professional truck driver seated inside a truck cabin",
  },
  {
    id: "specialist",
    title: "Find equipment or a service",
    description: "Request specialist equipment or services for your operation.",
    image: "/images/jobs/list-job-forklift.jpg",
    alt: "Forklift loading a transport trailer at an industrial yard",
  },
];

export default function PostingIntentCards({ value, onChange, darkMode }: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-black">What do you need?</legend>
      <p className={`mb-4 text-xs font-medium leading-5 ${darkMode ? "text-white/70" : "text-black/65"}`}>
        Select one option to see the right questions. You can change your selection before posting.
      </p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-3" data-loadlink-posting-intent-cards="true">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`group min-w-0 overflow-hidden rounded-[20px] border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6b800] ${selected ? "border-[#f6b800] ring-2 ring-[#f6b800]/60" : darkMode ? "border-white/20 hover:border-white/45" : "border-black/10 hover:border-black/25"} ${darkMode ? "bg-[#141414]" : "bg-white"}`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#292929]">
                <LoadLinkImage
                  src={option.image}
                  alt={option.alt}
                  loading="eager"
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 33vw, 260px"
                  className="block h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
                />
              </div>
              <div className="min-h-[122px] p-3 sm:p-3.5">
                <p className="text-[13px] font-black leading-5">{option.title}</p>
                <p className={`mt-1.5 text-[11px] font-medium leading-[1.55] ${darkMode ? "text-white/70" : "text-black/65"}`}>{option.description}</p>
                {selected ? <p className="mt-2 text-[11px] font-black text-[#b68500] dark:text-[#f6b800]">Selected</p> : null}
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
