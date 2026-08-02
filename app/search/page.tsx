import { Suspense } from "react";
import SearchResultsClient from "./SearchResultsClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <SearchResultsClient />
    </Suspense>
  );
}
