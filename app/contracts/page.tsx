import { redirect } from "next/navigation";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const params = new URLSearchParams({ portal: "contract" });

  for (const key of ["search", "city", "category"]) {
    const value = incoming[key];
    if (typeof value === "string" && value.trim()) params.set(key, value.trim());
  }

  redirect(`/jobs?${params.toString()}`);
}
