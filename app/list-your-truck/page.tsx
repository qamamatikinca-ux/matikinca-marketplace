import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ListYourTruckRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const incoming = await searchParams;
  const target = new URLSearchParams();

  for (const [key, value] of Object.entries(incoming || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => target.append(key, item));
    } else if (typeof value === "string") {
      target.set(key, value);
    }
  }

  const query = target.toString();
  redirect(`/list-your-vehicle${query ? `?${query}` : ""}`);
}
