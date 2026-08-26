"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const stories = [
  {
    eyebrow: "One platform",
    title: "The work stays connected.",
    copy: "Calls, messages, saved activity, verified profiles and logistics opportunities can live in one focused flow — built around the way logistics teams actually work.",
    image: "/landing/loadlink-platform.webp",
    alt: "LoadLink platform features including calls, messages, saved posts, job alerts and verified profiles",
    width: 240,
    height: 300,
  },
  {
    eyebrow: "Built for movement",
    title: "Commercial logistics, in motion.",
    copy: "From commercial vehicle discovery to opportunities and the documents that keep work moving, LoadLink brings the pieces closer together without turning the experience into dashboard clutter.",
    image: "/landing/loadlink-truck.webp",
    alt: "White MAN refrigerated commercial truck on the road",
    width: 180,
    height: 374,
  },
  {
    eyebrow: "LoadLink",
    title: "Logistics made easier.",
    copy: "A clearer place to discover, communicate and move work forward — designed around logistics rather than general classifieds.",
    image: "/landing/loadlink-logistics-easier.webp",
    alt: "LoadLink logistics made easier boxes graphic",
    width: 240,
    height: 240,
  },
];

export default function LandingExperience() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const main = document.querySelector("main");
    if (!main) return;

    const mount = document.createElement("div");
    mount.dataset.llStoryMount = "true";
    const footer = main.querySelector("footer");
    if (footer) main.insertBefore(mount, footer);
    else main.appendChild(mount);
    setMountNode(mount);

    return () => {
      setMountNode(null);
      mount.remove();
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/" || !mountNode) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const existing = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    existing.forEach((section) => section.classList.add("ll-scroll-reveal"));

    const revealTargets = [
      ...existing,
      ...Array.from(document.querySelectorAll<HTMLElement>("[data-ll-reveal]")),
    ];

    if (reduced) {
      revealTargets.forEach((target) => target.classList.add("ll-in-view"));
      return () => {
        existing.forEach((section) => section.classList.remove("ll-scroll-reveal", "ll-in-view"));
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("ll-in-view");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -7% 0px" },
    );

    revealTargets.forEach((target) => observer.observe(target));

    let raf = 0;
    const updateParallax = () => {
      raf = 0;
      const viewport = window.innerHeight || 1;
      document.querySelectorAll<HTMLElement>("[data-ll-parallax]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const progress = Math.max(-1, Math.min(1, (viewport / 2 - center) / viewport));
        element.style.setProperty("--ll-parallax", progress.toFixed(3));
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      existing.forEach((section) => section.classList.remove("ll-scroll-reveal", "ll-in-view"));
    };
  }, [pathname, mountNode]);

  if (pathname !== "/" || !mountNode) return null;

  return createPortal(
    <section ref={rootRef} className="ll-story" aria-label="LoadLink platform story">
      <div className="ll-story-intro" data-ll-reveal>
        <p>Move through LoadLink</p>
        <h2>
          One logistics platform.
          <br />
          Designed to stay in motion.
        </h2>
      </div>

      {stories.map((story, index) => (
        <article
          className={`ll-story-panel ${index % 2 ? "ll-story-panel--reverse" : ""}`}
          data-ll-reveal
          key={story.title}
        >
          <div className="ll-story-copy">
            <p className="ll-story-eyebrow">{story.eyebrow}</p>
            <h3>{story.title}</h3>
            <p>{story.copy}</p>
          </div>
          <div className={`ll-story-media ll-story-media--${index + 1}`} data-ll-parallax>
            <img
              src={story.image}
              alt={story.alt}
              width={story.width}
              height={story.height}
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>
      ))}
    </section>,
    mountNode,
  );
}
