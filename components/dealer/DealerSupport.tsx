"use client";

import { useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import { PrimaryButton, SectionHeading, Select, Surface, Textarea } from "./ui";

export default function DealerSupport({ darkMode }: { darkMode: boolean }) {
  const [category, setCategory] = useState("inventory"); const [message, setMessage] = useState(""); const [status, setStatus] = useState("");
  async function submit() { if (!message.trim()) return; setStatus(""); try { await dealerFetch("/api/dealer/support", { method: "POST", body: JSON.stringify({ category, message }) }); setMessage(""); setStatus("Dealer support case created."); } catch (e) { setStatus(e instanceof Error ? e.message : "Support case could not be created."); } }
  return <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Dealer support" detail="Your dealership, plan and account context are attached automatically so support does not start from zero." /><div className="mt-5 grid gap-3"><label className="text-xs font-black">Category<Select darkMode={darkMode} className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)}><option value="inventory">Inventory</option><option value="verification">Verification</option><option value="billing">Billing</option><option value="leads">Leads & messages</option><option value="technical">Technical</option><option value="other">Other</option></Select></label><label className="text-xs font-black">What do you need help with?<Textarea darkMode={darkMode} className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} /></label></div>{status ? <div className="mt-3 text-sm font-bold">{status}</div> : null}<div className="mt-5"><PrimaryButton type="button" onClick={submit}>Send to Dealer support</PrimaryButton></div></Surface>;
}
