"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearVehicleDraft, hasVehicleDraft, readVehicleDraft, scopeVehicleDraft, vehicleDraftHref, type VehicleDraft } from "@/lib/vehicleDraft";
import LoadLinkActionToast from "@/components/LoadLinkActionToast";

export default function VehicleDraftResumeToast() {
  const pathname = usePathname(), router = useRouter();
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let alive = true, revision = 0;
    const onListing = pathname.startsWith("/list-your-vehicle") || pathname.startsWith("/list-your-truck");
    const check = (id: string, sessionId: string) => {
      if (!alive) return;
      scopeVehicleDraft(id); setUserId(id); setDraft(null);
      if (!id || onListing) return;
      const saved = readVehicleDraft(id);
      if (!hasVehicleDraft(saved)) return;
      const seen = `loadlink-draft-prompt:${id}:${sessionId}`;
      try { if (sessionStorage.getItem(seen)) return; sessionStorage.setItem(seen, "1"); } catch {}
      setDraft(saved);
    };
    const getSessionId = (token?: string) => {
      try { return token ? String(JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).session_id || "session") : "session"; } catch { return "session"; }
    };
    const start = revision;
    void supabase.auth.getSession().then(({ data }) => { if (revision === start) check(data.session?.user.id || "", getSessionId(data.session?.access_token)); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      revision += 1;
      if (event === "SIGNED_OUT") { window.setTimeout(() => check("", ""), 0); return; }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") window.setTimeout(() => check(session?.user.id || "", getSessionId(session?.access_token)), 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [pathname]);
  return <LoadLinkActionToast open={Boolean(draft)} title="Continue your vehicle listing?" message="You left a vehicle listing unfinished. Your saved details are ready when you are." primaryLabel="Continue" secondaryLabel="Start fresh" onPrimary={() => { if (draft) router.push(vehicleDraftHref(draft)); setDraft(null); }} onSecondary={() => { clearVehicleDraft(userId); setDraft(null); }} onClose={() => setDraft(null)} />;
}
