import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logistics Jobs in South Africa",
  description:
    "Find current transport and logistics jobs for trucks, trailers, owner-drivers and mobile units across South Africa on LoadLink.",
  keywords: [
    "logistics jobs South Africa",
    "truck jobs South Africa",
    "transport jobs",
    "loads for trucks",
    "owner driver jobs",
    "mobile unit jobs",
  ],
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
