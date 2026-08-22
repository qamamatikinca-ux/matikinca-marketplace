// LoadLink AutoTrader-style search release marker — 2026-08-22
import { Suspense } from "react";
import SearchResultsClient from "./SearchResultsClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <SearchResultsClient />
    </Suspense>
  );
}
