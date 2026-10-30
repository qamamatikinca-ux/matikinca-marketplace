export type DriverIdentityState = {
 emailVerified: boolean; phoneVerified: boolean; phoneVerificationAvailable?: boolean | null; accountEmail: string;
 identityReady: boolean; identityMime: string;
 check: null | { id: string; status: string; mode: string; review_feedback?: string };
};
export function normalizeDriverPhone(value: string) {
 let n = value.replace(/\D/g, "");
 if (/^0[6-8]\d{8}$/.test(n)) n = `27${n.slice(1)}`;
 if (n.startsWith("00")) n = n.slice(2);
 return n ? `+${n}` : "";
}
export function identityReadyForSubmission(value: DriverIdentityState | null) {
 return Boolean(value?.emailVerified && value.phoneVerified && value.identityReady && value.check && ["pending_review", "manual_match"].includes(value.check.status));
}
