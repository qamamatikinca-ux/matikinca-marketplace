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
  const [userId, setUserId] = useState("");
  const dismissedKey=(id:string)=>`loadlink:dismissed-vehicle-resume:${id}`;
  const fingerprint=(value:VehicleDraft)=>JSON.stringify(value);
  function dismissPersistently(){
    if(draft&&userId){try{localStorage.setItem(dismissedKey(userId),fingerprint(draft))}catch{}}
    setDraft(null);
  }
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
      try{if(localStorage.getItem(dismissedKey(id))===fingerprint(saved!))return;}catch{}
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
  if (!draft) return null;
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
    <section role="status" aria-label="Unfinished vehicle listing"
      className={`fixed left-3 right-3 top-[max(12px,env(safe-area-inset-top))] z-[2147483490] mx-auto max-w-[420px] rounded-2xl border p-4 shadow-[0_12px_32px_rgba(0,0,0,.14)] ${darkMode ? "border-white/15 bg-[#171717] text-white" : "border-black/10 bg-white text-black"}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${darkMode?"bg-white/10":"bg-[#f5f5f3]"}`}><LoadLinkIcon name="truck" size={20}/></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold tracking-tight">Resume your listing</h2>
          <p className="mt-0.5 truncate text-sm font-medium">{identity || String(draft.title||category)}</p>
          <p className="mt-1 text-xs opacity-60">{category} · {stepName} · {updated}</p>
        </div>
        <button type="button" onClick={dismissPersistently} aria-label="Dismiss saved listing prompt"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${darkMode?"border-white/15":"border-black/10"}`}>
          <LoadLinkIcon name="close" size={17}/>
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 opacity-65">Your form details are saved on this device. Pick up where you stopped, or start a new listing.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={startFresh} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${darkMode?"border-white/20":"border-black/15"}`}>Start fresh</button>
        <button type="button" onClick={()=>{router.push(vehicleDraftHref(draft));dismissPersistently();}}
          className="min-h-11 rounded-xl bg-[#f6b800] px-3 text-sm font-bold text-black">Continue listing</button>
      </div>
    </section>
  );
}
