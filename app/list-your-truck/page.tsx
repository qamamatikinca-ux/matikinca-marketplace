import { redirect } from "next/navigation";

export default function ListVehiclePage() {
  redirect("/jobs/list?mode=asset");
}
