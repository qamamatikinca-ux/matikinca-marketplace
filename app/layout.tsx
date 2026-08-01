import type { Metadata } from "next";
import { Suspense } from "react";

import GlobalEnhancers from "@/components/platform/GlobalEnhancers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <GlobalEnhancers />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
