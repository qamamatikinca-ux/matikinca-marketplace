import NetworkRecovery from "@/components/platform/NetworkRecovery";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./loadlink-logistics-modal.css";
import "./loadlink-v2714-design.css";
import "./loadlink-universal-ui.css";
import "./loadlink-font-fix.css";
import "./loadlink-final-foundation.css";
import "./loadlink-responsive-experience.css";
import "./loadlink-mobile-final.css";
import "./loadlink-collage-repair.css";
import "./loadlink-performance.css";
import "./loadlink-final-polish-20260814.css";
import "./loadlink-search-glass.css";
import "./loadlink-glass-balance.css";
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
import LoadLinkRuntimeBoundary from "@/components/LoadLinkRuntimeBoundary";
import LoadLinkUiRepairV273 from "@/components/LoadLinkUiRepairV273";
import LoadLinkDeleteConfirmationLayer from "@/components/LoadLinkDeleteConfirmationLayer";
import LoadLinkToastCenter from "@/components/LoadLinkToastCenter";
import AccountSettingsGlassFix from "@/components/AccountSettingsGlassFix";
import LoadLinkInteractionSystem from "@/components/LoadLinkInteractionSystem";
import LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";
import LoadLinkShareEnhancer from "@/components/LoadLinkShareEnhancer";
import HomeFollowingEnhancer from "@/components/HomeFollowingEnhancer";
import ChatComposerActions from "@/components/ChatComposerActions";
import LogisticsToolsFinalEnhancer from "@/components/LogisticsToolsFinalEnhancer";

export const metadata: Metadata = {
  title: {
    default: "LoadLink | South African Logistics Marketplace",
    template: "%s | LoadLink",
  },
  description:
    "Find logistics jobs, transport contracts, commercial vehicles, mobile units, drivers and dealerships across South Africa on LoadLink.",
  keywords: [
    "LoadLink",
    "South Africa logistics",
    "transport jobs",
    "logistics contracts",
    "truck jobs",
    "commercial vehicles",
    "mobile units",
    "truck drivers",
    "logistics marketplace",
  ],
  applicationName: "LoadLink",
  category: "business",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "LoadLink",
    title: "LoadLink | South African Logistics Marketplace",
    description: "Search logistics jobs, contracts, commercial vehicles, mobile units and professional drivers across South Africa.",
  },
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
        <AccountSettingsGlassFix />
        <LoadLinkInteractionSystem />
        <LoadLinkTouchScrollGuard />
        <LoadLinkShareEnhancer />
        <HomeFollowingEnhancer />
        <ChatComposerActions />
        <LogisticsToolsFinalEnhancer />
        <Suspense fallback={null}><GlobalLoading /></Suspense>
        <SwipeDotsEnhancer />
        <AuthBootstrap />
        <NotificationCenter />
        <ChatLauncher />
        <LoadLinkToastCenter />
        <LoadLinkDeleteConfirmationLayer />
        <NetworkRecovery />
        {children}
        <Suspense fallback={null}><LoadLinkRuntimeBoundary /></Suspense>
      </body>
    </html>
  );
}
