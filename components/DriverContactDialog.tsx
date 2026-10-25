"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";

export default function DriverContactDialog({ id, name, darkMode, onClose }: { id: string; name: string; darkMode: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  async function call() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: sessionError } = await browserSupabase().auth.getSession();
      if (sessionError) throw new Error("Your account could not be reached. Please retry.");
      if (!data.session) { router.push(`/login?next=${encodeURIComponent("/drivers")}`); return; }
      const response = await fetch(`/api/phase2/contact/${id}`, { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Driver contact is temporarily unavailable.");
      const number = String(result.phone || "").replace(/[^+0-9]/g, "");
      if (!/^\+?\d{7,15}$/.test(number)) throw new Error("This driver has no callable phone number. You can message them on LoadLink.");
      window.location.href = `tel:${number}`;
    } catch (failure) { setError(failure instanceof Error && failure.name !== "TimeoutError" ? failure.message : "Connection interrupted. Please retry."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="driver-contact-title" className={`m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border p-6 shadow-2xl backdrop:bg-black/60 ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`}>
    <h2 id="driver-contact-title" className="text-xl font-black">Contact {name}</h2>
    <p className="mt-2 text-sm opacity-65">Choose how you would like to get in touch about this driver profile.</p>
    <Link href={`/messages/drivers?driver=${encodeURIComponent(id)}`} className="mt-5 block rounded-2xl bg-[#f6b800] p-4 text-center font-bold text-black">Text on LoadLink</Link>
    <button type="button" disabled={busy} onClick={() => void call()} className="mt-3 w-full rounded-2xl border border-current/20 p-4 font-bold disabled:opacity-50">{busy ? "Connecting…" : "Call driver"}</button>
    {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
    <button type="button" onClick={onClose} className="mt-4 w-full p-2 text-sm underline">Close</button>
  </dialog>;
}
