"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerAppointment, DealerInsight, DealerInventoryItem, DealerLead, DealerProfile, DealerSection, DealerStaffMember, DealerSummary, DealerWorkspaceState } from "@/lib/dealer/types";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import DealerActivity from "./DealerActivity";
import DealerAnalytics from "./DealerAnalytics";
import DealerBilling from "./DealerBilling";
import DealerCustomers from "./DealerCustomers";
import DealerInventory from "./DealerInventory";
import DealerLeads from "./DealerLeads";
import DealerMarketing from "./DealerMarketing";
import DealerMessages from "./DealerMessages";
import DealerOverview from "./DealerOverview";
import DealerReviews from "./DealerReviews";
import DealerShell from "./DealerShell";
import DealerShowroom from "./DealerShowroom";
import DealerSettings from "./DealerSettings";
import DealerSupport from "./DealerSupport";
import DealerTeam from "./DealerTeam";
import DealerVerification from "./DealerVerification";
import { PrimaryButton, Surface } from "./ui";

const emptySummary: DealerSummary = { live_stock: 0, draft_stock: 0, pending_stock: 0, reserved_stock: 0, sold_30d: 0, new_leads: 0, overdue_followups: 0, unread_messages: 0, appointments_today: 0, quotes_open: 0, stock_views_30d: 0, leads_30d: 0, response_rate: 0, avg_response_minutes: null, followers: 0, active_statuses: 0, profile_completion: 0 };

