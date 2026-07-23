"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LoadLinkLogo from "@/components/LoadLinkLogo";

export default function HomeLogoLink({
  className = "flex min-w-0 items-center justify-center overflow-visible",
  logoClassName = "",
  theme = "auto",
}: {
  className?: string;
  logoClassName?: string;
  theme?: "auto" | "light" | "dark";
}) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className={className}
      aria-label="Go to LoadLink homepage"
      onClick={(event) => {
        if (pathname === "/") {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          window.history.replaceState(window.history.state, "", "/");
          window.dispatchEvent(new Event("loadlink-home-refresh"));
        }
      }}
    >
      <LoadLinkLogo className={logoClassName} theme={theme} />
    </Link>
  );
}
