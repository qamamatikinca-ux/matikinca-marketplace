import NetworkRecovery from "@/components/platform/NetworkRecovery";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./loadlink-logistics-modal.css";
import GlobalLoading from "@/components/GlobalLoading";
import ChatLauncher from "@/components/ChatLauncher";
import SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";
import AuthBootstrap from "@/components/AuthBootstrap";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeCoordinator from "@/components/ThemeCoordinator";
import SimpleModeCoordinator from "@/components/SimpleModeCoordinator";
import AccountActivityTracker from "@/components/AccountActivityTracker";
import AuthMfaGate from "@/components/AuthMfaGate";
import ProfileOnboardingGate from "@/components/ProfileOnboardingGate";
import MarketplaceRestrictionGuard from "@/components/phase2/MarketplaceRestrictionGuard";
import LoadLinkRuntimeIntelligence from "@/components/LoadLinkRuntimeIntelligence";
import LoadLinkUiRepairV273 from "@/components/LoadLinkUiRepairV273";

export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f4efe3" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var k='loadlink-theme',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.dataset.loadlinkTheme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;r.dataset.loadlinkSimple=localStorage.getItem('loadlink-simple-mode')==='true'?'true':'false';var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='dark'?'#050505':'#f4efe3')}catch(e){}})();` }} />
      </head>
      <body>
        <ThemeCoordinator />
        <LoadLinkUiRepairV273 />
        <SimpleModeCoordinator />
        <AccountActivityTracker />
        <AuthMfaGate />
        <ProfileOnboardingGate />
        <MarketplaceRestrictionGuard />
        <Suspense fallback={null}><GlobalLoading /></Suspense>
        <SwipeDotsEnhancer />
        <AuthBootstrap />
        <NotificationCenter />
        <ChatLauncher />
        <NetworkRecovery />
        {children}
        <LoadLinkRuntimeIntelligence />
      </body>
    </html>
  );
}
