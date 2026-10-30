// LoadLink major revision — 2026-08-26
import NetworkRecovery from "@/components/platform/NetworkRecovery";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";
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
import "./loadlink-light-glass.css";
import "./loadlink-final-release-polish-20260821.css";
import "./loadlink-call-history-20260821.css";
import "./loadlink-release-completion-20260821.css";
import "./loadlink-release-recovery-20260821.css";
import "./loadlink-visible-combined-20260822.css";
import "./loadlink-final-release-20260822.css";
import "./loadlink-product-repair-20260822.css";
import "./loadlink-mobile-product-correction-20260822.css";
import "./loadlink-final-ui-consistency-20260822.css";
import "./loadlink-major-update-20260823.css";
import "./loadlink-completion-20260823.css";
import "./loadlink-completion-detail-20260823.css";
import "./loadlink-smart-ux-20260826.css";
import "./loadlink-call-chat-20261013.css";
import "./loadlink-vehicle-experience-20261013.css";
import "./loadlink-refresh-theme-20261015.css";
import "./loadlink-workspace-20261021.css";
import VehicleDraftResumeToast from "@/components/VehicleDraftResumeToast";
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
import LoadLinkSelectLabelFix from "@/components/LoadLinkSelectLabelFix";
import LoadLinkInteractionSystem from "@/components/LoadLinkInteractionSystem";
import LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";
import LoadLinkShareEnhancer from "@/components/LoadLinkShareEnhancer";
import DealerPostBenefitsEnhancer from "@/components/dealer/DealerPostBenefitsEnhancer";
import MarketplaceUxPolishEnhancer from "@/components/MarketplaceUxPolishEnhancer";
import PhotoGalleryModernizer from "@/components/PhotoGalleryModernizer";
import LoadLinkUniversalUiGuard from "@/components/LoadLinkUniversalUiGuard";
import ListingReportGuard from "@/components/ListingReportGuard";
import ChatComposerActions from "@/components/ChatComposerActions";
import DealerWorkspaceNavigationEnhancer from "@/components/dealer/DealerWorkspaceNavigationEnhancer";
import DealerPackageDetailsEnhancer from "@/components/dealer/DealerPackageDetailsEnhancer";
import LoadLinkCallBootstrap from "@/components/LoadLinkCallBootstrap";
import LoadLinkDealerChatStatus20260823 from "@/components/LoadLinkDealerChatStatus20260823";
import LoadLinkChatUiPolish20260823 from "@/components/LoadLinkChatUiPolish20260823";
import LoadLinkMajorUpdate20260823 from "@/components/LoadLinkMajorUpdate20260823";
import LoadLinkAuditUpdateBridge from "@/components/LoadLinkAuditUpdateBridge";
import LoadLinkCriticalInteractionFixes from "@/components/LoadLinkCriticalInteractionFixes";
import LoadLinkFinalUxRepair20260820 from "@/components/LoadLinkFinalUxRepair20260820";
import LoadLinkFinalReleasePolishBootstrap20260821 from "@/components/LoadLinkFinalReleasePolishBootstrap20260821";
import LoadLinkReleaseCompletion20260821 from "@/components/LoadLinkReleaseCompletion20260821";
import LoadLinkReleaseRecovery20260821 from "@/components/LoadLinkReleaseRecovery20260821";
import LoadLinkProductRepair20260822 from "@/components/LoadLinkProductRepair20260822";
import LoadLinkCookieConsent20260822 from "@/components/LoadLinkCookieConsent20260822";
import LoadLinkMobileUxCorrection20260822 from "@/components/LoadLinkMobileUxCorrection20260822";
import LoadLinkDealerStatusViewer20260823 from "@/components/LoadLinkDealerStatusViewer20260823";
import LoadLinkChatMediaPreview20260823 from "@/components/LoadLinkChatMediaPreview20260823";
import LoadLinkChatInfoCompletion20260823 from "@/components/LoadLinkChatInfoCompletion20260823";
import LoadLinkLocationCompletion20260823 from "@/components/LoadLinkLocationCompletion20260823";
import LoadLinkDistanceLayer20260823 from "@/components/LoadLinkDistanceLayer20260823";
import LoadLinkDealershipOwnerEdit20260823 from "@/components/LoadLinkDealershipOwnerEdit20260823";
import LoadLinkFinalProductPass20260823 from "@/components/LoadLinkFinalProductPass20260823";
import LoadLinkFinalMarketplacePolish20260824 from "@/components/LoadLinkFinalMarketplacePolish20260824";
import LoadLinkBrokenImageGuard20260826 from "@/components/LoadLinkBrokenImageGuard20260826";
import LoadLinkSmartUxPass20260826 from "@/components/LoadLinkSmartUxPass20260826";

