"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  communicationAudienceLabels,
  communicationSurfaceLabels,
  isInternalLoadLinkPath,
  type CommunicationAudience,
  type CommunicationPosition,
  type CommunicationPriority,
  type CommunicationStatus,
  type CommunicationSurface,
  type LoadLinkCommunication,
  type LoadLinkCommunicationEvent,
} from "@/lib/loadlinkCommunications";
import { supabase } from "@/lib/supabaseClient";

type MetricMap = Record<string, { viewed: number; dismissed: number; acknowledged: number; cta_clicked: number }>;
type AudienceCounts = Partial<Record<CommunicationAudience, number>>;

type CampaignDraft = {
  title: string;
  message: string;
  audience: CommunicationAudience;
  surface: CommunicationSurface;
  position: CommunicationPosition;
  priority: CommunicationPriority;
  background_color: string;
  text_color: string;
  accent_color: string;
  starts_at: string;
  ends_at: string;
  dismissible: boolean;
  acknowledgement_required: boolean;
  cta_label: string;
  cta_url: string;
};

const EMPTY_DRAFT: CampaignDraft = {
  title: "",
  message: "",
  audience: "all",
  surface: "banner",
  position: "top",
  priority: "normal",
  background_color: "#111111",
  text_color: "#FFFFFF",
  accent_color: "#F6B800",
  starts_at: "",
  ends_at: "",
  dismissible: true,
  acknowledgement_required: false,
  cta_label: "",
  cta_url: "",
};

const POSITIONS: CommunicationPosition[] = ["top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right", "center"];
const SURFACES: CommunicationSurface[] = ["banner", "toast", "modal", "inbox"];
const AUDIENCES: CommunicationAudience[] = ["all", "drivers", "dealerships", "pro", "dealer"];

