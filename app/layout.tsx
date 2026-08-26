import type { Metadata } from "next";
import "./globals.css";
import "./landing-experience.css";
import LandingExperience from "./landing-experience";

export const metadata: Metadata = {
  title: "LoadLink — Coming Soon",
  description:
    "LoadLink is a South African logistics marketplace for jobs, contracts, commercial vehicles, mobile units, drivers and dealerships, with practical logistics tools and branded PDF documents. Coming soon.",
  applicationName: "LoadLink",
  category: "business",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "LoadLink",
    title: "LoadLink — Coming Soon",
    description: "Logistics, made easier. Marketplace, operational tools and documents for South African logistics — coming soon.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body className="bg-[#050505] text-white antialiased">
        {children}
        <LandingExperience />
      </body>
    </html>
  );
}
