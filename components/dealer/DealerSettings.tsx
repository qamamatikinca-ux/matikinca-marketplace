"use client";

import { useEffect, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerBranch, DealerSettings as DealerSettingsType, DealerStaffMember } from "@/lib/dealer/types";
import { Input, Modal, PrimaryButton, SectionHeading, Select, SecondaryButton, Surface } from "./ui";

const defaults: DealerSettingsType = {
  stock_age_warning_days: 45,
  lead_response_warning_hours: 12,
  notify_new_leads: true,
  notify_overdue_followups: true,
  notify_inventory_attention: true,
  notify_marketing_opportunities: true,
  notify_billing: true,
  default_lead_owner: null,
  quote_valid_days: 7,
  branches: [],
};

export default function DealerSettings({ darkMode }: { darkMode: boolean }) {
  const [settings, setSettings] = useState<DealerSettingsType>(defaults);
  const [staff, setStaff] = useState<DealerStaffMember[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branch, setBranch] = useState({ name: "", location: "", phone: "", email: "", trading_hours: "", is_primary: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [data, team] = await Promise.all([
        dealerFetch<DealerSettingsType>("/api/dealer/settings"),
        dealerFetch<{ staff: DealerStaffMember[] }>("/api/dealer/team"),
      ]);
      setSettings({ ...defaults, ...data, branches: data.branches || [] });
      setStaff(team.staff || []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Dealer settings could not be loaded."); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    setBusy(true); setMessage("");
    try {
      await dealerFetch("/api/dealer/settings", { method: "POST", body: JSON.stringify({ action: "save", settings }) });
      setMessage("Dealer settings saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Dealer settings could not be saved."); }
    finally { setBusy(false); }
  }

  async function addBranch() {
    if (!branch.name.trim()) return;
    setBusy(true); setMessage("");
    try {
      await dealerFetch("/api/dealer/settings", { method: "POST", body: JSON.stringify({ action: "branch_create", ...branch }) });
      setBranchOpen(false); setBranch({ name: "", location: "", phone: "", email: "", trading_hours: "", is_primary: false }); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Branch could not be added."); }
    finally { setBusy(false); }
  }

  async function branchAction(id: string, action: "primary" | "deactivate") {
    setBusy(true); setMessage("");
    try { await dealerFetch("/api/dealer/settings", { method: "POST", body: JSON.stringify({ action: `branch_${action}`, branch_id: id }) }); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Branch could not be updated."); }
    finally { setBusy(false); }
  }

  const toggle = (key: keyof DealerSettingsType, label: string) => <label className={`flex min-h-14 items-center justify-between gap-4 border-b py-3 last:border-b-0 ${darkMode ? "border-white/8" : "border-black/8"}`}><span className="text-sm font-bold">{label}</span><input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="h-5 w-5 accent-[#f6b800]" /></label>;

  return <div className="grid gap-4">
    <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Dealer settings" detail="Defaults and alerts for the dealership workspace. These settings do not change LoadLink moderation rules." />{message ? <div className="mt-4 border-l-2 border-[#f6b800] pl-3 text-sm font-bold">{message}</div> : null}</Surface>

    <div className="grid gap-4 xl:grid-cols-2">
      <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Sales defaults" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Lead response warning<Input darkMode={darkMode} className="mt-1" type="number" min={1} max={72} value={settings.lead_response_warning_hours} onChange={(e) => setSettings({ ...settings, lead_response_warning_hours: Number(e.target.value) || 12 })} /></label><label className="text-xs font-black">Stock-age warning<Input darkMode={darkMode} className="mt-1" type="number" min={7} max={365} value={settings.stock_age_warning_days} onChange={(e) => setSettings({ ...settings, stock_age_warning_days: Number(e.target.value) || 45 })} /></label><label className="text-xs font-black">Quote validity<Select darkMode={darkMode} className="mt-1" value={String(settings.quote_valid_days)} onChange={(e) => setSettings({ ...settings, quote_valid_days: Number(e.target.value) })}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></Select></label><label className="text-xs font-black">Default lead owner<Select darkMode={darkMode} className="mt-1" value={settings.default_lead_owner || ""} onChange={(e) => setSettings({ ...settings, default_lead_owner: e.target.value || null })}><option value="">Person creating lead</option>{staff.filter((s) => s.is_active && s.user_id && ["owner","manager","sales_agent"].includes(s.role)).map((s) => <option key={s.id} value={s.user_id || ""}>{s.name || s.email || s.role}</option>)}</Select></label></div><div className="mt-5"><PrimaryButton type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</PrimaryButton></div></Surface>

      <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Dealer alerts" detail="Only useful, actionable notices should reach the team." /><div className="mt-3">{toggle("notify_new_leads", "New leads")}{toggle("notify_overdue_followups", "Overdue follow-ups")}{toggle("notify_inventory_attention", "Inventory attention")}{toggle("notify_marketing_opportunities", "Marketing opportunities")}{toggle("notify_billing", "Billing and renewal")}</div></Surface>
    </div>

    <Surface darkMode={darkMode} className="overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-current/10 p-4 sm:p-5"><SectionHeading title="Branches" detail="Keep dealership locations organised without creating separate accounts." /><PrimaryButton type="button" onClick={() => setBranchOpen(true)}>Add branch</PrimaryButton></div>{settings.branches.length ? <div className="divide-y divide-current/10">{settings.branches.map((b: DealerBranch) => <div key={b.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><div className="font-black">{b.name}</div>{b.is_primary ? <span className="border border-current/15 px-2 py-1 text-[10px] font-black">Primary</span> : null}{!b.is_active ? <span className="text-xs font-black text-red-500">Inactive</span> : null}</div><div className="mt-1 text-sm opacity-55">{[b.location, b.phone].filter(Boolean).join(" · ") || "Branch details not completed"}</div></div><div className="flex gap-2">{!b.is_primary && b.is_active ? <SecondaryButton darkMode={darkMode} type="button" onClick={() => branchAction(b.id, "primary")}>Make primary</SecondaryButton> : null}{b.is_active && !b.is_primary ? <SecondaryButton darkMode={darkMode} type="button" onClick={() => branchAction(b.id, "deactivate")}>Deactivate</SecondaryButton> : null}</div></div>)}</div> : <div className="p-5 text-sm opacity-55">Your main dealership location is used until additional branches are added.</div>}</Surface>

    <Modal open={branchOpen} onClose={() => setBranchOpen(false)} darkMode={darkMode} title="Add branch"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Branch name<Input darkMode={darkMode} className="mt-1" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} /></label><label className="text-xs font-black">Location<Input darkMode={darkMode} className="mt-1" value={branch.location} onChange={(e) => setBranch({ ...branch, location: e.target.value })} /></label><label className="text-xs font-black">Phone<Input darkMode={darkMode} className="mt-1" value={branch.phone} onChange={(e) => setBranch({ ...branch, phone: e.target.value })} /></label><label className="text-xs font-black">Email<Input darkMode={darkMode} className="mt-1" type="email" value={branch.email} onChange={(e) => setBranch({ ...branch, email: e.target.value })} /></label><label className="text-xs font-black sm:col-span-2">Trading hours<Input darkMode={darkMode} className="mt-1" value={branch.trading_hours} onChange={(e) => setBranch({ ...branch, trading_hours: e.target.value })} /></label></div><label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={branch.is_primary} onChange={(e) => setBranch({ ...branch, is_primary: e.target.checked })} className="h-5 w-5 accent-[#f6b800]" />Make this the primary branch</label><div className="mt-5 flex justify-end"><PrimaryButton type="button" disabled={busy || !branch.name.trim()} onClick={addBranch}>Add branch</PrimaryButton></div></Modal>
  </div>;
}
