import type { Metadata } from "next";
import LoadLinkContractCancel20260826 from "@/components/LoadLinkContractCancel20260826";

export const metadata: Metadata = {
  title: "Transport Contracts in South Africa",
  description:
    "Browse recurring, project and longer-term transport and logistics contracts across South Africa on LoadLink.",
  keywords: [
    "transport contracts South Africa",
    "logistics contracts",
    "truck contracts",
    "transport tenders",
    "long term logistics work",
  ],
};

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<LoadLinkContractCancel20260826 /></>;
}
