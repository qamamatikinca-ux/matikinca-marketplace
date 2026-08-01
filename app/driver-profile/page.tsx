"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import { browserSupabase } from "@/lib/phase2/supabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Doc = { id: string; document_type: string; original_filename: string; size_bytes: number };
type FormState = {
  full_name: string;
  headline: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  years_experience: number;
  licence_code: string;
  prdp_required: boolean;
  prdp_expiry: string;
  vehicle_types: string;
  route_experience: string;
  languages: string;
  previous_roles: string;
  availability: string;
  bio: string;
  status?: string;
  review_reason?: string;
  missing_document_type?: string;
};

const EMPTY: FormState = { full_name: "", headline: "", city: "", province: "", phone: "", email: "", years_experience: 0, licence_code: "", prdp_required: false, prdp_expiry: "", vehicle_types: "", route_experience: "", languages: "", previous_roles: "", availability: "Available immediately", bio: "" };
const LABELS: Record<string, string> = { identity: "ID or passport", drivers_licence: "Driver’s licence", prdp: "PrDP", cv: "CV", driving_certificate: "Relevant driving certificate" };

export default function DriverProfilePage() {
  const { darkMode } = useLoadLinkTheme();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const documentMap = useMemo(() => Object.fromEntries(docs.map((document) => [document.document_type, document])), [docs]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/58" : "text-black/58";
  const input = `mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white placeholder:text-white/30" : "border-black/15 bg-white text-black placeholder:text-black/30"}`;
  const textarea = `${input} h-auto min-h-28 py-3`;

  async function authToken() {
    const { data } = await browserSupabase().auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function load() {
    setLoading(true);
    try {
      const nextToken = await authToken();
      if (!nextToken) {
        window.location.href = `/login?next=${encodeURIComponent("/driver-profile")}`;
        return;
      }
      setToken(nextToken);
      const response = await fetch("/api/phase2/me", { headers: { Authorization: `Bearer ${nextToken}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The profile could not be loaded.");
      if (result.profile) {
        setForm({
          ...EMPTY,
          ...result.profile,
          vehicle_types: (result.profile.vehicle_types ?? []).join(", "),
          route_experience: (result.profile.route_experience ?? []).join(", "),
          languages: (result.profile.languages ?? []).join(", "),
          prdp_expiry: result.profile.prdp_expiry ?? "",
        });
      }
      setDocs(result.documents ?? []);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "The profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    return {
      ...form,
      vehicle_types: form.vehicle_types.split(",").map((value) => value.trim()).filter(Boolean),
      route_experience: form.route_experience.split(",").map((value) => value.trim()).filter(Boolean),
      languages: form.languages.split(",").map((value) => value.trim()).filter(Boolean),
    };
  }

  async function saveProfile(showConfirmation = true) {
    const activeToken = token || await authToken();
    if (!activeToken) throw new Error("Sign in is required.");
    const response = await fetch("/api/phase2/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
      body: JSON.stringify(payload()),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The profile could not be saved.");
    if (showConfirmation) {
      setMessageType("success");
      setMessage("Driver profile details saved.");
    }
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await saveProfile(true);
      await load();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "The profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(type: string, file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const activeToken = token || await authToken();
      if (!activeToken) throw new Error("Sign in is required.");
      const data = new FormData();
      data.append("documentType", type);
      data.append("file", file);
      const response = await fetch("/api/phase2/documents", { method: "POST", headers: { Authorization: `Bearer ${activeToken}` }, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setMessageType("success");
      setMessage(`${LABELS[type]} uploaded successfully.`);
      await load();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      await saveProfile(false);
      const activeToken = token || await authToken();
      const response = await fetch("/api/phase2/submit", { method: "POST", headers: { Authorization: `Bearer ${activeToken}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed.");
      setMessageType("success");
      setMessage("Your driver profile was submitted for review.");
      await load();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  const uploads = [["identity", true], ["drivers_licence", true], ["prdp", form.prdp_required], ["cv", false], ["driving_certificate", false]] as const;
  const status = (form.status || "draft").replaceAll("_", " ");

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[60px_1fr_60px] items-center px-4 md:grid-cols-[150px_1fr_150px] md:px-7">
          <SiteMenu darkMode={darkMode} />
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <div className="justify-self-end"><AuthStatusButton darkMode={darkMode} /></div>
        </div>
      </header>

      <section className="relative min-h-[300px] overflow-hidden bg-black text-white md:min-h-[390px]">
        <img src="/images/jobs/hero.jpg" alt="Professional truck driver profile on LoadLink" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
        <div className="relative mx-auto flex min-h-[300px] max-w-6xl flex-col justify-end px-5 pb-8 md:min-h-[390px] md:px-7 md:pb-11">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-black">Driver profile</span><span className="rounded-full border border-white/25 bg-black/45 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white">{status}</span></div>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.055em] sm:text-5xl md:text-7xl">Present your experience professionally</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/72 md:text-base">Build one LoadLink profile that truck owners and logistics businesses can review when they need an experienced driver.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 md:px-7 md:py-11">
        {loading ? <div className={`rounded-[24px] border p-6 ${surface}`}><p className={`text-sm font-bold ${muted}`}>Loading your driver profile…</p></div> : null}

        {form.review_reason ? (
          <section className={`loadlink-rejection-panel rounded-[24px] border p-5 ${darkMode ? "border-red-500/45 bg-red-950/25" : "border-red-400 bg-red-50"}`}>
            <h2 className="text-xl font-black">Review feedback</h2>
            <p className="mt-2 text-sm font-semibold leading-6">{form.review_reason}</p>
            {form.missing_document_type ? <p className="mt-3 text-xs font-black uppercase tracking-[.1em]">Requested document: {LABELS[form.missing_document_type]}</p> : null}
          </section>
        ) : null}

        {message ? <div role="status" className={`rounded-2xl border px-5 py-4 text-sm font-bold leading-6 ${messageType === "error" ? darkMode ? "border-red-500/45 bg-red-950/25 text-red-100" : "border-red-400 bg-red-50 text-red-900" : messageType === "success" ? darkMode ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-100" : "border-emerald-500/35 bg-emerald-50 text-emerald-900" : darkMode ? "border-[#f6b800]/30 bg-[#f6b800]/10 text-[#ffd760]" : "border-[#d79f00]/35 bg-[#fff5ce] text-[#5f4600]"}`}>{message}</div> : null}

        <form onSubmit={save} className="grid gap-6">
          <section className={`overflow-hidden rounded-[28px] border ${surface}`}>
            <SectionHeading title="Professional information" copy="Use accurate details that help businesses understand your experience and availability." darkMode={darkMode} />
            <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
              <Field label="Full name"><input className={input} value={form.full_name} onChange={(event) => field("full_name", event.target.value)} required /></Field>
              <Field label="Professional headline"><input className={input} value={form.headline} onChange={(event) => field("headline", event.target.value)} placeholder="Code 14 long-distance driver" /></Field>
              <Field label="City"><input className={input} value={form.city} onChange={(event) => field("city", event.target.value)} required /></Field>
              <Field label="Province"><input className={input} value={form.province} onChange={(event) => field("province", event.target.value)} required /></Field>
              <Field label="Contact number"><input className={input} value={form.phone} onChange={(event) => field("phone", event.target.value)} required /></Field>
              <Field label="Email"><input className={input} type="email" value={form.email} onChange={(event) => field("email", event.target.value)} required /></Field>
              <Field label="Years of experience"><input className={input} type="number" min="0" max="60" value={form.years_experience} onChange={(event) => field("years_experience", Number(event.target.value))} /></Field>
              <Field label="Licence code"><input className={input} value={form.licence_code} onChange={(event) => field("licence_code", event.target.value)} placeholder="e.g. EC / Code 14" required /></Field>
              <Field label="Vehicle experience"><input className={input} value={form.vehicle_types} onChange={(event) => field("vehicle_types", event.target.value)} placeholder="Truck, tanker, refrigerated truck" required /></Field>
              <Field label="Route experience"><input className={input} value={form.route_experience} onChange={(event) => field("route_experience", event.target.value)} placeholder="Gauteng, Durban, cross-border" /></Field>
              <Field label="Languages"><input className={input} value={form.languages} onChange={(event) => field("languages", event.target.value)} placeholder="English, isiXhosa" /></Field>
              <Field label="Availability"><input className={input} value={form.availability} onChange={(event) => field("availability", event.target.value)} /></Field>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 md:col-span-2 ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#faf9f5]"}`}><input type="checkbox" checked={form.prdp_required} onChange={(event) => field("prdp_required", event.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" /><span><strong className="block text-sm font-black">PrDP applies to the work I am seeking</strong><span className={`mt-1 block text-xs leading-5 ${muted}`}>Enable this only when the driving work requires a valid Professional Driving Permit.</span></span></label>
              {form.prdp_required ? <Field label="PrDP expiry"><input className={input} type="date" value={form.prdp_expiry} onChange={(event) => field("prdp_expiry", event.target.value)} /></Field> : null}
              <Field label="Previous roles and experience" wide><textarea className={textarea} value={form.previous_roles} onChange={(event) => field("previous_roles", event.target.value)} rows={4} placeholder="Briefly describe previous employers, vehicle types, routes or responsibilities." /></Field>
              <Field label="Professional summary" wide><textarea className={textarea} value={form.bio} onChange={(event) => field("bio", event.target.value)} rows={4} placeholder="Write a clear summary businesses can read on your public profile." /></Field>
            </div>
            <div className={`border-t p-5 md:p-7 ${darkMode ? "border-white/10" : "border-black/10"}`}><button disabled={busy || loading} type="submit" className="h-13 w-full rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-50">{busy ? "Saving…" : "Save profile details"}</button></div>
          </section>
        </form>

        <section className={`overflow-hidden rounded-[28px] border ${surface}`}>
          <SectionHeading title="Essential documents" copy="Only the documents needed to confirm your identity and driving credentials are requested." darkMode={darkMode} />
          <div className="grid gap-4 p-5 md:grid-cols-2 md:p-7">
            {uploads.map(([type, required]) => <DocumentUpload key={type} label={LABELS[type]} required={required} fileName={documentMap[type]?.original_filename} busy={busy} darkMode={darkMode} onFile={(file) => void upload(type, file)} />)}
          </div>
          <div className={`border-t px-5 py-4 text-xs font-semibold leading-6 md:px-7 ${darkMode ? "border-white/10 text-white/48" : "border-black/10 text-black/48"}`}>ID or passport and driver’s licence are required. PrDP is required only when applicable. CV and a relevant driving certificate are optional.</div>
        </section>

        <section className="rounded-[28px] border border-[#f6b800]/35 bg-black p-5 text-white md:p-7">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div><h2 className="text-2xl font-black">Ready for LoadLink review?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Save your latest details, upload the required documents and submit once. Your profile appears publicly only after approval.</p></div>
            <button className="h-13 rounded-xl bg-[#f6b800] px-7 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-50" disabled={busy || loading || form.status === "pending"} type="button" onClick={() => void submit()}>{form.status === "pending" ? "Review in progress" : busy ? "Submitting…" : "Submit profile for review"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ title, copy, darkMode }: { title: string; copy: string; darkMode: boolean }) {
  return <div className={`border-b px-5 py-5 md:px-7 ${darkMode ? "border-white/10" : "border-black/10"}`}><h2 className="text-3xl font-black tracking-[-.04em]">{title}</h2><p className={`mt-2 max-w-3xl text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{copy}</p></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "block md:col-span-2" : "block"}><span className="text-xs font-black">{label}</span>{children}</label>;
}

function DocumentUpload({ label, required, fileName, busy, darkMode, onFile }: { label: string; required: boolean; fileName?: string; busy: boolean; darkMode: boolean; onFile: (file: File | null) => void }) {
  return <label className={`flex min-h-32 cursor-pointer flex-col justify-between rounded-2xl border p-4 transition hover:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#faf9f5]"}`}><span><strong className="block text-sm font-black">{label}</strong><span className={`mt-1 block text-[10px] font-black uppercase tracking-[.1em] ${required ? "text-[#c08b00]" : darkMode ? "text-white/40" : "text-black/40"}`}>{required ? "Required" : "Optional"}</span></span><span className={`mt-4 truncate text-xs font-semibold ${darkMode ? "text-white/55" : "text-black/55"}`}>{fileName || "Choose PDF, JPG or PNG"}</span><input disabled={busy} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => onFile(event.target.files?.[0] ?? null)} className="hidden" /></label>;
}
