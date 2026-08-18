import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professional Truck Drivers in South Africa",
  description:
    "Find LoadLink driver profiles by location, licence code, vehicle experience and availability across South Africa.",
  keywords: [
    "truck drivers South Africa",
    "Code 14 drivers",
    "Code 10 drivers",
    "PrDP drivers",
    "logistics drivers",
    "drivers for hire",
  ],
};

export default function DriversLayout({ children }: { children: React.ReactNode }) {
  return children;
}
