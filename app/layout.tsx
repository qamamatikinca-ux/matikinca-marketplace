import NetworkRecovery from "@/components/platform/NetworkRecovery";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GlobalLoading from "@/components/GlobalLoading";
import ChatLauncher from "@/components/ChatLauncher";
import SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";
import AuthBootstrap from "@/components/AuthBootstrap";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeCoordinator from "@/components/ThemeCoordinator";

import MarketplaceRestrictionGuard from "@/components/phase2/MarketplaceRestrictionGuard";
export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeCoordinator />
        <MarketplaceRestrictionGuard />
        <Suspense fallback={null}><GlobalLoading /></Suspense>
        <SwipeDotsEnhancer />
        <AuthBootstrap />
        <NotificationCenter />
        <ChatLauncher />
        <NetworkRecovery />
        {children}
      </body>
    </html>
  );
}
