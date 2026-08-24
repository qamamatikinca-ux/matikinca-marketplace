"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  updated_at: string;
};

type PendingChange = {
  flag: FeatureFlag;
  next: boolean;
};

export default function ReleaseControlsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    const roleResult = await supabase.rpc("loadlink_phase2_admin_role");
    const role = String(roleResult.data || "").toLowerCase();
    const canManage = role === "owner" || role === "admin";
    setAllowed(canManage);
    if (!canManage) {
      setLoading(false);
      return;
    }

    const result = await supabase.from("loadlink_feature_flags").select("key,enabled,updated_at").order("key");
    if (result.error) setError(result.error.message);
    else setFlags((result.data || []) as FeatureFlag[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function applyChange() {
    if (!pending || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const result = await supabase.rpc("loadlink_owner_set_feature_flag", {
      flag_key: pending.flag.key,
      next_enabled: pending.next,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(`${humanize(pending.flag.key)} is now ${pending.next ? "enabled" : "disabled"}.`);
    setPending(null);
    await load();
  }

  if (loading || allowed === null) return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-6xl text-sm font-bold text-black/45">Loading Release Controls…</div></main>;

  if (!allowed) {
    return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-3xl rounded-[26px] border border-black/10 bg-white p-7"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Control Centre</p><h1 className="mt-2 text-3xl font-black">Release Controls unavailable</h1><p className="mt-3 text-sm font-semibold leading-6 text-black/55">Runtime feature switches are restricted to Owner and Admin accounts.</p><Link href="/admin" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-xs font-black text-white">Back to Control Centre</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">Owner controls</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Release Controls</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/55">Change registered runtime switches without editing code. New flags cannot be created from this page, and every real state change is audited.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/command" className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-xs font-black">Owner Command</Link><Link href="/admin" className="inline-flex h-11 items-center rounded-full bg-black px-5 text-xs font-black text-white">Control Centre</Link></div>
        </header>

        {error ? <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
        {notice ? <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</div> : null}

        <section className="mt-6 rounded-[28px] border border-black/10 bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-2 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Registered switches</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Runtime features</h2></div><span className="text-[10px] font-bold text-black/35">{flags.length} registered</span></div>

          <div className="mt-5 space-y-3">
            {flags.length ? flags.map((flag) => (
              <article key={flag.key} className="flex flex-col gap-4 rounded-[20px] border border-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${flag.enabled ? "bg-emerald-100 text-emerald-800" : "bg-black/5 text-black/45"}`}>{flag.enabled ? "Enabled" : "Disabled"}</span><span className="text-[9px] font-black uppercase tracking-[.1em] text-black/30">Runtime flag</span></div><h3 className="mt-2 text-base font-black">{humanize(flag.key)}</h3><p className="mt-1 break-all font-mono text-[10px] font-bold text-black/35">{flag.key}</p><p className="mt-2 text-[10px] font-semibold text-black/35">Last changed {formatDate(flag.updated_at)}</p></div>
                <button type="button" onClick={() => setPending({ flag, next: !flag.enabled })} className={`h-10 shrink-0 rounded-full px-5 text-[11px] font-black ${flag.enabled ? "border border-black/10 bg-white text-black" : "bg-black text-white"}`}>{flag.enabled ? "Disable" : "Enable"}</button>
              </article>
            )) : <div className="rounded-[20px] border border-dashed border-black/15 p-7 text-center"><p className="text-sm font-black">No runtime flags registered</p><p className="mt-1 text-[11px] font-semibold text-black/40">Release Controls will remain empty until engineering registers a feature switch.</p></div>}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-black/10 bg-black p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Safety boundary</p><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/60">This screen changes only existing feature-flag state. It does not edit environment variables, database credentials, payment configuration, arbitrary application settings or deployment code.</p></section>
      </div>

      {pending ? <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]" role="dialog" aria-modal="true"><div className="w-full max-w-[460px] rounded-[26px] bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,.32)]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Confirm runtime change</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">{pending.next ? "Enable" : "Disable"} {humanize(pending.flag.key)}?</h2><p className="mt-3 text-sm font-semibold leading-6 text-black/50">This takes effect for code that reads this registered flag. The change will be recorded in the Control Centre audit trail.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPending(null)} className="h-11 rounded-full border border-black/10 px-5 text-xs font-black disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={() => void applyChange()} className="h-11 rounded-full bg-black px-5 text-xs font-black text-white disabled:opacity-50">{saving ? "Applying…" : pending.next ? "Enable feature" : "Disable feature"}</button></div></div></div> : null}
    </main>
  );
}

function humanize(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
