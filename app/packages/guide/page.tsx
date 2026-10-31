import { redirect } from "next/navigation";

/** The legacy plan guide is replaced by the clear package comparison page. */
export default function PackageGuidePage() {
  redirect("/packages");
}
