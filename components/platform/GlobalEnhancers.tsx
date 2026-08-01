"use client";

import { usePathname } from "next/navigation";

import AuthBootstrap from "@/components/AuthBootstrap";
import ChatLauncher from "@/components/ChatLauncher";
import GlobalLoading from "@/components/GlobalLoading";
import NotificationCenter from "@/components/NotificationCenter";
import SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";
import ThemeCoordinator from "@/components/ThemeCoordinator";
import MarketplaceRestrictionGuard from "@/components/phase2/MarketplaceRestrictionGuard";
import NetworkRecovery from "@/components/platform/NetworkRecovery";

export default function GlobalEnhancers() {
  const pathname = usePathname() || "";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <ThemeCoordinator />
      <NetworkRecovery />
      {isAdminRoute ? null : (
        <>
          <MarketplaceRestrictionGuard />
          <GlobalLoading />
          <SwipeDotsEnhancer />
          <AuthBootstrap />
          <NotificationCenter />
          <ChatLauncher />
        </>
      )}
    </>
  );
}
