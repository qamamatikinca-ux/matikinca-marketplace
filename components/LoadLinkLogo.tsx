"use client";

import { ImgHTMLAttributes, useEffect, useState } from "react";

type LogoTheme = "auto" | "light" | "dark";

type LoadLinkLogoProps = ImgHTMLAttributes<HTMLImageElement> & {
  containerClassName?: string;
  showGlow?: boolean;
  theme?: LogoTheme;
};

function detectDarkMode() {
  if (typeof window === "undefined") return false;

  const mainClass = document.querySelector("main")?.getAttribute("class") || "";
  const headerClass = document.querySelector("header")?.getAttribute("class") || "";
  const pageClasses = `${mainClass} ${headerClass}`;

  if (pageClasses.includes("bg-[#050505]") || pageClasses.includes("bg-black")) return true;
  if (pageClasses.includes("bg-white") || pageClasses.includes("bg-[#fff")) return false;

  const pageTheme = localStorage.getItem("loadlink-theme");
  const loginTheme = localStorage.getItem("loadlink-login-theme");
  return (loginTheme || pageTheme) === "dark";
}

export default function LoadLinkLogo({
  className = "",
  containerClassName = "",
  showGlow = true,
  theme = "auto",
  alt = "LoadLink",
  ...props
}: LoadLinkLogoProps) {
  const [autoDarkMode, setAutoDarkMode] = useState(false);

  useEffect(() => {
    if (theme !== "auto") return;

    const sync = () => setAutoDarkMode(detectDarkMode());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    if (document.body) observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    const timer = window.setInterval(sync, 250);
    window.addEventListener("storage", sync);
    window.addEventListener("click", sync);
    window.addEventListener("loadlink-theme-change", sync);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("click", sync);
      window.removeEventListener("loadlink-theme-change", sync);
    };
  }, [theme]);

  const darkMode = theme === "dark" || (theme === "auto" && autoDarkMode);

  return (
    <span className={`loadlink-logo-wrap ${containerClassName}`}>
      {showGlow ? <span aria-hidden="true" className="loadlink-logo-glow" /> : null}
      <img
        src={darkMode ? "/images/loadlink-logo-dark.png?v=guest-chat-fix" : "/images/loadlink-logo-light.png?v=guest-chat-fix"}
        alt={alt}
        className={`loadlink-logo-img ${className}`}
        style={{ filter: "none" }}
        {...props}
      />
    </span>
  );
}
