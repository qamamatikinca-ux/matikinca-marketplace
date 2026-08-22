"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ContractRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  poster_photo?: string | null;
  description?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  listing_kind?: string | null;
  status?: string | null;
  moderation_status?: string | null;
};

function isContract(row: ContractRow) {
  return String(row.listing_kind || "").toLowerCase() === "contract" || /^Listing type:\s*Contract/im.test(String(row.description || ""));
}

function extractDetails(description: string | null | undefined) {
  const source = String(description || "");
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields: Array<{ label: string; value: string }> = [];
  const body: string[] = [];
  for (const line of lines) {
    const match = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (match && !/^listing type$/i.test(match[1])) fields.push({ label: match[1].trim(), value: match[2].trim() });
    else if (!/^Listing type:/i.test(line)) body.push(line);
  }
  return { fields, body: body.join("\n") };
}

function whatsapp(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [row, setRow] = useState<ContractRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        const found = ((payload.rows || []) as ContractRow[]).find((item) => item.id === id && isContract(item) && (!item.status || item.status === "active") && (!item.moderation_status || item.moderation_status === "approved"));
        setRow(found || null);
      })
      .catch(() => { if (active) setRow(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const details = useMemo(() => extractDetails(row?.description), [row?.description]);
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const wa = whatsapp(row?.whatsapp_number || row?.contact_number);

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 md:pt-10">
        {loading ? (
          <div className={`h-[420px] animate-pulse rounded-[24px] border ${surface}`} />
        ) : !row ? (
          <section className={`rounded-[24px] border p-8 text-center ${surface}`}>
            <h1 className="text-3xl font-black">This contract is no longer available</h1>
            <p className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>It may have expired, been removed, or no longer be approved for the public marketplace.</p>
            <Link href="/contracts" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Browse current contracts</Link>
          </section>
        ) : (
          <>
            <section className={`overflow-hidden rounded-[24px] border ${surface}`}>
              {row.photos?.length ? (
                <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-[#111]">
                  {row.photos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt="" className="aspect-[16/9] w-full shrink-0 snap-center object-cover" />)}
                </div>
              ) : null}
              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-[#f6b800]/12 px-3 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#b78300]">Contract</span>
                    <h1 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-5xl">{row.title || "Logistics contract"}</h1>
                    <p className={`mt-2 text-sm font-semibold ${muted}`}>{[row.city, row.vehicle_group].filter(Boolean).join(" · ") || "South Africa"}</p>
                  </div>
                  <div className="shrink-0 sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.1em] opacity-45">Rate</p><p className="mt-1 text-2xl font-black text-[#b78300]">{row.rate || "On request"}</p></div>
                </div>

                {details.body ? <p className={`mt-6 whitespace-pre-wrap text-sm font-semibold leading-7 ${muted}`}>{details.body}</p> : null}

                {details.fields.length ? (
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {details.fields.map((field) => <div key={`${field.label}-${field.value}`} className={`rounded-[16px] border p-4 ${darkMode ? "border-white/9 bg-white/[.025]" : "border-black/8 bg-black/[.018]"}`}><p className="text-[9px] font-black uppercase tracking-[.1em] opacity-40">{field.label}</p><p className="mt-1.5 text-sm font-black leading-5">{field.value}</p></div>)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className={`mt-4 rounded-[22px] border p-5 ${surface}`}>
              <p className="text-[9px] font-black uppercase tracking-[.11em] opacity-40">Posted by</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-[#111] text-[#f6b800]">{row.poster_photo ? <img src={row.poster_photo} alt="" className="h-full w-full object-cover" /> : null}</div>
                <div className="min-w-0"><p className="truncate text-sm font-black">{row.posted_by || "LoadLink poster"}</p><p className={`mt-0.5 text-xs font-semibold ${muted}`}>Contact through LoadLink before agreeing to work.</p></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Message</Link>
                {row.contact_number ? <a href={`tel:${row.contact_number}`} className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/14" : "border-black/12"}`}>Call</a> : null}
                {wa ? <a href={`https://wa.me/${wa}`} className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/14" : "border-black/12"}`}>WhatsApp</a> : null}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
