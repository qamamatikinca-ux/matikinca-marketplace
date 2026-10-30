import { redirect } from "next/navigation";
export const metadata = { title: "Driver verification", robots: { index: false, follow: false } };
export default function Page() { redirect("/driver-profile?step=verification"); }
