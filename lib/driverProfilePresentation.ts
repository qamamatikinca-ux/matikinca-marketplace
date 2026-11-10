export function driverProfilePresentation(status: string) {
 const value = String(status || "").trim().toLowerCase();
 if (value === "draft") return { label: "Finish your profile", action: "Continue profile", href: "/driver-profile", note: "Your profile is saved privately. Complete your details and verification before submitting it." };
 if (["pending", "pending_review", "submitted", "under_review"].includes(value)) return { label: "Waiting for verification", action: "View application", href: "/driver-profile", note: "Your profile stays private until the LoadLink team approves it." };
 if (["rejected", "changes_required", "needs_changes", "missing_document"].includes(value)) return { label: "Changes required", action: "Update profile", href: "/driver-profile", note: "Update the details requested by the LoadLink team and resubmit your application." };
 if (value === "approved") return { label: "Approved", action: "Manage profile", href: "/driver-profile", note: "Your driver profile has been approved. Keep your experience, contact details and availability up to date." };
 if (["suspended", "expired"].includes(value)) return { label: value === "expired" ? "Profile expired" : "Profile paused", action: "Review profile", href: "/driver-profile", note: "Open your application to review the status and any updates needed." };
 return { label: "Application saved", action: "View application", href: "/driver-profile", note: "Open your application to check its current status." };
}
