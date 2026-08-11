"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { browserSupabase } from "@/lib/phase2/supabase";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/southAfricaLocations";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Doc = { id: string; document_type: string; original_filename: string; size_bytes: number; mime_type?: string; uploaded_at?: string };
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
  profile_status?: string;
  review_reason?: string;
  missing_document_type?: string;
};

type MessageType = "success" | "error" | "info";

const EMPTY: FormState = {
  full_name: "", headline: "", city: "", province: "", phone: "", email: "", years_experience: 0,
  licence_code: "", prdp_required: false, prdp_expiry: "", vehicle_types: "", route_experience: "", languages: "",
  previous_roles: "", availability: "Available immediately", bio: "",
};

const LABELS: Record<string, string> = {
  identity: "ID or passport",
  drivers_licence: "Driver’s licence",
  prdp: "PrDP",
  cv: "CV",
  driving_certificate: "Relevant driving certificate",
};

const STEP_LABELS = ["Personal", "Driving", "Availability", "Documents", "Review"];
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function cleanMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return fallback;
}

export default function DriverProfileWizardV273() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [submitted, setSubmitted] = useState(false);

  const documentMap = useMemo(() => Object.fromEntries(docs.map((doc) => [doc.document_type, doc])), [docs]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `mt-2 h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#151515] text-white placeholder:text-white/30" : "border-black/12 bg-[#fbfaf7] text-black placeholder:text-black/35"}`;
  const textarea = `${input} h-auto min-h-28 py-3`;

  async function authToken() {
    const client = browserSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return "";
    let session = data.session;
    if (session && (!session.expires_at || session.expires_at * 1000 <= Date.now() + 30_000)) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) return "";
      session = refreshed.data.session;
    }
    return session?.access_token || "";
  }

  async function load(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const token = await authToken();
      if (!token) {
        window.location.assign(`/login?next=${encodeURIComponent("/driver-profile")}`);
        return;
      }
      const response = await fetch("/api/phase2/me", { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The profile could not be loaded.");
      if (result.profile) {
        setForm({
          ...EMPTY,
          ...result.profile,
          vehicle_types: Array.isArray(result.profile.vehicle_types) ? result.profile.vehicle_types.join(", ") : String(result.profile.vehicle_types || ""),
          route_experience: Array.isArray(result.profile.route_experience) ? result.profile.route_experience.join(", ") : String(result.profile.route_experience || ""),
          languages: Array.isArray(result.profile.languages) ? result.profile.languages.join(", ") : String(result.profile.languages || ""),
          prdp_expiry: String(result.profile.prdp_expiry || result.profile.prdp_expires_at || "").slice(0, 10),
        });
        const status = String(result.profile.status || result.profile.profile_status || "");
        if (["pending", "submitted"].includes(status)) setSubmitted(true);
      }
      setDocs(Array.isArray(result.documents) ? result.documents : []);
    } catch (error) {
      setMessageType("error");
      setMessage(cleanMessage(error, "The driver profile could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(true); }, []);

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

  function validateStep(current: number) {
    if (current === 1) {
      if (!form.full_name.trim()) return "Add your full name.";
      if (!form.city.trim()) return "Choose your city or town.";
      if (!form.province.trim()) return "Choose your province.";
      if (!form.phone.trim()) return "Add your contact number.";
      if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Add a valid email address.";
    }
    if (current === 2) {
      if (!form.licence_code.trim()) return "Add your driving licence code.";
      if (!form.vehicle_types.split(",").some((value) => value.trim())) return "Add at least one vehicle type you can drive.";
    }
    if (current === 3 && form.prdp_required && !form.prdp_expiry) return "Add your PrDP expiry date.";
    if (current === 4) {
      if (!documentMap.identity) return "Upload your ID or passport before continuing.";
      if (!documentMap.drivers_licence) return "Upload your driver’s licence before continuing.";
      if (form.prdp_required && !documentMap.prdp) return "Upload your PrDP before continuing.";
    }
    return "";
  }

  async function saveProfile(showConfirmation = false) {
    const token = await authToken();
    if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
    const response = await fetch("/api/phase2/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload()),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The profile could not be saved.");
    if (showConfirmation) {
      setMessageType("success");
      setMessage("Profile details saved.");
    }
  }

  async function continueStep() {
    if (busy || uploadingType) return;
    setMessage("");
    const validation = validateStep(step);
    if (validation) { setMessageType("error"); setMessage(validation); return; }
    setBusy(true);
    try {
      if (step <= 3) await saveProfile(false);
      setStep((current) => Math.min(5, current + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessageType("error");
      setMessage(cleanMessage(error, "LoadLink could not save these details."));
    } finally {
      setBusy(false);
    }
  }

  async function upload(type: string, file: File | null) {
    if (!file || busy || uploadingType) return;
    setMessage("");
    const label = LABELS[type] || "Document";
    const mime = file.type.toLowerCase().split(";")[0];
    if (!ACCEPTED_DOCUMENT_TYPES.has(mime)) {
      setMessageType("error"); setMessage(`${label}: choose a PDF, JPG or PNG file.`); return;
    }
    if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
      setMessageType("error"); setMessage(`${label}: the file must be smaller than 8 MB.`); return;
    }
    setUploadingType(type);
    try {
      await saveProfile(false);
      const token = await authToken();
      if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
      const data = new FormData();
      data.append("documentType", type);
      data.append("file", file);
      const response = await fetch("/api/phase2/documents", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `${label} could not be uploaded.`);
      setMessageType("success");
      setMessage(`${label} uploaded successfully.`);
      await load(false);
    } catch (error) {
      setMessageType("error");
      setMessage(`${label}: ${cleanMessage(error, "upload failed.")}`);
    } finally {
      setUploadingType("");
    }
  }

  async function submit() {
    if (busy || uploadingType) return;
    setMessage("");
    for (const current of [1, 2, 3, 4]) {
      const validation = validateStep(current);
      if (validation) { setStep(current); setMessageType("error"); setMessage(validation); return; }
    }
    setBusy(true);
    try {
      const token = await authToken();
      if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
      const response = await fetch("/api/phase2/submit", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payload: payload() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The driver profile could not be submitted.");
      setSubmitted(true);
      setForm((current) => ({ ...current, status: "pending", profile_status: "submitted", review_reason: "", missing_document_type: "" }));
      setMessageType("success");
      setMessage("Profile submitted. LoadLink has received it for review.");
    } catch (error) {
      setMessageType("error");
      setMessage(cleanMessage(error, "The driver profile could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  return <main className={`min-h-screen ${page}`} data-loadlink-driver-wizard="v273">
    <Header darkMode={darkMode} toggleTheme={toggleTheme} />
    <section className="border-b border-[#f6b800]/25 bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black">Driver profile</span>{submitted ? <span className="rounded-full border border-white/20 px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/70">Review in progress</span> : null}</div>
        <h1 className="mt-4 text-[40px] font-black tracking-[-.06em] sm:text-[48px]">Build your driver profile</h1>
        <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-white/50">Complete each step, check your details, then send one clean profile to LoadLink for review.</p>
      </div>
    </section>

    <div className="mx-auto max-w-3xl px-4 py-6 pb-20">
      {form.review_reason ? <div className="mb-4 rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold"><strong className="block font-black">Review feedback</strong><span className="mt-1 block opacity-75">{form.review_reason}</span>{form.missing_document_type ? <button type="button" onClick={() => setStep(4)} className="mt-3 text-xs font-black underline underline-offset-4">Replace {LABELS[form.missing_document_type] || "requested document"}</button> : null}</div> : null}
      {message ? <div role="status" className={`mb-4 rounded-[16px] border p-4 text-xs font-bold leading-5 ${messageType === "error" ? "border-red-500/35 bg-red-500/10" : messageType === "success" ? "border-emerald-500/35 bg-emerald-500/10" : "border-[#f6b800]/30 bg-[#f6b800]/10"}`}>{message}</div> : null}

      <div className="mb-2 flex items-center justify-between text-[10px] font-black"><span>Step {step} of 5</span><span className="opacity-40">{STEP_LABELS[step - 1]}</span></div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-current/10"><div className="h-full bg-[#f6b800] transition-[width] duration-200" style={{ width: `${step * 20}%` }} /></div>

      <section className={`rounded-[26px] border p-5 sm:p-7 ${surface}`}>
        {step === 1 ? <>
          <StepTitle title="Personal information" copy="Use accurate contact details businesses can rely on." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input className={input} value={form.full_name} onChange={(event) => field("full_name", event.target.value)} autoComplete="name" /></Field>
            <Field label="Professional headline"><input className={input} value={form.headline} onChange={(event) => field("headline", event.target.value)} placeholder="Code 14 long-distance driver" /></Field>
            <Field label="City or town"><SouthAfricaLocationInput className={input} value={form.city} onChange={(value, selected) => { field("city", value); if (selected?.province) field("province", selected.province); }} darkMode={darkMode} allowAllSouthAfrica={false} required /></Field>
            <Field label="Province"><select className={input} value={form.province} onChange={(event) => field("province", event.target.value)}><option value="">Select province</option>{SOUTH_AFRICAN_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}</select></Field>
            <Field label="Contact number"><input className={input} value={form.phone} onChange={(event) => field("phone", event.target.value)} inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Email"><input className={input} type="email" value={form.email} onChange={(event) => field("email", event.target.value)} autoComplete="email" /></Field>
          </div>
        </> : null}

        {step === 2 ? <>
          <StepTitle title="Driving experience" copy="Tell businesses what you can drive and where you have worked." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Years of experience"><input className={input} type="number" min="0" max="60" value={form.years_experience} onChange={(event) => field("years_experience", Number(event.target.value))} /></Field>
            <Field label="Licence code"><input className={input} value={form.licence_code} onChange={(event) => field("licence_code", event.target.value)} placeholder="e.g. EC / Code 14" /></Field>
            <Field label="Vehicle experience"><input className={input} value={form.vehicle_types} onChange={(event) => field("vehicle_types", event.target.value)} placeholder="Truck, tanker, refrigerated truck" /></Field>
            <Field label="Route experience"><input className={input} value={form.route_experience} onChange={(event) => field("route_experience", event.target.value)} placeholder="Gauteng, Durban, cross-border" /></Field>
            <Field label="Languages"><input className={input} value={form.languages} onChange={(event) => field("languages", event.target.value)} placeholder="English, isiXhosa" /></Field>
            <Field label="Previous roles"><input className={input} value={form.previous_roles} onChange={(event) => field("previous_roles", event.target.value)} placeholder="Long-haul driver, fleet driver" /></Field>
          </div>
        </> : null}

        {step === 3 ? <>
          <StepTitle title="Availability and PrDP" copy="Add your current availability and the credentials relevant to the work you want." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Availability"><input className={input} value={form.availability} onChange={(event) => field("availability", event.target.value)} placeholder="Available immediately" /></Field>
            <label className={`mt-2 flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 ${darkMode ? "border-white/15 bg-[#151515]" : "border-black/12 bg-[#fbfaf7]"}`}><span><strong className="block text-xs font-black">PrDP required for my work</strong><span className={`mt-0.5 block text-[9px] font-semibold ${muted}`}>Turn on if you use a PrDP.</span></span><input type="checkbox" checked={form.prdp_required} onChange={(event) => field("prdp_required", event.target.checked)} className="h-5 w-5 accent-[#f6b800]" /></label>
            {form.prdp_required ? <Field label="PrDP expiry"><input className={input} type="date" value={form.prdp_expiry} onChange={(event) => field("prdp_expiry", event.target.value)} /></Field> : null}
            <Field label="Professional summary" wide><textarea className={textarea} value={form.bio} onChange={(event) => field("bio", event.target.value)} placeholder="Briefly describe your driving experience, reliability and the type of work you are looking for." /></Field>
          </div>
        </> : null}

        {step === 4 ? <>
          <StepTitle title="Essential documents" copy="Upload only the documents needed to confirm your identity and driving credentials." muted={muted} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DocumentUpload type="identity" label={LABELS.identity} required fileName={documentMap.identity?.original_filename} busy={busy || Boolean(uploadingType)} uploading={uploadingType === "identity"} darkMode={darkMode} onFile={(file) => void upload("identity", file)} />
            <DocumentUpload type="drivers_licence" label={LABELS.drivers_licence} required fileName={documentMap.drivers_licence?.original_filename} busy={busy || Boolean(uploadingType)} uploading={uploadingType === "drivers_licence"} darkMode={darkMode} onFile={(file) => void upload("drivers_licence", file)} />
            {form.prdp_required ? <DocumentUpload type="prdp" label={LABELS.prdp} required fileName={documentMap.prdp?.original_filename} busy={busy || Boolean(uploadingType)} uploading={uploadingType === "prdp"} darkMode={darkMode} onFile={(file) => void upload("prdp", file)} /> : null}
            <DocumentUpload type="cv" label={LABELS.cv} fileName={documentMap.cv?.original_filename} busy={busy || Boolean(uploadingType)} uploading={uploadingType === "cv"} darkMode={darkMode} onFile={(file) => void upload("cv", file)} />
            <DocumentUpload type="driving_certificate" label={LABELS.driving_certificate} fileName={documentMap.driving_certificate?.original_filename} busy={busy || Boolean(uploadingType)} uploading={uploadingType === "driving_certificate"} darkMode={darkMode} onFile={(file) => void upload("driving_certificate", file)} />
          </div>
          <p className={`mt-4 text-[10px] font-semibold leading-5 ${muted}`}>Accepted: PDF, JPG or PNG. Maximum 8 MB per document. Your driver documents are not published publicly.</p>
        </> : null}

        {step === 5 ? <>
          <StepTitle title="Review your profile" copy="Check each section before sending it to LoadLink." muted={muted} />
          <div className="mt-5 divide-y divide-current/10 overflow-hidden rounded-[18px] border border-current/10">
            <ReviewRow label="Personal" value={`${form.full_name} · ${form.city}, ${form.province}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Contact" value={`${form.phone} · ${form.email}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Licence" value={`${form.licence_code} · ${form.years_experience || 0} years experience`} onEdit={() => setStep(2)} />
            <ReviewRow label="Vehicles" value={form.vehicle_types || "—"} onEdit={() => setStep(2)} />
            <ReviewRow label="Availability" value={form.availability || "—"} onEdit={() => setStep(3)} />
            <ReviewRow label="PrDP" value={form.prdp_required ? `Required${form.prdp_expiry ? ` · expires ${form.prdp_expiry}` : ""}` : "Not marked as required"} onEdit={() => setStep(3)} />
            <ReviewRow label="Documents" value={`${documentMap.identity ? "ID ✓" : "ID missing"} · ${documentMap.drivers_licence ? "Licence ✓" : "Licence missing"}${form.prdp_required ? ` · ${documentMap.prdp ? "PrDP ✓" : "PrDP missing"}` : ""}`} onEdit={() => setStep(4)} />
          </div>
          {submitted ? <div className="mt-5 rounded-[16px] border border-[#f6b800]/35 bg-[#f6b800]/10 p-4 text-xs font-bold">Your profile is already with LoadLink for review. You can still correct your saved details if LoadLink requests changes.</div> : null}
        </> : null}

        <div className="mt-6 flex gap-2">
          {step > 1 ? <button type="button" disabled={busy || Boolean(uploadingType)} onClick={() => { setMessage(""); setStep((current) => current - 1); }} className="h-12 rounded-xl border border-current/12 px-5 text-xs font-black disabled:opacity-40">Back</button> : null}
          {step < 5 ? <button type="button" disabled={busy || Boolean(uploadingType)} onClick={() => void continueStep()} className="h-12 flex-1 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40">{busy ? "Saving…" : "Continue"}</button> : <button type="button" disabled={busy || Boolean(uploadingType) || submitted} onClick={() => void submit()} className="h-12 flex-1 rounded-xl bg-[#f6b800] px-5 text-sm font-black tracking-[-.02em] text-black disabled:opacity-45">{busy ? "Submitting…" : submitted ? "Review in progress" : "Submit profile for review"}</button>}
        </div>
      </section>
    </div>
  </main>;
}

function Header({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) {
  return <header className={`sticky top-0 z-50 h-[64px] border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 sm:px-5"><div className="flex items-center gap-1.5"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div><div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="pointer-events-auto"><HomeLogoLink theme={darkMode ? "dark" : "light"} /></div></div><div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div></div></header>;
}

function StepTitle({ title, copy, muted }: { title: string; copy: string; muted: string }) {
  return <div><h2 className="text-2xl font-black tracking-[-.035em] sm:text-3xl">{title}</h2><p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>{copy}</p></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "block sm:col-span-2" : "block"}><span className="text-xs font-black">{label}</span>{children}</label>;
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="flex items-start gap-3 px-4 py-4"><span className="w-20 shrink-0 text-[9px] font-black uppercase opacity-40">{label}</span><span className="min-w-0 flex-1 break-words text-xs font-bold">{value}</span><button type="button" onClick={onEdit} className="shrink-0 text-[9px] font-black text-[#b88600] underline underline-offset-3">Edit</button></div>;
}

function DocumentUpload({ label, required = false, fileName, busy, uploading, darkMode, onFile }: { type: string; label: string; required?: boolean; fileName?: string; busy: boolean; uploading: boolean; darkMode: boolean; onFile: (file: File | null) => void }) {
  function change(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    onFile(file);
  }
  return <label className={`relative flex min-h-32 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4 transition hover:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.035]" : "border-black/10 bg-[#faf9f5]"}`}>
    <span><strong className="block text-sm font-black">{label}</strong><span className={`mt-1 block text-[9px] font-black uppercase tracking-[.1em] ${required ? "text-[#b88600]" : "opacity-40"}`}>{required ? "Required" : "Optional"}</span></span>
    <span className="mt-4"><span className="block truncate text-xs font-semibold opacity-55">{uploading ? "Uploading…" : fileName || "Choose PDF, JPG or PNG"}</span>{fileName && !uploading ? <span className="mt-1 block text-[9px] font-black text-[#b88600]">Tap to replace</span> : null}</span>
    <input disabled={busy} type="file" accept="application/pdf,image/jpeg,image/png" onChange={change} className="hidden" />
    {uploading ? <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-current/10"><span className="block h-full w-2/3 animate-pulse bg-[#f6b800]" /></span> : null}
  </label>;
}
