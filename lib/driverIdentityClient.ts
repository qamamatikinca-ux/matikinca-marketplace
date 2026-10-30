import { supabase } from "@/lib/supabaseClient";
export async function driverIdentityRequest(body: Record<string, unknown>) {
 const { data, error } = await supabase.auth.getSession();
 if (error || !data.session) throw new Error("Sign in again to continue verification.");
 const response = await fetch("/api/phase2/identity", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30000) });
 if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || "Verification could not finish. Please retry."); }
 return response;
}
