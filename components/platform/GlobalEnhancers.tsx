"use client";

import { lazy, Suspense } from "react";
import { usePathname } from "next/navigation";

import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";

const AuthBootstrap = lazy(() => import("@/components/AuthBootstrap"));
const ChatLauncher = lazy(() => import("@/components/ChatLauncher"));
const GlobalLoading = lazy(() => import("@/components/GlobalLoading"));
const NotificationCenter = lazy(() => import("@/components/NotificationCenter"));
const SwipeDotsEnhancer = lazy(() => import("@/components/SwipeDotsEnhancer"));
const ThemeCoordinator = lazy(() => import("@/components/ThemeCoordinator"));
const MarketplaceRestrictionGuard = lazy(() => import("@/components/phase2/MarketplaceRestrictionGuard"));
const NetworkRecovery = lazy(() => import("@/components/platform/NetworkRecovery"));

function IsolatedEnhancer({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <LoadLinkBoundary name={name}>
      <Suspense fallback={null}>{children}</Suspense>
    </LoadLinkBoundary>
  );
}

export default function GlobalEnhancers() {
  const pathname = usePathname() || "";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <IsolatedEnhancer name="theme"><ThemeCoordinator /></IsolatedEnhancer>
      <IsolatedEnhancer name="network"><NetworkRecovery /></IsolatedEnhancer>
      {isAdminRoute ? null : (
        <>
          <IsolatedEnhancer name="marketplace restriction"><MarketplaceRestrictionGuard /></IsolatedEnhancer>
          <IsolatedEnhancer name="loading"><GlobalLoading /></IsolatedEnhancer>
          <IsolatedEnhancer name="swipe navigation"><SwipeDotsEnhancer /></IsolatedEnhancer>
          <IsolatedEnhancer name="account bootstrap"><AuthBootstrap /></IsolatedEnhancer>
          <IsolatedEnhancer name="notifications"><NotificationCenter /></IsolatedEnhancer>
          <IsolatedEnhancer name="chat"><ChatLauncher /></IsolatedEnhancer>
        </>
      )}
    </>
  );
}
