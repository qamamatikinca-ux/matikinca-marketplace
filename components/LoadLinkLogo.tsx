"use client";

import { ImgHTMLAttributes, useEffect, useState } from "react";

type LogoTheme = "auto" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type LoadLinkLogoProps = ImgHTMLAttributes<HTMLImageElement> & {
  containerClassName?: string;
  showGlow?: boolean;
  theme?: LogoTheme;
};

function readDocumentTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.dataset.loadlinkTheme;
  if (explicit === "dark" || explicit === "light") return explicit;
  const stored = window.localStorage.getItem("loadlink-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function LoadLinkLogo({
  className = "",
  containerClassName = "",
  showGlow = true,
  theme = "auto",
  alt = "LoadLink",
  ...props
}: LoadLinkLogoProps) {
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    if (theme !== "auto") {
      setResolved(theme);
      return;
    }

    const sync = () => setResolved(readDocumentTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-loadlink-theme", "class"],
    });

    window.addEventListener("storage", sync);
    window.addEventListener("loadlink-theme-change", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", sync);
      window.removeEventListener("loadlink-theme-change", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
    };
  }, [theme]);

  const activeTheme = theme === "auto" ? resolved : theme;
  const src = activeTheme === "dark"
    ? "/images/loadlink-logo-dark.png?v=universal-theme-v1"
    : "/images/loadlink-logo-light.png?v=universal-theme-v1";

  return (
    <span
      className={`loadlink-logo-wrap ${containerClassName}`}
      data-logo-theme={activeTheme}
    >
      {showGlow ? <span aria-hidden="true" className="loadlink-logo-glow" /> : null}
      <img
        src={src}
        alt={alt}
        className={`loadlink-logo-img ${className}`}
        draggable={false}
        {...props}
      />
    </span>
  );
}
