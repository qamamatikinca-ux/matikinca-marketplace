"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
export type OwnDriverProfile = { id: string; user_id: string; full_name: string; headline?: string; city?: string; province?: string; licence_code?: string; years_experience?: number; availability?: string; bio?: string; vehicle_types?: string[]; status: string; review_reason?: string; profile_status?: string };
export function useOwnDriverProfile() {
 const account = useLoadLinkAccount();
 const [state, setState] = useState<{ profile: OwnDriverProfile | null; portrait: string; hasPortrait: boolean }>({ profile: null, portrait: "", hasPortrait: false });
 useEffect(() => {
  const userId = account.user?.id;
  if (!userId || account.user?.is_anonymous) return;
  let active = true, portrait = "", loading = false;
  const load = async () => {
   if (loading) return; loading = true;
   try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id !== userId) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const response = await fetch("/api/phase2/me", { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return;
    const result = await response.json();
    if (!active || result.profile?.user_id !== userId) return;
    const image = await fetch("/api/phase2/me?portrait=1", { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    let next = "";
    if (image.ok && ["image/jpeg", "image/png"].includes(image.headers.get("content-type") || "")) next = URL.createObjectURL(await image.blob());
    if (!active) { if (next) URL.revokeObjectURL(next); return; }
    if (portrait) URL.revokeObjectURL(portrait); portrait = next;
    setState({ profile: result.profile, portrait: next, hasPortrait: Boolean(result.documents?.some((doc: {document_type:string}) => doc.document_type === "portrait")) });
   } catch { /* Keep the last known private profile during a connection failure. */ }
   finally { loading = false; }
  };
  void load();
  window.addEventListener("focus", load); window.addEventListener("loadlink-driver-profile-updated", load);
  return () => { active = false; if (portrait) URL.revokeObjectURL(portrait); window.removeEventListener("focus", load); window.removeEventListener("loadlink-driver-profile-updated", load); };
 }, [account.user?.id, account.user?.is_anonymous]);
 return state.profile?.user_id === account.user?.id ? state : { profile: null, portrait: "", hasPortrait: false };
}
