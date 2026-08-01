import AdminShell from "@/components/admin/AdminShell";
import AdminRecords from "@/components/admin/AdminRecords";
export default function Page(){return <AdminShell title="Dealership reviews" description="Moderate verified dealership reviews and responses before public display."><AdminRecords type="reviews" title="Review moderation" emptyText="No dealership reviews were found."/></AdminShell>}
