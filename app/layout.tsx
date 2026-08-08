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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LoadLink",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/images/loadlink-app-icon-180.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f4efe3" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var k='loadlink-theme',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.dataset.loadlinkTheme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='dark'?'#050505':'#f4efe3')}catch(e){}})();` }} />
      </head>
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
