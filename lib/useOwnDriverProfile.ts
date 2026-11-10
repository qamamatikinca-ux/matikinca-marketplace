"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
export type OwnDriverProfile = { id: string; user_id: string; full_name: string; headline?: string; city?: string; province?: string; email?: string; phone?: string; licence_code?: string; years_experience?: number; availability?: string; bio?: string; vehicle_types?: string[]; route_experience?: string[]; languages?: string[]; status: string; review_reason?: string; profile_status?: string };
type PreviewState = { profile: OwnDriverProfile | null; portrait: string; hasPortrait: boolean; error: string; userId: string };
const EMPTY_PREVIEW: PreviewState = { profile: null, portrait: "", hasPortrait: false, error: "", userId: "" };
export function useOwnDriverProfile() {
 const account = useLoadLinkAccount();
 const [state, setState] = useState<PreviewState>(EMPTY_PREVIEW);
 const refresh = useCallback(() => window.dispatchEvent(new Event("loadlink-driver-profile-updated")), []);
 useEffect(() => {
  const userId = account.user?.id;
  if (!userId || account.user?.is_anonymous) return;
  let active = true, portrait = "", loading = false;
  const load = async () => {
   if (loading) return; loading = true;
   try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id !== userId) { if (active) setState(EMPTY_PREVIEW); return; }
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const response = await fetch("/api/phase2/me", { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Your driver profile could not load. Please try again.");
    const result = await response.json();
    if (!active) return;
    if (!result.profile) { if (portrait) URL.revokeObjectURL(portrait); portrait = ""; setState({ ...EMPTY_PREVIEW, userId }); return; }
    if (result.profile.user_id !== userId) throw new Error("Your driver profile could not load. Please try again.");
    const hasPortrait = Boolean(result.documents?.some((doc: {document_type:string}) => doc.document_type === "portrait"));
    // Publish the application immediately. An optional image request must never
    // hold the banner back or discard an otherwise valid application.
    setState(previous => ({ profile: result.profile, portrait: previous.profile?.id === result.profile.id && hasPortrait ? previous.portrait : "", hasPortrait, userId, error: "" }));
    let next = "";
    try {
     if (hasPortrait) {
      const image = await fetch("/api/phase2/me?portrait=1", { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (image.ok && ["image/jpeg", "image/png"].includes(image.headers.get("content-type") || "")) next = URL.createObjectURL(await image.blob());
     }
    } catch { return; }
    if (!active) { if (next) URL.revokeObjectURL(next); return; }
    if (portrait) URL.revokeObjectURL(portrait); portrait = next;
    setState(previous => previous.profile?.id === result.profile.id && previous.userId === userId ? { ...previous, portrait: next } : previous);
   } catch { if (active) setState(previous => ({ ...(previous.userId === userId ? previous : EMPTY_PREVIEW), userId, error: "Your driver profile could not load. Please try again." })); }
   finally { loading = false; }
  };
  void load();
  window.addEventListener("focus", load); window.addEventListener("loadlink-driver-profile-updated", load);
  return () => { active = false; if (portrait) URL.revokeObjectURL(portrait); window.removeEventListener("focus", load); window.removeEventListener("loadlink-driver-profile-updated", load); };
 }, [account.user?.id, account.user?.is_anonymous]);
 return { ...(account.user && !account.user.is_anonymous && state.userId === account.user.id ? state : EMPTY_PREVIEW), refresh };
}
