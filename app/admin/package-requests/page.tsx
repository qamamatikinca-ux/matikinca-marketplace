"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const OWNER_EMAIL = "loadlinksouthafrica@gmail.com";
type RequestRow = {
  id: string;
  user_id: string;
  requested_features: Record<string, unknown>;
  estimated_amount_cents: number;
  final_amount_cents?: number | null;
  recommended_plan?: string | null;
  status: string;
  admin_note?: string | null;
  created_at: string;
};

export default function PackageRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) { window.location.assign("/"); return; }
    const result = await supabase.from("custom_package_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (result.error) setMessage(result.error.message); else setRows((result.data || []) as RequestRow[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function review(row: RequestRow, status: "approved" | "rejected") {
    const suggested = Math.max(0, Math.round((row.final_amount_cents || row.estimated_amount_cents) / 100));
    const price = status === "approved" ? Number(window.prompt("Final monthly price in rand", String(suggested)) || suggested) : 0;
    const note = window.prompt(status === "approved" ? "Approval note (optional)" : "Reason for rejection", row.admin_note || "") || "";
    const result = await supabase.from("custom_package_requests").update({ status, final_amount_cents: status === "approved" ? Math.max(0, Math.round(price * 100)) : null, admin_note: note || null, reviewed_at: new Date().toISOString() }).eq("id", row.id);
    if (result.error) setMessage(result.error.message); else await load();
  }

  return <main className="min-h-screen bg-[#f4efe3] px-5 py-10 text-black"><div className="mx-auto max-w-6xl"><header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-4xl font-black tracking-[-.045em]">Tailored package requests</h1><p className="mt-2 text-sm font-semibold text-black/55">Review LoadLink Plan Guide estimates before a custom price can be activated.</p></div><Link href="/admin" className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black">Admin workspace</Link></header>{message?<p className="mt-5 rounded-xl border border-red-500/30 bg-red-50 p-4 text-sm font-bold">{message}</p>:null}{loading?<p className="mt-8 text-sm font-bold text-black/50">Loading requests…</p>:rows.length?<div className="mt-7 grid gap-4">{rows.map((row)=><article key={row.id} className="rounded-[24px] border border-black/10 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{row.status.replaceAll("_"," ")}</span><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{row.recommended_plan || "custom"}</span></div><p className="mt-3 text-xs font-bold text-black/45">User {row.user_id}</p><p className="mt-1 text-xs font-bold text-black/45">{new Date(row.created_at).toLocaleString("en-ZA")}</p></div><div className="text-right"><p className="text-xs font-black text-black/45">Guide estimate</p><p className="text-3xl font-black">R{Math.round(row.estimated_amount_cents/100).toLocaleString("en-ZA")}<span className="text-xs text-black/45">/mo</span></p>{row.final_amount_cents?<p className="mt-1 text-xs font-black text-emerald-600">Approved R{Math.round(row.final_amount_cents/100).toLocaleString("en-ZA")}/mo</p>:null}</div></div><pre className="mt-5 overflow-x-auto rounded-xl bg-[#f7f5ef] p-4 text-xs leading-6">{JSON.stringify(row.requested_features,null,2)}</pre><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>void review(row,"approved")} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Approve / set price</button><button type="button" onClick={()=>void review(row,"rejected")} className="rounded-xl border border-red-500 px-4 py-3 text-xs font-black text-red-600">Reject</button></div>{row.admin_note?<p className="mt-4 text-xs font-semibold text-black/55">Note: {row.admin_note}</p>:null}</article>)}</div>:<div className="mt-8 rounded-[24px] border border-black/10 bg-white p-8 text-center"><h2 className="text-2xl font-black">No tailored requests</h2><p className="mt-2 text-sm text-black/50">New requests from the packages page will appear here.</p></div>}</div></main>;
}
