"use client";

import { useRef, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import { Modal, PrimaryButton, SecondaryButton } from "./ui";

export default function DealerBulkImport({ darkMode, open, onClose, onDone }: { darkMode: boolean; open: boolean; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ total: number; ready: number; attention: number; invalid: number; errors?: string[] } | null>(null);
  const [error, setError] = useState("");

  async function upload() {
    if (!file || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const text = await file.text();
      const body = await dealerFetch<{ total: number; ready: number; attention: number; invalid: number; errors?: string[] }>("/api/dealer/bulk-import", { method: "POST", body: JSON.stringify({ filename: file.name, csv: text }) });
      setResult(body); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); }
    finally { setBusy(false); }
  }

  function downloadTemplate() {
    const csv = "title,year,brand,model,vehicle_type,price,city,mileage,transmission,fuel,condition\n2022,2022,Scania,R500,Truck,1450000,Centurion,350000,Automatic,Diesel,Used\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "loadlink-dealer-stock-template.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <Modal open={open} onClose={onClose} darkMode={darkMode} title="Import stock">
    <p className="text-sm leading-6 opacity-60">Upload a LoadLink CSV. Valid rows become drafts first; nothing is published automatically.</p>
    <div className="mt-5 flex flex-wrap gap-2"><SecondaryButton darkMode={darkMode} type="button" onClick={downloadTemplate}>Download template</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={() => ref.current?.click()}>Choose CSV</SecondaryButton></div>
    <input ref={ref} className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    {file ? <div className="mt-4 border border-current/10 px-4 py-3 text-sm font-bold">{file.name}</div> : null}
    {error ? <div className="mt-4 text-sm font-bold text-red-500">{error}</div> : null}
    {result ? <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-current/10 bg-current/10 sm:grid-cols-4">{[["Rows", result.total], ["Ready", result.ready], ["Attention", result.attention], ["Invalid", result.invalid]].map(([label, value]) => <div key={String(label)} className={`${darkMode ? "bg-[#111]" : "bg-white"} p-4`}><div className="text-xs font-black uppercase tracking-[.1em] opacity-40">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}</div> : null}
    {result?.errors?.length ? <div className="mt-4 max-h-36 overflow-y-auto border border-current/10 p-3 text-xs opacity-65">{result.errors.slice(0, 20).map((item) => <div key={item} className="py-1">{item}</div>)}</div> : null}
    <div className="mt-6 flex justify-end"><PrimaryButton type="button" disabled={!file || busy} onClick={upload}>{busy ? "Checking stock…" : "Import as drafts"}</PrimaryButton></div>
  </Modal>;
}
