import type { Metadata } from "next";
import "./globals.css";
import GlobalLoading from "@/components/GlobalLoading";

export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GlobalLoading />
        {children}
      </body>
    </html>
  );
}
