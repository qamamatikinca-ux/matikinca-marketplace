"use client";

import { usePathname } from "next/navigation";
import LoadLinkRuntimeIntelligence from "@/components/LoadLinkRuntimeIntelligence";
import LoadLinkVehicleRuntime from "@/components/LoadLinkVehicleRuntime";

export default function LoadLinkRuntimeBoundary() {
  const pathname = usePathname();

  // Vehicle listing owns its own auth and publish-time entitlement checks.
  // Never mount the legacy global ListingGate on these routes.
  if (pathname === "/list-your-vehicle" || pathname === "/list-your-truck") {
    return <LoadLinkVehicleRuntime />;
  }

  return <LoadLinkRuntimeIntelligence />;
}
