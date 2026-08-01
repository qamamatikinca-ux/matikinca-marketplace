import AdminShell from "@/components/admin/AdminShell";
import AdminRecords from "@/components/admin/AdminRecords";
export default function Page(){return <AdminShell title="Fraud signals" description="Review duplicate listings, suspicious prices, repeated media and other marketplace-quality signals."><AdminRecords type="fraud" title="Fraud review queue" emptyText="No open fraud signals were found."/></AdminShell>}