export default function CommunicationStudioPage() {
  const [campaigns, setCampaigns] = useState<LoadLinkCommunication[]>([]);
  const [metrics, setMetrics] = useState<MetricMap>({});
  const [audienceCounts, setAudienceCounts] = useState<AudienceCounts>({});
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setUserId(auth.user.id);

    const access = await supabase.rpc("loadlink_can_manage_communications");
    if (access.error || access.data !== true) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const [campaignResult, eventResult, countResult] = await Promise.all([
      supabase.from("loadlink_communication_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("loadlink_communication_events").select("campaign_id,event_type"),
      supabase.rpc("loadlink_admin_communication_audience_counts"),
    ]);

    if (campaignResult.error) setError(campaignResult.error.message);
    else setCampaigns((campaignResult.data || []) as LoadLinkCommunication[]);

    if (!eventResult.error) {
      const next: MetricMap = {};
      for (const row of (eventResult.data || []) as LoadLinkCommunicationEvent[]) {
        const current = next[row.campaign_id] || { viewed: 0, dismissed: 0, acknowledged: 0, cta_clicked: 0 };
        current[row.event_type] += 1;
        next[row.campaign_id] = current;
      }
      setMetrics(next);
    }

    if (!countResult.error && countResult.data && typeof countResult.data === "object") {
      setAudienceCounts(countResult.data as AudienceCounts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeCount = useMemo(() => campaigns.filter((item) => effectiveStatus(item) === "live").length, [campaigns]);
  const scheduledCount = useMemo(() => campaigns.filter((item) => effectiveStatus(item) === "scheduled").length, [campaigns]);

  function resetEditor() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError("");
    setNotice("");
  }

  function editCampaign(campaign: LoadLinkCommunication) {
    setEditingId(campaign.id);
    setDraft({
      title: campaign.title,
      message: campaign.message,
      audience: campaign.audience,
      surface: campaign.surface,
      position: campaign.position,
      priority: campaign.priority,
      background_color: campaign.background_color,
      text_color: campaign.text_color,
      accent_color: campaign.accent_color,
      starts_at: toLocalInput(campaign.starts_at),
      ends_at: toLocalInput(campaign.ends_at),
      dismissible: campaign.dismissible,
      acknowledgement_required: campaign.acknowledgement_required,
      cta_label: campaign.cta_label || "",
      cta_url: campaign.cta_url || "",
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(status: CommunicationStatus) {
    if (!userId || saving) return;
    setError("");
    setNotice("");

    const title = draft.title.trim();
    const message = draft.message.trim();
    const ctaLabel = draft.cta_label.trim();
    const ctaUrl = draft.cta_url.trim();
    if (!title || !message) {
      setError("Add a title and message before saving.");
      return;
    }
    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
      setError("CTA label and CTA destination must be used together.");
      return;
    }
    if (ctaUrl && !isInternalLoadLinkPath(ctaUrl)) {
      setError("CTA destination must be an internal LoadLink path such as /driver-profile.");
      return;
    }
    if (status === "scheduled" && !draft.starts_at) {
      setError("Choose a start date and time before scheduling.");
      return;
    }
    const startsAt = draft.starts_at ? new Date(draft.starts_at) : null;
    const endsAt = draft.ends_at ? new Date(draft.ends_at) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      setError("The start date is invalid.");
      return;
    }
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      setError("The end date is invalid.");
      return;
    }
    if (startsAt && endsAt && endsAt <= startsAt) {
      setError("End time must be after the start time.");
      return;
    }

    setSaving(true);
    const payload = {
      title,
      message,
      status,
      audience: draft.audience,
      surface: draft.surface,
      position: draft.surface === "modal" ? "center" : draft.position,
      priority: draft.priority,
      background_color: draft.background_color.toUpperCase(),
      text_color: draft.text_color.toUpperCase(),
      accent_color: draft.accent_color.toUpperCase(),
      starts_at: status === "live" && !startsAt ? new Date().toISOString() : startsAt?.toISOString() || null,
      ends_at: endsAt?.toISOString() || null,
      dismissible: draft.acknowledgement_required ? false : draft.dismissible,
      acknowledgement_required: draft.acknowledgement_required,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      updated_by: userId,
    };

    const result = editingId
      ? await supabase.from("loadlink_communication_campaigns").update(payload).eq("id", editingId)
      : await supabase.from("loadlink_communication_campaigns").insert({ ...payload, created_by: userId });

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(status === "live" ? "Published." : status === "scheduled" ? "Scheduled." : "Draft saved.");
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    await load();
  }

  async function changeStatus(id: string, status: CommunicationStatus) {
    if (!userId) return;
    setError("");
    const patch: Record<string, unknown> = { status, updated_by: userId };
    if (status === "live") patch.starts_at = new Date().toISOString();
    const result = await supabase.from("loadlink_communication_campaigns").update(patch).eq("id", id);
    if (result.error) setError(result.error.message);
    else await load();
  }

  if (loading || allowed === null) return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-6xl text-sm font-bold text-black/50">Loading Communication Studio…</div></main>;

  if (!allowed) {
    return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-3xl rounded-[26px] border border-black/10 bg-white p-7"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Control Centre</p><h1 className="mt-2 text-3xl font-black">Communication Studio is not assigned to this account.</h1><p className="mt-3 text-sm font-semibold leading-6 text-black/55">Publishing customer communication requires Owner/Admin access or an authorised Operations/marketing permission.</p><Link href="/admin" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-xs font-black text-white">Back to Control Centre</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">Customer operations</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Communication Studio</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/55">Publish controlled in-app updates without changing code. Audience, placement, timing and presentation are enforced by LoadLink.</p>
          </div>
          <Link href="/admin" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-xs font-black">Control Centre</Link>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Live now" value={activeCount} />
          <Stat label="Scheduled" value={scheduledCount} />
          <Stat label="Signed-in audience" value={audienceCounts.all ?? "—"} />
        </section>

        {error ? <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
        {notice ? <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</div> : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
          <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_18px_55px_rgba(0,0,0,.035)] sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Composer</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">{editingId ? "Edit communication" : "New communication"}</h2></div>
              {editingId ? <button type="button" onClick={resetEditor} className="rounded-full border border-black/10 px-4 py-2 text-[11px] font-black">Cancel edit</button> : null}
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Title"><input value={draft.title} maxLength={90} onChange={(e)=>setDraft((d)=>({...d,title:e.target.value}))} className={inputClass} placeholder="Clear, specific headline" /></Field>
              <Field label="Message"><textarea value={draft.message} maxLength={800} rows={5} onChange={(e)=>setDraft((d)=>({...d,message:e.target.value}))} className={`${inputClass} resize-y py-3`} placeholder="Tell customers exactly what is changing and what they need to do." /><p className="mt-1 text-right text-[10px] font-bold text-black/35">{draft.message.length}/800</p></Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Audience"><select value={draft.audience} onChange={(e)=>setDraft((d)=>({...d,audience:e.target.value as CommunicationAudience}))} className={inputClass}>{AUDIENCES.map((value)=><option key={value} value={value}>{communicationAudienceLabels[value]}{typeof audienceCounts[value] === "number" ? ` · ${audienceCounts[value]}` : ""}</option>)}</select></Field>
                <Field label="Style"><select value={draft.surface} onChange={(e)=>{const surface=e.target.value as CommunicationSurface;setDraft((d)=>({...d,surface,position:surface==="modal"?"center":d.position}));}} className={inputClass}>{SURFACES.map((value)=><option key={value} value={value}>{communicationSurfaceLabels[value]}</option>)}</select></Field>
                <Field label="Position"><select value={draft.surface === "modal" ? "center" : draft.position} disabled={draft.surface === "modal" || draft.surface === "inbox"} onChange={(e)=>setDraft((d)=>({...d,position:e.target.value as CommunicationPosition}))} className={`${inputClass} disabled:opacity-50`}>{POSITIONS.map((value)=><option key={value} value={value}>{labelize(value)}</option>)}</select></Field>
                <Field label="Priority"><select value={draft.priority} onChange={(e)=>setDraft((d)=>({...d,priority:e.target.value as CommunicationPriority}))} className={inputClass}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ColourField label="Background" value={draft.background_color} onChange={(value)=>setDraft((d)=>({...d,background_color:value}))} />
                <ColourField label="Text" value={draft.text_color} onChange={(value)=>setDraft((d)=>({...d,text_color:value}))} />
                <ColourField label="Accent" value={draft.accent_color} onChange={(value)=>setDraft((d)=>({...d,accent_color:value}))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts"><input type="datetime-local" value={draft.starts_at} onChange={(e)=>setDraft((d)=>({...d,starts_at:e.target.value}))} className={inputClass} /></Field>
                <Field label="Ends (optional)"><input type="datetime-local" value={draft.ends_at} onChange={(e)=>setDraft((d)=>({...d,ends_at:e.target.value}))} className={inputClass} /></Field>
              </div>

              <div className="grid gap-3 rounded-[20px] border border-black/10 bg-[#f7f6f1] p-4 sm:grid-cols-2">
                <Toggle label="Customer can dismiss" checked={draft.dismissible} disabled={draft.acknowledgement_required} onChange={(checked)=>setDraft((d)=>({...d,dismissible:checked}))} />
                <Toggle label="Require acknowledgement" checked={draft.acknowledgement_required} onChange={(checked)=>setDraft((d)=>({...d,acknowledgement_required:checked,dismissible:checked?false:d.dismissible}))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Action button label"><input value={draft.cta_label} maxLength={40} onChange={(e)=>setDraft((d)=>({...d,cta_label:e.target.value}))} className={inputClass} placeholder="Update profile" /></Field>
                <Field label="LoadLink destination"><input value={draft.cta_url} onChange={(e)=>setDraft((d)=>({...d,cta_url:e.target.value}))} className={inputClass} placeholder="/driver-profile" /></Field>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-black/10 pt-5">
                <button type="button" disabled={saving} onClick={()=>void save("draft")} className="h-11 rounded-full border border-black/10 px-5 text-xs font-black disabled:opacity-50">Save draft</button>
                <button type="button" disabled={saving} onClick={()=>void save("scheduled")} className="h-11 rounded-full border border-black bg-white px-5 text-xs font-black disabled:opacity-50">Schedule</button>
                <button type="button" disabled={saving} onClick={()=>void save("live")} className="h-11 rounded-full bg-black px-5 text-xs font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Publish now"}</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Live preview</p>
              <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-[22px] border border-black/10 bg-[#eceae3] p-4">
                <div className={`${draft.surface === "banner" ? "w-full" : "w-full max-w-sm"} relative rounded-[20px] border border-white/10 p-5 shadow-xl`} style={{backgroundColor:draft.background_color,color:draft.text_color}}>
                  {draft.priority !== "normal" ? <p className="text-[9px] font-black uppercase tracking-[.18em]" style={{color:draft.accent_color}}>{draft.priority}</p> : null}
                  <p className="mt-1 text-base font-black">{draft.title.trim() || "Announcement title"}</p>
                  <p className="mt-1.5 text-[11px] font-semibold leading-5 opacity-75">{draft.message.trim() || "Your customer message will appear here exactly as configured."}</p>
                  {draft.cta_label.trim() ? <span className="mt-4 inline-flex rounded-full px-4 py-2 text-[10px] font-black" style={{backgroundColor:draft.accent_color,color:readableText(draft.accent_color)}}>{draft.cta_label.trim()}</span> : null}
                  {draft.dismissible && !draft.acknowledgement_required ? <span className="absolute right-3 top-3 text-lg opacity-60">×</span> : null}
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold leading-5 text-black/45">Preview shows content and colour treatment. Final placement follows the selected style and position on the customer’s device.</p>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-black p-6 text-white">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Publishing guardrails</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/65">Customer actions stay inside LoadLink, required acknowledgements cannot be dismissed, and every create/update/publish decision is written to the Control Centre audit trail.</p>
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-[28px] border border-black/10 bg-white p-5 sm:p-7">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Campaigns</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Communication history</h2></div><button type="button" onClick={()=>void load()} className="rounded-full border border-black/10 px-4 py-2 text-[11px] font-black">Refresh</button></div>
          <div className="mt-5 space-y-3">
            {campaigns.length ? campaigns.map((campaign)=>{
              const state=effectiveStatus(campaign);const metric=metrics[campaign.id]||{viewed:0,dismissed:0,acknowledged:0,cta_clicked:0};
              return <article key={campaign.id} className="rounded-[20px] border border-black/10 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusChip status={state}/><span className="text-[10px] font-black uppercase tracking-[.12em] text-black/40">{communicationSurfaceLabels[campaign.surface]} · {communicationAudienceLabels[campaign.audience]}</span></div><h3 className="mt-2 text-lg font-black">{campaign.title}</h3><p className="mt-1 max-w-3xl text-[12px] font-semibold leading-5 text-black/50">{campaign.message}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-black/40"><span>{metric.viewed} seen</span><span>{metric.dismissed} dismissed</span><span>{metric.acknowledged} acknowledged</span><span>{metric.cta_clicked} action clicks</span>{campaign.starts_at?<span>Starts {formatDate(campaign.starts_at)}</span>:null}{campaign.ends_at?<span>Ends {formatDate(campaign.ends_at)}</span>:null}</div></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={()=>editCampaign(campaign)} className="h-9 rounded-full border border-black/10 px-4 text-[10px] font-black">Edit</button>{campaign.status==="live"?<button type="button" onClick={()=>void changeStatus(campaign.id,"paused")} className="h-9 rounded-full border border-black/10 px-4 text-[10px] font-black">Pause</button>:campaign.status!=="archived"?<button type="button" onClick={()=>void changeStatus(campaign.id,"live")} className="h-9 rounded-full bg-black px-4 text-[10px] font-black text-white">Publish</button>:null}{campaign.status!=="archived"?<button type="button" onClick={()=>void changeStatus(campaign.id,"archived")} className="h-9 rounded-full border border-black/10 px-4 text-[10px] font-black text-black/55">Archive</button>:null}</div></div></article>;
            }) : <div className="rounded-[20px] border border-dashed border-black/15 p-8 text-center"><p className="text-base font-black">No customer communications yet</p><p className="mt-2 text-xs font-semibold text-black/45">Create a draft above. Nothing reaches customers until you publish or schedule it.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass = "h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 text-[12px] font-bold text-black outline-none transition focus:border-[#f6b800]";

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-black/45">{label}</span>{children}</label>}
function ColourField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <Field label={label}><div className="flex h-11 items-center gap-2 rounded-[14px] border border-black/10 px-2"><input type="color" value={value} onChange={(e)=>onChange(e.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"/><span className="text-[11px] font-black">{value.toUpperCase()}</span></div></Field>}
function Toggle({label,checked,disabled=false,onChange}:{label:string;checked:boolean;disabled?:boolean;onChange:(checked:boolean)=>void}){return <label className={`flex items-center justify-between gap-3 ${disabled?"opacity-45":""}`}><span className="text-[11px] font-black">{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(e)=>onChange(e.target.checked)} className="h-4 w-4 accent-black"/></label>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="rounded-[20px] border border-black/10 bg-white px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[.13em] text-black/40">{label}</p><p className="mt-1 text-2xl font-black tracking-[-.04em]">{value}</p></div>}
function StatusChip({status}:{status:CommunicationStatus}){const cls=status==="live"?"bg-emerald-100 text-emerald-800":status==="scheduled"?"bg-amber-100 text-amber-800":status==="paused"?"bg-slate-100 text-slate-700":status==="archived"?"bg-black/5 text-black/45":"bg-[#f6b800]/20 text-[#725400]";return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${cls}`}>{status}</span>}
function effectiveStatus(campaign:LoadLinkCommunication):CommunicationStatus{if(campaign.status==="archived"||campaign.status==="paused"||campaign.status==="draft")return campaign.status;const now=Date.now();if(campaign.ends_at&&new Date(campaign.ends_at).getTime()<=now)return "archived";if(campaign.starts_at&&new Date(campaign.starts_at).getTime()>now)return "scheduled";return "live"}
function toLocalInput(value:string|null){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";const local=new Date(d.getTime()-d.getTimezoneOffset()*60_000);return local.toISOString().slice(0,16)}
function formatDate(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString("en-ZA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
function labelize(value:string){return value.split("-").map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ")}
function readableText(hex:string){const value=hex.replace("#","");if(value.length!==6)return "#000000";const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);return (r*299+g*587+b*114)/1000>145?"#000000":"#FFFFFF"}
