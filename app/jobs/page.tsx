import JobsPortalClient from "./JobsPortalClient";

type SearchParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const initialQuery = { search: first(params.search), category: first(params.category), portal: first(params.portal) };
  // The requested portal is present in the first server response on refresh.
  return <JobsPortalClient key={JSON.stringify(initialQuery)} initialQuery={initialQuery} />;
}
