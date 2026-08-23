import type { ReactNode } from "react";
import PackageGuideRibbon from "@/components/PackageGuideRibbon";
import LoadLinkPaymentReviewState20260823 from "@/components/LoadLinkPaymentReviewState20260823";

export default function PackagesLayout({ children }: { children: ReactNode }) {
  return <><LoadLinkPaymentReviewState20260823 /><PackageGuideRibbon />{children}</>;
}
