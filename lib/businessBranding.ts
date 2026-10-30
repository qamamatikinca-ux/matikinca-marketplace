import { supabase } from "@/lib/supabaseClient";
export async function brandingRequest(body: Record<string, unknown>, expectedUserId?: string) {
 const { data: { session } } = await supabase.auth.getSession();
 if (!session || session.user.is_anonymous) throw new Error("Sign in to add your business logo.");
 if (expectedUserId && session.user.id !== expectedUserId) throw new Error("Your account changed. Please retry.");
 const response = await fetch("/api/tools/branding", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30000) });
 if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || "Business branding is unavailable. Please retry."); }
 return response;
}
export async function readBusinessBranding() {
 const { data: { session } } = await supabase.auth.getSession();
 const user = session?.user;
 if (!user || user.is_anonymous) return { allowed: false, logo: "", userId: null };
 const state = await (await brandingRequest({ action: "status" })).json();
 if (state.userId !== user.id) throw new Error("Your account changed. Please retry.");
 if (!state.allowed || !state.hasLogo) return { allowed: Boolean(state.allowed), logo: "", userId: user.id };
 const blob = await (await brandingRequest({ action: "read" })).blob();
 const logo = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
 const current = await supabase.auth.getSession();
 if (current.data.session?.user.id !== user.id) throw new Error("Your account changed. Please retry.");
 return { allowed: true, logo, userId: user.id };
}
