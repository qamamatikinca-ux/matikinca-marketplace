import { redirect } from "next/navigation";

export default async function DealershipVehiclePage({ params }: { params: Promise<{ slug: string; listingId: string }> }) {
  const { listingId } = await params;
  redirect(`/vehicles/${encodeURIComponent(listingId)}`);
}