export default function DealerWorkspace() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<DealerWorkspaceState | null>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [summary, setSummary] = useState<DealerSummary>(emptySummary);
  const [insights, setInsights] = useState<DealerInsight[]>([]);
  const [leads, setLeads] = useState<DealerLead[]>([]);
  const [inventory, setInventory] = useState<DealerInventoryItem[]>([]);
  const [appointments, setAppointments] = useState<DealerAppointment[]>([]);
  const [staff, setStaff] = useState<DealerStaffMember[]>([]);
  const [section, setSection] = useState<DealerSection>((params.get("section") as DealerSection) || "overview");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successText, setSuccessText] = useState({ title: "Done", message: "LoadLink updated your dealership." });
  const refreshTimer = useRef<number | null>(null);
  const refreshRunning = useRef(false);
  const refreshAgain = useRef(false);

  const refreshCore = useCallback(async () => {
    if (refreshRunning.current) { refreshAgain.current = true; return; }
    refreshRunning.current = true;
    try {
      const [summaryData, intelligence, leadData, inventoryData, appointmentData, teamData] = await Promise.allSettled([
        dealerFetch<DealerSummary>("/api/dealer/summary"),
        dealerFetch<{ items: DealerInsight[] }>("/api/dealer/intelligence"),
        dealerFetch<{ items: DealerLead[] }>("/api/dealer/leads?page=1&page_size=6&scope=mine"),
        dealerFetch<{ items: DealerInventoryItem[] }>("/api/dealer/inventory?page=1&page_size=60&stock=all&publication=all&moderation=all&sort=newest"),
        dealerFetch<{ items: DealerAppointment[] }>("/api/dealer/appointments?range=today"),
        dealerFetch<{ staff: DealerStaffMember[] }>("/api/dealer/team"),
      ]);
      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (intelligence.status === "fulfilled") setInsights(intelligence.value.items || []);
      if (leadData.status === "fulfilled") setLeads(leadData.value.items || []);
      if (inventoryData.status === "fulfilled") setInventory(inventoryData.value.items || []);
      if (appointmentData.status === "fulfilled") setAppointments(appointmentData.value.items || []);
      if (teamData.status === "fulfilled") setStaff(teamData.value.staff || []);
    } finally {
      refreshRunning.current = false;
      if (refreshAgain.current) { refreshAgain.current = false; void refreshCore(); }
    }
  }, []);

  const queueRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => { refreshTimer.current = null; void refreshCore(); }, 300);
  }, [refreshCore]);

  const boot = useCallback(async () => {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) { window.location.assign(loginHref("/dealer")); return; }
    try {
      const data = await dealerFetch<{ context: DealerWorkspaceState | null; profile: DealerProfile | null }>("/api/dealer/context");
      setContext(data.context); setProfile(data.profile);
      if (data.context?.dealership_id) await refreshCore();
    } catch (e) { setError(e instanceof Error ? e.message : "Dealer could not be opened."); }
    finally { setLoading(false); }
  }, [refreshCore]);

  useEffect(() => { void boot(); }, [boot]);
  useEffect(() => {
    if (!context?.dealership_id) return;
    const channel = supabase.channel(`dealer-${context.dealership_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications" }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_leads", filter: `dealership_id=eq.${context.dealership_id}` }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_listings", filter: `dealership_id=eq.${context.dealership_id}` }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_statuses", filter: `dealership_id=eq.${context.dealership_id}` }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_updates", filter: `dealership_id=eq.${context.dealership_id}` }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_staff", filter: `dealership_id=eq.${context.dealership_id}` }, queueRefresh)
      .subscribe();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [context?.dealership_id, queueRefresh]);

  const validSection = useMemo(() => section || "overview", [section]);
  function navigate(next: DealerSection) { setSection(next); window.history.replaceState({}, "", `/dealer?section=${next}`); }
  function openSuccess(title: string, message: string) { setSuccessText({ title, message }); setSuccess(true); window.setTimeout(() => setSuccess(false), 1800); }
  function addVehicle() { if (!context?.dealership_id) return; window.location.assign(`/list-your-vehicle?plan=dealer&dealership=${context.dealership_id}`); }

  if (loading) return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`}><div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4"><Surface darkMode={darkMode} className="w-full p-8 text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><div className="mt-4 text-sm font-black">Opening Dealer</div></Surface></div></main>;
  if (error && !context) return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`}><div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4"><Surface darkMode={darkMode} className="w-full p-8"><h1 className="text-xl font-black">Dealer could not open</h1><p className="mt-2 text-sm opacity-60">{error}</p><PrimaryButton type="button" className="mt-5" onClick={() => void boot()}>Try again</PrimaryButton></Surface></div></main>;
  if (!context || !profile) return <DealerOnboarding darkMode={darkMode} toggleTheme={toggleTheme} onCreated={boot} />;

  return <><SubmissionSuccess open={success} title={successText.title} message={successText.message} /><DealerShell darkMode={darkMode} toggleTheme={toggleTheme} profile={profile} context={context} section={validSection} setSection={navigate} onAddVehicle={addVehicle}>
    {validSection === "overview" ? <DealerOverview darkMode={darkMode} context={context} summary={summary} leads={leads} appointments={appointments} insights={insights} inventory={inventory} setSection={navigate} onRefresh={refreshCore} /> : null}
    {validSection === "inventory" ? <DealerInventory darkMode={darkMode} context={context} onAddVehicle={addVehicle} /> : null}
    {validSection === "leads" ? <DealerLeads darkMode={darkMode} context={context} inventory={inventory} staff={staff} /> : null}
    {validSection === "customers" ? <DealerCustomers darkMode={darkMode} /> : null}
    {validSection === "messages" ? <DealerMessages darkMode={darkMode} /> : null}
    {validSection === "analytics" ? <DealerAnalytics darkMode={darkMode} /> : null}
    {validSection === "marketing" ? <DealerMarketing darkMode={darkMode} context={context} inventory={inventory} insights={insights} /> : null}
    {validSection === "team" ? <DealerTeam darkMode={darkMode} context={context} /> : null}
    {validSection === "showroom" ? <DealerShowroom darkMode={darkMode} profile={profile} context={context} onProfile={(next) => { setProfile(next); openSuccess("Showroom saved", "Your dealership details are up to date."); }} /> : null}
    {validSection === "verification" ? <DealerVerification darkMode={darkMode} context={context} /> : null}
    {validSection === "billing" ? <DealerBilling darkMode={darkMode} context={context} /> : null}
    {validSection === "reviews" ? <DealerReviews darkMode={darkMode} /> : null}
    {validSection === "activity" ? <DealerActivity darkMode={darkMode} /> : null}
    {validSection === "settings" ? <DealerSettings darkMode={darkMode} /> : null}
    {validSection === "support" ? <DealerSupport darkMode={darkMode} /> : null}
  </DealerShell></>;
}

function DealerOnboarding({ darkMode, toggleTheme, onCreated }: { darkMode: boolean; toggleTheme: () => void; onCreated: () => void }) {
  const [name, setName] = useState(""); const [location, setLocation] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function create() { if (!name.trim()) return; setBusy(true); setMessage(""); try { await dealerFetch("/api/dealer/context", { method: "POST", body: JSON.stringify({ action: "create_profile", name, location }) }); await onCreated(); } catch (e) { setMessage(e instanceof Error ? e.message : "Dealer profile could not be created."); } finally { setBusy(false); } }
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black"}`}><div className="mx-auto flex min-h-screen max-w-xl items-center px-4"><Surface darkMode={darkMode} className="w-full p-6 sm:p-8"><div className="text-xs font-black uppercase tracking-[.12em] opacity-40">Dealer</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Set up your dealership</h1><p className="mt-2 text-sm leading-6 opacity-60">Create the private workspace first. You can prepare stock and your showroom while business verification is completed.</p><div className="mt-6 grid gap-3"><input className={`h-12 border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#141414]" : "border-black/10 bg-white"}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dealership name" /><input className={`h-12 border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#141414]" : "border-black/10 bg-white"}`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / location" /></div>{message ? <div className="mt-3 text-sm font-bold text-red-500">{message}</div> : null}<div className="mt-5 flex items-center justify-between"><button type="button" onClick={toggleTheme} className="text-xs font-black opacity-50">Change theme</button><PrimaryButton type="button" disabled={busy || !name.trim()} onClick={create}>{busy ? "Creating…" : "Create Dealer workspace"}</PrimaryButton></div></Surface></div></main>;
}

export function DealerWorkspaceSuspense() {
  return <Suspense fallback={null}><DealerWorkspace /></Suspense>;
}