export const metadata: Metadata = {
  title: { default: "LoadLink | South African Logistics Marketplace", template: "%s | LoadLink" },
  description: "Find logistics jobs, transport contracts, commercial vehicles, mobile units, drivers and dealerships across South Africa on LoadLink.",
  keywords: ["LoadLink","South Africa logistics","transport jobs","logistics contracts","truck jobs","commercial vehicles","mobile units","truck drivers","logistics marketplace"],
  applicationName: "LoadLink",
  category: "business",
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "en_ZA", siteName: "LoadLink", title: "LoadLink | South African Logistics Marketplace", description: "Search logistics jobs, contracts, commercial vehicles, mobile units and professional drivers across South Africa." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t,s=false;try{t=localStorage.getItem('loadlink-theme');s=localStorage.getItem('loadlink-simple-mode')==='true'}catch(e){}if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.dataset.loadlinkHydrating='true';r.dataset.loadlinkTheme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;r.style.backgroundColor=t==='dark'?'#050505':'#f4efe3';r.dataset.loadlinkSimple=s?'true':'false';var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='dark'?'#050505':'#f4efe3');window.setTimeout(function(){delete r.dataset.loadlinkHydrating},4000);document.addEventListener('error',function(ev){var el=ev.target;if(!el||el.tagName!=='IMG'||el.dataset.loadlinkManagedImage==='true')return;el.style.visibility='hidden'},true);document.addEventListener('load',function(ev){var el=ev.target;if(el&&el.tagName==='IMG'&&el.dataset.loadlinkManagedImage!=='true'&&el.naturalWidth>0&&el.style.visibility==='hidden')el.style.removeProperty('visibility')},true)})();` }} />
        <noscript><style>{'html:root body img[data-loadlink-managed-image="true"][data-loadlink-image-state="pending"]{visibility:visible!important}'}</style></noscript>
      </head>
      <body data-loadlink-release="20261021-workspace-r1">
        <ThemeCoordinator /><LoadLinkUiRepairV273 /><SimpleModeCoordinator /><AccountActivityTracker /><AuthMfaGate /><ProfileOnboardingGate /><MarketplaceRestrictionGuard /><AccountSettingsGlassFix /><LoadLinkSelectLabelFix /><LoadLinkInteractionSystem /><LoadLinkTouchScrollGuard /><LoadLinkShareEnhancer /><DealerPostBenefitsEnhancer /><MarketplaceUxPolishEnhancer /><PhotoGalleryModernizer /><LoadLinkUniversalUiGuard /><LoadLinkAuditUpdateBridge /><LoadLinkCriticalInteractionFixes /><LoadLinkFinalUxRepair20260820 /><LoadLinkFinalReleasePolishBootstrap20260821 /><LoadLinkReleaseCompletion20260821 /><LoadLinkReleaseRecovery20260821 /><LoadLinkProductRepair20260822 /><LoadLinkMobileUxCorrection20260822 /><ListingReportGuard /><ChatComposerActions /><DealerWorkspaceNavigationEnhancer /><DealerPackageDetailsEnhancer /><LoadLinkMajorUpdate20260823 /><LoadLinkCallBootstrap /><LoadLinkDealerChatStatus20260823 /><LoadLinkChatUiPolish20260823 /><LoadLinkChatMediaPreview20260823 /><LoadLinkChatInfoCompletion20260823 /><LoadLinkDealerStatusViewer20260823 /><LoadLinkLocationCompletion20260823 /><LoadLinkDistanceLayer20260823 /><LoadLinkDealershipOwnerEdit20260823 /><LoadLinkFinalProductPass20260823 /><LoadLinkFinalMarketplacePolish20260824 /><LoadLinkBrokenImageGuard20260826 /><LoadLinkBoundary name="marketplace enhancements"><LoadLinkSmartUxPass20260826 /></LoadLinkBoundary><LoadLinkCookieConsent20260822 />
        <SwipeDotsEnhancer /><AuthBootstrap /><NotificationCenter /><ChatLauncher /><LoadLinkToastCenter /><VehicleDraftResumeToast /><LoadLinkDeleteConfirmationLayer /><NetworkRecovery />
        {children}
        <Suspense fallback={null}><LoadLinkRuntimeBoundary /></Suspense>
      </body>
    </html>
  );
}
