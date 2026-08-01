import type { Metadata } from "next";
import { Suspense } from "react";

import GlobalEnhancers from "@/components/platform/GlobalEnhancers";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LoadLinkBoundary name="global website services">
          <Suspense fallback={null}>
            <GlobalEnhancers />
          </Suspense>
        </LoadLinkBoundary>
        {children}
      </body>
    </html>
  );
}
