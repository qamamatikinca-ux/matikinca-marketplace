"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Step = "phone" | "otp" | "documents" | "done";

export default function VerifyPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+27");
  const [token, setToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("south_african_id");
  const [last4, setLast4] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [company, setCompany] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setMessage("Sign in before starting account verification.");
    });
  }, []);

  async function sendOtp() {
    if (busy) return;
    setBusy(true); setMessage("");
    if (!isSupabaseConfigured) {
      setMessage("Verification is temporarily unavailable. Try again shortly.");
      setBusy(false); return;
    }
    const clean = phone.replace(/\s/g, "");
    const { error } = await supabase.auth.signInWithOtp({ phone: clean });
    setBusy(false);
    if (error) { setMessage("The SMS code could not be sent. Check the number and try again."); return; }
    setStep("otp");
    setMessage("Verification code sent by SMS.");
  }

  async function verifyOtp() {
    if (busy) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp({ phone: phone.replace(/\s/g, ""), token, type: "sms" });
    setBusy(false);
    if (error) { setMessage("That SMS code was not accepted. Check it and try again."); return; }
    setStep("documents");
    setMessage("Cellphone number verified. Complete the identity details below.");
  }

  async function upload(file: File, userId: string, label: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${userId}/${label}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("verification-documents").upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!idFile || !selfie) { setMessage("Add your identity document and a clear selfie."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const [idPath, selfiePath, companyPath] = await Promise.all([
        upload(idFile, user.id, "identity"),
        upload(selfie, user.id, "selfie"),
        company ? upload(company, user.id, "company") : Promise.resolve(null),
      ]);
      const { error } = await supabase.from("verification_requests").upsert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.replace(/\s/g, ""),
        id_type: idType,
        id_number_last4: last4,
        id_document_path: idPath,
        selfie_path: selfiePath,
        company_document_path: companyPath,
        status: "pending",
      }, { onConflict: "user_id" });
      if (error) throw error;
      setStep("done");
      setSubmissionSuccess(true);
      window.setTimeout(() => setSubmissionSuccess(false), 2100);
    } catch {
      setMessage("Your verification could not be submitted. Check the files and try again.");
    } finally { setBusy(false); }
  }

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const input = `mt-2 h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04] text-white" : "border-black/12 bg-[#fffdf8] text-black"}`;
  const stepNumber = step === "phone" ? 1 : step === "otp" ? 2 : step === "documents" ? 3 : 4;

  return (
    <main className={`min-h-screen ${page}`}>
      <SubmissionSuccess open={submissionSuccess} title="Verification sent" />
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-3xl px-4 py-7 sm:px-5 md:py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">Verify your identity</h1>
          <Link href="/verification-status" className={`hidden h-11 shrink-0 items-center rounded-xl border px-4 text-xs font-semibold sm:flex ${darkMode ? "border-white/12" : "border-black/12"}`}>Check status</Link>
        </div>

        <section className={`overflow-hidden rounded-[26px] border shadow-[0_16px_45px_rgba(0,0,0,.07)] ${surface}`}>
          <div className="p-5 sm:p-7">
            <div className="grid grid-cols-4 gap-2" aria-label="Verification progress">
              {[[1,"Phone"],[2,"Code"],[3,"Identity"],[4,"Review"]].map(([number,label]) => {
                const active = stepNumber >= Number(number);
                return <div key={String(label)} className="min-w-0 text-center"><div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 text-white/35" : "border-black/12 text-black/35"}`}>{number}</div><p className={`mt-2 truncate text-[10px] font-black uppercase tracking-[.08em] ${active ? "opacity-80" : "opacity-35"}`}>{label}</p></div>;
              })}
            </div>

            {step === "phone" ? <div className="mt-6"><label className="block text-sm font-black">South African cellphone number<input className={input} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label><button disabled={busy} onClick={() => void sendOtp()} className="mt-5 h-13 w-full rounded-2xl bg-black font-black text-[#f6b800] disabled:opacity-50 dark:bg-[#f6b800] dark:text-black">{busy ? "Sending…" : "Send verification code"}</button></div> : null}

            {step === "otp" ? <div className="mt-6"><label className="block text-sm font-black">SMS verification code<input className={`${input} text-center text-xl font-black tracking-[.28em]`} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" /></label><button disabled={busy || token.length !== 6} onClick={() => void verifyOtp()} className="mt-5 h-13 w-full rounded-2xl bg-[#f6b800] font-black text-black disabled:opacity-50">{busy ? "Checking…" : "Verify number"}</button><button type="button" onClick={() => { setStep("phone"); setToken(""); setMessage(""); }} className={`mt-3 h-11 w-full rounded-xl border text-xs font-black ${darkMode ? "border-white/12" : "border-black/12"}`}>Use a different number</button></div> : null}

            {step === "documents" ? <form onSubmit={submit} className="mt-6 grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-black">Full legal name<input required className={input} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label className="block text-sm font-black">Document type<select className={input} value={idType} onChange={(event) => setIdType(event.target.value)}><option value="south_african_id">South African ID</option><option value="passport">Passport</option></select></label></div><label className="block text-sm font-black">Last four digits of ID or passport<input required className={input} value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" maxLength={4} /></label><FileField label="Identity document" required onChange={setIdFile} darkMode={darkMode} /><FileField label="Clear selfie showing your face" required onChange={setSelfie} darkMode={darkMode} /><FileField label="Company registration document (optional)" onChange={setCompany} darkMode={darkMode} /><button disabled={busy} className="h-13 w-full rounded-2xl bg-[#f6b800] font-black text-black disabled:opacity-50">{busy ? "Submitting…" : "Submit for verification"}</button></form> : null}

            {step === "done" ? <div className="mt-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12 text-xl font-black text-emerald-500">✓</div><h2 className="mt-4 text-2xl font-black">Submission received</h2><p className={`mx-auto mt-2 max-w-md text-sm font-semibold leading-6 ${muted}`}>We'll update your status after review.</p><Link href="/verification-status" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-black font-semibold text-[#f6b800] dark:bg-[#f6b800] dark:text-black">View status</Link></div> : null}

            {message ? <p role="status" className={`mt-5 rounded-2xl border p-4 text-sm font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.03] text-white/68" : "border-black/10 bg-black/[.02] text-black/68"}`}>{message}</p> : null}
          </div>
        </section>
        <Link href="/verification-status" className={`mt-4 flex h-11 items-center justify-center rounded-xl border text-xs font-semibold sm:hidden ${darkMode ? "border-white/12" : "border-black/12"}`}>Check verification status</Link>
      </section>
    </main>
  );
}

function FileField({ label, required, onChange, darkMode }: { label: string; required?: boolean; onChange: (file: File | null) => void; darkMode: boolean }) {
  return <label className="block text-sm font-black">{label}<input required={required} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => onChange(event.target.files?.[0] || null)} className={`mt-2 block w-full rounded-2xl border p-3 text-xs font-semibold file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-3 file:py-2 file:font-black file:text-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04] text-white file:bg-[#f6b800] file:text-black" : "border-black/12 bg-[#fffdf8] text-black"}`} /></label>;
}
