"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearVehicleDraft, hasVehicleDraft, readVehicleDraft, scopeVehicleDraft, vehicleDraftHref, type VehicleDraft } from "@/lib/vehicleDraft";
import LoadLinkActionToast from "@/components/LoadLinkActionToast";

export default function VehicleDraftResumeToast() {
  const pathname = usePathname(), router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const sessionKeyRef = useRef("");
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let alive = true, revision = 0;
    const check = (id: string, sessionId: string) => {
      if (!alive) return;
      const key = id ? `${id}:${sessionId}` : "";
      // Focus and token events can repeat SIGNED_IN for the same active session.
      // Navigation alone must never offer a draft the user just left.
      if (key && sessionKeyRef.current === key) return;
      sessionKeyRef.current = key;
      scopeVehicleDraft(id); setUserId(id); setDraft(null);
      const currentPath = pathnameRef.current;
      if (!id || currentPath.startsWith("/list-your-vehicle") || currentPath.startsWith("/list-your-truck")) return;
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
  }, []);
  return <LoadLinkActionToast open={Boolean(draft)} title="Continue your vehicle listing?" message="You left a vehicle listing unfinished. Your saved details are ready when you are." primaryLabel="Continue" secondaryLabel="Start fresh" onPrimary={() => { if (draft) router.push(vehicleDraftHref(draft)); setDraft(null); }} onSecondary={() => { clearVehicleDraft(userId); setDraft(null); }} onClose={() => setDraft(null)} />;
}
