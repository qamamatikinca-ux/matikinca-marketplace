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
          window.location.reload();
        }
      }}
    >
      <LoadLinkLogo className={logoClassName} theme={theme} />
    </Link>
  );
}
