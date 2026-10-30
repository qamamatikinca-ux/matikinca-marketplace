import { comparisonDistance } from "./liveIdentity";

// A browser comparison is advisory evidence for staff, never an approval.
// An unreadable ID must not discard an already completed movement recording.
export async function compareDriverEvidence(
 describe: (source: "identity" | "first" | "last") => Promise<ArrayLike<number>[]>,
) {
 const first = await describe("first");
 const last = await describe("last");
 if (first.length !== 1 || last.length !== 1) return { distance: null, continuity: null };
 const continuity = comparisonDistance(first[0], last[0]);
 if (continuity === null || continuity > .6) throw new Error("We could not confirm the same face throughout. Please repeat the camera check.");
 const identity = await describe("identity").catch(() => []);
 return { continuity, distance: identity.length === 1 ? comparisonDistance(identity[0], first[0]) : null };
}
