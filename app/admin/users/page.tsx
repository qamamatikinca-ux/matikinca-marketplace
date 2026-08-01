import AdminShell from "@/components/admin/AdminShell";
import AdminRecords from "@/components/admin/AdminRecords";
export default function Page(){return <AdminShell title="User operations" description="Review account verification, package status and role information without exposing passwords or private documents."><AdminRecords type="users" title="User records" emptyText="No user records were found."/></AdminShell>}
