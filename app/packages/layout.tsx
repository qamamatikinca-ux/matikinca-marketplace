import type { ReactNode } from "react";
import PackageGuideRibbon from "@/components/PackageGuideRibbon";

export default function PackagesLayout({ children }: { children: ReactNode }) {
  return <><PackageGuideRibbon />{children}</>;
}
