import { redirect } from "next/navigation";

export default function ContractsPage() {
  redirect("/jobs?portal=contract");
}
