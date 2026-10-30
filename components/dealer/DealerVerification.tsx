"use client";

import { useEffect, useState } from "react";
import { dealerFetch, removeDealerUpload, uploadDealerFile } from "@/lib/dealer/client";
import type { DealerVerificationDocument, DealerWorkspaceState } from "@/lib/dealer/types";
import DocumentUpload from "@/components/DocumentUpload";
import { PrimaryButton, SectionHeading, Surface } from "./ui";

const labels: Record<DealerVerificationDocument["document_type"], string> = {
  company_registration: "Company registration",
  tax: "Tax document",
  business_address: "Proof of business address",
  representative_authority: "Representative authority",
};

export default function DealerVerification({ darkMode, context }: { darkMode: boolean; context: DealerWorkspaceState }) {
  const [docs, setDocs] = useState<DealerVerificationDocument[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() { try { const r = await dealerFetch<{ documents: DealerVerificationDocument[] }>("/api/dealer/verification"); setDocs(r.documents || []); } catch { setDocs([]); } }
  useEffect(() => {
    let active = true;
    void dealerFetch<{ documents: DealerVerificationDocument[] }>("/api/dealer/verification").then(result => { if (active) setDocs(result.documents || []); }).catch(() => { if (active) setDocs([]); });
    return () => { active = false; };
  }, []);
  async function upload(pendingType: DealerVerificationDocument["document_type"], file: File | null) {
    if (!file) return; setBusy(pendingType); setMessage("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Verification files must be 10 MB or less.");
      const uploaded = await uploadDealerFile({ bucket: "dealership-documents", dealershipId: context.dealership_id, file, allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, folder: pendingType });
      try {
        await dealerFetch("/api/dealer/verification", { method: "POST", body: JSON.stringify({ action: "upload", document_type: pendingType, filename: file.name, mime: uploaded.mime, storage_path: uploaded.storage_path }) });
      } catch (e) { await removeDealerUpload("dealership-documents", uploaded.storage_path); throw e; }
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Document could not be uploaded."); }
    finally { setBusy(null); }
  }
  async function submit() { setMessage(""); try { await dealerFetch("/api/dealer/verification", { method: "POST", body: JSON.stringify({ action: "submit" }) }); setMessage("Verification submitted to LoadLink."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Verification could not be submitted."); } }

  const allReady = (Object.keys(labels) as DealerVerificationDocument["document_type"][]).every((type) => docs.some((doc) => doc.document_type === type && ["pending", "under_review", "approved"].includes(doc.status)));
  return <div className="grid gap-4"><Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Business verification" detail="Business authenticity is separate from billing and platform standing. Each document has its own review result." /><div className="mt-4 text-sm"><b className="capitalize">{context.verification_status.replaceAll("_", " ")}</b></div>{message ? <div className="mt-3 text-sm font-bold">{message}</div> : null}</Surface><Surface darkMode={darkMode} className="grid gap-3 p-4 sm:p-5">{(Object.keys(labels) as DealerVerificationDocument["document_type"][]).map((type) => { const doc = docs.find((item) => item.document_type === type); const status = doc?.status || "missing"; return <div key={type}><DocumentUpload label={labels[type]} required fileName={doc && status !== "missing" ? "Document attached" : undefined} accept="application/pdf,image/jpeg,image/png,image/webp" hint="PDF, JPG, PNG or WEBP · up to 10 MB" disabled={Boolean(busy)} status={busy === type ? "Uploading…" : undefined} onFile={file => void upload(type, file)} /><p className={`mt-2 px-4 text-xs ${status === "approved" ? "text-emerald-600" : status === "changes_required" || status === "rejected" ? "text-red-500" : "opacity-60"}`}>{status.replaceAll("_", " ")}{doc?.version ? ` · version ${doc.version}` : ""}{doc?.reason ? ` · ${doc.reason}` : ""}</p></div>; })}</Surface><div className="flex justify-end"><PrimaryButton type="button" disabled={!allReady || ["submitted", "under_review", "approved"].includes(context.verification_status)} onClick={submit}>Submit verification</PrimaryButton></div></div>;
}
