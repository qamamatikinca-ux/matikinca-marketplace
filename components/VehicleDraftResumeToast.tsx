"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearVehicleDraft, hasVehicleDraft, readVehicleDraft, readVehicleWizardStep, scopeVehicleDraft, vehicleDraftHref, type VehicleDraft } from "@/lib/vehicleDraft";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function VehicleDraftResumeToast() {
  const { darkMode } = useLoadLinkTheme();
  const pathname = usePathname(), router = useRouter();
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  const sessionKeyRef = useRef("");
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  // Navigation must remove the temporary card, not leave it waiting
  // to reappear over the next visit.
  useEffect(() => {
    if (pathname === "/") return;
    const timer = window.setTimeout(() => setDraft(null), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  const [userId, setUserId] = useState("");
  const dismissedKey=(id:string)=>`loadlink:dismissed-vehicle-resume:${id}`;
  const fingerprint=(value:VehicleDraft)=>JSON.stringify(value);
  function dismissPersistently(){
    if(draft&&userId){try{localStorage.setItem(dismissedKey(userId),fingerprint(draft))}catch{}}
    setDraft(null);
  }
  useEffect(() => {
    let alive = true, revision = 0;
    let promptTimer: number | null = null;
    const check = (id: string, sessionId: string) => {
      if (!alive) return;
      // A resume suggestion belongs only on Home, never over Messages,
      // Control Centre, forms, face verification, or an active conversation.
      if (!id) {
        // A signed-out user must never see a previous account's draft prompt.
        setDraft(null);
        setUserId("");
        sessionKeyRef.current = "";
        return;
      }
      if (pathnameRef.current !== "/") return;
      const key = `${id}:${sessionId}`;
      if (sessionKeyRef.current === key) return;
      const seen = `loadlink-draft-prompt:${id}:${sessionId}`;
      try { if (sessionStorage.getItem(seen)) return; } catch {}
      scopeVehicleDraft(id);
      const saved = readVehicleDraft(id);
      if (!hasVehicleDraft(saved)) return;
      try { if (localStorage.getItem(dismissedKey(id)) === fingerprint(saved!)) return; } catch {}
      sessionKeyRef.current = key;
      // Let Home become usable first. Never interrupt navigation or page load.
      if (promptTimer) window.clearTimeout(promptTimer);
      promptTimer = window.setTimeout(() => {
        if (!alive || pathnameRef.current !== "/") return;
        try { sessionStorage.setItem(seen, "1"); } catch {}
        setUserId(id);
        setDraft(saved);
      }, 5500);
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
    return () => {
      alive = false;
      if (promptTimer) window.clearTimeout(promptTimer);
      sessionKeyRef.current = "";
      subscription.unsubscribe();
    };
  }, [pathname]);
  if (pathname !== "/" || !draft) return null;
  const categoryNames: Record<string,string> = { truck:"Truck", bakkie_van:"Bakkie or van", trailer:"Trailer", mobile_unit:"Mobile unit" };
  const category = categoryNames[String(draft.vehicleCategory||"")] || "Vehicle";
  const identity = [draft.year && Number(draft.year)>1970 ? draft.year : null, draft.brand, draft.modelName]
    .filter(value=>Boolean(value) && String(value).trim()).map(String).join(" ");
  const step = readVehicleWizardStep(userId, String(draft.submissionId||""));
  const stepName = ["Vehicle type","Vehicle details","Photos & documents","Final review"][step];
  const updated = typeof draft.updatedAt==="number" && Number.isFinite(draft.updatedAt)
    ? new Date(draft.updatedAt).toLocaleString("en-ZA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
    : "Saved on this device";
  const startFresh=()=>{
    const entry = draft.vehicleCategory === "mobile_unit" ? "mobile-unit" : "vehicle";
    clearVehicleDraft(userId);
    dismissPersistently();
    router.push(`/list-your-vehicle?entry=${entry}#listing-form`);
  };
  return (
    <aside role="status" aria-label="Saved vehicle listing" aria-live="polite"
      className={`fixed bottom-[max(90px,env(safe-area-inset-bottom))] left-3 right-3 z-[950] mx-auto max-w-[390px] rounded-2xl border p-3.5 shadow-[0_8px_26px_rgba(0,0,0,.10)] ${darkMode ? "border-white/15 bg-[#191919] text-white" : "border-black/10 bg-white text-black"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${darkMode?"bg-white/10":"bg-[#f3f3f3]"}`}>
          <LoadLinkIcon name="truck" size={18}/>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight">You have a saved listing</h2>
          <p className="mt-0.5 truncate text-[13px] font-medium">{identity || String(draft.title || category)}</p>
          <p className="mt-1 text-xs leading-4 opacity-60">{category} · {stepName}</p>
          <p className="mt-0.5 text-[11px] opacity-50">{updated}</p>
        </div>
        <button type="button" onClick={dismissPersistently} aria-label="Dismiss listing reminder"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg opacity-65 hover:opacity-100">
          <LoadLinkIcon name="close" size={18}/>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={startFresh}
          className={`min-h-10 rounded-lg border px-3 text-[13px] font-semibold ${darkMode?"border-white/20":"border-black/15"}`}>Start fresh</button>
        <button type="button" onClick={()=>{router.push(vehicleDraftHref(draft));dismissPersistently();}}
          className="min-h-10 rounded-lg bg-[#f6b800] px-3 text-[13px] font-semibold text-black">Resume listing</button>
      </div>
    </aside>
  );
}
