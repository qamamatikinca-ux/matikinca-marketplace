"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Portal = {
  title: string;
  description: string;
  href: string;
  images: string[];
};

const portals: Portal[] = [
  { title: "Jobs", description: "Find transport and logistics work for trucks and mobile units.", href: "/jobs?portal=job", images: ["/images/jobs-1.jpg", "/images/jobs-2.jpg", "/images/jobs-3.jpg"] },
  { title: "Contracts", description: "Browse longer-term logistics opportunities and recurring work.", href: "/contracts", images: ["/images/contracts-1.jpg", "/images/contracts-2.jpg", "/images/contracts-3.jpg"] },
  { title: "Drivers", description: "Browse approved drivers or manage your professional driver profile.", href: "/driver-portal", images: ["/images/driver-profile-hero.jpg"] },
  { title: "List vehicle", description: "List a commercial vehicle or mobile unit on LoadLink.", href: "/list-your-vehicle", images: ["/images/truck-1.jpg", "/images/truck-2.jpg", "/images/truck-3.jpg"] },
];

export default function LoadLinkHomepagePortalGrid20260822({ darkMode }: { darkMode: boolean }) {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setImageIndex((value) => value + 1), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section data-loadlink-home-portals="gold-actions-v2" className="px-0 pb-8 pt-2 sm:px-4 md:px-6 md:pb-12">
      <div className="mx-auto grid w-full max-w-[1440px] auto-rows-fr gap-px bg-black/10 md:grid-cols-2">
        {portals.map((portal) => {
          const src = portal.images[imageIndex % portal.images.length];
          const slug = portal.title.toLowerCase().replaceAll(" ", "-");
          return (
            <Link
              key={portal.title}
              href={portal.href}
              scroll
              aria-label={`Open ${portal.title}`}
              data-loadlink-home-portal-card={slug}
              data-loadlink-scroll-top="true"
              className={`group relative block h-full min-h-[300px] overflow-hidden transition active:scale-[.998] sm:min-h-[340px] md:min-h-[390px] lg:min-h-[430px] ${darkMode ? "bg-[#090909]" : "bg-white"}`}
            >
              <img
                src={src}
                alt=""
                loading={portal.title === "Jobs" || portal.title === "Contracts" ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.025]"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (!image.dataset.fallbackApplied) {
                    image.dataset.fallbackApplied = "true";
                    image.src = portal.images[0];
                  } else image.style.opacity = "0";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/66 via-transparent to-transparent" />

              <div className="relative z-10 flex h-full min-h-[inherit] max-w-[34rem] flex-col justify-end p-5 text-white sm:p-7 md:p-8">
                <h2 className="text-[31px] font-black leading-[.96] tracking-[-.04em] sm:text-[38px] md:text-[42px]">{portal.title}</h2>
                <p className="mt-2 max-w-[29rem] text-[13px] font-medium leading-5 text-white/76">{portal.description}</p>
                <span className="mt-5 inline-flex min-h-11 w-fit items-center gap-3 rounded-2xl bg-[#f6b800] px-5 text-[12px] font-black text-black shadow-[0_10px_30px_rgba(246,184,0,.18)] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_34px_rgba(246,184,0,.24)]">
                  Open portal <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
