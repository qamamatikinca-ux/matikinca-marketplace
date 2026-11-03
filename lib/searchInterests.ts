
import { normaliseSearch } from "@/lib/smartSearch";
const KEY = "loadlink-search-interests-v1";

/** Browsing interests remain on this device and are never uploaded. */
export function readSearchInterests(): string[] {
  if (typeof window === "undefined") return [];
  const terms: string[] = [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(stored)) for (const item of stored) if (typeof item === "string") terms.push(item.slice(0, 90));
  } catch { /* Storage may be disabled. */ }
  try {
    const viewed: unknown = JSON.parse(localStorage.getItem("loadlink-recent-viewed-jobs") || "[]");
    if (Array.isArray(viewed)) {
      for (const row of viewed.slice(0, 15)) {
        if (!row || typeof row !== "object") continue;
        const item = row as { category?: unknown; title?: unknown; type?: unknown };
        if (!/(vehicle|truck|unit|trailer|asset)/i.test(String(item.category || "") + " " + String(item.type || ""))) continue;
        const description = normaliseSearch(String(item.title || "") + " " + String(item.type || ""));
        for (const term of ["mobile kitchen", "food truck", "mobile fridge", "side tipper", "tautliner", "refrigerated", "truck", "trailer", "bakkie", "mobile unit"]) {
          if (description.includes(term)) { terms.push(term); break; }
        }
      }
    }
  } catch { /* Browsing continues without history. */ }
  return [...new Set(terms.map(term => term.trim()).filter(term => term.length > 1))].slice(0, 8);
}

export function rememberSearchInterest(query: string) {
  if (typeof window === "undefined") return;
  const clean = String(query || "").trim().slice(0, 90);
  if (clean.length < 2) return;
  try {
    const remaining = readSearchInterests().filter(term => term.toLowerCase() !== clean.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([clean, ...remaining].slice(0, 8)));
  } catch { /* Search still works. */ }
}
